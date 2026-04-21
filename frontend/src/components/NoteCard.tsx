import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path.ts';
import { retrieveToken, storeToken } from '../tokenStorage';
import { useTheme } from '../ThemeContext';
import { Calendar3 } from 'react-bootstrap-icons';
import alarmSound from '../assets/TimerSound.mp3';

interface Note {
  id: string;
  text: string;
  createdAt: Date;
}

function NoteCard() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [noteText, setNoteText] = useState('');
  const [time, setTime] = useState('30:00');
  const [start, setStart] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [timeSettingOpen, setTimeSettingOpen] = useState(false);
  const [minutesInput, setMinutesInput] = useState('30');
  
  
  // Initialize it with the default (30 minutes)
  const initialSecondsRef = useRef(30 * 60);
  const secondsRef = useRef(30 * 60);

  const userDataString = localStorage.getItem('user_data');
  const userData = userDataString ? JSON.parse(userDataString) : {};
  const userId = userData.id || -1;

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showIndicator, setShowIndicator] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(0.5); // Default volume at 50%
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- API Functions ---
  async function loadNotes(): Promise<void> {
    try {
      const response = await fetch(buildPath('api/searchcards'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, search: '', jwtToken: retrieveToken() }),
      });
      const data = await response.json();
      if (data.jwtToken) storeToken(data.jwtToken);
      if (!data.error && data.results) {
        const mapped: Note[] = data.results.map((n: any) => ({
          id: n.id, 
          text: n.text, 
          createdAt: new Date(n.createdAt || Date.now()),
        }));
        setNotes(mapped.reverse());
      }
    } catch (err) { 
      console.error('Failed to load notes:', err); 
    }
  }
useEffect(() => {
  if (testAudioRef.current) {
    testAudioRef.current.volume = volume;
  }
}, [volume]);

  // --- Timer Logic ---
useEffect(() => {
  if (!start) return;

  const interval = setInterval(() => {
    if (secondsRef.current <= 0) { 
      setStart(false); 
      clearInterval(interval); 

      // --- ALARM LOGIC ---
      if (!audioRef.current) {
        audioRef.current = new Audio(alarmSound);
      }
      audioRef.current.volume = volume;
      audioRef.current.play().catch(err => console.log("Playback error:", err));

      // --- RESET LOGIC ---
      // Set the countdown back to the starting value
      secondsRef.current = initialSecondsRef.current;

      // Format the numbers to update the big display
      const mins = Math.floor(secondsRef.current / 60).toString().padStart(2, '0');
      const secs = (secondsRef.current % 60).toString().padStart(2, '0');
      setTime(`${mins}:${secs}`);

      return; 
    }
    
    secondsRef.current -= 1;
    const mins = Math.floor(secondsRef.current / 60).toString().padStart(2, '0');
    const secs = (secondsRef.current % 60).toString().padStart(2, '0');
    setTime(`${mins}:${secs}`);
  }, 1000);

  return () => clearInterval(interval);
}, [start]);

const startStopTimer = (e: React.MouseEvent) => {
  e.preventDefault(); 
  
  // If the alarm is ringing, stop it when the user clicks the button
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Reset sound to start
    }
  setStart((prev) => !prev); 
};

const changeTime = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  // If user clears the input, allow it but don't change the timer
  if (value === '') { 
    setMinutesInput(''); 
    return; 
  }
  const mins = parseInt(value, 10);
  if (isNaN(mins)) return;
  
  // Only update the text box state
  const finalMins = mins > 999 ? 999 : mins;
  setMinutesInput(String(finalMins));
};

const applyTimeChange = () => {
  const mins = parseInt(minutesInput, 10) || 0;
  const totalSeconds = mins * 60;

  // Update the actual timer values
  secondsRef.current = totalSeconds;
  initialSecondsRef.current = totalSeconds;
  const displayMins = String(mins).padStart(2, '0');
  setTime(`${displayMins}:00`);
  
  // Close the modal
  closeSettings();
};

  // --- Note Actions ---
  async function createNote(e: React.MouseEvent) {
    e.preventDefault();

      // CHECK LOGIN FIRST
  if (userId === -1 || !userData.id) {
    triggerAlert("You must have an account to create notes");
    return; // Stop the function here
  }

    if (!noteText.trim()) return;
    
    const tempId = crypto.randomUUID();
    const optimisticNote = { id: tempId, text: noteText.trim(), createdAt: new Date() };
    
    setNotes((prev) => [optimisticNote, ...prev]);
    setNoteText('');
    
    try {
      const response = await fetch(buildPath('api/addcard'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text: optimisticNote.text, jwtToken: retrieveToken() }),
      });
      const data = await response.json();
      if (data.jwtToken) storeToken(data.jwtToken);
      if (data.error) {
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
      } else if (data.id) {
        setNotes((prev) => prev.map((n) => n.id === tempId ? { ...n, id: data.id } : n));
      }
    } catch { 
      setNotes((prev) => prev.filter((n) => n.id !== tempId)); 
    }
  }

  async function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      const response = await fetch(buildPath('api/deletecard'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, jwtToken: retrieveToken() }),
      });
      const data = await response.json();
      if (data.jwtToken) storeToken(data.jwtToken);
    } catch { 
      loadNotes(); 
    }
  }

