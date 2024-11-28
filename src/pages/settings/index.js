import React from 'react';
import Settings from '../../components/Settings';

function SettingsPage({ settings, setSettings }) {
  return (
    <div className="page settings-page">
      <header>
        <h1 className="header__title">Settings</h1>
        <p className="header__sub-title">Configure your AI chatbot's personality and behavior</p>
      </header>
      
      <Settings 
        settings={settings} 
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          localStorage.setItem('botSettings', JSON.stringify(newSettings));
        }} 
      />
    </div>
  );
}

export default SettingsPage; 