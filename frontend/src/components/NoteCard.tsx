import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path.ts';
import { retrieveToken, storeToken } from '../tokenStorage';
import { useTheme } from '../ThemeContext';

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
  
  const secondsRef = useRef(30 * 60);

  const userDataString = localStorage.getItem('user_data');
  const userData = userDataString ? JSON.parse(userDataString) : {};
  const userId = userData.id || -1;

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
    if (userId !== -1) loadNotes(); 
  }, [userId]);

  // --- Timer Logic ---
  useEffect(() => {
    if (!start) return;
    const interval = setInterval(() => {
      if (secondsRef.current <= 0) { 
        setStart(false); 
        clearInterval(interval); 
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
    setStart((prev) => !prev); 
  };

  const changeTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') { 
      setMinutesInput(''); 
      secondsRef.current = 0; 
      setTime('00:00'); 
      return; 
    }
    const mins = parseInt(value, 10);
    if (isNaN(mins)) return;
    const finalMins = mins > 999 ? 999 : mins;
    setMinutesInput(String(finalMins));
    secondsRef.current = finalMins * 60;
    setTime(`${String(finalMins).padStart(2, '0')}:00`);
  };

  // --- Note Actions ---
  async function createNote(e: React.MouseEvent) {
    e.preventDefault();
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
    navigate('/login');
  };

  // --- Styles ---
  const themeBtnStyle: React.CSSProperties = {
    position: 'fixed', top: '16px', right: '120px', zIndex: 1001,
    background: 'var(--card-bg)', color: 'var(--text-main)',
    border: '1px solid var(--border-color)', borderRadius: '50%',
    width: '42px', height: '42px', cursor: 'pointer', fontSize: '20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  };

  const calendarBtnStyle: React.CSSProperties = {
    position: 'fixed', top: '16px', right: '16px', zIndex: 101,
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

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', transition: '0.25s' }}>
      
      {/* UI Controls */}
      <button style={themeBtnStyle} onClick={toggleDarkMode}>
        {isDarkMode ? '🌙' : '☀️'}
      </button>

      <button style={calendarBtnStyle} onClick={() => navigate('/calendar')}>
        Calendar
      </button>

      <button style={toggleBtnStyle} onClick={() => setPanelOpen(true)}>
        <span>&#9776;</span>
        {notes.length > 0 && <span style={badgeStyle}>{notes.length}</span>}
      </button>

      <div style={overlayStyle} onClick={() => setPanelOpen(false)} />

      {/* Side Panel */}
      <div style={panelStyle}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>My Notes ({notes.length})</span>
          <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}>&#x2715;</button>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
          {notes.map((note) => (
            <div key={note.id} style={{ background: 'var(--note-bg)', borderRadius: '10px', padding: '12px', marginBottom: '10px', position: 'relative', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginBottom: '4px' }}>{note.createdAt.toLocaleDateString()}</div>
              <p style={{ fontSize: '14px', color: 'var(--text-main)', margin: 0 }}>{note.text}</p>
              <button onClick={() => deleteNote(note.id)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>&#x2715;</button>
            </div>
          ))}
        </div>
        
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={handleLogout} style={{ width: '100%', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '24px', padding: '10px', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      {/* Timer Settings Modal */}
      {timeSettingOpen && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Time (minutes)</span>
          <input type="text" value={minutesInput} onChange={changeTime} style={{ textAlign: 'center', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', width: '100px' }} />
          <button onClick={() => setTimeSettingOpen(false)} style={{ background: '#2d4ef5', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>Set</button>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <button onClick={() => setTimeSettingOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ fontSize: '72px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace' }}>{time}</div>
        </button>

        <button
          onClick={startStopTimer}
          style={{
            fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '2px',
            background: 'linear-gradient(to bottom, #4c00ff 0%, #1e006e 100%)',
            width: '160px', height: '50px', cursor: 'pointer', border: 'none', borderRadius: '12px'
          }}
        >
          {start ? 'Pause' : 'Start'}
        </button>

        <textarea 
          placeholder="Write a quick note" 
          value={noteText} 
          onChange={(e) => setNoteText(e.target.value)} 
          style={{ 
            width: '90%', maxWidth: '600px', height: '150px', padding: '16px', 
            border: '2px dashed var(--border-color)', borderRadius: '10px', 
            background: 'var(--note-bg)', color: 'var(--text-main)', resize: 'none', outline: 'none' 
          }} 
        />

        <button 
          onClick={createNote} 
          style={{ background: '#2d4ef5', color: '#fff', border: 'none', borderRadius: '24px', padding: '12px 32px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
        >
          Create Note
        </button>
      </div>
    </div>
  );
}

export default NoteCard;