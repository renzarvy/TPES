import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useGlobalToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Building2, 
  Sparkles, 
  Database, 
  ChevronDown, 
  Check, 
  RotateCcw,
  Zap,
  HelpCircle,
  Eye,
  Layers,
  Crown
} from 'lucide-react';
import { 
  seedDemoDataToStorage, 
  clearDemoDataFromStorage, 
  isDemoDataSeeded,
  DEMO_FACULTY_MEMBERS 
} from '../../lib/demoReportsData';

export interface RoleDemoOption {
  id: string;
  role: UserRole;
  title: string;
  subtitle: string;
  email: string;
  name: string;
  department: string;
  idNumber: string;
  icon: React.ElementType;
  badgeColor: string;
  description: string;
}

export const DEMO_ROLES: RoleDemoOption[] = [
  {
    id: 'admin',
    role: 'admin',
    title: 'Administrator',
    subtitle: 'Institutional Oversight',
    email: 'admin@stalexiuscollege.edu.ph',
    name: 'Dr. Alexius Admin',
    department: 'Office of the Academic Vice President',
    idNumber: 'ADM-001',
    icon: Crown,
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'Full administrative access: analytics, teacher verification, evaluation schedules, criteria editor, and reports.'
  },
  {
    id: 'dean',
    role: 'admin',
    title: 'Dean / Chair',
    subtitle: 'College of Nursing',
    email: 'dean.nursing@stalexiuscollege.edu.ph',
    name: 'Dean Arthur Reyes, RN, PhD',
    department: 'College of Nursing',
    idNumber: 'DEAN-101',
    icon: Building2,
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    description: 'Department head oversight: departmental rating distributions, faculty roster, and performance monitoring.'
  },
  {
    id: 'teacher',
    role: 'teacher',
    title: 'Faculty Member',
    subtitle: 'Prof. Maria Santos',
    email: 'maria.santos@stalexiuscollege.edu.ph',
    name: 'Prof. Maria Santos, RN, MN',
    department: 'College of Nursing',
    idNumber: 'EMP-7012',
    icon: UserCheck,
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    description: 'Instructor dashboard: individual performance scores, criteria radar breakdown, student qualitative feedback, and self-reflection.'
  },
  {
    id: 'student',
    role: 'student',
    title: 'Student Evaluator',
    subtitle: 'Juan Dela Cruz',
    email: 'student@stalexiuscollege.edu.ph',
    name: 'Juan A. Dela Cruz',
    department: 'College of Computer Studies',
    idNumber: '2024-10294',
    icon: GraduationCap,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description: 'Student portal: faculty evaluation checklist, verified student status, rating questionnaire, and evaluation receipts.'
  }
];

export const RoleDemoSwitcher: React.FC<{ compact?: boolean; className?: string }> = ({ 
  compact = false,
  className = ''
}) => {
  const { user, role, signInWithEmergencySession } = useAuth();
  const { withLoading } = useLoading();
  const { showSuccess, showInfo } = useGlobalToast();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [demoSeeded, setDemoSeeded] = useState<boolean>(() => isDemoDataSeeded());
  const [switching, setSwitching] = useState(false);

  // Determine current active demo role
  const currentUserEmail = (user?.email || '').toLowerCase().trim();
  const currentRole = DEMO_ROLES.find(r => r.email.toLowerCase() === currentUserEmail) || 
    DEMO_ROLES.find(r => r.role === role) || 
    DEMO_ROLES[0];

  const handleSwitchRole = async (target: RoleDemoOption) => {
    setIsOpen(false);
    setSwitching(true);

    try {
      // Automatically ensure demo benchmark dataset is seeded so the role dashboard has full data
      if (!isDemoDataSeeded()) {
        seedDemoDataToStorage();
        setDemoSeeded(true);
      }

      await withLoading(
        () => signInWithEmergencySession(
          target.email,
          target.role,
          target.name,
          {
            department: target.department,
            studentId: target.idNumber,
            employeeId: target.idNumber,
            idNumber: target.idNumber
          }
        ),
        `Switching to ${target.title} Demo (${target.name})...`
      );

      showSuccess(`Switched to ${target.title}`, `Now viewing workspace as ${target.name} (${target.department}).`);
      navigate('/dashboard');
      window.dispatchEvent(new CustomEvent('sac_demo_role_changed', { detail: target }));
    } catch (err) {
      console.error("Error switching demo role:", err);
    } finally {
      setSwitching(false);
    }
  };

  const handleToggleDemoData = () => {
    if (demoSeeded) {
      clearDemoDataFromStorage();
      setDemoSeeded(false);
      showInfo('Demo Data Cleared', 'Sample teachers and evaluations have been removed from local storage.');
    } else {
      const res = seedDemoDataToStorage();
      setDemoSeeded(true);
      showSuccess('Demo Data Loaded', `Populated ${res.teacherCount} faculty members and ${res.evalCount} realistic student evaluations.`);
    }
    window.dispatchEvent(new CustomEvent('sac_demo_data_toggled', { detail: !demoSeeded }));
    window.dispatchEvent(new Event('storage'));
  };

  if (compact) {
    return (
      <div className={`relative inline-block text-left ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={switching}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition cursor-pointer"
          title="Switch Demo Role"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span className="hidden sm:inline">Demo:</span>
          <span className="font-extrabold truncate max-w-[90px]">{currentRole.title}</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2 text-slate-100 divide-y divide-slate-800">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Role Dashboard Simulator
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    4 Roles
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  1-Click switch to preview the dashboard of each academic role.
                </p>
              </div>

              <div className="py-1 space-y-1">
                {DEMO_ROLES.map((r) => {
                  const Icon = r.icon;
                  const isSelected = r.email.toLowerCase() === currentUserEmail || (r.role === role && r.id !== 'dean');

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSwitchRole(r)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-start gap-2.5 transition cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600/20 border border-blue-500/40 text-white' 
                          : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${r.badgeColor}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate">{r.title}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{r.name}</p>
                        <p className="text-[9px] text-slate-500 truncate">{r.department}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 px-2 pb-1">
                <button
                  type="button"
                  onClick={handleToggleDemoData}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Database className="w-3 h-3 text-amber-400" />
                  <span>{demoSeeded ? 'Reset / Re-seed Demo Dataset' : 'Load Benchmark Demo Dataset'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full-width bar or card layout
  return (
    <div className={`bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-800/40 rounded-2xl p-4 shadow-lg text-white ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <span>Interactive Role Dashboard Simulator</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">
                Instant Switch
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Select any role below to instantly preview its live dashboard, charts, forms, and workflows.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleDemoData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer self-start sm:self-auto"
        >
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span>{demoSeeded ? 'Re-seed Demo Data' : 'Seed 170+ Demo Evals'}</span>
        </button>
      </div>

      {/* Role Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {DEMO_ROLES.map((r) => {
          const Icon = r.icon;
          const isSelected = r.email.toLowerCase() === currentUserEmail || (r.role === role && r.id !== 'dean');

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSwitchRole(r)}
              disabled={switching}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-blue-600/25 border-blue-400 shadow-md ring-1 ring-blue-400'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${r.badgeColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.title}</span>
                  </span>
                  {isSelected ? (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium group-hover:text-slate-300">
                      Switch &rarr;
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-white truncate">{r.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{r.department}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400/90 leading-tight">
                {r.subtitle} &bull; <span className="font-mono text-slate-500">{r.idNumber}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
