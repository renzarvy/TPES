import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { useGlobalToast } from '../contexts/ToastContext';
import { parseAuthError } from '../utils/authErrorParser';
import { ServiceDiagnosticsModal } from '../components/common/ServiceDiagnostics';
import { getStoredDepartments, subscribeToDepartments } from '../lib/departments';
import { seedDemoDataToStorage, isDemoDataSeeded } from '../lib/demoReportsData';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  Building2,
  RefreshCw,
  BookOpen,
  Activity,
  Sparkles,
  Crown,
  GraduationCap
} from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    signInWithEmergencySession,
    resetPassword,
    authError, 
    clearAuthError, 
    loading: authContextLoading 
  } = useAuth();

  const { isLoading: globalLoading, withLoading } = useLoading();
  const { showSuccess, showError, showWarning, showInfo } = useGlobalToast();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [accountRole, setAccountRole] = useState<'student' | 'teacher'>('student');
  const [departments, setDepartments] = useState<string[]>(() => getStoredDepartments());
  const [department, setDepartment] = useState<string>(() => {
    const list = getStoredDepartments();
    return list[0] || 'College of Nursing';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localMsg, setLocalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const isBusy = submitting || authContextLoading || globalLoading;

  // Real-time synchronization of academic college departments
  useEffect(() => {
    const unsubscribe = subscribeToDepartments((updatedDepts) => {
      if (updatedDepts && updatedDepts.length > 0) {
        setDepartments(updatedDepts);
        setDepartment(prev => updatedDepts.includes(prev) ? prev : updatedDepts[0]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    clearAuthError();
    setLocalMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await withLoading(
          () => signInWithEmail(email.trim(), password),
          'Verifying credentials with secure auth...'
        );
        showSuccess('Welcome Back!', 'Signed in successfully to St. Alexius College.');
        navigate('/dashboard');
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          const msg = 'Please enter your full name.';
          setLocalMsg({ type: 'error', text: msg });
          showError('Missing Information', msg);
          return;
        }
        await withLoading(
          () => signUpWithEmail(email.trim(), password, fullName.trim(), idNumber.trim(), accountRole, { department }),
          'Creating student/faculty profile...'
        );
        showSuccess('Account Registered', 'Welcome to St. Alexius College! Redirecting to your dashboard...');
        setLocalMsg({ 
          type: 'success', 
          text: 'Account registered successfully! Redirecting to portal...' 
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          const msg = 'Please enter your school email address.';
          setLocalMsg({ type: 'error', text: msg });
          showError('Email Required', msg);
          return;
        }
        await withLoading(
          () => resetPassword(email.trim()),
          'Sending password reset instructions...'
        );
        showInfo('Recovery Link Sent', 'Password reset instructions have been sent to your email.');
        setLocalMsg({ 
          type: 'success', 
          text: 'Password reset instructions have been sent to your email address.' 
        });
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const parsed = parseAuthError(err);
      setLocalMsg({ type: 'error', text: parsed.description });
      
      if (parsed.isHttp401) {
        showWarning(parsed.title, parsed.description);
      } else if (parsed.isTimeout) {
        showError('Network Timeout', parsed.description);
      } else {
        showError(parsed.title, parsed.description);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isBusy) return;
    clearAuthError();
    setLocalMsg(null);
    setSubmitting(true);
    try {
      await withLoading(
        () => signInWithGoogle(),
        'Authenticating with Google...'
      );
      showSuccess('Signed In', 'Google authentication successful.');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      const parsed = parseAuthError(err);
      setLocalMsg({ type: 'error', text: parsed.description });
      showError(parsed.title, parsed.description);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1a36] via-[#11224d] to-[#0a152e] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link to="/" className="inline-flex items-center space-x-3 group mb-3">
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
              ST. ALEXIUS COLLEGE
            </h1>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mt-0.5">
              Teacher Performance Evaluation System
            </p>
          </div>
        </Link>
        <h2 className="text-xl font-bold text-slate-200 tracking-tight mt-1">
          {mode === 'signin' && 'Sign in to your account'}
          {mode === 'signup' && 'Register student or faculty account'}
          {mode === 'forgot' && 'Reset your password'}
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Official academic evaluation portal for students, faculty, and administrators.
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => { setMode('signin'); setLocalMsg(null); clearAuthError(); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'signin'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => { setMode('signup'); setLocalMsg(null); clearAuthError(); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => { setMode('forgot'); setLocalMsg(null); clearAuthError(); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'forgot'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recovery
            </button>
          </div>

          {/* Feedback Messages */}
          {localMsg && (
            <div
              className={`mb-4 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 border ${
                localMsg.type === 'error'
                  ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                  : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              }`}
            >
              {localMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{localMsg.text}</span>
            </div>
          )}

          {authError && !localMsg && (
            <div className="mb-4 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 border bg-rose-950/50 border-rose-800 text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{authError}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            
            {/* Registration specific fields */}
            {mode === 'signup' && (
              <>
                {/* Role selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setAccountRole('student')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition text-center ${
                        accountRole === 'student'
                          ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Student Evaluator
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setAccountRole('teacher')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition text-center ${
                        accountRole === 'teacher'
                          ? 'border-blue-400 bg-blue-400/10 text-blue-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Faculty Member
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={isBusy}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={accountRole === 'teacher' ? 'e.g., Prof. Maria Santos' : 'e.g., Juan A. Dela Cruz'}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                {/* ID Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    {accountRole === 'teacher' ? 'Faculty ID Number' : 'Student ID Number'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={isBusy}
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="e.g., 2024-10294"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                {/* College / Department Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    College / Academic Department
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <select
                      value={department}
                      disabled={isBusy}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Institutional / Personal Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  disabled={isBusy}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., yourname@stalexius.edu.ph"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Password (for Sign In & Registration) */}
            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isBusy}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isBusy}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-blue-500/25 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isBusy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Request...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In to Portal'}
                    {mode === 'signup' && 'Complete Registration'}
                    {mode === 'forgot' && 'Send Recovery Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Diagnostics and Health status trigger */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Database & Auth Health:</span>
            <ServiceDiagnosticsModal
              isOpen={showDiagnostics}
              onClose={() => setShowDiagnostics(false)}
            />
          </div>

          {/* Quick Demo Test Access for All 4 Roles */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Quick Role Demo Login
              </span>
              <span className="text-[9px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                1-Click Demo
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mb-2.5">
              Instantly preview any role dashboard with pre-loaded benchmark evaluation records.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Admin */}
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  clearAuthError();
                  setSubmitting(true);
                  if (!isDemoDataSeeded()) seedDemoDataToStorage();
                  try {
                    await withLoading(
                      () => signInWithEmergencySession('admin@stalexiuscollege.edu.ph', 'admin', 'Dr. Alexius Admin', { department: 'Institutional Administration' }),
                      'Signing in as Administrator...'
                    );
                    showSuccess('Welcome Administrator', 'Logged in as Dr. Alexius Admin');
                    navigate('/dashboard');
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-center transition flex flex-col items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold">Admin</span>
                </div>
                <span className="text-[9px] text-amber-400/80">Dr. Alexius Admin</span>
              </button>

              {/* Dean */}
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  clearAuthError();
                  setSubmitting(true);
                  if (!isDemoDataSeeded()) seedDemoDataToStorage();
                  try {
                    await withLoading(
                      () => signInWithEmergencySession('dean.nursing@stalexiuscollege.edu.ph', 'admin', 'Dean Arthur Reyes, RN, PhD', { department: 'College of Nursing' }),
                      'Signing in as Dean...'
                    );
                    showSuccess('Welcome Dean', 'Logged in as Dean Arthur Reyes, PhD');
                    navigate('/dashboard');
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 text-center transition flex flex-col items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold">Dean</span>
                </div>
                <span className="text-[9px] text-purple-400/80">College of Nursing</span>
              </button>

              {/* Faculty */}
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  clearAuthError();
                  setSubmitting(true);
                  if (!isDemoDataSeeded()) seedDemoDataToStorage();
                  try {
                    await withLoading(
                      () => signInWithEmergencySession('maria.santos@stalexiuscollege.edu.ph', 'teacher', 'Prof. Maria Santos', { department: 'College of Nursing', employeeId: 'EMP-7012' }),
                      'Signing in as Faculty Member...'
                    );
                    showSuccess('Welcome Faculty', 'Logged in as Prof. Maria Santos');
                    navigate('/dashboard');
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-300 text-center transition flex flex-col items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-bold">Faculty</span>
                </div>
                <span className="text-[9px] text-blue-400/80">Prof. Maria Santos</span>
              </button>

              {/* Student */}
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  clearAuthError();
                  setSubmitting(true);
                  if (!isDemoDataSeeded()) seedDemoDataToStorage();
                  try {
                    await withLoading(
                      () => signInWithEmergencySession('student@stalexiuscollege.edu.ph', 'student', 'Juan A. Dela Cruz', { department: 'College of Computer Studies', studentId: '2024-10294' }),
                      'Signing in as Student Evaluator...'
                    );
                    showSuccess('Welcome Student', 'Logged in as Juan A. Dela Cruz');
                    navigate('/dashboard');
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-center transition flex flex-col items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold">Student</span>
                </div>
                <span className="text-[9px] text-emerald-400/80">Juan Dela Cruz</span>
              </button>
            </div>
          </div>

        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-amber-400 transition inline-flex items-center space-x-1.5"
          >
            <span>&larr; Back to St. Alexius College Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
