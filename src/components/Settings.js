import React, { useState, useEffect } from 'react';
import './Settings.css';
import { personas } from '../config/personas';
import PropTypes from 'prop-types';

const RESPONSE_SPEEDS = {
  instant: { label: 'Instant', min: 0, max: 0 },
  fast: { label: 'Fast', min: 1, max: 3 },
  normal: { label: 'Normal', min: 2, max: 5 },
  slow: { label: 'Slow', min: 4, max: 8 },
  verySlow: { label: 'Very Slow', min: 6, max: 12 }
};

function Settings({ settings, onSaveSettings }) {
  const [currentSettings, setCurrentSettings] = useState(settings);
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [customPromptError, setCustomPromptError] = useState('');
  
  useEffect(() => {
    console.log('Settings component rendered with:', currentSettings);
  }, [currentSettings]);

  const handleChange = (section, setting, value) => {
    if (currentSettings[section]?.[setting] === value) {
      return;
    }
    
    setCurrentSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [setting]: value,
        ...(setting === 'persona' && value !== 'custom' ? { customPrompt: '' } : {})
      }
    }));
  };

  const handleSpeedChange = (speed) => {
    setCurrentSettings(prev => ({
      ...prev,
      chat: {
        ...prev.chat,
        responseSpeed: speed,
        minDelay: RESPONSE_SPEEDS[speed].min,
        maxDelay: RESPONSE_SPEEDS[speed].max
      }
    }));
  };

  const handleSave = () => {
    onSaveSettings(currentSettings);
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 2000);
  };

  return (
    <div className="settings">
      <div className="settings-section">
        <h2>Bot Personality</h2>
        <div className="persona-selector">
          {Object.entries(personas).map(([key, persona]) => (
            <div 
              key={key}
              className={`persona-card ${currentSettings.bot?.persona === key ? 'selected' : ''}`}
              onClick={() => handleChange('bot', 'persona', key)}
            >
              <h3>{persona.name}</h3>
              <p>{persona.description}</p>
            </div>
          ))}
        </div>

        {currentSettings.bot?.persona === 'custom' && (
          <div className="custom-prompt-section">
            <label>Custom Prompt</label>
            <textarea
              value={currentSettings.bot?.customPrompt || ''}ok
              onChange={(e) => handleChange('bot', 'customPrompt', e.target.value)}
              placeholder="Enter your custom bot personality prompt..."
              maxLength={1000}
              rows={4}
            />
            <div className="prompt-footer">
              <span className="character-count">
                {(currentSettings.bot?.customPrompt || '').length}/1000
              </span>
              {customPromptError && (
                <span className="error-message">{customPromptError}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>Bot Attitude</h2>
        <p className="settings-description">
          Changing this slider will affect how 'random and wild' the bot is when replying to users, and how much it will stay on topic.
        </p>
        <div className="attitude-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={currentSettings.bot?.attitude ?? 50}
            onChange={(e) => handleChange('bot', 'attitude', parseInt(e.target.value))}
            className="attitude-slider"
          />
          <div className="attitude-labels">
            <span>Focused</span>
            <span>Random</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Chat Settings</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <label>Response Speed</label>
            <div className="speed-selector">
              {Object.entries(RESPONSE_SPEEDS).map(([speed, config]) => (
                <button
                  key={speed}
                  className={`speed-button ${currentSettings.chat?.responseSpeed === speed ? 'selected' : ''}`}
                  onClick={() => handleSpeedChange(speed)}
                >
                  {config.label}
                </button>
              ))}
            </div>
            <p className="speed-description">
              {currentSettings.chat?.responseSpeed === 'instant' 
                ? "Bot will respond as soon as possible."
                : `Bot will wait between ${RESPONSE_SPEEDS[currentSettings.chat?.responseSpeed]?.min}s and ${RESPONSE_SPEEDS[currentSettings.chat?.responseSpeed]?.max}s before responding.`
              }
            </p>
          </div>

          <div className="setting-item">
            <label>Emote Usage</label>
            <select 
              value={currentSettings.chat.emoteUsage} 
              onChange={(e) => handleChange('chat', 'emoteUsage', e.target.value)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="save-section">
        <button 
          className="save-button"
          onClick={handleSave}
        >
          Save Settings
        </button>
        {showSaveMessage && <span className="save-message">Settings saved!</span>}
      </div>
    </div>
  );
}

Settings.propTypes = {
  settings: PropTypes.object.isRequired,
  onSaveSettings: PropTypes.func.isRequired
};

export default React.memo(Settings); 