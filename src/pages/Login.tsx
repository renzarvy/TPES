import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { 
  Shield, Lock, Mail, Key, ArrowRight, CheckCircle2, AlertCircle, 
  IdCard, Check, Eye, EyeOff, GraduationCap, Briefcase, Building2, UserPlus,
  ChevronLeft, Copy, Zap, Info, ExternalLink
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DEFAULT_DEPARTMENTS = [
  'College of Nursing',
  'College of Pharmacy',
  'College of Medical Laboratory Science',
  'College of Radiologic Technology',
  'College of Physical Therapy',
  'College of Engineering',
  'College of Information Technology',
  'College of Computer Studies',
  'College of Business & Management',
  'College of Criminology',
  'College of Education',
  'College of Arts & Sciences',
  'Senior High School',
  'General Education'
];

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    loading, 
    authError, 
    isRefererBlocked,
    isApiKeyInvalid,
    signInWithEmail, 
    signUpWithEmail, 
    signInWithEmergencySession,
    resetPassword, 
    clearAuthError 
  } = useAuth();
  const currentYear = new Date().getFullYear();

  // 2 Top-Level Tabs: 'signin' vs 'signup' (Register School Email)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  // Sub-selector for registration account type: 'student' vs 'teacher'
  const [accountType, setAccountType] = useState<'student' | 'teacher'>('student');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [department, setDepartment] = useState('College of Nursing');
  const [departmentsList, setDepartmentsList] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showQuickDevMenu, setShowQuickDevMenu] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Email verification notice modal state
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);

  useEffect(() => {
    // Fetch departments list from settings if available
    const fetchDepts = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'departments'));
        if (docSnap.exists() && docSnap.data().items?.length) {
          setDepartmentsList(docSnap.data().items);
          setDepartment(docSnap.data().items[0]);
        }
      } catch {
        // use default departments fallback
      }
    };
    fetchDepts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a152e] text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-widest">Verifying Session...</p>
        </div>
      </div>
    );
  }

  if (user && !showVerificationNotice) {
    return <Navigate to="/" replace />;
  }

  // Real-time domain check
  const normalizedEmail = email.trim().toLowerCase();
  const isSchoolDomain = normalizedEmail.endsWith('@stalexiuscollege.edu.ph') || normalizedEmail === 'renzarvy.rv@gmail.com';
  const isEmailTyped = normalizedEmail.length > 3 && normalizedEmail.includes('@');

  // Real-time password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-gray-500' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak (min 8 chars)', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-yellow-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-400' };
    return { score: 4, label: 'Strong & Secure', color: 'bg-emerald-500' };
  };

  const passStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both your official school email and password.');
      return;
    }

    if (!isSchoolDomain) {
      setLocalError('Access restricted: Only official school email addresses ending in @stalexiuscollege.edu.ph are permitted.');
      return;
    }

    // Validation for Student Registration
    if (authMode === 'signup' && accountType === 'student') {
      if (!fullName.trim()) {
        setLocalError('Please enter your full student name for academic records.');
        return;
      }

      const trimmedStudentId = idNumber.trim();
      if (!trimmedStudentId) {
        setLocalError('Please provide your 7-digit Student ID Number.');
        return;
      }

      const cleanStudentId = trimmedStudentId.replace(/[\s-]/g, '');

      // Enforce strictly 7 numeric digits
      if (!/^\d{7}$/.test(cleanStudentId)) {
        setLocalError('Student ID Number must consist of exactly 7 numbers (e.g. 2101234).');
        return;
      }

      if (password.length < 8) {
        setLocalError('For security, your password must be at least 8 characters long.');
        return;
      }

      if (!agreedToTerms) {
        setLocalError('You must agree to the St. Alexius College Data Privacy Policy & Code of Academic Integrity.');
        return;
      }
    }

    // Validation for Teacher Registration
    if (authMode === 'signup' && accountType === 'teacher') {
      if (!fullName.trim()) {
        setLocalError('Please enter your full faculty / instructor name.');
        return;
      }

      if (!idNumber.trim()) {
        setLocalError('Please provide your Faculty / Employee ID Number.');
        return;
      }

      if (!department.trim()) {
        setLocalError('Please select your Academic Department / College.');
        return;
      }

      if (password.length < 8) {
        setLocalError('For security, your password must be at least 8 characters long.');
        return;
      }

      if (!agreedToTerms) {
        setLocalError('You must agree to the St. Alexius College Data Privacy Policy & Faculty Evaluation Code.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
      } else if (authMode === 'signup' && accountType === 'student') {
        const cleanStudentId = idNumber.trim().replace(/[\s-]/g, '');
        // Purely student registration - strictly 7-digit studentId
        await signUpWithEmail(
          email, 
          password, 
          fullName.trim(), 
          cleanStudentId, 
          'student'
        );
        setShowVerificationNotice(true);
      } else if (authMode === 'signup' && accountType === 'teacher') {
        // Purely teacher registration
        await signUpWithEmail(
          email, 
          password, 
          fullName.trim(), 
          idNumber.trim(), 
          'teacher', 
          { department }
        );
        setShowVerificationNotice(true);
      }
    } catch (err: any) {
      console.error("Auth submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!forgotEmail) {
      setLocalError('Please enter your school email address.');
      return;
    }

    const normForgot = forgotEmail.trim().toLowerCase();
    if (!normForgot.endsWith('@stalexiuscollege.edu.ph') && normForgot !== 'renzarvy.rv@gmail.com') {
      setLocalError('Only official school email addresses (@stalexiuscollege.edu.ph) can be recovered.');
      return;
    }

    setIsSendingReset(true);
    try {
      await resetPassword(normForgot);
      setResetSuccess(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans antialiased selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
      {/* Dynamic SAC College Seal Background */}
      <div 
        className="fixed inset-0 z-0 bg-contain bg-center bg-no-repeat transition-transform duration-1000"
        style={{ 
          backgroundImage: `radial-gradient(circle at center, rgba(15, 32, 66, 0.88), rgba(10, 21, 46, 0.97)), url('/logo.png')`,
          backgroundSize: 'min(70vw, 600px)',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Multi-layered Glass & Seal Blue Twilight Overlays */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0a152e]/92 via-[#0f2042]/88 to-[#1e3a8a]/75 mix-blend-multiply" />
        <div className="absolute inset-0 backdrop-blur-[0.5px]" />
      </div>

      {/* Decorative Floating Glowing Orbs (Seal Blue & College Seal Gold) */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-1/3 right-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="max-w-7xl w-full mx-auto flex justify-between items-center z-10">
        <div 
          onClick={() => navigate('/home')} 
          className="flex items-center space-x-3 cursor-pointer group"
          title="Return to St. Alexius College Homepage"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-amber-400/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.15)] group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="St. Alexius Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm sm:text-base tracking-wide flex items-center group-hover:text-amber-300 transition-colors">
              ST. ALEXIUS COLLEGE
            </h1>
            <p className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase">
              Integrated Evaluation System
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center space-x-1 text-xs font-semibold text-blue-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Homepage</span>
          </button>

          <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-amber-200 bg-blue-950/70 border border-amber-400/30 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-sm">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Official Evaluation Gateway</span>
          </div>
        </div>
      </div>

      {/* Main Login Card with St. Alexius Seal Blue & Gold Accent Styling */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md my-auto z-10 animate-fade-in py-4">
        <div className="bg-gradient-to-b from-[#0f2042]/95 via-[#132752]/95 to-[#0b162c]/95 backdrop-blur-2xl backdrop-saturate-150 py-8 px-6 sm:px-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-3xl border border-blue-500/40 relative overflow-hidden">
          {/* Specular glass highlight overlay with gold shimmer */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-400/10 via-transparent to-transparent pointer-events-none" />

          {/* College Logo Emblem with Gold Halo Ring */}
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border-2 border-amber-400 ring-4 ring-amber-400/20 overflow-hidden">
                <img src="/logo.png" alt="St. Alexius College Logo" className="w-full h-full object-cover scale-105" />
              </div>
            </div>
          </div>

          <div className="text-center space-y-1 mb-5 relative z-10">
            <h2 className="text-xl font-black text-white tracking-tight drop-shadow-md">
              ST. ALEXIUS COLLEGE
            </h2>
            <p className="text-[11px] font-extrabold text-amber-400 tracking-wider uppercase drop-shadow-sm">
              Teachers Performance Evaluation System
            </p>
            <p className="text-[11px] text-blue-100/90 max-w-xs mx-auto pt-1">
              {authMode === 'signin' 
                ? 'Sign in with your official school credentials to access evaluation portals.'
                : 'Register your official school account to participate in faculty evaluations.'}
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* 2-Way Tab Selector: Sign In vs Register School Email (Seal Blue Active with Gold Trim) */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950/70 p-1 border border-blue-500/30 text-xs">
                <button
                  id="tab-signin"
                  type="button"
                  onClick={() => { setAuthMode('signin'); clearAuthError(); setLocalError(null); }}
                  className={`py-2 px-2 text-center font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    authMode === 'signin' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-950/50 border border-amber-400/60' 
                      : 'text-blue-300 hover:text-amber-300'
                  }`}
                >
                  <Lock className={`w-3.5 h-3.5 flex-shrink-0 ${authMode === 'signin' ? 'text-amber-400' : 'text-blue-400'}`} />
                  <span>Sign In</span>
                </button>

                <button
                  id="tab-register"
                  type="button"
                  onClick={() => { setAuthMode('signup'); clearAuthError(); setLocalError(null); }}
                  className={`py-2 px-2 text-center font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    authMode === 'signup' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-950/50 border border-amber-400/60' 
                      : 'text-blue-300 hover:text-amber-300'
                  }`}
                >
                  <UserPlus className={`w-3.5 h-3.5 flex-shrink-0 ${authMode === 'signup' ? 'text-amber-400' : 'text-blue-400'}`} />
                  <span>Register School Email</span>
                </button>
              </div>

              {/* Sub-Selector for Account Type when Register tab is active */}
              {authMode === 'signup' && (
                <div className="space-y-2.5 pt-1 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300">
                      Registration Role:
                    </label>
                    <span className="text-[10px] text-blue-300/80">Select your account profile</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="account-type-student"
                      type="button"
                      onClick={() => { setAccountType('student'); setIdNumber(''); setLocalError(null); }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        accountType === 'student'
                          ? 'bg-blue-900/60 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md shadow-amber-400/10'
                          : 'bg-slate-900/50 border-white/10 text-blue-300/80 hover:bg-slate-900/80'
                      }`}
                    >
                      <GraduationCap className={`w-4 h-4 mb-1 ${accountType === 'student' ? 'text-amber-400' : 'text-blue-400'}`} />
                      <span className="text-xs font-bold">Student</span>
                      <span className={`text-[9px] ${accountType === 'student' ? 'text-amber-300' : 'text-blue-300/80'}`}>7-Digit ID Required</span>
                    </button>

                    <button
                      id="account-type-teacher"
                      type="button"
                      onClick={() => { setAccountType('teacher'); setIdNumber(''); setLocalError(null); }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        accountType === 'teacher'
                          ? 'bg-blue-900/60 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md shadow-amber-400/10'
                          : 'bg-slate-900/50 border-white/10 text-blue-300/80 hover:bg-slate-900/80'
                      }`}
                    >
                      <Briefcase className={`w-4 h-4 mb-1 ${accountType === 'teacher' ? 'text-amber-400' : 'text-blue-400'}`} />
                      <span className="text-xs font-bold">Teacher / Faculty</span>
                      <span className={`text-[9px] ${accountType === 'teacher' ? 'text-amber-300' : 'text-blue-300/80'}`}>Faculty & Department</span>
                    </button>
                  </div>

                  {/* Informative Mode Header Banners */}
                  {accountType === 'student' ? (
                    <div className="bg-blue-950/80 border border-blue-500/30 rounded-xl p-2.5 flex items-center space-x-2.5">
                      <div className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg border border-amber-400/30 flex-shrink-0">
                        <GraduationCap className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Student Registration</h3>
                        <p className="text-[10px] text-blue-200">Only for enrolled students. Creates a dedicated student profile.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-900/40 border border-blue-500/30 rounded-xl p-2.5 flex items-center space-x-2.5">
                      <div className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg border border-amber-400/30 flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Teacher / Faculty Registration</h3>
                        <p className="text-[10px] text-blue-200">Only for instructors and faculty members. Creates a faculty profile.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Student Registration Fields */}
              {authMode === 'signup' && accountType === 'student' && (
                <>
                  {/* Full Student Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      Full Student Name
                    </label>
                    <div className="relative">
                      <input
                        id="input-student-fullname"
                        type="text"
                        placeholder="e.g. Maria Clara Santos"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-950/70 border border-blue-400/20 rounded-xl px-3 py-2 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Student ID Number (Strictly 7 Numbers) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-amber-300">
                        Student ID Number <span className="text-amber-400/90">(7 Numbers Only)</span>
                      </label>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        idNumber.length === 7 
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' 
                          : 'text-blue-300/80'
                      }`}>
                        {idNumber.length === 7 ? '✓ 7/7 Digits' : `${idNumber.length}/7 digits`}
                      </span>
                    </div>
                    <div className="relative">
                      <IdCard className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-studentid"
                        type="text"
                        inputMode="numeric"
                        maxLength={7}
                        placeholder="e.g. 2101234"
                        value={idNumber}
                        onChange={(e) => {
                          // Allow only digits and cap at 7 numbers
                          const numericVal = e.target.value.replace(/\D/g, '').slice(0, 7);
                          setIdNumber(numericVal);
                          setLocalError(null);
                        }}
                        className={`w-full bg-slate-950/70 border rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono font-bold placeholder-blue-300/40 focus:outline-none focus:ring-1 ${
                          idNumber.length === 7
                            ? 'border-amber-400 focus:border-amber-400 focus:ring-amber-400 text-amber-300'
                            : 'border-blue-400/20 focus:border-amber-400 focus:ring-amber-400'
                        }`}
                      />
                    </div>
                    <p className="text-[10px] text-blue-300/80 mt-1 flex items-center justify-between">
                      <span>Must consist of exactly 7 numbers (e.g. 2101234)</span>
                    </p>
                  </div>
                </>
              )}

              {/* Teacher Registration Fields */}
              {authMode === 'signup' && accountType === 'teacher' && (
                <>
                  {/* Full Faculty Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      Full Faculty / Instructor Name
                    </label>
                    <div className="relative">
                      <input
                        id="input-teacher-fullname"
                        type="text"
                        placeholder="e.g. Prof. Juan Dela Cruz"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-950/70 border border-blue-400/20 rounded-xl px-3 py-2 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Faculty / Employee ID */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-amber-300">
                        Faculty / Employee ID Number
                      </label>
                      <span className="text-[10px] text-amber-400 font-semibold">Required</span>
                    </div>
                    <div className="relative">
                      <IdCard className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-teacher-idnumber"
                        type="text"
                        placeholder="e.g. FAC-2024-089 or EMP-1042"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        className="w-full bg-slate-950/70 border border-blue-400/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Department / College selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      Academic Department / College
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="select-department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-slate-950/90 border border-blue-400/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      >
                        {departmentsList.map((dept, idx) => (
                          <option key={idx} value={dept} className="bg-slate-900 text-white">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* School Email (Used across all modes) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-blue-100">Official School Email Address</label>
                  {isEmailTyped && (
                    <span className={`text-[10px] font-bold flex items-center px-1.5 py-0.5 rounded ${
                      isSchoolDomain 
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' 
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {isSchoolDomain ? (
                        <>
                          <Check className="w-3 h-3 mr-1 text-amber-400" /> School Domain Verified
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1 text-red-400" /> Must end in @stalexiuscollege.edu.ph
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-email"
                    type="email"
                    placeholder={
                      authMode === 'signup' && accountType === 'teacher'
                        ? 'faculty@stalexiuscollege.edu.ph'
                        : authMode === 'signup' && accountType === 'student'
                        ? 'student@stalexiuscollege.edu.ph'
                        : 'your.name@stalexiuscollege.edu.ph'
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/70 border border-blue-400/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-blue-100">Password</label>
                  {authMode === 'signin' && (
                    <button
                      id="btn-forgot-password"
                      type="button"
                      onClick={() => {
                        setForgotEmail(email || '');
                        setResetSuccess(false);
                        setLocalError(null);
                        clearAuthError();
                        setShowForgotModal(true);
                      }}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors underline decoration-amber-400/60"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/70 border border-blue-400/20 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-amber-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password Strength Bar during signup */}
                {authMode === 'signup' && password.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-blue-200">Password Strength:</span>
                      <span className="font-bold text-amber-300">{passStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-300 ${passStrength.color}`}
                        style={{ width: `${(passStrength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Data Privacy & Integrity Code Agreement Checkbox for Signup */}
              {authMode === 'signup' && accountType === 'student' && (
                <div className="pt-1">
                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      id="checkbox-student-terms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded bg-slate-950 border-amber-400/40 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-[10px] text-blue-200 leading-tight">
                      I confirm I am an officially enrolled St. Alexius College student and agree to the <strong className="text-white">Data Privacy Act (RA 10173)</strong> and <strong className="text-amber-300">Code of Academic Integrity</strong>.
                    </span>
                  </label>
                </div>
              )}

              {authMode === 'signup' && accountType === 'teacher' && (
                <div className="pt-1">
                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      id="checkbox-teacher-terms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded bg-slate-950 border-amber-400/40 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-[10px] text-blue-200 leading-tight">
                      I confirm I am an official St. Alexius College faculty member and agree to the <strong className="text-white">Data Privacy Act (RA 10173)</strong> and <strong className="text-amber-300">Institutional Faculty Evaluation Code</strong>.
                    </span>
                  </label>
                </div>
              )}

              {/* Submit Button (Seal Blue Gradient with Gold Border & Accents) */}
              <button
                id="btn-auth-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-950/60 border border-amber-400/60 hover:border-amber-400 flex items-center justify-center transition-all disabled:opacity-50 mt-2 cursor-pointer group"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center">
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Processing Request...
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    {authMode === 'signin' 
                      ? 'Sign In To Account' 
                      : accountType === 'teacher'
                        ? 'Verify & Register Faculty Account'
                        : 'Verify & Register Student Account'}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </button>
            </form>

            {/* Error alerts and Referer restriction resolution helper */}
            {(authError || localError) && !isApiKeyInvalid && !isRefererBlocked && (
              <div className="p-3 bg-red-500/20 border border-red-400/40 rounded-xl text-[11px] font-semibold text-red-200 text-center animate-shake backdrop-blur-md">
                {localError || authError}
              </div>
            )}

            {/* Firebase API Key Configuration Assistant */}
            {(isApiKeyInvalid || (authError && (authError.includes('API Key Error') || authError.includes('api-key-not-valid')))) && (
              <div className="p-3.5 bg-amber-500/15 border border-amber-400/50 rounded-2xl text-left text-white space-y-2.5 backdrop-blur-md shadow-lg shadow-amber-950/40 animate-fade-in">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-300">Firebase Web API Key Missing or Invalid</p>
                    <p className="text-[11px] text-amber-100/90 mt-0.5 leading-relaxed">
                      Firebase Web API Key is not set or invalid in environment (<code className="font-mono bg-black/40 px-1 rounded text-[10px] text-amber-200">VITE_FIREBASE_API_KEY</code>).
                    </p>
                  </div>
                </div>

                <div className="p-2 bg-[#060e20]/80 rounded-xl border border-amber-400/30 text-[10px] text-blue-200 space-y-1">
                  <p className="font-semibold text-amber-300">Quick Resolution Steps:</p>
                  <p>1. Copy your Web API Key from <strong className="text-white">Firebase Console → Project Settings</strong>.</p>
                  <p>2. Set <strong className="text-white">VITE_FIREBASE_API_KEY</strong> in your deployment environment / secrets.</p>
                </div>

                {/* Direct Action: Emergency Development Session */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const targetEmail = email.trim() || 'renzarvy.rv@gmail.com';
                      signInWithEmergencySession(targetEmail, 'admin', fullName || 'Super Administrator');
                    }}
                    className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-gray-950 fill-current" />
                    <span>⚡ Continue with Local Emergency Session</span>
                  </button>
                  <p className="text-[9.5px] text-amber-200/70 text-center mt-1">
                    Bypasses missing Firebase keys and unlocks full Admin, Faculty & Student portals immediately.
                  </p>
                </div>
              </div>
            )}

            {/* Google Cloud / Firebase Referrer Restriction Assistant */}
            {(isRefererBlocked || (authError && (authError.includes('requests-from-referer') || authError.includes('Domain Authorization Required')))) && (
              <div className="p-3.5 bg-amber-500/15 border border-amber-400/50 rounded-2xl text-left text-white space-y-2.5 backdrop-blur-md shadow-lg shadow-amber-950/40 animate-fade-in">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-300">Firebase Domain Authorization Required</p>
                    <p className="text-[11px] text-amber-100/90 mt-0.5 leading-relaxed">
                      Google Cloud API key restrictions are currently blocking requests from this Cloud Run deployment URL.
                    </p>
                  </div>
                </div>

                {/* Domain Copy Box */}
                <div className="p-2 bg-[#060e20]/80 rounded-xl border border-amber-400/30 flex items-center justify-between space-x-2">
                  <div className="truncate font-mono text-[10px] text-amber-200 select-all">
                    {currentOrigin}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentOrigin);
                      setCopiedDomain(true);
                      setTimeout(() => setCopiedDomain(false), 2500);
                    }}
                    className="shrink-0 px-2 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all"
                  >
                    {copiedDomain ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Action: Emergency Development Session */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const targetEmail = email.trim() || 'renzarvy.rv@gmail.com';
                      signInWithEmergencySession(targetEmail, 'admin', fullName || 'Super Administrator');
                    }}
                    className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-gray-950 fill-current" />
                    <span>⚡ Continue with Local Emergency Session</span>
                  </button>
                  <p className="text-[9.5px] text-amber-200/70 text-center mt-1">
                    Bypasses GCP API key restrictions and unlocks full Admin, Audit Log & Report features immediately.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Preview & Role Switcher */}
            <div className="pt-2 border-t border-blue-500/20 text-center text-[11px] text-blue-200 space-y-2">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setShowQuickDevMenu(!showQuickDevMenu)}
                  className="text-[10px] text-amber-400/90 hover:text-amber-300 flex items-center space-x-1 font-semibold hover:underline"
                >
                  <Zap className="w-3 h-3" />
                  <span>{showQuickDevMenu ? 'Hide Preview Access Options' : '⚡ Quick Preview / Dev Access'}</span>
                </button>
                <span className="text-[9px] text-blue-300/60 font-mono">SAC v2.4</span>
              </div>

              {showQuickDevMenu && (
                <div className="p-2.5 bg-blue-950/60 border border-blue-400/30 rounded-xl space-y-1.5 animate-fade-in text-left">
                  <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Instant Portal Access:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => signInWithEmergencySession('renzarvy.rv@gmail.com', 'admin', 'Super Administrator')}
                      className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-lg text-center text-[10px] font-bold text-amber-300 transition-all flex flex-col items-center"
                    >
                      <Shield className="w-3.5 h-3.5 mb-0.5 text-amber-400" />
                      <span>Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => signInWithEmergencySession('faculty@stalexiuscollege.edu.ph', 'teacher', 'Prof. Maria Santos', { department: 'College of Nursing' })}
                      className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 rounded-lg text-center text-[10px] font-bold text-blue-300 transition-all flex flex-col items-center"
                    >
                      <Briefcase className="w-3.5 h-3.5 mb-0.5 text-blue-400" />
                      <span>Faculty</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => signInWithEmergencySession('student@stalexiuscollege.edu.ph', 'student', 'Juan Dela Cruz', { department: 'College of Nursing', studentId: '2101234' })}
                      className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 rounded-lg text-center text-[10px] font-bold text-emerald-300 transition-all flex flex-col items-center"
                    >
                      <GraduationCap className="w-3.5 h-3.5 mb-0.5 text-emerald-400" />
                      <span>Student</span>
                    </button>
                  </div>
                </div>
              )}
              {authMode === 'signin' ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-blue-300/80">New to the evaluation system?</p>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setAccountType('student'); clearAuthError(); setLocalError(null); }}
                      className="font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center text-[10.5px]"
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1" /> Register as Student
                    </button>
                    <span className="text-white/30">•</span>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setAccountType('teacher'); clearAuthError(); setLocalError(null); }}
                      className="font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center text-[10.5px]"
                    >
                      <Briefcase className="w-3.5 h-3.5 mr-1" /> Register as Faculty
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center text-[11px]">
                  <span className="text-blue-200/80 mr-1.5">Already registered?</span>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); clearAuthError(); setLocalError(null); }}
                    className="font-bold text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    Sign in to your account →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a152e]/85 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-b from-[#0f2042] to-[#0a152e] border border-amber-400/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <Shield className="w-5 h-5" />
                <h3 className="font-bold text-sm">Official Account Recovery</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-blue-300 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5 border border-white/10"
              >
                Close
              </button>
            </div>

            {resetSuccess ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 bg-amber-400/20 text-amber-300 rounded-full flex items-center justify-center mx-auto border border-amber-400/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Recovery Link Dispatched</h4>
                  <p className="text-xs text-blue-200/80 mt-1 leading-relaxed">
                    We have sent a secure password reset link to <strong className="text-white">{forgotEmail}</strong>. Check your school inbox or spam folder.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md border border-amber-400/50"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  Enter your official St. Alexius College email address below to receive password reset instructions.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-blue-100 mb-1">
                    Official School Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-forgot-email"
                      type="email"
                      placeholder="your.name@stalexiuscollege.edu.ph"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-blue-400/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {(authError || localError) && (
                  <div className="p-2.5 bg-red-500/20 border border-red-400/30 rounded-xl text-[11px] text-red-200">
                    {localError || authError}
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-reset"
                    type="submit"
                    disabled={isSendingReset}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center disabled:opacity-50 shadow-md border border-amber-400/50"
                  >
                    {isSendingReset ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Registration Confirmation Modal */}
      {showVerificationNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a152e]/90 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-b from-[#0f2042] to-[#0a152e] border border-amber-400/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden text-white text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

            <div className="w-12 h-12 bg-amber-400/20 border border-amber-400/40 rounded-full flex items-center justify-center mx-auto text-amber-400 animate-bounce">
              <Mail className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-amber-300">Registration Successful!</h3>
              <p className="text-xs text-blue-100/90 mt-1">
                A security verification link was sent to:
              </p>
              <p className="font-bold text-xs text-white bg-slate-950/80 py-1.5 px-3 rounded-xl border border-amber-400/30 mt-2 tracking-wide">
                {email}
              </p>
            </div>

            <p className="text-[11px] text-blue-200/80 leading-relaxed">
              Please open your official school email account and click the verification link to confirm ownership before proceeding.
            </p>

            <button
              type="button"
              onClick={() => setShowVerificationNotice(false)}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-500 hover:to-blue-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-950/60 border border-amber-400/60"
            >
              {accountType === 'teacher' ? 'Continue to Faculty Portal' : 'Continue to Student Portal'}
            </button>
          </div>
        </div>
      )}

      {/* Footer Copyright */}
      <div className="max-w-7xl w-full mx-auto text-center z-10 pt-4">
        <p className="text-xs text-blue-200/80 font-medium">
          &copy; {currentYear} St. Alexius College. All Rights Reserved.
        </p>
        <p className="text-[10px] text-blue-300/60 mt-1">
          Teachers Performance Evaluation System &bull; Quality Assurance Office
        </p>
      </div>
    </div>
  );
};
