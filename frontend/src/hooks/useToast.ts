import { useState, useCallback } from 'react';
import { ToastType } from '../components/Toast';

export interface ShowToastOptions {
  /** 0 = no auto-dismiss (for loading toasts cleared manually). Omit = default duration per type. */
  duration?: number;
}

interface Toast {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

/**
 * Custom hook for managing toast notifications
 * Eliminates code duplication across components
 */
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', options?: ShowToastOptions): string => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, message, type, duration: options?.duration }]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
  };
};

