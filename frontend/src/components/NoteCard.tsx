import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path.ts';
import { retrieveToken, storeToken } from '../tokenStorage';

interface Note {
  id: string;  // UUID string from server
  text: string;
  createdAt: Date;
}

function NoteCard() {
  const navigate = useNavigate();
  const [noteText, setNoteText] = useState('');
  const [time, setTime] = useState('30:00');
  const [start, setStart] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [timeSettingOpen, setTimeSettingOpen] = useState(false);
  const [minutesInput, setMinutesInput] = useState('30');
  const [hideNotesButton, setHideNotes] = useState(false);
  const secondsRef = useRef(30 * 60);

  const userDataString = localStorage.getItem('user_data');
  const userData = userDataString ? JSON.parse(userDataString) : {};
  const userId = userData.id || -1;

  useEffect(() => {
    if (userId === -1) {
      navigate('/login');
    }
  }, [userId, navigate]);

  async function loadNotes(): Promise<void> {
    try {
      const response = await fetch(buildPath('api/searchcards'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          search: '',
          jwtToken: retrieveToken()
        }),
      });
      const data = await response.json();

      if (data.jwtToken) {
        storeToken(data.jwtToken);
      }

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

  // Timer
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

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setNoteText(e.target.value);
  }

  function startStopTimer(event: React.MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setStart((prev) => !prev);
  }

  function changeTime(e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    if (value === '') {
      setMinutesInput('');
      secondsRef.current = 0;
      setTime('00:00');
      return;
    }
    const mins = parseInt(value, 10);
    if (isNaN(mins)) return;
    if (mins > 999) {
      e.target.value = '999';
      setMinutesInput('999');
      secondsRef.current = 999 * 60;
      setTime('999:00');
      return;
    }
    setMinutesInput(String(mins));
    secondsRef.current = mins * 60;
    setTime(`${String(mins).padStart(2, '0')}:00`);
  }

  async function createNote(event: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    event.preventDefault();
    if (!noteText.trim()) return;

    // crypto.randomUUID only works in secure contexts (HTTPS/localhost). This string form works over plain HTTP too.
    const tempId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const optimisticNote: Note = {
      id: tempId,
      text: noteText.trim(),
      createdAt: new Date(),
    };
    setNotes((prev) => [optimisticNote, ...prev]);
    setNoteText('');

    try {
      const response = await fetch(buildPath('api/addcard'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          text: optimisticNote.text,
          jwtToken: retrieveToken()
        }),
      });
      const data = await response.json();

      if (data.jwtToken) {
        storeToken(data.jwtToken);
      }

      if (data.error && data.error.length > 0) {
        console.error('Failed to save note:', data.error);
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
      } else {
        if (data.id) {
          setNotes((prev) =>
            prev.map((n) => n.id === tempId ? { ...n, id: data.id } : n)
          );
        }
      }
    } catch (err) {
      console.error('Network error saving note:', err);
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
    }
  }

  async function deleteNote(id: string): Promise<void> {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      const response = await fetch(buildPath('api/deletecard'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          jwtToken: retrieveToken()
        }),
      });
      const data = await response.json();

      if (data.jwtToken) {
        storeToken(data.jwtToken);
      }

      if (data.error && data.error.length > 0) {
        console.error('Failed to delete note:', data.error);
        loadNotes();
      }
    } catch (err) {
      console.error('Network error deleting note:', err);
      loadNotes();
    }
  }

  function handleLogout(): void {
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_data');
    navigate('/login');
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const timeSettingStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    height: '300px',
    width: '300px',
    background: '#ffffff',
    border: '1px solid #d0ddf5',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'left',
    gap: '12px',
    padding: '20px',
  };

  const timeSettingOverlayStyle: React.CSSProperties = {
    display: timeSettingOpen ? 'block' : 'none',
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.25)',
    zIndex: 199,
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: '300px',
    background: '#ffffff',
    borderRight: '1px solid #d0ddf5',
    transform: panelOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.25s ease',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
  };

  const overlayStyle: React.CSSProperties = {
    display: panelOpen ? 'block' : 'none',
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.15)',
    zIndex: 99,
  };

  const toggleBtnStyle: React.CSSProperties = {
    display: hideNotesButton ? 'none' : 'flex',
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 101,
    background: '#2d4ef5',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    width: '42px',
    height: '42px',
    fontSize: '18px',
    cursor: 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  };

  const calendarBtnStyle: React.CSSProperties = {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 101,
    background: '#2d4ef5',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '0 14px',
    height: '42px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    background: '#e53e3e',
    color: '#fff',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  };

  return (
    <div>
      <button style={{ ...toggleBtnStyle, position: 'fixed' }} onClick={() => { setPanelOpen(true); setHideNotes(true); }}>
        <span>&#9776;</span>
        {notes.length > 0 && <span style={badgeStyle}>{notes.length}</span>}
      </button>

      <button style={calendarBtnStyle} onClick={() => navigate('/calendar')}>
        Calendar
      </button>

      <div style={overlayStyle} onClick={() => { setPanelOpen(false); setHideNotes(false); }} />

      <div style={panelStyle}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #e8eef7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#1a1a2e' }}>
            My Notes ({notes.length})
          </span>
          <button
            onClick={() => { setPanelOpen(false); setHideNotes(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#888', lineHeight: 1 }}
          >
            &#x2715;
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
          {notes.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>
              No notes yet. Write one!
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: '#eaf1fb',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '10px',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '11px', color: '#5577bb', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.3px' }}>
                  {formatDate(note.createdAt)} &middot; {formatTime(note.createdAt)}
                </div>
                <p style={{ fontSize: '14px', color: '#1a1a2e', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {note.text}
                </p>
                <button
                  onClick={() => deleteNote(note.id)}
                  title="Delete"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#aaa',
                    lineHeight: 1,
                  }}
                >
                  &#x2715;
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '12px', borderTop: '1px solid #e8eef7' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              background: '#e53e3e',
              color: '#fff',
              border: 'none',
              borderRadius: '24px',
              padding: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={timeSettingOverlayStyle} onClick={() => setTimeSettingOpen(false)} />

      {timeSettingOpen && (
        <div style={timeSettingStyle}>
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '16px', color: '#1a1a2e' }}>Time (minutes)</span>
            <button
              onClick={() => setTimeSettingOpen(false)}
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#888',
              }}
            >
              &#x2715;
            </button>
          </div>
          <div>
            <input
              type="text"
              value={minutesInput}
              onChange={(e) => changeTime(e as any)}
              style={{
                textAlign: 'center',
                backgroundColor: 'lightgrey',
                fontSize: '14px',
                border: '1px solid #aac0e8',
                borderRadius: '8px',
                padding: '8px',
                fontFamily: 'monospace',
                width: '100px',
                height: '33px',
              }}
            />
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#dce8f7',
        gap: '16px',
      }}>
        <button
          onClick={() => setTimeSettingOpen((t) => !t)}
          style={{ background: 'none', border: 'none' }}
        >
          <div style={{ fontSize: '72px', fontWeight: 700, color: '#1a1a2e', letterSpacing: '2px', lineHeight: 1, fontFamily: 'monospace' }}>
            {time}
          </div>
        </button>

        <button
          onClick={startStopTimer}
          className="btn"
          style={{
            fontSize: '32px', fontWeight: 700, color: '#dce8f7', letterSpacing: '2px', lineHeight: 1, fontFamily: 'monospace',
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

        <textarea
          placeholder="Write a quick note"
          value={noteText}
          onChange={handleNoteChange}
          style={{
            width: '600px',
            height: '300px',
            padding: '14px 16px',
            border: '2px dashed #aac0e8',
            borderRadius: '10px',
            background: '#eaf1fb',
            fontSize: '14px',
            color: '#333',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        <button
          type="button"
          onClick={createNote}
          style={{
            background: '#2d4ef5',
            color: '#fff',
            border: 'none',
            borderRadius: '24px',
            padding: '10px 28px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Create Note
        </button>
      </div>
    </div>
  );
}

export default NoteCard;