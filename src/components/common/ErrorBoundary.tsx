import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Key, ShieldAlert } from 'lucide-react';
import { isFirebaseConfigured, firebaseConfig } from '../../lib/config';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isConfigIssue = !isFirebaseConfigured() || !firebaseConfig.apiKey;
      const errorMessage = this.state.error?.message || "An unexpected runtime error occurred.";

      return (
        <div id="error-boundary-screen" className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                {isConfigIssue ? <Key className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {isConfigIssue ? "Firebase Configuration Required" : "Application Startup Notice"}
                </h1>
                <p className="text-xs text-slate-400">St. Alexius College Faculty Evaluation System</p>
              </div>
            </div>

            {isConfigIssue ? (
              <div className="space-y-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200">
                <div className="flex items-start space-x-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-300">Missing Firebase Web API Key</p>
                    <p className="text-xs text-slate-300 mt-1">
                      The production build was compiled without <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">VITE_FIREBASE_API_KEY</code>.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/80 rounded-lg p-3 text-xs font-mono text-slate-300 border border-slate-800 overflow-x-auto">
                  <p className="text-slate-400 mb-1"># Add this to your .env file and rebuild:</p>
                  <p className="text-emerald-400">VITE_FIREBASE_API_KEY=&quot;AIzaSy...&quot;</p>
                  <p className="text-slate-300 mt-2 text-[11px]">npm run build && firebase deploy --only hosting</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto">
                <p className="font-semibold text-rose-400 mb-1">Error Trace:</p>
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="reload-app-button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
