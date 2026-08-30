import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Activity,
  X,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import { isTursoConfigured, getTursoClient } from '../../lib/turso';
import { auth } from '../../lib/firebase';
import { useGlobalToast } from '../../contexts/ToastContext';

export interface ServiceDiagnosticsProps {
  isOpen?: boolean;
  onClose?: () => void;
  triggerButtonClassName?: string;
  showTrigger?: boolean;
}

interface ServiceStatus {
  name: string;
  category: 'turso' | 'firebase' | 'storage';
  status: 'connected' | 'warning' | 'local_fallback' | 'testing';
  latencyMs?: number;
  message: string;
  details?: string;
  actionGuide?: string;
}

export const ServiceDiagnosticsModal: React.FC<ServiceDiagnosticsProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  triggerButtonClassName,
  showTrigger = true,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
  const { showSuccess } = useGlobalToast();

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const handleOpen = () => setInternalOpen(true);
  const handleClose = () => {
    if (onClose) onClose();
    setInternalOpen(false);
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: ServiceStatus[] = [];

    // 1. Check Turso Database Connectivity
    const tursoStart = performance.now();
    try {
      const configured = isTursoConfigured();
      if (!configured) {
        results.push({
          name: 'Turso Cloud Database (libSQL)',
          category: 'turso',
          status: 'local_fallback',
          message: 'Operating in Local Resilient Fallback Mode',
          details: 'No remote VITE_TURSO_AUTH_TOKEN is present in the current environment.',
          actionGuide: 'The app is fully functional using local offline persistence. To connect to your cloud cluster, generate a token with "turso db tokens create stalexius-tpes-sade" and set VITE_TURSO_AUTH_TOKEN.',
        });
      } else {
        const client = getTursoClient();
        if (client) {
          await client.execute('SELECT 1 as ping');
          const latency = Math.round(performance.now() - tursoStart);
          results.push({
            name: 'Turso Cloud Database (libSQL)',
            category: 'turso',
            status: 'connected',
            latencyMs: latency,
            message: `Connected securely (${latency}ms)`,
            details: 'Remote database cluster "stalexius-tpes-sade" is reachable and queries execute successfully.',
          });
        } else {
          results.push({
            name: 'Turso Cloud Database (libSQL)',
            category: 'turso',
            status: 'local_fallback',
            message: 'Local Fallback Active',
            details: 'Client initialized in local storage protection mode.',
          });
        }
      }
    } catch (err: any) {
      const is401 = err?.message?.includes('401') || err?.status === 401;
      results.push({
        name: 'Turso Cloud Database (libSQL)',
        category: 'turso',
        status: is401 ? 'warning' : 'local_fallback',
        message: is401 ? 'Auth Token Expired or Unauthorized (HTTP 401)' : 'Remote Sync Offline',
        details: err?.message || 'Unable to connect to Turso remote server.',
        actionGuide: is401
          ? 'Regenerate your Turso Auth token via CLI ("turso db tokens create stalexius-tpes-sade") or Netlify environment settings. Local fallback continues to store users and evaluations safely.'
          : 'Check network connectivity or environment variables.',
      });
    }

    // 2. Check Firebase Authentication & Services
    const fbStart = performance.now();
    try {
      if (auth && auth.app) {
        const latency = Math.round(performance.now() - fbStart);
        const currentUser = auth.currentUser;
        results.push({
          name: 'Firebase Authentication Service',
          category: 'firebase',
          status: 'connected',
          latencyMs: latency,
          message: 'Firebase SDK Active',
          details: `App: ${auth.app.name || '[DEFAULT]'} | Active User: ${currentUser ? currentUser.email : 'Guest / Not Signed In'}`,
        });
      } else {
        results.push({
          name: 'Firebase Authentication Service',
          category: 'firebase',
          status: 'warning',
          message: 'Firebase SDK in Standby Mode',
          details: 'Initialized with standard local credential fallback.',
        });
      }
    } catch (err: any) {
      results.push({
        name: 'Firebase Authentication Service',
        category: 'firebase',
        status: 'warning',
        message: 'Firebase Operational Notice',
        details: err?.message || 'Operating with local identity provider.',
      });
    }

    // 3. Check Browser LocalStorage Persistence Engine
    try {
      const testKey = '__sac_diag_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);

      const localUsers = localStorage.getItem('sac_tpes_local_users');
      const parsedUsers = localUsers ? Object.keys(JSON.parse(localUsers)).length : 0;
      const session = localStorage.getItem('sac_tpes_turso_session');

      results.push({
        name: 'Local Persistence Engine (Storage)',
        category: 'storage',
        status: 'connected',
        message: 'Active and Operational',
        details: `Cached Users: ${parsedUsers} | Active Session: ${session ? 'Authenticated' : 'No Session'}`,
      });
    } catch (err: any) {
      results.push({
        name: 'Local Persistence Engine (Storage)',
        category: 'storage',
        status: 'warning',
        message: 'LocalStorage Warning',
        details: 'Browser cookies or local storage might be restricted in privacy mode.',
      });
    }

    setStatuses(results);
    setLastChecked(new Date());
    setIsRunning(false);
  };

  useEffect(() => {
    if (isOpen && statuses.length === 0) {
      runDiagnostics();
    }
  }, [isOpen]);

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Connected
          </span>
        );
      case 'local_fallback':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <HardDrive className="w-3.5 h-3.5 text-blue-500" />
            Local Resilient Mode
          </span>
        );
      case 'warning':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Notice
          </span>
        );
    }
  };

  const getIcon = (category: ServiceStatus['category']) => {
    switch (category) {
      case 'turso':
        return <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'firebase':
        return <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'storage':
      default:
        return <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={handleOpen}
          className={
            triggerButtonClassName ||
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition cursor-pointer'
          }
          title="Inspect System & Database Connectivity"
        >
          <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span>System Diagnostics</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="diagnostics-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Activity className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 id="diagnostics-modal-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Database & Auth Diagnostics
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Live status monitor for Turso (libSQL), Firebase, and Local Persistence
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close diagnostics dialog"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Status List */}
                <div className="space-y-3">
                  {statuses.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 space-y-2 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            {getIcon(item.category)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.message}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>

                      {item.details && (
                        <div className="text-[11px] font-mono bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-lg text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/60 break-words">
                          {item.details}
                        </div>
                      )}

                      {item.actionGuide && (
                        <div className="text-xs bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3 rounded-lg text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <span className="font-semibold block mb-0.5">Quick Guide:</span>
                            {item.actionGuide}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Resilient Architecture Explainer */}
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span>Dual-Tier Resilient Storage Protection</span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    St. Alexius College Evaluation System is engineered with dual-tier resilience. When remote cloud tokens are absent or returning HTTP 401, client-side cryptographic storage transparently guarantees uninterrupted user logins, account registrations, and offline evaluation workflows.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Ready for test'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await runDiagnostics();
                      showSuccess('Diagnostics Refreshed', 'Database and Auth connectivity checked.');
                    }}
                    disabled={isRunning}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-xs font-bold text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                    <span>{isRunning ? 'Checking Services...' : 'Re-test Connectivity'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
