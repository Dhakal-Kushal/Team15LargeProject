import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path.ts';
import { storeToken } from '../tokenStorage';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import { useTheme } from '../ThemeContext';

interface MyJwtPayload extends JwtPayload {
  firstName: string;
  lastName: string;
  userId: number;
}

function Login() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [error, setError] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');
  const navigate = useNavigate();

  async function doLogin(event: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    event.preventDefault();

    try {
      const response = await fetch(buildPath('api/login'), {
        method: 'POST',
        body: JSON.stringify({ login: loginName, password: loginPassword }),
        headers: { 'Content-Type': 'application/json' }
      });
      const res = await response.json();
      if (res.error) { setError(res.error); return; }
      storeToken(res);
      const decoded = jwtDecode<MyJwtPayload>(res.accessToken);
      if ((decoded.userId ?? -1) <= 0) { setError('User/Password combination incorrect'); } 
      else {
        localStorage.setItem('user_data', JSON.stringify({ firstName: decoded.firstName, lastName: decoded.lastName, id: decoded.userId }));
        navigate('/NoteCards');
      }
    } catch { setError('Server error, please try again'); }
  }

  // UPDATED: Input style now matches your NoteCard blue-dash logic for light mode
  const inputStyle: React.CSSProperties = { 
    width: '100%', 
    padding: '12px', 
    border: isDarkMode ? '2px dashed var(--border-color)' : '2px dashed #6c8ef2', 
    borderRadius: '10px', 
    background: 'var(--input-bg)', 
    color: 'var(--text-main)', 
    outline: 'none', 
    marginBottom: '10px',
    transition: 'all 0.2s ease'
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      background: 'var(--bg-color)', // Uses the variable
      gap: '16px',
      transition: 'background 0.25s ease' // Smooth transition
    }}>
      {/* Theme Toggle Button */}
      <button aria-label="Toggle light and dark mode" onClick={toggleDarkMode} style={{ position: 'fixed', top: '16px', right: '16px', background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '42px', height: '42px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {isDarkMode ? '🌙' : '☀️'}
      </button>

      {/* Login Card */}
      <div style={{ 
        background: 'var(--card-bg)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '16px', 
        padding: '40px', 
        width: '350px', 
        boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)',
        transition: 'all 0.25s ease'
      }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-main)', marginBottom: '20px', fontFamily: 'monospace', fontSize: '28px', fontWeight: 700 }}>Login</h2>
        
        {error && <p style={{ color: '#e53e3e', fontSize: '13px', textAlign: 'center', marginBottom: '10px' }}>{error}</p>}
        
        <label style={{ color: 'var(--text-main)', fontSize: '13px', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Username</label>
        <input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} style={inputStyle} />
        
        <label style={{ color: 'var(--text-main)', fontSize: '13px', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Password</label>
        <input type="password" value={loginPassword} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        
        <button onClick={doLogin} style={{ width: '100%', padding: '12px', background: '#2d4ef5', color: '#fff', border: 'none', borderRadius: '24px', cursor: 'pointer', fontWeight: 700, marginTop: '10px', fontSize: '16px' }}>
          Login
        </button>
        
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-sub)', fontSize: '13px' }}>
          Don't have an account? <span onClick={() => navigate('/register')} style={{ color: '#2d4ef5', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>Sign up</span>
        </p>
      </div>
    </div>
  );
}

export default Login;