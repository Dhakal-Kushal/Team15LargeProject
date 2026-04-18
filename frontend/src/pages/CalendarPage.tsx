import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from '../components/Path';
import { retrieveToken, storeToken } from '../tokenStorage';

interface Note {
  id: string;
  text: string;
  createdAt: Date;
}

function CalendarPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

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

      if (data.jwtToken) {
        storeToken(data.jwtToken);
      }

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

  function getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getPreview(text: string): string {
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.length <= 50) return firstLine;
    return firstLine.slice(0, 50) + '...';
  }

  const notesByDate = useMemo(() => {
    const grouped: Record<string, Note[]> = {};

    for (const note of notes) {
      const key = getDateKey(new Date(note.createdAt));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(note);
    }

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return grouped;
  }, [notes]);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: (Date | null)[] = [];

  for (let i = 0; i < startDay; i++) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(new Date(year, month, day));
  }

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const selectedNotes = selectedDateKey ? notesByDate[selectedDateKey] || [] : [];

  const monthLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#dce8f7',
        padding: '30px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          background: '#f6f8fc',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <button
            onClick={() => navigate('/NoteCards')}
            style={{
              background: '#2d4ef5',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Back to Notes
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={prevMonth}
              style={{
                border: 'none',
                background: '#fff',
                borderRadius: '10px',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ‹
            </button>

            <h1 style={{ margin: 0, fontSize: '28px', color: '#1a1a2e' }}>{monthLabel}</h1>

            <button
              onClick={nextMonth}
              style={{
                border: 'none',
                background: '#fff',
                borderRadius: '10px',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ›
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '10px',
            marginBottom: '10px',
          }}
        >
          {dayNames.map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontWeight: 700,
                color: '#6b7280',
                padding: '8px 0',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '10px',
          }}
        >
          {calendarCells.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={index}
                  style={{
                    minHeight: '120px',
                    background: 'transparent',
                  }}
                />
              );
            }

            const dateKey = getDateKey(date);
            const dayNotes = notesByDate[dateKey] || [];
            const previews = dayNotes.slice(0, 3);

            return (
              <div
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                style={{
                  minHeight: '120px',
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '10px',
                  cursor: 'pointer',
                  border: '1px solid #e4eaf5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>
                  {date.getDate()}
                </div>

                {previews.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      background: '#eaf1fb',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      fontSize: '12px',
                      color: '#334155',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {getPreview(note.text)}
                  </div>
                ))}

                {dayNotes.length > 3 && (
                  <div style={{ fontSize: '12px', color: '#5577bb', fontWeight: 600 }}>
                    +{dayNotes.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDateKey && (
        <>
          <div
            onClick={() => setSelectedDateKey(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.25)',
              zIndex: 99,
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(700px, 90vw)',
              maxHeight: '80vh',
              background: '#ffffff',
              borderRadius: '18px',
              padding: '20px',
              zIndex: 100,
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ margin: 0, color: '#1a1a2e' }}>
                Notes for {selectedDateKey}
              </h2>

              <button
                onClick={() => setSelectedDateKey(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ×
              </button>
            </div>

            {selectedNotes.length === 0 ? (
              <p style={{ color: '#777' }}>No notes for this day.</p>
            ) : (
              selectedNotes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    background: '#f4f7fc',
                    borderRadius: '12px',
                    padding: '14px',
                    marginBottom: '12px',
                    border: '1px solid #e4eaf5',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#5577bb',
                      fontWeight: 600,
                      marginBottom: '8px',
                    }}
                  >
                    {new Date(note.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: '#1f2937',
                      lineHeight: 1.5,
                    }}
                  >
                    {note.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CalendarPage;