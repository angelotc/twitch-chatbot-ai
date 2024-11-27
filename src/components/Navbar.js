import React from 'react';
import './Navbar.css';

function Navbar({ showDashboard, setShowDashboard }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1></h1>
      </div>
      
      <div className="navbar-links">
        <button 
          className={`nav-link ${!showDashboard ? 'active' : ''}`}
          onClick={() => setShowDashboard(false)}
        >
          Stream
        </button>
        <button 
          className={`nav-link ${showDashboard ? 'active' : ''}`}
          onClick={() => setShowDashboard(true)}
        >
          Settings
        </button>
      </div>
    </nav>
  );
}

export default Navbar; 