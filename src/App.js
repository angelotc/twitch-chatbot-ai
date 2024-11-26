import './App.css';
import { useRef, useState, useEffect } from 'react';
import { RealtimeTranscriber } from 'assemblyai/streaming';
import * as RecordRTC from 'recordrtc';
import { EventEmitter } from 'events';
import OpenAI from 'openai';
import Dashboard from './components/Dashboard';
import { personas } from './config/personas';
import Navbar from './components/Navbar';
import { loadSettings, saveSettings, defaultSettings } from './config/chatSettings';

// Twitch Configuration - Move these to environment variables later
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws';
const OAUTH_TOKEN = process.env.REACT_APP_TWITCH_ACCESS_TOKEN;
const CLIENT_ID = process.env.REACT_APP_TWITCH_CLIENT_ID;
const BOT_USER_ID = process.env.REACT_APP_TWITCH_BOT_USER_ID;
const CHAT_CHANNEL_USER_ID = process.env.REACT_APP_TWITCH_CHANNEL_USER_ID;

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

function App() {
  /** @type {React.MutableRefObject<RealtimeTranscriber>} */
  const realtimeTranscriber = useRef(null)
  /** @type {React.MutableRefObject<RecordRTC>} */
  const recorder = useRef(null)
  const transcriptEmitterRef = useRef(new EventEmitter());
  const [isRecording, setIsRecording] = useState(false)
  const [respondedTranscript, setRespondedTranscript] = useState('')
  const [currentTranscript, setCurrentTranscript] = useState('')
  const twitchWsRef = useRef(null);
  const [twitchMessages, setTwitchMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  let websocketSessionID;

  const MAX_RESPONDED_TRANSCRIPT_LENGTH = 750; // Set a maximum length for respondedTranscript
  const MAX_TWITCH_MESSAGES = 15; // Set a maximum number of Twitch chat messages to keep

  const [showDashboard, setShowDashboard] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());

  const generateOpenAIResponse = async (updatedTranscript, chatHistory) => {
    const persona = personas[settings.bot.persona];
    console.log('persona:', persona);
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: settings.bot.customPrompt || persona.systemPrompt
          },
          { role: "user", content: `Previously responded transcript: "${respondedTranscript}"` },
          { role: "user", content: `Updated transcript from streamer: "${updatedTranscript}"` },
          { role: "user", content: `Recent chat messages: ${JSON.stringify(chatHistory)}` },
          { role: "user", content: "Based on this information, generate a unique response." }
        ],
        max_tokens: 150,
      });
      console.log('Responded transcript:', respondedTranscript);
      console.log('Updated transcript:', updatedTranscript);
      console.log('chatHistory:', chatHistory);
      console.log('OpenAI response:', response);

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating OpenAI response:', error);
      return '';
    }
  };

  async function getAuth() {
    // https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token
    let response = await fetch('https://id.twitch.tv/oauth2/validate', {
      method: 'GET',
      headers: {
        'Authorization': 'OAuth ' + OAUTH_TOKEN
      }
    });
  
    if (response.status !== 200) {
      let data = await response.json();
      console.error("Token is not valid. /oauth2/validate returned status code " + response.status);
      console.error(data);
      process.exit(1);
    }
  
    console.log("Validated token.");
  }
  const getToken = async () => {
    const response = await fetch('http://localhost:8000/token');
    const data = await response.json();

    if (data.error) {
      alert(data.error)
    }

    return data.token;
  };

  const startTranscription = async () => {
    setIsConnecting(true);
    try {
      getAuth();
      twitchWsRef.current = startWebSocketClient();
      realtimeTranscriber.current = new RealtimeTranscriber({
        token: await getToken(),
        sampleRate: 16_000,
      });

      realtimeTranscriber.current.on('transcript', transcript => {
        if (transcript.message_type === 'PartialMessage') {
          return;
        }

        if (/[.!?]$/.test(transcript.text.trim())) {
          const latestSentence = transcript.text.trim();
          setCurrentTranscript(latestSentence);
          transcriptEmitterRef.current.emit('transcriptUpdated', latestSentence);
        }
      });

      realtimeTranscriber.current.on('error', event => {
        console.error(event);
        realtimeTranscriber.current.close();
        realtimeTranscriber.current = null;
      });

      realtimeTranscriber.current.on('close', (code, reason) => {
        console.log(`Connection closed: ${code} ${reason}`);
        realtimeTranscriber.current = null;
      });

      await realtimeTranscriber.current.connect();

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          recorder.current = new RecordRTC(stream, {
            type: 'audio',
            mimeType: 'audio/webm;codecs=pcm',
            recorderType: RecordRTC.StereoAudioRecorder,
            timeSlice: 250,
            desiredSampRate: 16000,
            numberOfAudioChannels: 1,
            bufferSize: 4096,
            audioBitsPerSecond: 128000,
            ondataavailable: async (blob) => {
              if (!realtimeTranscriber.current) return;
              const buffer = await blob.arrayBuffer();
              realtimeTranscriber.current.sendAudio(buffer);
            },
          });
          recorder.current.startRecording();
        })
        .catch((err) => console.error(err));

      setIsRecording(true)
    } catch (error) {
      console.error('Error starting transcription:', error);
    } finally {
      setIsConnecting(false);
    }
  }

  const endTranscription = async (event) => {
    event.preventDefault();
    setIsRecording(false)

    // Close Twitch connection
    if (twitchWsRef.current) {
      twitchWsRef.current.close();
      twitchWsRef.current = null;
    }
    await realtimeTranscriber.current.close();
    realtimeTranscriber.current = null;

    recorder.current.pauseRecording();
    recorder.current = null;
  }

  useEffect(() => {
    const emitter = transcriptEmitterRef.current;
    let lastResponseTime = Date.now();

    emitter.on('transcriptUpdated', async (updatedTranscript) => {
      console.log('Updated transcript:', updatedTranscript);
      const recentChat = twitchMessages.slice(-5);
      console.log('Recent chat:', recentChat);

      const currentTime = Date.now();
      const timeSinceLastResponse = currentTime - lastResponseTime;

      let shouldRespond = false;
      console.log('Response frequency:', settings.chat.responseFrequency);
      console.log('Time since last response:', timeSinceLastResponse);
      console.log('Should respond:', shouldRespond);
      switch (settings.chat.responseFrequency) {
        case 'high':
          shouldRespond = timeSinceLastResponse > 10000; // Respond every 10 seconds
          break;
        case 'medium':
          shouldRespond = timeSinceLastResponse > 30000; // Respond every 30 seconds
          break;
        case 'low':
          shouldRespond = timeSinceLastResponse > 60000; // Respond every 60 seconds
          break;
        default:
          shouldRespond = timeSinceLastResponse > 30000; // Default to medium
      }

      if (shouldRespond) {
        const aiResponse = await generateOpenAIResponse(updatedTranscript, recentChat);
        console.log('AI response:', aiResponse);
        if (aiResponse) {
          sendChatMessage(aiResponse);
          setRespondedTranscript(prev => {
            const newTranscript = `${prev} ${updatedTranscript}`.trim();
            return newTranscript.length > MAX_RESPONDED_TRANSCRIPT_LENGTH
              ? newTranscript.slice(-MAX_RESPONDED_TRANSCRIPT_LENGTH)
              : newTranscript;
          });
          setCurrentTranscript('');
          lastResponseTime = currentTime;
        }
      }
    });

    return () => {
      emitter.removeAllListeners('transcriptUpdated');
    };
  }, [twitchMessages, respondedTranscript, settings.chat.responseFrequency]);

  function startWebSocketClient() {
    let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);

    websocketClient.onopen = () => {
      console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
    };

    websocketClient.onerror = console.error;

    websocketClient.onmessage = (event) => {
      console.log("Received message:", event.data);
      handleWebSocketMessage(JSON.parse(event.data));
    };

    return websocketClient;
  }
  async function registerEventSubListeners() {
    console.log("Registering EventSub listeners with session ID:", websocketSessionID);
    try {
      const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + OAUTH_TOKEN,
          'Client-Id': CLIENT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'channel.chat.message',
          version: '1',
          condition: {
            broadcaster_user_id: CHAT_CHANNEL_USER_ID,
            user_id: BOT_USER_ID
          },
          transport: {
            method: 'websocket',
            session_id: websocketSessionID
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to register EventSub listener:", data);
      } else {
        console.log("Successfully registered EventSub listener");
      }
    } catch (error) {
      console.error("Error registering EventSub listener:", error);
    }
  }
  function handleWebSocketMessage(data) {
    switch (data.metadata?.message_type) {
      case 'session_welcome':
        websocketSessionID = data.payload.session.id;
        console.log("Websocket session IDssss:", websocketSessionID);
        registerEventSubListeners();
        break;
      case 'notification':
        if (data.metadata.subscription_type === 'channel.chat.message') {
          console.log(`MSG #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);

          setTwitchMessages(prev => {
            const newMessages = [...prev, {
              username: data.payload.event.chatter_user_login,
              message: data.payload.event.message.text
            }];
            return newMessages.slice(-MAX_TWITCH_MESSAGES);
          });

          if (data.payload.event.message.text.trim() === "HeyGuys") {
            sendChatMessage("VoHiYo");
          }
        }
        break;
      default:
        break;
    }
  }

  async function sendChatMessage(chatMessage) {
    try {
      let response = await fetch('https://api.twitch.tv/helix/chat/messages', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + OAUTH_TOKEN,
          'Client-Id': CLIENT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          broadcaster_id: CHAT_CHANNEL_USER_ID,
          sender_id: BOT_USER_ID,
          message: chatMessage
        })
      });

      if (!response.ok) {
        console.error('Failed to send chat message');
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }

  return (
    <div className="App">
      <Navbar 
        showDashboard={showDashboard} 
        setShowDashboard={setShowDashboard} 
      />
      
      {showDashboard ? (
        <Dashboard 
          settings={settings} 
          onSaveSettings={(newSettings) => {
            setSettings(newSettings);
            // Here you could also save to localStorage or your backend
            localStorage.setItem('botSettings', JSON.stringify(newSettings));
          }} 
        />
      ) : (
        <>
          <header>
            <h1 className="header__title">Twitch Chat AI</h1>
            <p className="header__sub-title">A Twitch chatbot that recognizes the streamer's voice and responds to the chat.</p>
          </header>
          <div className="real-time-interface">
            <p id="real-time-title" className="real-time-interface__title">Click start to begin recording!</p>
            {isRecording ? (
              <button className="real-time-interface__button" onClick={endTranscription}>Stop recording</button>
            ) : (
              <button 
                className="real-time-interface__button" 
                onClick={startTranscription}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Record'}
              </button>
            )}
          </div>
          
          <div className="real-time-interface__message">
            <h3>Streamer's Transcript</h3>
            <div>
              <h4>Responded Transcript:</h4>
              {respondedTranscript}
            </div>
            <div>
              <h4>Current Transcript:</h4>
              {currentTranscript}
            </div>
          </div>
          <div className="twitch-chat">
            <h3>Twitch Chat</h3>
            <div className="chat-messages">
              {twitchMessages.map((msg, index) => (
                <div key={index} className="chat-message">
                  <span className="username">{msg.username}: </span>
                  <span className="message">{msg.message}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;