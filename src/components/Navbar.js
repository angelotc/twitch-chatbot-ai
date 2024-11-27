import React from 'react';
import './Navbar.css';

function Navbar({ showSettings, setShowSettings }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1></h1>
      </div>
      
      <div className="navbar-links">
        <button 
          className={`nav-link ${!showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(false)}
        >
          Stream
        </button>
        <button 
          className={`nav-link ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(true)}
        >
          Settings
        </button>
      </div>
    </nav>
  );
}

export default Navbar; 