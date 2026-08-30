import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface LoadingState {
  id: string;
  message?: string;
  isBlocking?: boolean;
}

interface LoadingContextType {
  isLoading: boolean;
  activeRequests: LoadingState[];
  startLoading: (id?: string, message?: string, isBlocking?: boolean) => string;
  stopLoading: (id: string) => void;
  withLoading: <T>(
    asyncFn: () => Promise<T>,
    message?: string,
    isBlocking?: boolean,
    customId?: string
  ) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<LoadingState[]>([]);

  const startLoading = useCallback(
    (id?: string, message?: string, isBlocking = false): string => {
      const requestId = id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setRequests((prev) => {
        const filtered = prev.filter((r) => r.id !== requestId);
        return [...filtered, { id: requestId, message, isBlocking }];
      });
      return requestId;
    },
    []
  );

  const stopLoading = useCallback((id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const withLoading = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      message?: string,
      isBlocking = false,
      customId?: string
    ): Promise<T> => {
      const id = startLoading(customId, message, isBlocking);
      try {
        return await asyncFn();
      } finally {
        stopLoading(id);
      }
    },
    [startLoading, stopLoading]
  );

  const isLoading = requests.length > 0;
  const blockingRequest = requests.find((r) => r.isBlocking);

  const contextValue = useMemo(
    () => ({
      isLoading,
      activeRequests: requests,
      startLoading,
      stopLoading,
      withLoading,
    }),
    [isLoading, requests, startLoading, stopLoading, withLoading]
  );

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}

      {/* Global Top Progress Bar */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 h-1 z-[99999] bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-400 origin-left shadow-[0_0_12px_rgba(59,130,246,0.8)]"
          />
        )}
      </AnimatePresence>

      {/* Blocking Fullscreen Overlay with Spinner & Message */}
      <AnimatePresence>
        {blockingRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99998] bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 select-none cursor-wait"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center max-w-xs text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-inner">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Processing Request
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {blockingRequest.message || 'Please wait while we complete authentication...'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
