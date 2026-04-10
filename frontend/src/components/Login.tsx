import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

async function handleSubmit(e: React.MouseEvent<HTMLButtonElement>): Promise<void> {
  e.preventDefault();
  try {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: user, password }),
    });
    const data = await response.json();
    if (data.id === -1) {
      setError('Invalid username or password');
    } else {
      localStorage.setItem('userId', String(data.id));
      localStorage.setItem('firstName', data.firstName);
      localStorage.setItem('lastName', data.lastName);
      navigate('/');
    }
  } catch (err) {
    setError('Server error, please try again');
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

      {/* Card */}
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

        {/* Title */}
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center' }}>
          {isRegistering ? 'Register' : 'Login'}
        </div>

        {error && (
          <div style={{ color: '#e53e3e', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* User */}
        <div>
          <label style={labelStyle}>Username</label>
          <input
            type="email"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="john123"
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        {/* Confirm Password — only shown when registering */}
        {isRegistering && (
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
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
          {isRegistering ? 'Create Account' : 'Login'}
        </button>

        {/* Toggle between login and register */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#5577bb' }}>
          {isRegistering ? (
            <>
              Already have an account?{' '}
              <span
                onClick={() => setIsRegistering(false)}
                style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', color: '#2d4ef5' }}
              >
                Log in here
              </span>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <span
                onClick={() => navigate('/register')}
                style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', color: '#2d4ef5' }}
              >
                Sign up here
              </span>
            </>
          )}
        </div>
      </div>

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/')}
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
        ← Back
      </button>

    </div>
  );
}

export default Login;