const handleLogout = () => {
  localStorage.removeItem('user_data');
  localStorage.removeItem('token_data');
  setNotes([]); 
  setPanelOpen(false); 
  navigate('/NoteCards'); 
};

  const triggerAlert = (message: string) => {
  // 1. Reset timer if it's already running
  if (alertTimeoutRef.current) {
    window.clearTimeout(alertTimeoutRef.current);
  }

  // 2. Set the message and show it
  setAlertMessage(message);
  setShowAlert(true);

  // 3. Start the 10-second countdown
  alertTimeoutRef.current = window.setTimeout(() => {
    setShowAlert(false);
  }, 10000);
};

const handleCalendarClick = (e: React.MouseEvent) => {
  e.preventDefault();
  if (userId === -1 || !userData.id) {
    triggerAlert("You must have an account to access the calendar feature");
  } else {
    navigate('/calendar');
  }
};



  // --- Styles ---
  const themeBtnStyle: React.CSSProperties = {
    position: 'fixed', top: '16px', right: '16px', zIndex: 1001,
    background: 'var(--card-bg)', color: 'var(--text-main)',
    border: '1px solid var(--border-color)', borderRadius: '50%',
    width: '42px', height: '42px', cursor: 'pointer', fontSize: '20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  };

  const calendarBtnStyle: React.CSSProperties = {
    position: 'fixed', bottom: '16px', right: '16px', zIndex: 101,
    background: '#2d4ef5', color: '#fff', border: 'none',
    borderRadius: '10px', padding: '0 14px', height: '42px',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  };

  const toggleBtnStyle: React.CSSProperties = {
    display: panelOpen ? 'none' : 'flex',
    position: 'fixed', top: '16px', left: '16px', zIndex: 101,
    background: '#2d4ef5', color: '#fff', border: 'none',
    borderRadius: '10px', width: '42px', height: '42px',
    fontSize: '18px', cursor: 'pointer', alignItems: 'center', justifyContent: 'center',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute', top: '-6px', right: '-6px',
    background: '#e53e3e', color: '#fff', borderRadius: '50%',
    width: '18px', height: '18px', fontSize: '11px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, height: '100vh', width: '300px',
    background: 'var(--panel-bg)', borderRight: '1px solid var(--border-color)',
    transform: panelOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.25s ease', zIndex: 1000, display: 'flex', flexDirection: 'column',
  };

  const overlayStyle: React.CSSProperties = {
    display: panelOpen ? 'block' : 'none',
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999,
  };

  const loginBtnStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '16px',
  left: '16px', // Positioned to the left of the Calendar button
  zIndex: 101,
  background: '#2d4ef5',
  color: '#fff',
  border: 'none',
  borderRadius: '24px',
  padding: '0 20px',
  height: '42px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  transition: 'transform 0.2s, background 0.2s',
};

