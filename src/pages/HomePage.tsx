import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowRight, LogIn, Award, HeartHandshake, Scale, Feather, 
  Compass, CheckCircle2, GraduationCap, Building2, Phone, Mail, 
  MapPin, Clock, Copy, Check, Eye, Target, Sparkles, BookOpen, 
  Layers, ExternalLink, ShieldCheck, HelpCircle
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'home' | 'vision-mission' | 'values'>('home');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      } catch {
        // Defaults safely to standard institutional academic period ('2025-2026', '1st Semester')
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

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-[#c59b27] selection:text-slate-900">
      
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
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 sm:py-3.5 flex justify-between items-center">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={() => {
              setActiveTab('home');
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
              <h1 className="text-xl sm:text-2xl lg:text-[24px] font-serif-display font-bold text-[#162a56] leading-tight tracking-tight">
                St. Alexius College
              </h1>
              <p className="text-[9px] sm:text-[10px] tracking-[0.22em] font-semibold text-slate-500 uppercase mt-0.5">
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
                  setActiveTab('vision-mission');
                  scrollToSection('vision-mission');
                }}
                className={`relative py-1 transition-colors hover:text-[#162a56] ${activeTab === 'vision-mission' ? 'text-[#162a56] font-semibold' : 'text-slate-600'}`}
              >
                Mission & Vision
                {activeTab === 'vision-mission' && (
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

      {/* 3. Hero Section with Authentic Background & Seal */}
      <section className="relative bg-[#0d1c3a] text-white overflow-hidden py-16 sm:py-20 lg:py-24 border-b border-blue-900/50">
        
        {/* Background Image Texture */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none mix-blend-luminosity"
          style={{ backgroundImage: `url('/background.webp')` }}
        />

        {/* Ambient Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c1a36] via-[#10244c]/95 to-[#0b1730]/90 pointer-events-none" />

        {/* Ambient Glows */}
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
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] xl:text-[60px] font-serif-display font-normal text-white leading-[1.15] tracking-tight mb-6 sm:mb-8">
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
                the Teachers Performance Evaluation System (TPES) provides an automated, confidential, 
                and values-centered framework for continuous academic growth and instructional excellence.
              </p>

              {/* Tagline */}
              <p className="font-serif-display italic text-[#e5ca7c] text-lg sm:text-xl mb-8 sm:mb-10 font-normal">
                Experience the Alexian Difference!
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={handleStartEvaluation}
                  className="w-full sm:w-auto bg-[#c59b27] hover:bg-[#b0881e] text-[#0d1c3a] font-bold text-xs sm:text-sm tracking-wider uppercase px-7 py-3.5 rounded shadow-lg flex items-center justify-center space-x-2.5 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <span>START AN EVALUATION</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => scrollToSection('vision-mission')}
                  className="w-full sm:w-auto border border-white/40 hover:border-white hover:bg-white/10 text-white font-semibold text-xs sm:text-sm tracking-wider uppercase px-6 py-3.5 rounded transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#c59b27]" />
                  <span>MISSION & VISION</span>
                </button>

                <button
                  onClick={() => scrollToSection('core-values')}
                  className="w-full sm:w-auto bg-blue-900/60 hover:bg-blue-900 text-blue-200 font-semibold text-xs sm:text-sm tracking-wider uppercase px-6 py-3.5 rounded transition-all flex items-center justify-center space-x-2 border border-blue-700/50 cursor-pointer"
                >
                  <HeartHandshake className="w-4 h-4 text-[#c59b27]" />
                  <span>CORE VALUES</span>
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
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-92 lg:h-92 rounded-full p-2 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-sm border-2 border-white/20 shadow-2xl flex items-center justify-center transition-transform duration-500 hover:scale-[1.02]">
                  <div className="w-full h-full rounded-full bg-slate-900/80 p-4 flex items-center justify-center overflow-hidden border border-white/10">
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

      {/* 4. St. Alexius College Mission & Vision Section */}
      <section id="vision-mission" className="py-20 bg-gradient-to-b from-[#091326] via-[#0d1c3a] to-[#0a1428] text-white relative border-b border-blue-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#c59b27] text-xs font-bold tracking-[0.25em] uppercase inline-block mb-3">
              INSTITUTIONAL PHILOSOPHY
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-display font-bold text-white mb-4">
              Vision, Mission & Goals
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Rooted in Christian values, St. Alexius College strives for academic excellence, holistic education, 
              and professional competence in the service of God and humanity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            
            {/* Vision Card */}
            <div className="relative bg-gradient-to-br from-blue-950/80 via-slate-900/90 to-[#0c1a36] border-2 border-amber-400/40 rounded-2xl p-8 sm:p-10 shadow-2xl flex flex-col justify-between group hover:border-[#c59b27] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#c59b27]/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#c59b27]/15 border border-[#c59b27]/40 text-[#c59b27] flex items-center justify-center shadow-inner">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#e5ca7c] uppercase tracking-widest">Our Future</span>
                    <h3 className="text-2xl font-serif-display font-bold text-white">Institutional Vision</h3>
                  </div>
                </div>
                
                <blockquote className="text-slate-200 text-base sm:text-lg leading-relaxed font-light italic border-l-4 border-[#c59b27] pl-5 my-4">
                  &ldquo;St. Alexius College envisions to be a premier higher education institution in Southern Mindanao recognized for producing globally competent, morally upright, and compassionate professionals committed to transformative community service, sustainable development, and life-long learning.&rdquo;
                </blockquote>
              </div>

              <div className="mt-6 pt-4 border-t border-blue-900/40 flex items-center justify-between text-xs text-[#e5ca7c]">
                <span className="font-semibold uppercase tracking-wider">Alexian Identity</span>
                <span>Global Competence &middot; Moral Rectitude</span>
              </div>
            </div>

            {/* Mission Card */}
            <div className="relative bg-gradient-to-br from-blue-950/80 via-slate-900/90 to-[#0c1a36] border-2 border-blue-600/40 rounded-2xl p-8 sm:p-10 shadow-2xl flex flex-col justify-between group hover:border-blue-400 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-400/40 text-blue-300 flex items-center justify-center shadow-inner">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-blue-300 uppercase tracking-widest">Our Purpose</span>
                    <h3 className="text-2xl font-serif-display font-bold text-white">Institutional Mission</h3>
                  </div>
                </div>
                
                <blockquote className="text-slate-200 text-base sm:text-lg leading-relaxed font-light italic border-l-4 border-blue-400 pl-5 my-4">
                  &ldquo;St. Alexius College is dedicated to providing quality, accessible, and values-centered education that nurtures holistic human development through excellence in instruction, innovative research, responsive community engagement, and the integration of Christian and Alexian core values.&rdquo;
                </blockquote>
              </div>

              <div className="mt-6 pt-4 border-t border-blue-900/40 flex items-center justify-between text-xs text-blue-300">
                <span className="font-semibold uppercase tracking-wider">Alexian Commitment</span>
                <span>Instruction &middot; Research &middot; Community Extension</span>
              </div>
            </div>

          </div>

          {/* Institutional Legacy & Heritage Banner */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full bg-white p-1 flex-shrink-0 shadow-md">
                <img src="/logo.png" alt="SAC Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">A Heritage of Healing, Service & Academic Leadership</h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                  Founded by Dr. Arturo P. Pingoy and Dr. Amparo Y. Pingoy, St. Alexius College has pioneered excellence in Nursing, Allied Health Sciences, Education, Business, Information Technology, and Security Management in Koronadal City and Region XII.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => scrollToSection('core-values')}
                className="px-5 py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-[#e5ca7c] border border-amber-400/30 text-xs font-bold tracking-wider uppercase transition flex items-center space-x-2"
              >
                <span>EXPLORE PILLARS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

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

      {/* 6. Quick Portal Access / Call to Action */}
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
              className="bg-[#c59b27] hover:bg-[#b0881e] text-[#0c1a36] font-bold text-sm tracking-wider uppercase px-8 py-3.5 rounded shadow-xl flex items-center space-x-2 transition-all transform hover:scale-105 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in to Portal</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-sm tracking-wider uppercase px-8 py-3.5 rounded transition-all cursor-pointer"
            >
              <span>Register Student Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* 7. Institutional Footer */}
      <footer className="bg-[#081020] text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white p-0.5">
                  <img src="/logo.png" alt="St. Alexius Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-white font-serif-display font-bold text-base">St. Alexius College</h4>
                  <p className="text-[10px] tracking-widest text-slate-400 uppercase">Office of Academic Affairs</p>
                </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Founded in 1971 by Dr. Arturo & Dr. Amparo Pingoy, St. Alexius College is committed to delivering quality, value-driven education across Allied Health Sciences, Nursing, and Arts & Sciences in Koronadal City.
              </p>
            </div>

            <div>
              <h5 className="text-white font-semibold uppercase tracking-wider text-[11px] mb-3">Academic Portals</h5>
              <ul className="space-y-2">
                <li><button onClick={() => navigate('/login')} className="hover:text-[#c59b27] transition-colors cursor-pointer">Student Evaluation Portal</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-[#c59b27] transition-colors cursor-pointer">Faculty Performance Dashboard</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-[#c59b27] transition-colors cursor-pointer">Guidance & Testing Center</button></li>
                <li><button onClick={() => navigate('/portal')} className="hover:text-[#c59b27] transition-colors cursor-pointer">Student Verification Status</button></li>
              </ul>
            </div>

            {/* Campus Location */}
            <div>
              <h5 className="text-white font-semibold uppercase tracking-wider text-[11px] mb-3 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#c59b27]" />
                <span>Campus Location</span>
              </h5>
              <div className="text-slate-400 leading-relaxed space-y-1 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                <p className="font-bold text-slate-200">St. Alexius College, Inc.</p>
                <p>Gensan Drive, Brgy. Zone IV,</p>
                <p>City of Koronadal, 9506,</p>
                <p>South Cotabato, Philippines</p>
              </div>
            </div>

            {/* Contacts beside Campus Location */}
            <div>
              <h5 className="text-white font-semibold uppercase tracking-wider text-[11px] mb-3 flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-[#c59b27]" />
                <span>Contact Channels</span>
              </h5>
              <div className="space-y-2 text-slate-400 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Landline</span>
                  <a href="tel:0832282019" className="text-slate-300 hover:text-amber-400 font-mono transition">
                    (083) 228 2019
                  </a>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Mobile Numbers</span>
                  <div className="flex flex-col space-y-0.5 font-mono text-slate-300">
                    <a href="tel:09209748650" className="hover:text-amber-400 transition">0920 974 8650</a>
                    <a href="tel:09088127461" className="hover:text-amber-400 transition">0908 812 7461</a>
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Email</span>
                  <a href="mailto:admin@stalexiuscollege.edu.ph" className="text-amber-300 hover:underline break-all block mt-0.5">
                    admin@stalexiuscollege.edu.ph
                  </a>
                </div>
              </div>
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

export default HomePage;
