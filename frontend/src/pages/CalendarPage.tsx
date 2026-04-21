import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from '../components/Path';
import { retrieveToken, storeToken } from '../tokenStorage';
import { useTheme } from '../ThemeContext';

interface Note {
  id: string;
  text: string;
  createdAt: Date;
}

function CalendarPage() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteTime, setNewNoteTime] = useState('12:00');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const userDataString = localStorage.getItem('user_data');
  const userData = userDataString ? JSON.parse(userDataString) : {};
  const userId = userData.id || -1;

  useEffect(() => {
    if (userId === -1) {
      navigate('/');
      return;
    }
    loadNotes();
  }, [userId]);

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
      if (data.jwtToken) storeToken(data.jwtToken);

      if (!data.error && data.results) {
        const mapped: Note[] = data.results.map((n: any) => ({
          id: n.id,
          text: n.text,
          createdAt: new Date(n.createdAt || Date.now()),
        }));
        setNotes(mapped);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }

  async function handleAddNote(): Promise<void> {
    if (!newNoteText.trim() || !selectedDateKey) return;

    setIsSaving(true);
    setSaveError('');

    try {
      const [year, month, day] = selectedDateKey.split('-').map(Number);
      const [hours, minutes] = newNoteTime.split(':').map(Number);
      const noteDate = new Date(year, month - 1, day, hours, minutes, 0);

      const response = await fetch(buildPath('api/addcard'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newNoteText.trim(),
          jwtToken: retrieveToken(),
          date: noteDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setSaveError(data.error);
      } else {
        if (data.jwtToken) storeToken(data.jwtToken);
        const newNote: Note = {
          id: data.id,
          text: newNoteText.trim(),
          createdAt: noteDate,
        };
        setNotes((prev) => [...prev, newNote]);
        setNewNoteText('');
        setNewNoteTime('12:00');
        setIsAddingNote(false);
      }
    } catch (err) {
      setSaveError('Failed to save note. Please try again.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCloseModal(): void {
    setSelectedDateKey(null);
    setIsAddingNote(false);
    setNewNoteText('');
    setNewNoteTime('12:00');
    setSaveError('');
  }

  function getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getPreview(text: string): string {
    const firstLine = text.split('\n')[0].trim();
    return firstLine.length <= 40 ? firstLine : firstLine.slice(0, 40) + '...';
  }

  const notesByDate = useMemo(() => {
    const grouped: Record<string, Note[]> = {};
    for (const note of notes) {
      const key = getDateKey(new Date(note.createdAt));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(note);
    }
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    return grouped;
  }, [notes]);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarCells.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarCells.push(new Date(year, month, day));
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedNotes = selectedDateKey ? notesByDate[selectedDateKey] || [] : [];
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{
      minHeight: '100vh',
      background: isDarkMode ? 'var(--bg-color)' : '#dce8f7',
      padding: '30px',
      boxSizing: 'border-box',
      transition: 'background 0.25s ease'
    }}>

      {/* Theme Toggle Button */}
      <button onClick={toggleDarkMode} style={{
        position: 'fixed', top: '16px', right: '16px', zIndex: 1001,
        background: 'var(--card-bg)', color: 'var(--text-main)',
        border: '1px solid var(--border-color)', borderRadius: '50%',
        width: '42px', height: '42px', cursor: 'pointer', fontSize: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {isDarkMode ? '🌙' : '☀️'}
      </button>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: isDarkMode ? 'var(--card-bg)' : '#f6f8fc',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: isDarkMode ? '0 6px 30px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.08)',
        border: isDarkMode ? '1px solid var(--border-color)' : 'none',
        transition: '0.25s'
      }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => navigate('/NoteCards')} style={{
            background: '#2d4ef5', color: '#fff', border: 'none',
            borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600,
          }}>
            Back to Notes
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={prevMonth} style={{
              border: isDarkMode ? '1px solid var(--border-color)' : 'none',
              background: isDarkMode ? '#2d2d2d' : '#fff',
              color: 'var(--text-main)', borderRadius: '10px',
              width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px',
            }}>‹</button>

            <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--text-main)' }}>{monthLabel}</h1>

            <button onClick={nextMonth} style={{
              border: isDarkMode ? '1px solid var(--border-color)' : 'none',
              background: isDarkMode ? '#2d2d2d' : '#fff',
              color: 'var(--text-main)', borderRadius: '10px',
              width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px',
            }}>›</button>
          </div>
          <div style={{ width: '100px' }}></div>
        </div>

        {/* Day Name Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '10px' }}>
          {dayNames.map((day) => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 700, color: isDarkMode ? '#9ca3af' : '#6b7280', padding: '8px 0' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
          {calendarCells.map((date, index) => {
            if (!date) return <div key={index} style={{ minHeight: '120px' }} />;

            const dateKey = getDateKey(date);
            const dayNotes = notesByDate[dateKey] || [];
            const previews = dayNotes.slice(0, 3);

            return (
              <div key={dateKey} onClick={() => setSelectedDateKey(dateKey)}
                style={{
                  minHeight: '120px',
                  background: isDarkMode ? '#2d2d2d' : '#ffffff',
                  borderRadius: '14px',
                  padding: '10px',
                  cursor: 'pointer',
                  border: isDarkMode ? '1px solid #444' : '1px solid #e4eaf5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {date.getDate()}
                </div>

                {previews.map((note) => (
                  <div key={note.id} style={{
                    background: isDarkMode ? '#3d3d5c' : '#eaf1fb',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    color: isDarkMode ? '#e2e8f0' : '#334155',
                    lineHeight: 1.3,
                    maxHeight: '3.2em',
                    overflow: 'hidden'
                  }}>
                    {getPreview(note.text)}
                  </div>
                ))}

                {dayNotes.length > 3 && (
                  <div style={{ fontSize: '11px', color: '#5577bb', fontWeight: 700 }}>
                    +{dayNotes.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {selectedDateKey && (
        <>
          <div onClick={handleCloseModal}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />

          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(700px, 90vw)', maxHeight: '80vh',
            background: isDarkMode ? '#1e1e1e' : '#ffffff',
            borderRadius: '18px', padding: '24px', zIndex: 1000,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            overflowY: 'auto', border: isDarkMode ? '1px solid var(--border-color)' : 'none',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Notes for {selectedDateKey}</h2>
              <button onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-main)' }}>
                ×
              </button>
            </div>

            {/* Existing Notes */}
            {selectedNotes.length === 0 && !isAddingNote ? (
              <p style={{ color: 'var(--text-sub)', margin: 0 }}>No notes for this day.</p>
            ) : (
              selectedNotes.map((note) => (
                <div key={note.id} style={{
                  background: isDarkMode ? '#2d2d2d' : '#f4f7fc',
                  borderRadius: '12px', padding: '16px',
                  border: isDarkMode ? '1px solid #444' : '1px solid #e4eaf5'
                }}>
                  <div style={{ fontSize: '12px', color: '#5577bb', fontWeight: 700, marginBottom: '8px' }}>
                    {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    {note.text}
                  </div>
                </div>
              ))
            )}

            {/* Add Note Form */}
            {isAddingNote && (
              <div style={{
                background: isDarkMode ? '#2d2d2d' : '#f4f7fc',
                borderRadius: '12px', padding: '16px',
                border: isDarkMode ? '1px solid #5577bb' : '1px solid #b3c6ef',
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>

                {/* Time Picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 600 }}>
                    Time:
                  </label>
                  <input
                    type="time"
                    value={newNoteTime}
                    onChange={(e) => setNewNoteTime(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: isDarkMode ? '1px solid #444' : '1px solid #d1dff5',
                      background: isDarkMode ? '#1e1e1e' : '#ffffff',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <textarea
                  autoFocus
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Type your note here..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: isDarkMode ? '1px solid #444' : '1px solid #d1dff5',
                    background: isDarkMode ? '#1e1e1e' : '#ffffff',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                {saveError && (
                  <p style={{ margin: 0, color: '#e05c5c', fontSize: '13px' }}>{saveError}</p>
                )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setIsAddingNote(false); setNewNoteText(''); setNewNoteTime('12:00'); setSaveError(''); }}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                      border: isDarkMode ? '1px solid #555' : '1px solid #ccc',
                      background: 'transparent', color: 'var(--text-main)',
                    }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNote}
                    disabled={isSaving || !newNoteText.trim()}
                    style={{
                      padding: '8px 20px', borderRadius: '8px', cursor: isSaving || !newNoteText.trim() ? 'not-allowed' : 'pointer',
                      fontWeight: 600, border: 'none',
                      background: isSaving || !newNoteText.trim() ? '#7a8fc7' : '#2d4ef5',
                      color: '#fff',
                    }}>
                    {isSaving ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            )}

            {/* Add Note Button */}
            {!isAddingNote && (
              <button
                onClick={() => setIsAddingNote(true)}
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 18px', borderRadius: '10px',
                  background: '#2d4ef5', color: '#fff',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                }}>
                + Add Note
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CalendarPage;
