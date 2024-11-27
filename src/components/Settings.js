import React, { useState } from 'react';
import './Settings.css';
import { personas } from '../config/personas';

function Settings({ settings, onSaveSettings }) {
  const [currentSettings, setCurrentSettings] = useState(settings);
  const [customPromptError, setCustomPromptError] = useState('');
  
  const handleChange = (section, setting, value) => {
    if (section === 'bot' && setting === 'customPrompt') {
      if (value.length > 1000) {
        setCustomPromptError('Custom prompt must be less than 1000 characters');
        return;
      }
      setCustomPromptError('');
    }
    
    setCurrentSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [setting]: value
      }
    }));
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
              value={currentSettings.bot?.customPrompt || ''}
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
        <h2>Chat Settings</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <label>Response Frequency</label>
            <select 
              value={currentSettings.chat.responseFrequency} 
              onChange={(e) => handleChange('chat', 'responseFrequency', e.target.value)}
            >
              <option value="high">High (respond to most messages)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="low">Low (minimal responses)</option>
            </select>
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

      <button 
        className="save-button"
        onClick={() => onSaveSettings(currentSettings)}
      >
        Save Settings
      </button>
    </div>
  );
}

export default Settings; 