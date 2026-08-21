import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowRight, LogIn, Shield, Award, BookOpen, Users, CheckCircle2, 
  Sparkles, HeartHandshake, Scale, Feather, Compass, Star, ChevronRight,
  ExternalLink, Layers, GraduationCap, Building2, HelpCircle, X, Lock,
  History, Calendar, FileSpreadsheet, Cpu, Activity, Clock, BarChart3,
  TrendingUp, Check, Info, ArrowUpRight, Network
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, logOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'home' | 'values' | 'framework' | 'pieces'>('home');

  const [academicPeriod, setAcademicPeriod] = useState({
    year: '2025-2026',
    semester: '1st Semester',
    isEvalOpen: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const genDoc = await getDoc(doc(db, 'settings', 'general'));
        if (genDoc.exists()) {
          const data = genDoc.data();
          setAcademicPeriod({
            year: data.academicYear || '2025-2026',
            semester: data.semester || '1st Semester',
            isEvalOpen: data.isEvaluationOpen !== false
          });
        }
      } catch (err) {
        console.warn("Settings fetch notice:", err);
      }
    };
    fetchSettings();
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStartEvaluation = () => {
    if (user) {
      if (role === 'student' || role === 'teacher' || role === 'admin') {
        navigate('/');
      } else {
        navigate('/portal');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-[#c59b27] selection:text-slate-900">
      
      {/* 1. Top Ribbon */}
      <header className="bg-[#0c1a36] text-white py-2 px-4 sm:px-8 border-b border-blue-900/40 text-[11px] sm:text-xs z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1.5 sm:gap-4 tracking-wider">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold tracking-[0.2em]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#c59b27]" />
            <span>OFFICE OF ACADEMIC AFFAIRS &middot; GUIDANCE & TESTING CENTER</span>
          </div>
          <div className="font-bold text-[#c59b27] tracking-[0.16em] uppercase flex items-center gap-2">
            <span>EXPERIENCE THE ALEXIAN DIFFERENCE!</span>
          </div>
        </div>
      </header>

      {/* 2. Main Navigation Bar */}
      <nav className="bg-white text-slate-900 sticky top-0 z-40 shadow-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-4 flex justify-between items-center">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
            className="flex items-center space-x-3 sm:space-x-4 cursor-pointer group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-[#162a56]/20 p-0.5 shadow-sm group-hover:scale-105 transition-transform bg-slate-50">
              <img 
                src="/logo.png" 
                alt="St. Alexius College Seal" 
                className="w-full h-full object-contain"
                onError={(e: any) => {
                  e.target.onerror = null;
                  e.target.src = 'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/favicon.ico';
                }}
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-serif-display font-bold text-[#162a56] leading-tight tracking-tight">
                St. Alexius College
              </h1>
              <p className="text-[9px] sm:text-[10.5px] tracking-[0.22em] font-semibold text-slate-500 uppercase mt-0.5">
                FACULTY PERFORMANCE EVALUATION SYSTEM
              </p>
            </div>
          </div>

          {/* Nav Links & Action */}
          <div className="flex items-center space-x-2 sm:space-x-6 md:space-x-8">
            <div className="hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-700">
              <button 
                onClick={() => {
                  setActiveTab('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative py-1 transition-colors hover:text-[#162a56] font-semibold ${activeTab === 'home' ? 'text-[#162a56]' : 'text-slate-600'}`}
              >
                Home
                {activeTab === 'home' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#c59b27] rounded-full" />
                )}
              </button>

              <button 
                onClick={() => {
                  setActiveTab('values');
                  scrollToSection('core-values');
                }}
                className={`relative py-1 transition-colors hover:text-[#162a56] ${activeTab === 'values' ? 'text-[#162a56] font-semibold' : 'text-slate-600'}`}
              >
                Core Values
                {activeTab === 'values' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#c59b27] rounded-full" />
                )}
              </button>

              <button 
                onClick={() => {
                  setActiveTab('framework');
                  scrollToSection('framework');
                }}
                className={`relative py-1 transition-colors hover:text-[#162a56] ${activeTab === 'framework' ? 'text-[#162a56] font-semibold' : 'text-slate-600'}`}
              >
                Framework
                {activeTab === 'framework' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#c59b27] rounded-full" />
                )}
              </button>

              <button 
                onClick={() => {
                  setActiveTab('pieces');
                  scrollToSection('pieces-section');
                }}
                className={`relative py-1 transition-colors hover:text-[#162a56] ${activeTab === 'pieces' ? 'text-[#162a56] font-semibold' : 'text-slate-600'}`}
              >
                PIECES Model
                {activeTab === 'pieces' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#c59b27] rounded-full" />
                )}
              </button>
            </div>

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/')}
                  className="bg-[#162a56] hover:bg-[#0f1d3c] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded shadow transition-colors flex items-center space-x-2"
                >
                  <GraduationCap className="w-4 h-4 text-[#c59b27]" />
                  <span>Go to Dashboard</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="bg-[#162a56] hover:bg-[#0f1d3c] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded shadow transition-all flex items-center space-x-2 active:scale-95"
              >
                <LogIn className="w-4 h-4 text-[#c59b27]" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 3. Hero Section */}
      <section className="relative bg-[#162c5b] text-white overflow-hidden py-16 sm:py-20 lg:py-24 border-b border-blue-900/50">
        
        {/* Subtle College Seal Watermark & Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-no-repeat bg-right opacity-20 pointer-events-none transition-opacity"
          style={{ 
            backgroundImage: `radial-gradient(circle at 75% 50%, rgba(22, 44, 91, 0.4), rgba(15, 23, 42, 0.95)), url('/logo.png')`,
            backgroundSize: 'contain',
            backgroundPosition: 'right center'
          }}
        />

        {/* Ambient Glow */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#c59b27]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content Area */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-start text-left">
              
              {/* Eyebrow */}
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <span className="px-2.5 py-1 bg-amber-400/20 text-[#e5ca7c] border border-amber-400/30 rounded text-[10px] sm:text-[11px] font-bold tracking-[0.22em] uppercase">
                  ST. ALEXIUS COLLEGE, INC. &middot; KORONADAL CITY
                </span>
                <span className="text-blue-300 text-xs hidden sm:inline">&bull; SINCE 1971</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] xl:text-[62px] font-serif-display font-normal text-white leading-[1.14] tracking-tight mb-6 sm:mb-8">
                Teaching measured by<br />
                <span className="relative inline-block pb-1">
                  the values
                  <span className="absolute left-0 bottom-0 w-full h-[5px] sm:h-[6px] bg-[#c59b27] rounded-sm" />
                </span><br />
                we live by.
              </h1>

              {/* Description Paragraph */}
              <p className="text-slate-200/95 text-sm sm:text-base lg:text-[16.5px] leading-relaxed max-w-2xl font-light mb-4 sm:mb-6">
                Developed for the Guidance Office and Academic Affairs of St. Alexius College, Inc., 
                the Teachers Performance Evaluation System (TPES) replaces semi-manual Google Forms with 
                an automated, confidential, and mathematically validated evaluation workflow.
              </p>

              {/* Tagline */}
              <p className="font-serif-display italic text-[#e5ca7c] text-lg sm:text-xl mb-8 sm:mb-10 font-normal">
                Experience the Alexian Difference!
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={handleStartEvaluation}
                  className="w-full sm:w-auto bg-[#c59b27] hover:bg-[#b0881e] text-[#0d1c3a] font-bold text-xs sm:text-sm tracking-wider uppercase px-7 py-3.5 rounded shadow-lg flex items-center justify-center space-x-2.5 transition-all transform hover:-translate-y-0.5 active:scale-95"
                >
                  <span>START AN EVALUATION</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => scrollToSection('core-values')}
                  className="w-full sm:w-auto border border-white/40 hover:border-white hover:bg-white/10 text-white font-semibold text-xs sm:text-sm tracking-wider uppercase px-6 py-3.5 rounded transition-all flex items-center justify-center space-x-2"
                >
                  <Award className="w-4 h-4 text-[#c59b27]" />
                  <span>CORE VALUES</span>
                </button>

                <button
                  onClick={() => scrollToSection('framework')}
                  className="w-full sm:w-auto bg-blue-900/60 hover:bg-blue-900 text-blue-200 font-semibold text-xs sm:text-sm tracking-wider uppercase px-6 py-3.5 rounded transition-all flex items-center justify-center space-x-2 border border-blue-700/50"
                >
                  <Layers className="w-4 h-4" />
                  <span>VIEW FRAMEWORK</span>
                </button>
              </div>

              {/* Academic Term Info Indicator */}
              <div className="mt-8 pt-6 border-t border-blue-400/20 flex flex-wrap items-center gap-4 text-xs text-blue-200/80">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Academic Period: <strong className="text-white font-semibold">{academicPeriod.year} &middot; {academicPeriod.semester}</strong></span>
                </div>
                <span className="hidden sm:inline text-blue-400">&bull;</span>
                <div>
                  Guidance Portal: <span className="text-amber-300 font-semibold">{academicPeriod.isEvalOpen ? 'Active Evaluation Period' : 'Scheduled Maintenance'}</span>
                </div>
              </div>

            </div>

            {/* Right Graphic Area: Prominent St. Alexius College Crest */}
            <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-end items-center relative">
              <div className="relative group">
                
                {/* Glow ring */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-[#c59b27]/30 to-blue-400/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-700 pointer-events-none" />
                
                {/* Circular Seal Container */}
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-full p-2 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-sm border-2 border-white/20 shadow-2xl flex items-center justify-center transition-transform duration-500 hover:scale-[1.02]">
                  <div className="w-full h-full rounded-full bg-slate-900/60 p-4 flex items-center justify-center overflow-hidden border border-white/10">
                    <img 
                      src="/logo.png" 
                      alt="St. Alexius College Official Emblem" 
                      className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = 'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/favicon.ico';
                      }}
                    />
                  </div>
                </div>

                {/* Badge Overlay */}
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-[#0c1a36] border border-[#c59b27]/60 text-[#c59b27] px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase shadow-xl whitespace-nowrap">
                  ESTABLISHED 1971 &middot; GENSAN DRIVE
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Core Values Section */}

      {/* 5. The 5 Core Values Section */}
      <section id="core-values" className="py-20 bg-[#0a1428] text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#c59b27] text-xs font-bold tracking-[0.25em] uppercase inline-block mb-3">
              THE ALEXIAN FOUNDATION
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-display font-bold text-white mb-4">
              Five Pillars of Teaching Excellence
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              At St. Alexius College, every lecture, clinical instruction, and laboratory mentoring session 
              is guided by principles rooted in holistic development and Christian values.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* Value 1: Humility */}
            <div className="bg-gradient-to-b from-blue-950/60 to-slate-900/90 border border-blue-800/40 p-6 rounded-xl hover:border-[#c59b27]/60 transition-all duration-300 group hover:-translate-y-1 shadow-lg">
              <div className="w-12 h-12 rounded-lg bg-[#c59b27]/10 text-[#c59b27] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif-display font-bold text-white mb-2 group-hover:text-[#c59b27] transition-colors">
                Humility
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Openness to constructive feedback, approachable guidance, and empathetic recognition of learner diversity.
              </p>
            </div>

            {/* Value 2: Integrity */}
            <div className="bg-gradient-to-b from-blue-950/60 to-slate-900/90 border border-blue-800/40 p-6 rounded-xl hover:border-[#c59b27]/60 transition-all duration-300 group hover:-translate-y-1 shadow-lg">
              <div className="w-12 h-12 rounded-lg bg-[#c59b27]/10 text-[#c59b27] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif-display font-bold text-white mb-2 group-hover:text-[#c59b27] transition-colors">
                Integrity
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Academic honesty, fair and transparent assessment criteria, and unwavering ethical conduct in and out of the classroom.
              </p>
            </div>

            {/* Value 3: Simplicity */}
            <div className="bg-gradient-to-b from-blue-950/60 to-slate-900/90 border border-blue-800/40 p-6 rounded-xl hover:border-[#c59b27]/60 transition-all duration-300 group hover:-translate-y-1 shadow-lg">
              <div className="w-12 h-12 rounded-lg bg-[#c59b27]/10 text-[#c59b27] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Feather className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif-display font-bold text-white mb-2 group-hover:text-[#c59b27] transition-colors">
                Simplicity
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Clarity in instructional delivery, direct communication, and purposeful pedagogical materials focused on mastery.
              </p>
            </div>

            {/* Value 4: Service */}
            <div className="bg-gradient-to-b from-blue-950/60 to-slate-900/90 border border-blue-800/40 p-6 rounded-xl hover:border-[#c59b27]/60 transition-all duration-300 group hover:-translate-y-1 shadow-lg">
              <div className="w-12 h-12 rounded-lg bg-[#c59b27]/10 text-[#c59b27] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif-display font-bold text-white mb-2 group-hover:text-[#c59b27] transition-colors">
                Service
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Dedication to student growth, compassionate consultation hours, and proactive institutional contributions.
              </p>
            </div>

            {/* Value 5: Excellence */}
            <div className="bg-gradient-to-b from-blue-950/60 to-slate-900/90 border border-blue-800/40 p-6 rounded-xl hover:border-[#c59b27]/60 transition-all duration-300 group hover:-translate-y-1 shadow-lg">
              <div className="w-12 h-12 rounded-lg bg-[#c59b27]/10 text-[#c59b27] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif-display font-bold text-white mb-2 group-hover:text-[#c59b27] transition-colors">
                Excellence
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Subject mastery, innovative teaching techniques, and continuous professional and pedagogical advancement.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. The Evaluation Framework Breakdown */}
      <section id="framework" className="py-20 bg-slate-950 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5">
              <span className="text-[#c59b27] text-xs font-bold tracking-[0.25em] uppercase inline-block mb-3">
                STANDARDS & ASSESSMENT
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif-display font-bold text-white mb-6">
                A Multi-Faceted Evaluation Framework
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                Our evaluation system integrates verified student evaluations, faculty self-reflections, 
                and peer reviews to generate clear, actionable insights for academic growth.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#c59b27] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Confidential & Anonymous Ratings</h4>
                    <p className="text-xs text-slate-400">Student submissions are strictly anonymized to encourage candid and honest developmental feedback.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#c59b27] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Institutional Quality Assurance</h4>
                    <p className="text-xs text-slate-400">Real-time department benchmarks align with CHED and academic accreditation criteria.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#c59b27] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Actionable Formative Feedback</h4>
                    <p className="text-xs text-slate-400">Faculty receive targeted feedback summaries with criteria breakdowns to enhance curriculum delivery.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <div className="text-2xl font-serif-display font-bold text-[#c59b27] mb-1">01</div>
                <h4 className="text-base font-bold text-white mb-2">Teaching & Pedagogy</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Subject matter expertise, clarity of syllabus, organization of lectures, and utilization of engaging instructional materials.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <div className="text-2xl font-serif-display font-bold text-[#c59b27] mb-1">02</div>
                <h4 className="text-base font-bold text-white mb-2">Classroom Management</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Punctuality, conducive learning atmosphere, efficient time management, and encouraging inclusive class participation.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <div className="text-2xl font-serif-display font-bold text-[#c59b27] mb-1">03</div>
                <h4 className="text-base font-bold text-white mb-2">Assessment & Feedback</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fairness of exams, transparency of grading criteria, and timely return of quizzes and assignments.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <div className="text-2xl font-serif-display font-bold text-[#c59b27] mb-1">04</div>
                <h4 className="text-base font-bold text-white mb-2">Core Values Alignment</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Demonstration of humility, integrity, simplicity, service, and excellence in student interactions.
                </p>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 7. PIECES Framework Section */}
      <section id="pieces-section" className="py-20 bg-[#0c1a36] text-white border-t border-blue-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#c59b27] text-xs font-bold tracking-[0.25em] uppercase inline-block mb-3">
              SYSTEM EVALUATION DIMENSIONS
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-display font-bold text-white mb-4">
              The PIECES Framework Analysis
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Evaluating the multidimensional institutional impact of transitioning from semi-manual Google Forms 
              to an automated, centralized web platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* P - Performance */}
            <div className="bg-slate-900/80 border border-blue-800/40 p-6 rounded-xl relative overflow-hidden">
              <div className="text-3xl font-serif-display font-extrabold text-[#c59b27] mb-2">P</div>
              <h3 className="text-lg font-bold text-white mb-2">Performance</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Automating the compilation and mathematical aggregation of student evaluations eliminates manual calculation bottlenecks and drastically reduces report generation turnaround times.
              </p>
              <div className="text-[11px] text-amber-300/90 font-medium">Outcome: Rapid throughput & real-time analytics</div>
            </div>

            {/* I - Information */}
            <div className="bg-slate-900/80 border border-blue-800/40 p-6 rounded-xl relative overflow-hidden">
              <div className="text-3xl font-serif-display font-extrabold text-[#c59b27] mb-2">I</div>
              <h3 className="text-lg font-bold text-white mb-2">Information & Data Quality</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Centralized database persistence ensures data consistency, accurate weighted calculations, and organized archival without spreadsheet encoding discrepancy risks.
              </p>
              <div className="text-[11px] text-amber-300/90 font-medium">Outcome: High-fidelity, verified records</div>
            </div>

            {/* E - Economics */}
            <div className="bg-slate-900/80 border border-blue-800/40 p-6 rounded-xl relative overflow-hidden">
              <div className="text-3xl font-serif-display font-extrabold text-[#c59b27] mb-2">E</div>
              <h3 className="text-lg font-bold text-white mb-2">Economics</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Reduces institutional expenditures on physical paper forms, manual filing supplies, and unnecessary clerical overtime, freeing up resources for faculty development.
              </p>
              <div className="text-[11px] text-amber-300/90 font-medium">Outcome: Sustainable, cost-effective operations</div>
            </div>

            {/* C - Control & Security */}
            <div className="bg-slate-900/80 border border-blue-800/40 p-6 rounded-xl relative overflow-hidden">
              <div className="text-3xl font-serif-display font-extrabold text-[#c59b27] mb-2">C</div>
              <h3 className="text-lg font-bold text-white mb-2">Control & Security</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Implements strict role-based access control (RBAC), student anonymity safeguards, and protected cloud encryption against unauthorized data modification or viewing.
              </p>
              <div className="text-[11px] text-amber-300/90 font-medium">Outcome: Robust data privacy & confidentiality</div>
            </div>

            {/* E - Efficiency */}
            <div className="bg-slate-900/80 border border-blue-800/40 p-6 rounded-xl relative overflow-hidden">
              <div className="text-3xl font-serif-display font-extrabold text-[#c59b27] mb-2">E</div>
              <h3 className="text-lg font-bold text-white mb-2">Efficiency</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Reduces administrative steps for the Guidance Office, enabling instant generation of faculty performance rankings, department summaries, and longitudinal trends.
              </p>
              <div className="text-[11px] text-amber-300/90 font-medium">Outcome: Automated end-to-end workflow</div>
            </div>

            {/* S - Service */}
            <div className="bg-slate-900/80 border border-blue-800/40 p-6 rounded-xl relative overflow-hidden">
              <div className="text-3xl font-serif-display font-extrabold text-[#c59b27] mb-2">S</div>
              <h3 className="text-lg font-bold text-white mb-2">Service</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Provides students with an accessible mobile-friendly evaluation gateway while delivering teachers meaningful, timely formative feedback for continuous instructional growth.
              </p>
              <div className="text-[11px] text-amber-300/90 font-medium">Outcome: Improved stakeholder experience</div>
            </div>

          </div>

        </div>
      </section>

      {/* 8. Quick Portal Access / Call to Action */}
      <section className="py-16 bg-[#162a56] text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-serif-display font-bold text-white mb-4">
            Ready to participate in the evaluation?
          </h2>
          <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Log in with your official St. Alexius College school email address (<code className="text-[#c59b27] font-mono">@stalexiuscollege.edu.ph</code>) to access your evaluation dashboard.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="bg-[#c59b27] hover:bg-[#b0881e] text-[#0c1a36] font-bold text-sm tracking-wider uppercase px-8 py-3.5 rounded shadow-xl flex items-center space-x-2 transition-all transform hover:scale-105"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in to Portal</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-sm tracking-wider uppercase px-8 py-3.5 rounded transition-all"
            >
              <span>Register Student Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* 9. Institutional Footer */}
      <footer className="bg-[#081020] text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white p-0.5">
                  <img src="/logo.png" alt="St. Alexius Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-white font-serif-display font-bold text-base">St. Alexius College, Inc.</h4>
                  <p className="text-[10px] tracking-widest text-slate-400 uppercase">Office of Academic Affairs &middot; Guidance Office</p>
                </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                Founded in 1961 by Dr. Arturo & Dr. Amparo Pingoy, St. Alexius College is committed to delivering quality, value-driven education across Allied Health, Nursing, Information Technology, Business, and Aviation in Koronadal City.
              </p>
            </div>

            <div>
              <h5 className="text-white font-semibold uppercase tracking-wider text-[11px] mb-3">Academic Portals</h5>
              <ul className="space-y-2">
                <li><button onClick={() => navigate('/login')} className="hover:text-[#c59b27] transition-colors">Student Evaluation Portal</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-[#c59b27] transition-colors">Faculty Performance Dashboard</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-[#c59b27] transition-colors">Guidance & Testing Center Administration</button></li>
                <li><button onClick={() => navigate('/portal')} className="hover:text-[#c59b27] transition-colors">Student Verification Status</button></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold uppercase tracking-wider text-[11px] mb-3">Institutional Location & Contacts</h5>
              <p className="text-slate-400 leading-relaxed">
                St. Alexius College, Inc.<br />
                General Santos Drive (Gensan Drive)<br />
                Koronadal City, South Cotabato, 9506 Philippines<br />
                Email: <span className="text-slate-300">academics@stalexiuscollege.edu.ph</span>
              </p>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500">
            <p>&copy; {new Date().getFullYear()} St. Alexius College, Inc. All Rights Reserved.</p>
            <div className="flex space-x-6 text-[#c59b27]">
              <span>Humility</span> &bull; 
              <span>Integrity</span> &bull; 
              <span>Simplicity</span> &bull; 
              <span>Service</span> &bull; 
              <span>Excellence</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
