import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Lock } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (username && password) {
      login();
      navigate('/');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div className="card" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        <img 
          src="/qordata_logo.png" 
          alt="Qordata Logo" 
          style={{ width: '180px', marginBottom: '24px' }}
        />
        
        <h2 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Sign in to access K-Sunshine Compliance</p>

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}>
            <Lock size={18} /> Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