const closeSettings = () => {
  // 1. Stop the test audio if it's playing
  if (testAudioRef.current) {
    testAudioRef.current.pause();
    testAudioRef.current.currentTime = 0; // Reset to start
    testAudioRef.current = null;
  }
  // 2. Close the modal
  setTimeSettingOpen(false);
};


  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', transition: '0.25s' }}>

      {showAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 3000,
          padding: '16px 24px',
          backgroundColor: '#fee2e2', 
          border: '1px solid #7f1d1d', 
          color: '#7f1d1d',           
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          fontWeight: 500,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          {alertMessage} {/* <--- Dynamic message shows here */}
          <button
            aria-label="Dismiss alert"
            onClick={() => setShowAlert(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#7f1d1d',
              cursor: 'pointer',
              marginLeft: '10px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            &#x2715;
          </button>
        </div>
      )}

      {/* Add this CSS in your global CSS file or a <style> tag to make it smooth */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    {/* Login/Register Button - Only shows if not logged in */}
    {(userId === -1 || !userData.id) && (
    <button 
      style={loginBtnStyle} 
      onClick={() => navigate('/login')}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.background = '#1a3bbd';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = '#2d4ef5';
      }}
    >
      Login / Register
    </button>
    )}
      
      {/* UI Controls */}
      <button aria-label="Toggle light and dark mode" style={themeBtnStyle} onClick={toggleDarkMode}>
        {isDarkMode ? '🌙' : '☀️'}
      </button>

      <button aria-label="Open calendar" style={calendarBtnStyle} onClick={handleCalendarClick}>
        <Calendar3 size={22} />
      </button>

    {/* Side Panel Toggle Button - Always Visible */}
    <button aria-label="Open notes panel" style={toggleBtnStyle} onClick={() => setPanelOpen(true)}>
      <span>&#9776;</span>
      {/* Only show badge if logged in and there are notes */}
      {userId !== -1 && notes.length > 0 && (
        <span style={badgeStyle}>{notes.length}</span>
      )}
    </button>

      <div style={overlayStyle} onClick={() => setPanelOpen(false)} />

