import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildPath } from './Path.ts';

type Status = 'verifying' | 'success' | 'error';

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    (async () => {
      try {
        const response = await fetch(buildPath(`api/verify?token=${encodeURIComponent(token)}`), {
          method: 'GET',
        });
        const data = await response.json();
        if (data.verified) {
          setStatus('success');
          setMessage('Email verified. You can now log in.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      } catch {
        setStatus('error');
        setMessage('Server error, please try again.');
      }
    })();
  }, [searchParams]);

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #d0ddf5',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    padding: '36px 40px',
    width: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    textAlign: 'center',
  };

  const statusColor = status === 'success' ? '#2f855a' : status === 'error' ? '#e53e3e' : '#1a1a2e';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#dce8f7',
      gap: '16px',
    }}>
      <div style={cardStyle}>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', fontFamily: 'monospace', letterSpacing: '1px' }}>
          Email Verification
        </div>

        <div style={{ color: statusColor, fontSize: '14px', fontWeight: 600, lineHeight: 1.5 }}>
          {message}
        </div>

        {status !== 'verifying' && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'linear-gradient(to bottom, rgba(76, 0, 255, 0.84) 0%, rgba(76, 0, 255, 0.84) 90%, rgba(30, 0, 110) 100%)',
              color: '#dce8f7',
              border: 'none',
              borderRadius: '24px',
              padding: '12px 28px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'monospace',
              letterSpacing: '1px',
              width: '100%',
            }}
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
