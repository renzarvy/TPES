import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '../components/common/Toast';

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => string;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4500): string => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string, duration?: number) => showToast('success', title, message, duration),
    [showToast]
  );

  const showError = useCallback(
    (title: string, message?: string, duration?: number) => showToast('error', title, message, duration || 6000),
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string, duration?: number) => showToast('warning', title, message, duration),
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string, duration?: number) => showToast('info', title, message, duration),
    [showToast]
  );

  const contextValue = useMemo(
    () => ({
      toasts,
      showToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      dismissToast,
      clearAll,
    }),
    [toasts, showToast, showSuccess, showError, showWarning, showInfo, dismissToast, clearAll]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useGlobalToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useGlobalToast must be used within a ToastProvider');
  }
  return context;
};
