import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path.ts';
import { storeToken } from '../tokenStorage';
import { jwtDecode, type JwtPayload } from 'jwt-decode';

// Your custom TypeScript interface
interface MyJwtPayload extends JwtPayload {
  firstName: string;
  lastName: string;
  userId: number;
}

function Login() {
  const [error, setError] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');
  const navigate = useNavigate();

  // Your robust login logic, updated with useNavigate and UI error handling
  async function doLogin(event: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    event.preventDefault();

    var obj = { login: loginName, password: loginPassword };
    var js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath('api/login'), {
        method: 'POST',
        body: js,
        headers: { 'Content-Type': 'application/json' }
      });

      var res = JSON.parse(await response.text());

      // If the API returns a standard error
      if (res.error) {
        setError(res.error);
        return;
      }

      const { accessToken } = res;
      storeToken(res);

      const decoded = jwtDecode<MyJwtPayload>(accessToken);

      var ud = decoded;
      var userId = ud.userId ?? -1; 
      var firstName = ud.firstName;
      var lastName = ud.lastName;

      if (userId <= 0) {
        setError('User/Password combination incorrect');
      } else {
        var user = { firstName: firstName, lastName: lastName, id: userId };
        localStorage.setItem('user_data', JSON.stringify(user));

        setError('');
        // Modern navigation
        navigate('/NoteCards');
      }
    } catch (e: any) {
      // Replaced alert() with clean UI error
      setError('Server error, please try again');
      console.log(e);
    }
  }

  // Friend's styling
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

      {/* Card UI */}
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
          Login
        </div>

        {/* Displays the error state if there is one */}
        {error && (
          <div style={{ color: '#e53e3e', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div>
          <label style={labelStyle}>Username</label>
          <input
            type="text"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="Username"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        <div style={{ textAlign: 'right', fontSize: '12px', marginTop: '-8px' }}>
          <span
            onClick={() => navigate('/forgot-password')}
            style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', color: '#2d4ef5' }}
          >
            Forgot password?
          </span>
        </div>

        <button
          type="button"
          onClick={doLogin}
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
          Login
        </button>

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#5577bb' }}>
          Don't have an account?{' '}
          <span
            onClick={() => navigate('/register')}
            style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', color: '#2d4ef5' }}
          >
            Sign up here
          </span>
        </div>

      </div>
    </div>
  );
}

export default Login;