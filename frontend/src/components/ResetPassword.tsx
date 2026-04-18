import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildPath } from './Path.ts';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(buildPath('api/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Password updated. You can now log in with the new password.');
      } else {
        setError(data.error || 'Reset failed. The link may be expired or already used.');
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
          Reset Password
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
              <label style={labelStyle}>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
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
              {submitting ? 'Updating...' : 'Update Password'}
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

export default ResetPassword;
