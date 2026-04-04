import React, { useEffect } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

const defaultDurationForType = (type: ToastType | undefined): number => {
  if (type === 'loading') return 0;
  return 3000;
};

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

/**
 * Toast notification component that auto-dismisses after a delay
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration: durationProp,
  onClose,
}) => {
  const duration = durationProp ?? defaultDurationForType(type);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const noAutoclose = duration <= 0;

  return (
    <div className={`toast toast-${type}${noAutoclose ? ' toast-no-autoclose' : ''}`}>
      <div className="toast-content">
        {type === 'loading' && <div className="toast-spinner" aria-hidden />}
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: ToastType; duration?: number }>;
  onRemove: (id: string) => void;
}

/**
 * Container for managing multiple toast notifications
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

