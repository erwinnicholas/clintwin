import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';
import '../index.css';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [role, setRole] = useState('RESEARCH_ANALYST');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegistering) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (name.trim() === '') {
        setError('Please enter your full name.');
        return;
      }
      
      setSuccess('Account created successfully! Please log in.');
      setIsRegistering(false);
      setPassword(''); // Clear password for security
      
    } else {
      // Login Mode - Form Validation Only
      if (!email.includes('@')) {
        setError('Please enter a valid email.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      // Instantly login (Bypass actual auth)
      login({ 
        role: role, 
        name: email.split('@')[0], // Extract name from email for mock user
        email: email
      });
      
      if (role === 'SYSTEM_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        
        {/* Logo Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', justifyContent: 'center' }}>
          <Activity size={32} color="var(--accent-blue)" />
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>ClinTwin</h2>
        </div>



        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(255, 61, 0, 0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '0.75rem', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {isRegistering && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
                style={{ 
                  padding: '0.75rem', 
                  background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid var(--border-color)', 
                  color: 'white', 
                  borderRadius: '4px',
                  outline: 'none'
                }} 
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              style={{ 
                padding: '0.75rem', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--border-color)', 
                color: 'white', 
                borderRadius: '4px',
                outline: 'none'
              }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              style={{ 
                padding: '0.75rem', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--border-color)', 
                color: 'white', 
                borderRadius: '4px',
                outline: 'none'
              }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Role</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              style={{ 
                padding: '0.75rem', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--border-color)', 
                color: 'white', 
                borderRadius: '4px',
                outline: 'none',
                appearance: 'none'
              }} 
            >
              <option value="RESEARCH_ANALYST" style={{ background: 'var(--bg-primary)' }}>Research Analyst</option>
              <option value="SYSTEM_ADMIN" style={{ background: 'var(--bg-primary)' }}>System Admin</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '0.75rem', fontSize: '1rem', marginTop: '1rem', width: '100%', justifyContent: 'center' }}
          >
            {isRegistering ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isRegistering ? (
            <>
              Already have an account? <span onClick={() => setIsRegistering(false)} style={{ color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}>Log In</span>
            </>
          ) : (
            <>
              Need an account? <span onClick={() => setIsRegistering(true)} style={{ color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}>Register Here</span>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;
