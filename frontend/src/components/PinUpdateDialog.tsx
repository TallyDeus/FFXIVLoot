import React, { useState } from 'react';
import { authService } from '../services/api/authService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { Button } from './Button';
import './PinUpdateDialog.css';

interface PinUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dialog for updating the current user's PIN
 */
export const PinUpdateDialog: React.FC<PinUpdateDialogProps> = ({ isOpen, onClose }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPin || !newPin || !confirmPin) {
      showToast('All fields are required', 'error');
      return;
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      showToast('New PIN must be exactly 4 digits', 'error');
      return;
    }

    if (newPin !== confirmPin) {
      showToast('New PIN and confirmation do not match', 'error');
      return;
    }

    if (newPin === currentPin) {
      showToast('New PIN must be different from current PIN', 'error');
      return;
    }

    if (!user) {
      showToast('User not found', 'error');
      return;
    }

    setLoading(true);
    try {
      await authService.updatePin(user.id, currentPin, newPin);
      showToast('PIN updated successfully! Please log in again.', 'success');
      // Clear form
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      onClose();
      // Logout user so they need to log in with new PIN
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error: any) {
      showToast(error.message || 'Failed to update PIN. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    onClose();
  };

  return (
    <div className="pin-update-overlay">
      <div className="pin-update-container">
        <form onSubmit={handleSubmit} className="pin-update-form">
          <h3>Update PIN</h3>
          
          <div className="form-group">
            <label htmlFor="currentPin">Current PIN</label>
            <input
              type="password"
              id="currentPin"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter current PIN"
              maxLength={4}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPin">New PIN</label>
            <input
              type="password"
              id="newPin"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter new 4-digit PIN"
              maxLength={4}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPin">Confirm New PIN</label>
            <input
              type="password"
              id="confirmPin"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Confirm new PIN"
              maxLength={4}
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <Button
              type="button"
              variant="outlined"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              loading={loading}
              disabled={currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
            >
              {loading ? 'Updating...' : 'Update PIN'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

