import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path.ts';
import { useTheme } from '../ThemeContext';

function Register() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', login: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [e.target.name]: e.target.value});

  async function handleRegister(e: React.MouseEvent) {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    try {
      const response = await fetch(buildPath('api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.error) setError(data.error);
      else {
        setError(''); // Clear error on success
        setSuccess('Account created! You can now log in.');
        setTimeout(() => navigate('/login'), 2000); // Redirect after 2 seconds
      }
    } catch { setError('Server error'); }
  }

  // Consistent Input Styling: Medium blue dashes in Light Mode, standard variables in Dark Mode
  const inputStyle: React.CSSProperties = { 
    width: '100%', 
    padding: '10px', 
    border: isDarkMode ? '2px dashed var(--border-color)' : '2px dashed #6c8ef2', 
    borderRadius: '10px', 
    background: 'var(--input-bg)', 
    color: 'var(--text-main)', 
    marginBottom: '10px', 
    outline: 'none',
    transition: 'all 0.2s ease' 
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      background: 'var(--bg-color)', 
      gap: '16px',
      transition: 'background 0.25s ease' 
    }}>
      
      {/* Theme Toggle Button */}
      <button onClick={toggleDarkMode} style={{ position: 'fixed', top: '16px', right: '16px', background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '42px', height: '42px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {isDarkMode ? '🌙' : '☀️'}
      </button>

      {/* Register Card */}
      <div style={{ 
        background: 'var(--card-bg)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '16px', 
        padding: '30px', 
        width: '380px', 
        boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)',
        transition: 'all 0.25s ease'
      }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-main)', fontFamily: 'monospace', marginBottom: '20px', fontSize: '28px', fontWeight: 700 }}>Register</h2>
        
        {error && <p style={{ color: '#e53e3e', textAlign: 'center', fontSize: '13px', marginBottom: '10px' }}>{error}</p>}
        {success && <p style={{ color: '#38a169', textAlign: 'center', fontSize: '13px', marginBottom: '10px' }}>{success}</p>}
        
        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Mapping fields */}
          {[
            { id: 'firstName', label: 'First Name' },
            { id: 'lastName', label: 'Last Name' },
            { id: 'email', label: 'Email' },
            { id: 'login', label: 'Username' }
          ].map(field => (
            <div key={field.id}>
              <label style={{ color: 'var(--text-main)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{field.label}</label>
              <input type="text" name={field.id} onChange={handleChange} style={inputStyle} />
            </div>
          ))}

          <label style={{ color: 'var(--text-main)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Password</label>
          <input type="password" name="password" onChange={handleChange} style={inputStyle} />
          
          <label style={{ color: 'var(--text-main)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Confirm Password</label>
          <input type="password" name="confirmPassword" onChange={handleChange} style={inputStyle} />
        </div>
        
        <button onClick={handleRegister} style={{ width: '100%', padding: '12px', background: '#2d4ef5', color: '#fff', border: 'none', borderRadius: '24px', cursor: 'pointer', fontWeight: 700, marginTop: '10px', fontSize: '16px' }}>
          Register
        </button>
        
        <p onClick={() => navigate('/login')} style={{ textAlign: 'center', marginTop: '15px', color: '#2d4ef5', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontWeight: 600 }}>
          Back to Login
        </p>
      </div>
    </div>
  );
}

export default Register;