import { useState, useCallback } from 'react';
import { ToastType } from '../components/Toast';

interface Toast {
  id: string;
  message: string;
  type?: ToastType;
}

/**
 * Custom hook for managing toast notifications
 * Eliminates code duplication across components
 */
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
  };
};