{/* Side Panel */}
<div style={panelStyle}>
  <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
      {userId !== -1 ? `My Notes (${notes.length})` : 'Guest Mode'}
    </span>
    <button aria-label="Close notes panel" onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}>&#x2715;</button>
  </div>
  
  <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
    {userId !== -1 ? (
      // If logged in, show notes
      notes.map((note) => (
        <div key={note.id} style={{ background: 'var(--note-bg)', borderRadius: '10px', padding: '12px', marginBottom: '10px', position: 'relative', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginBottom: '4px' }}>{note.createdAt.toLocaleDateString()}</div>
          <p style={{ fontSize: '14px', color: 'var(--text-main)', margin: 0 }}>{note.text}</p>
          <button aria-label="Delete note" onClick={() => deleteNote(note.id)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>&#x2715;</button>
        </div>
      ))
    ) : (
      // If NOT logged in, show this message
      <div style={{ textAlign: 'center', color: 'var(--text-sub)', marginTop: '40px', padding: '0 20px' }}>
        <p>You are not logged in.</p>
        <button 
          onClick={() => navigate('/login')}
          style={{ background: '#2d4ef5', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', marginTop: '10px' }}
        >
          Login to see notes
        </button>
      </div>
    )}
  </div>
  
  {/* ONLY show logout button if userId is not -1 */}
  {userId !== -1 && (
    <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
      <button onClick={handleLogout} style={{ width: '100%', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '24px', padding: '10px', cursor: 'pointer' }}>
        Logout
      </button>
    </div>
  )}
</div>


{/* Timer Settings Modal */}
{timeSettingOpen && (
  <>
    <div onClick={closeSettings} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1999 }} />
    
    <div style={{ 
      position: 'fixed', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)', 
      width: '380px', // Thinner as requested
      background: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
      backdropFilter: 'blur(12px)', 
      border: '1px solid var(--border-color)', 
      borderRadius: '24px', 
      padding: '30px', 
      zIndex: 2000, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
    }}>
      {/* SECTION 1: TIME SETTINGS */}
      <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>Set Timer (mins)</span>
      <input 
        type="text" 
        value={minutesInput} 
        onChange={changeTime} 
        style={{ 
          textAlign: 'center', 
          background: 'var(--input-bg)', 
          color: 'var(--text-main)', 
          //border: '2px dashed #6c8ef2', 
          borderRadius: '12px', 
          padding: '3px', 
          width: '120px',
          fontSize: '28px',
          fontWeight: 700,
          outline: 'none'
        }} 
      />
      
      <button 
        onClick={applyTimeChange}
        style={{ 
          background: '#2d4ef5', 
          color: '#fff', 
          border: 'none', 
          borderRadius: '12px', 
          padding: '8px 0px', 
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '18px',
          width: '40%' 
        }}
      >
        Set Time
      </button>

      {/* DIVIDER LINE */}
      <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '10px 0' }} />

      {/* SECTION 2: ALARM SETTINGS */}
      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>Alarm Settings</span>
      
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)', fontSize: '14px' }}>
          <span>Volume</span>
          <span>{Math.round(volume * 100)}%</span>
        </div>
        
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer', accentColor: '#2d4ef5' }}
        />
        
        <button 
          onClick={() => {
              // If a test sound is already playing, stop it first
              if (testAudioRef.current) {
                testAudioRef.current.pause();
                testAudioRef.current.currentTime = 0;
              }

              // Create new audio instance and store it in the ref
              const audio = new Audio(alarmSound);
              audio.volume = volume;
              testAudioRef.current = audio;
              
              audio.play();

              // Clean up the ref when the sound finishes naturally
              audio.onended = () => { testAudioRef.current = null; };
            }}
          style={{
            background: 'none',
            border: `1px solid var(--border-color)`,
            color: 'var(--text-main)',
            borderRadius: '8px',
            padding: '8px',
            fontSize: '13px',
            cursor: 'pointer',
            marginTop: '5px'
          }}
        >
          🔊 Test Alarm Sound
        </button>
      </div>
    </div>
  </>
)}

  {/* Main Content Area */}
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '60px', minHeight: '100vh' }}>
    
    {/* NEW: Timer Hint Indicator */}
    {showIndicator && !timeSettingOpen && (
      <div style={{
        marginBottom: '-15px',
        padding: '6px 12px',
        background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(45, 78, 245, 0.1)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <span style={{ fontSize: '13px', color: 'var(--text-sub)', fontWeight: 500 }}>
          Click here to change timer settings
        </span>
        <button 
          onClick={() => setShowIndicator(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-sub)',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          ✕
        </button>
      </div>
    )}

    <button onClick={() => {
      // Sync the input box with the current timer before opening
      setMinutesInput(String(Math.floor(secondsRef.current / 60)));
      setTimeSettingOpen(true);
      setShowIndicator(false); // Hide the indicator permanently once they've opened settings
    }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
      <div style={{ fontSize: '72px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace' }}>{time}</div>
    </button>

    {/* Reverted Start/Stop Button */}
    <div style={{ display: 'flex', gap: '12px', marginTop: '0px', marginBottom: '40px' }}>
      <button
        onClick={startStopTimer}
        className="btn"
        style={{
          fontSize: '32px', 
          fontWeight: 700, 
          color: '#dce8f7', 
          letterSpacing: '2px', 
          lineHeight: 1, 
          fontFamily: 'monospace',
          zIndex: 101,
          background: 'linear-gradient(to bottom, rgba(76, 0, 255, 0.84) 0%, rgba(76, 0, 255, 0.84) 90%, rgba(30, 0, 110) 100%)',
          width: '160px',
          height: '50px',
          cursor: 'pointer',
          border: 'none',
          boxShadow: 'none',
        }}
      >
        {start ? 'Pause' : 'Start'}
      </button>

      <button
        onClick={() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          setStart(false);
          secondsRef.current = initialSecondsRef.current;
          const mins = Math.floor(secondsRef.current / 60).toString().padStart(2, '0');
          const secs = (secondsRef.current % 60).toString().padStart(2, '0');
          setTime(`${mins}:${secs}`);
        }}
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#dce8f7',
          letterSpacing: '2px',
          lineHeight: 1,
          fontFamily: 'monospace',
          zIndex: 101,
          background: 'linear-gradient(to bottom, rgba(80, 80, 80, 0.9) 0%, rgba(40, 40, 40) 100%)',
          width: '160px',
          height: '50px',
          cursor: 'pointer',
          border: 'none',
          boxShadow: 'none',
          borderRadius: '8px',
        }}
      >
        Reset
      </button>
    </div>

  {/* 3. CHANGE: Increased height of the Note Textarea */}
  <textarea 
    placeholder="Write a quick note" 
    value={noteText} 
    onChange={(e) => setNoteText(e.target.value)} 
    style={{ 
      width: '90%', 
      maxWidth: '700px', 
      height: '350px', // Set to 350px or 400px for a much larger box
      padding: '20px', 
      border: isDarkMode ? '2px dashed var(--border-color)' : '2px dashed #6c8ef2', 
      borderRadius: '12px', 
      background: isDarkMode ? 'var(--note-bg)' : '#eef4ff', 
      color: 'var(--text-main)', 
      resize: 'none', 
      outline: 'none',
      fontSize: '18px',
      lineHeight: '1.5',
      transition: 'all 0.2s ease'
    }} 
  />

        <button 
          onClick={createNote} 
          style={{ marginTop: '24px', background: '#2d4ef5', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px 32px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
        >
          Create Note
        </button>
      </div>
    </div>
  );
}

export default NoteCard;