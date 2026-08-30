import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { Menu, X, Mail, RefreshCw, AlertTriangle } from 'lucide-react';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, loading, resendVerificationEmail, reloadUser } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [checkingVerification, setCheckingVerification] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const handleResendVerification = async () => {
    setResendStatus('sending');
    try {
      await resendVerificationEmail();
      setResendStatus('sent');
      setTimeout(() => setResendStatus('idle'), 6000);
    } catch (err) {
      setResendStatus('error');
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    await reloadUser();
    setTimeout(() => setCheckingVerification(false), 800);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-amber-300 tracking-wider uppercase">Loading Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row font-sans text-slate-800 antialiased selection:bg-blue-500/30 relative">
      {/* Background Image with Dark Overlay for enhanced readability */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <img
          src="/school-bg.webp"
          alt=""
          role="presentation"
          aria-hidden="true"
          className="w-full h-full object-cover object-center filter blur-[1px] scale-105"
        />
        {/* Dark Aesthetic Overlay */}
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/95 via-slate-900/90 to-blue-950/80" />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-[#0f172a] via-[#1e3a8a] to-[#0f172a] text-white px-4 py-3 flex justify-between items-center shadow-lg z-40 sticky top-0 border-b border-blue-800/60">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center overflow-hidden border border-white/20 shadow-md flex-shrink-0">
            <img src="/logo.png" alt="St. Alexius College Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-xs font-extrabold tracking-wider text-amber-300 block">ST. ALEXIUS COLLEGE</span>
            <p className="text-[10px] text-blue-200 font-medium">Evaluation System</p>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10"
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Collapsible Sidebar Component */}
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">
        {user && !user.emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 sm:px-6 text-amber-900 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm animate-fade-in print:hidden">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Unverified School Email:</strong> A verification link was sent to <span className="font-bold underline text-amber-950">{user.email}</span>. Please verify your account.
              </span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={handleResendVerification}
                disabled={resendStatus === 'sending'}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center space-x-1 shadow-xs disabled:opacity-50"
              >
                <Mail className="w-3 h-3" />
                <span>{resendStatus === 'sending' ? 'Sending...' : resendStatus === 'sent' ? 'Sent!' : 'Resend Email'}</span>
              </button>
              <button
                onClick={handleCheckVerification}
                disabled={checkingVerification}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px] transition-colors flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${checkingVerification ? 'animate-spin' : ''}`} />
                <span>I've Verified</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Navbar Header */}
        <TopNavbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children || <Outlet />}
        </main>

        {/* Global Copyright Footer */}
        <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-500 font-medium flex flex-col sm:flex-row items-center justify-between gap-2 print:hidden">
          <div className="flex items-center space-x-2 text-slate-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-[#1e3a8a]" />
            <span>St. Alexius College Teachers Performance Evaluation System</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            &copy; {currentYear} St. Alexius College. All Rights Reserved.
          </div>
        </footer>
      </div>
    </div>
  );
};

