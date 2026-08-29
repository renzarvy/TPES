import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoredDepartments, subscribeToDepartments } from '../lib/departments';
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
  BookOpen
} from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    resetPassword,
    authError, 
    clearAuthError, 
    loading 
  } = useAuth();

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
    clearAuthError();
    setLocalMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        navigate('/dashboard');
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setLocalMsg({ type: 'error', text: 'Please enter your full name.' });
          setSubmitting(false);
          return;
        }
        await signUpWithEmail(email, password, fullName, idNumber, accountRole, { department });
        setLocalMsg({ 
          type: 'success', 
          text: 'Account registered successfully! Please check your email or proceed to the portal.' 
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setLocalMsg({ type: 'error', text: 'Please enter your school email address.' });
          setSubmitting(false);
          return;
        }
        await resetPassword(email);
        setLocalMsg({ 
          type: 'success', 
          text: 'Password reset instructions have been sent to your email address.' 
        });
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearAuthError();
    setLocalMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
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
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-blue-900/50">
          
          {/* Institutional Official Logo at Top of Sign-In Form */}
          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <img 
              src="/logo.png" 
              alt="St. Alexius College Official Logo" 
              className="w-20 h-20 object-contain drop-shadow-lg hover:scale-105 transition-transform duration-200"
              referrerPolicy="no-referrer" 
            />
            <div className="mt-2.5">
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                St. Alexius College
              </span>
              <p className="text-[11px] text-slate-400">
                Institutional Authentication Gateway
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); clearAuthError(); setLocalMsg(null); }}
              className={`pb-3 flex-1 text-center font-medium text-sm transition-colors border-b-2 ${
                mode === 'signin'
                  ? 'border-amber-400 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); clearAuthError(); setLocalMsg(null); }}
              className={`pb-3 flex-1 text-center font-medium text-sm transition-colors border-b-2 ${
                mode === 'signup'
                  ? 'border-amber-400 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot'); clearAuthError(); setLocalMsg(null); }}
              className={`pb-3 flex-1 text-center font-medium text-sm transition-colors border-b-2 ${
                mode === 'forgot'
                  ? 'border-amber-400 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Recovery
            </button>
          </div>

          {/* Feedback message banner */}
          {(authError || localMsg) && (
            <div className={`mb-6 p-4 rounded-xl text-xs flex items-start space-x-3 border ${
              localMsg?.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/60 border-red-500/50 text-red-200'
            }`}>
              {localMsg?.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">
                {localMsg?.text || authError}
              </div>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {/* Registration specific fields */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountRole('student')}
                      className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all ${
                        accountRole === 'student'
                          ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <div>
                        <div className="text-xs font-bold">Student</div>
                        <div className="text-[10px] text-slate-400">Evaluate instructors</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountRole('teacher')}
                      className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all ${
                        accountRole === 'teacher'
                          ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <div>
                        <div className="text-xs font-bold">Faculty</div>
                        <div className="text-[10px] text-slate-400">View evaluations</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Juan A. Dela Cruz"
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      {accountRole === 'student' ? 'Student ID No.' : 'Employee ID No.'}
                    </label>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder={accountRole === 'student' ? 'e.g. 2024-10294' : 'e.g. EMP-1042'}
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Department / College
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Email field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                School Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@stalexiuscollege.edu.ph"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Official institution domain: <span className="text-amber-400 font-mono">@stalexiuscollege.edu.ph</span>
              </p>
            </div>

            {/* Password field */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); clearAuthError(); }}
                      className="text-xs text-amber-400 hover:text-amber-300 transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter secure password"
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-sm"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
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

          {/* Alternative Sign-In Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-950/50 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 6.4 10.4 6.4z"
                  />
                </svg>
                <span>Institutional Google Account</span>
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
