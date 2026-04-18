import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path.ts';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(buildPath('api/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.sent) {
        setSuccess('If an account exists for that email, a reset link has been sent. Check your inbox.');
      } else {
        setError(data.error || 'Something went wrong, please try again.');
      }
    } catch {
      setError('Server error, please try again');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '2px dashed #aac0e8',
    borderRadius: '10px',
    background: '#eaf1fb',
    fontSize: '14px',
    color: '#333',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: '6px',
    display: 'block',
  };

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
      <div style={{
        background: '#ffffff',
        border: '1px solid #d0ddf5',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '36px 40px',
        width: '400px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center' }}>
          Forgot Password
        </div>

        {error && (
          <div style={{ color: '#e53e3e', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ color: '#2f855a', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
            {success}
          </div>
        )}

        {!success && (
          <>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                background: 'linear-gradient(to bottom, rgba(76, 0, 255, 0.84) 0%, rgba(76, 0, 255, 0.84) 90%, rgba(30, 0, 110) 100%)',
                color: '#dce8f7',
                border: 'none',
                borderRadius: '24px',
                padding: '12px 28px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
                letterSpacing: '1px',
                width: '100%',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#5577bb' }}>
          <span
            onClick={() => navigate('/login')}
            style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', color: '#2d4ef5' }}
          >
            Back to login
          </span>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
