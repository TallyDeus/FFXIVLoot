import React, { useState } from 'react';
import { authService } from '../services/api/authService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
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
  const { toasts, showToast, removeToast } = useToast();

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
      showToast('The confirmation PIN does not match the new PIN you entered', 'error');
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
      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to update PIN. Please try again.';
      
      // Extract error message from various possible error formats
      const errorText = error?.message || error?.detail || error?.toString() || '';
      const errorMsg = errorText.toLowerCase();
      
      // Check if it's a current PIN error (401 Unauthorized with "Invalid current PIN")
      if (errorMsg.includes('invalid current pin')) {
        errorMessage = 'The current PIN you entered is incorrect. Please try again.';
      } else if (errorMsg.includes('pin must be exactly 4 digits')) {
        errorMessage = 'PIN must be exactly 4 digits.';
      } else if (errorText) {
        // Use the error message if it's meaningful
        errorMessage = errorText;
      }
      
      showToast(errorMessage, 'error');
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

