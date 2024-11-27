import React, { useEffect, useRef } from 'react';

function StreamPage({ 
  isRecording,
  isConnecting,
  startTranscription,
  endTranscription,
  respondedTranscript,
  currentTranscript,
  twitchMessages 
}) {
  const chatMessagesRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [twitchMessages]);

  return (
    <div className="page stream-page">
      <header>
        <h1 className="header__title">LoyalViewerAI</h1>
        <p className="header__sub-title">A Twitch chatbot that recognizes the streamer's voice and responds to the chat.</p>
      </header>

      <div className="real-time-interface">
        <p className="real-time-interface__title">Click start to begin recording!</p>
        {isRecording ? (
          <button className="real-time-interface__button" onClick={endTranscription}>
            Stop recording
          </button>
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
          <p>{respondedTranscript}</p>
        </div>
        <div>
          <h4>Current Transcript:</h4>
          <p>{currentTranscript}</p>
        </div>
      </div>

      <div className="twitch-chat">
        <h3>Twitch Chat</h3>
        <div className="chat-messages" ref={chatMessagesRef}>
          {twitchMessages.map((msg, index) => (
            <div key={index} className="chat-message">
              <span className="username">{msg.username}: </span>
              <span className="message">{msg.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StreamPage; 