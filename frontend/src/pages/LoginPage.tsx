import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import { Button } from '../components/Button';
import './LoginPage.css';

/**
 * Login page component
 */
export const LoginPage: React.FC = () => {
  const [memberName, setMemberName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memberName.trim() || !pin.trim()) {
      showToast('Please enter both member name and PIN', 'error');
      return;
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      showToast('PIN must be exactly 4 digits', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(memberName.trim(), pin);
      showToast('Login successful!', 'success');
      navigate('/members');
    } catch (error: any) {
      showToast(error.message || 'Invalid member name or PIN', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img 
            src="/pp-icon.jpg"
            alt="App Icon" 
            className="login-icon"
            onError={(e) => {
              (e.target as HTMLImageElement).style.backgroundColor = 'var(--tc-bg-card)';
            }}
          />
          <h1>Brain damage is a choice</h1>
          <p>Please log in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="memberName">Member Name</label>
            <input
              id="memberName"
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Enter your member name"
              autoComplete="username"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter 4-digit PIN"
              autoComplete="current-password"
              maxLength={4}
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            variant="contained"
            color="primary"
            fullWidth
            loading={loading}
            disabled={!memberName.trim() || pin.length !== 4}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

