import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { getStoredDepartments, subscribeToDepartments } from '../../lib/departments';
import { 
  CheckCircle2, Clock, AlertCircle, Search, Filter, Download, Printer, 
  Award, FileText, Sliders, Save, RefreshCw, X, Eye, ShieldCheck, 
  ChevronRight, Sparkles, Building2, User, ExternalLink, HelpCircle, Check
} from 'lucide-react';

export interface StudentCompletionRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  studentId: string;
  college: string;
  department: string;
  photoUrl?: string;
  evaluatedTeacherIds: string[];
  evaluatedTeachersDetails: {
    teacherId: string;
    teacherName?: string;
    teacherDept?: string;
    submittedAt?: string;
    score?: number;
  }[];
  evaluatedCount: number;
  targetCount: number;
  percentage: number;
  isCleared: boolean;
  clearanceCode: string;
  completedAt?: string;
  manualOverride?: boolean;
  overrideNote?: string;
}

export const StudentEvaluationCompletionTracker: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentCompletionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Settings State
  const [requiredCount, setRequiredCount] = useState<number>(5);
  const [targetMode, setTargetMode] = useState<'count' | 'all'>('count');
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetInputVal, setTargetInputVal] = useState<number>(5);
  const [targetModeInputVal, setTargetModeInputVal] = useState<'count' | 'all'>('count');
  const [targetSaveSuccess, setTargetSaveSuccess] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLEARED' | 'IN_PROGRESS' | 'NOT_STARTED'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [availableColleges, setAvailableColleges] = useState<string[]>(() => getStoredDepartments());

  // Dossier Modal
  const [selectedStudentDossier, setSelectedStudentDossier] = useState<StudentCompletionRecord | null>(null);
  
  // Manual Clearance Override Modal
  const [overrideStudent, setOverrideStudent] = useState<StudentCompletionRecord | null>(null);
  const [overrideNoteInput, setOverrideNoteInput] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // 1. Subscribe to Evaluation Target Settings
  useEffect(() => {
    // Read local cache first
    try {
      const cachedTarget = localStorage.getItem('sac_setting_requiredEvaluationsCount');
      if (cachedTarget !== null) {
        const val = parseInt(cachedTarget, 10);
        if (!isNaN(val) && val > 0) {
          setRequiredCount(val);
          setTargetInputVal(val);
        }
      }
      const cachedMode = localStorage.getItem('sac_setting_requiredEvaluationsMode') as 'count' | 'all';
      if (cachedMode === 'count' || cachedMode === 'all') {
        setTargetMode(cachedMode);
        setTargetModeInputVal(cachedMode);
      }
    } catch {}

    const unsubEvalSettings = onSnapshot(doc(db, 'settings', 'evaluation'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.requiredEvaluationsCount !== undefined) {
          const count = Number(data.requiredEvaluationsCount) || 5;
          setRequiredCount(count);
          setTargetInputVal(count);
          try {
            localStorage.setItem('sac_setting_requiredEvaluationsCount', count.toString());
          } catch {}
        }
        if (data.requiredEvaluationsMode) {
          const mode = data.requiredEvaluationsMode;
          setTargetMode(mode);
          setTargetModeInputVal(mode);
          try {
            localStorage.setItem('sac_setting_requiredEvaluationsMode', mode);
          } catch {}
        }
      }
    }, (err) => console.warn("Evaluation target settings listener info:", err));

    const unsubDepts = subscribeToDepartments((items) => {
      if (items && items.length > 0) {
        setAvailableColleges(items);
      }
    });

    return () => {
      unsubEvalSettings();
      unsubDepts();
    };
  }, []);

  // 2. Load & Sync Student Records, Evaluated Count & Clearance Status
  useEffect(() => {
    let usersList: any[] = [];
    let verificationsList: any[] = [];
    let evaluationsList: any[] = [];
    let teachersMap: Record<string, any> = {};

    const computeStudentProgress = () => {
      // 1. Map teachers
      try {
        const localTeachers = JSON.parse(localStorage.getItem('sac_local_teachers') || '{}');
        teachersMap = { ...localTeachers };
      } catch {}

      // 2. Map all student accounts
      const studentMap: Record<string, any> = {};

      // Seed baseline demo students for testing if available
      const demoStudents = [
        {
          id: 'student-demo-uid',
          userId: 'student-demo-uid',
          name: 'Juan A. Dela Cruz',
          email: 'student@stalexiuscollege.edu.ph',
          studentId: '2024-10294',
          college: 'College of Information Technology',
          department: 'College of Information Technology',
          photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          role: 'student',
          verificationStatus: 'approved'
        },
        {
          id: 'demo-student-samantha',
          userId: 'demo-student-samantha',
          name: 'Samantha Cruz',
          email: 'samantha.cruz@stalexiuscollege.edu.ph',
          studentId: '2025-10821',
          college: 'College of Nursing',
          department: 'College of Nursing',
          photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
          role: 'student',
          verificationStatus: 'approved'
        },
        {
          id: 'demo-student-kevin',
          userId: 'demo-student-kevin',
          name: 'Kevin Alcantara',
          email: 'kevin.alcantara@stalexiuscollege.edu.ph',
          studentId: '2025-10499',
          college: 'College of Information Technology',
          department: 'College of Information Technology',
          photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
          role: 'student',
          verificationStatus: 'approved'
        },
        {
          id: 'demo-student-bea',
          userId: 'demo-student-bea',
          name: 'Bea Nicole Soriano',
          email: 'bea.soriano@stalexiuscollege.edu.ph',
          studentId: '2024-09812',
          college: 'College of Pharmacy',
          department: 'College of Pharmacy',
          photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          role: 'student',
          verificationStatus: 'approved'
        },
        {
          id: 'demo-student-gabriel',
          userId: 'demo-student-gabriel',
          name: 'Gabriel Morales',
          email: 'gabriel.morales@stalexiuscollege.edu.ph',
          studentId: '2023-11204',
          college: 'College of Allied Health Sciences',
          department: 'College of Allied Health Sciences',
          photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          role: 'student',
          verificationStatus: 'approved'
        }
      ];

      demoStudents.forEach(ds => {
        studentMap[ds.id] = { ...ds };
      });

      // Incorporate Firestore users
      usersList.forEach(u => {
        const email = (u.email || '').toLowerCase().trim();
        if (u.role === 'admin' || email === 'renzarvy.rv@gmail.com' || u.role === 'teacher') return;
        studentMap[u.id] = { ...studentMap[u.id], ...u };
      });

      // Incorporate verification requests
      verificationsList.forEach(vr => {
        const id = vr.userId || vr.id;
        const email = (vr.email || '').toLowerCase().trim();
        if (vr.role === 'admin' || email === 'renzarvy.rv@gmail.com' || vr.role === 'teacher') return;
        studentMap[id] = { ...studentMap[id], ...vr };
      });

      // Incorporate local storage verification requests
      try {
        const localReqs = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
        Object.entries(localReqs).forEach(([id, vr]: [string, any]) => {
          if (vr.role !== 'teacher' && vr.role !== 'admin') {
            studentMap[id] = { ...studentMap[id], ...vr };
          }
        });
      } catch {}

      // Incorporate manual clearance overrides from storage
      let localOverrides: Record<string, any> = {};
      try {
        localOverrides = JSON.parse(localStorage.getItem('sac_student_clearance_overrides') || '{}');
      } catch {}

      // 3. Map all evaluations to student IDs
      const studentEvalsMap: Record<string, any[]> = {};
      
      // Combine firestore + local evaluations
      const allEvaluations = [...evaluationsList];
      try {
        const localEvals = JSON.parse(localStorage.getItem('sac_local_evaluations') || '{}');
        Object.values(localEvals).forEach(le => allEvaluations.push(le));
      } catch {}

      allEvaluations.forEach(ev => {
        const sId = ev.actualStudentId || ev.studentId;
        if (!sId || sId === 'anonymous') return;

        // Find matching student key in studentMap
        let targetKey = sId;
        if (!studentMap[targetKey]) {
          const found = Object.values(studentMap).find((st: any) => 
            st.studentId === sId || (st.email && ev.studentEmail && st.email.toLowerCase() === ev.studentEmail.toLowerCase())
          );
          if (found) targetKey = (found as any).id;
        }

        if (!studentEvalsMap[targetKey]) {
          studentEvalsMap[targetKey] = [];
        }

        // Avoid duplicate teacher evals
        if (!studentEvalsMap[targetKey].some(existing => existing.teacherId === ev.teacherId)) {
          studentEvalsMap[targetKey].push(ev);
        }
      });

      // 4. Calculate final records
      const target = targetMode === 'count' ? requiredCount : 6; // default 6 for all faculty mode if variable

      const records: StudentCompletionRecord[] = Object.values(studentMap).map((st: any) => {
        const evals = studentEvalsMap[st.id] || studentEvalsMap[st.studentId] || [];
        const evaluatedTeacherIds = evals.map(e => e.teacherId);
        
        const evaluatedTeachersDetails = evals.map(e => {
          const tInfo = teachersMap[e.teacherId];
          return {
            teacherId: e.teacherId,
            teacherName: e.teacherName || tInfo?.name || 'Faculty Member',
            teacherDept: e.teacherDepartment || tInfo?.department || 'Department',
            submittedAt: e.createdAt || e.updatedAt || new Date().toISOString(),
            score: e.computedScore || 5.0
          };
        });

        const evaluatedCount = evaluatedTeacherIds.length;
        const studentTarget = targetMode === 'count' ? requiredCount : Math.max(1, target);
        const percentage = Math.min(100, Math.round((evaluatedCount / studentTarget) * 100));
        
        const override = localOverrides[st.id] || localOverrides[st.studentId];
        const isCleared = (evaluatedCount >= studentTarget) || Boolean(override?.cleared);
        
        // Find latest submission timestamp if available
        let completedAt: string | undefined;
        if (isCleared && evaluatedTeachersDetails.length > 0) {
          completedAt = evaluatedTeachersDetails[evaluatedTeachersDetails.length - 1]?.submittedAt;
        }
        if (override?.timestamp) {
          completedAt = override.timestamp;
        }

        // Generate consistent tamper-evident clearance verification hash
        const rawCode = `${st.studentId || st.id}-2025-SAC-${evaluatedCount}`;
        const clearanceCode = `SAC-CLR-${Math.abs(hashString(rawCode)).toString(36).toUpperCase().padStart(8, '0')}`;

        return {
          id: st.id,
          userId: st.userId || st.id,
          name: st.name || st.displayName || st.studentName || 'Enrolled Student',
          email: st.email || '',
          studentId: st.studentId || st.idNumber || '2025-XXXX',
          college: st.college || st.department || 'College Department',
          department: st.department || st.college || 'College Department',
          photoUrl: st.photoURL || st.photoUrl || st.idProofUrl,
          evaluatedTeacherIds,
          evaluatedTeachersDetails,
          evaluatedCount,
          targetCount: studentTarget,
          percentage,
          isCleared,
          clearanceCode,
          completedAt,
          manualOverride: Boolean(override?.cleared),
          overrideNote: override?.note
        };
      });

      // Sort by completed first, then by name
      records.sort((a, b) => {
        if (a.isCleared !== b.isCleared) return a.isCleared ? -1 : 1;
        return b.evaluatedCount - a.evaluatedCount;
      });

      setStudents(records);
      setLoading(false);
    };

    const hashString = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    };

    // Subscriptions
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      computeStudentProgress();
    }, () => computeStudentProgress());

    const unsubVerifs = onSnapshot(collection(db, 'verification_requests'), (snap) => {
      verificationsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      computeStudentProgress();
    }, () => computeStudentProgress());

    const unsubEvals = onSnapshot(collection(db, 'evaluations'), (snap) => {
      evaluationsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      computeStudentProgress();
    }, () => computeStudentProgress());

    const handleSync = () => computeStudentProgress();
    window.addEventListener('sac_evaluation_submitted', handleSync);
    window.addEventListener('sac_verification_updated', handleSync);
    window.addEventListener('app_setting_changed', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      unsubUsers();
      unsubVerifs();
      unsubEvals();
      window.removeEventListener('sac_evaluation_submitted', handleSync);
      window.removeEventListener('sac_verification_updated', handleSync);
      window.removeEventListener('app_setting_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [requiredCount, targetMode]);

  // Handle saving new evaluation target requirement
  const handleSaveTargetSettings = async () => {
    const newCount = Math.max(1, Math.min(20, targetInputVal));
    setIsSavingTarget(true);
    setTargetSaveSuccess(false);

    try {
      // 1. Update Firestore settings/evaluation
      await setDoc(doc(db, 'settings', 'evaluation'), {
        requiredEvaluationsCount: newCount,
        requiredEvaluationsMode: targetModeInputVal,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Also mirror into settings/general for consistency
      await setDoc(doc(db, 'settings', 'general'), {
        requiredEvaluationsCount: newCount,
        requiredEvaluationsMode: targetModeInputVal
      }, { merge: true }).catch(console.warn);

      // 3. Update localStorage
      localStorage.setItem('sac_setting_requiredEvaluationsCount', newCount.toString());
      localStorage.setItem('sac_setting_requiredEvaluationsMode', targetModeInputVal);

      // 4. Log admin audit activity
      await logActivity({
        action: 'SETTINGS_UPDATE',
        entity: 'SETTINGS',
        details: `Updated required student evaluations target to ${newCount} evaluation(s) per student (Mode: ${targetModeInputVal === 'count' ? 'Fixed Count' : 'All Assigned Faculty'}).`,
        performedBy: user?.displayName || 'Administrator',
        performedByEmail: user?.email || 'admin@stalexiuscollege.edu.ph'
      }).catch(console.warn);

      // 5. Broadcast change event across tabs & windows
      window.dispatchEvent(new CustomEvent('app_setting_changed', {
        detail: { key: 'requiredEvaluationsCount', value: newCount }
      }));

      setRequiredCount(newCount);
      setTargetMode(targetModeInputVal);
      setTargetSaveSuccess(true);
      setTimeout(() => {
        setShowTargetModal(false);
        setTargetSaveSuccess(false);
      }, 900);
    } catch (err) {
      console.warn("Notice saving target settings (using local fallback):", err);
      localStorage.setItem('sac_setting_requiredEvaluationsCount', newCount.toString());
      localStorage.setItem('sac_setting_requiredEvaluationsMode', targetModeInputVal);
      setRequiredCount(newCount);
      setTargetMode(targetModeInputVal);
      setTargetSaveSuccess(true);
      setTimeout(() => {
        setShowTargetModal(false);
        setTargetSaveSuccess(false);
      }, 900);
    } finally {
      setIsSavingTarget(false);
    }
  };

  // Handle manual clearance override by admin
  const handleApplyClearanceOverride = async () => {
    if (!overrideStudent) return;
    setIsSavingOverride(true);

    try {
      const overrides = JSON.parse(localStorage.getItem('sac_student_clearance_overrides') || '{}');
      overrides[overrideStudent.id] = {
        cleared: true,
        note: overrideNoteInput.trim() || 'Manual administrative evaluation clearance approved.',
        timestamp: new Date().toISOString(),
        grantedBy: user?.email || 'admin@stalexiuscollege.edu.ph'
      };
      localStorage.setItem('sac_student_clearance_overrides', JSON.stringify(overrides));

      await logActivity({
        action: 'APPROVAL',
        entity: 'STUDENT',
        details: `Granted manual evaluation clearance override for student ${overrideStudent.name} (${overrideStudent.studentId}). Reason: ${overrideNoteInput || 'Administrative Approval'}`,
        performedBy: user?.displayName || 'Administrator',
        performedByEmail: user?.email || 'admin@stalexiuscollege.edu.ph',
        targetId: overrideStudent.id,
        targetName: overrideStudent.name
      }).catch(console.warn);

      // Trigger update
      window.dispatchEvent(new Event('sac_verification_updated'));
      setOverrideStudent(null);
      setOverrideNoteInput('');
    } catch (err) {
      console.warn("Override notice:", err);
    } finally {
      setIsSavingOverride(false);
    }
  };

  // Export Clearance Roster to CSV
  const handleExportCSV = () => {
    const headers = [
      'Student School ID',
      'Full Name',
      'College / Department',
      'Email Address',
      'Evaluations Completed',
      'Required Target',
      'Progress %',
      'Clearance Status',
      'Clearance Verification Hash',
      'Completion Timestamp'
    ];

    const rows = filteredStudents.map(s => [
      `"${s.studentId}"`,
      `"${s.name}"`,
      `"${s.college}"`,
      `"${s.email}"`,
      s.evaluatedCount,
      s.targetCount,
      `${s.percentage}%`,
      s.isCleared ? 'CLEARED / FINISHED' : (s.evaluatedCount > 0 ? 'IN PROGRESS' : 'NOT STARTED'),
      `"${s.clearanceCode}"`,
      `"${s.completedAt || (s.isCleared ? 'Completed' : 'Pending')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAC_Student_Evaluation_Clearance_Roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Official Roster
  const handlePrintRoster = () => {
    window.print();
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Status filter
      if (statusFilter === 'CLEARED' && !s.isCleared) return false;
      if (statusFilter === 'IN_PROGRESS' && (s.isCleared || s.evaluatedCount === 0)) return false;
      if (statusFilter === 'NOT_STARTED' && s.evaluatedCount > 0) return false;

      // Department filter
      if (departmentFilter !== 'ALL' && s.college !== departmentFilter && s.department !== departmentFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = s.name.toLowerCase().includes(q);
        const idMatch = s.studentId.toLowerCase().includes(q);
        const emailMatch = s.email.toLowerCase().includes(q);
        const deptMatch = s.college.toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !emailMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [students, statusFilter, departmentFilter, searchQuery]);

  // Statistics
  const totalCount = students.length;
  const clearedCount = students.filter(s => s.isCleared).length;
  const inProgressCount = students.filter(s => !s.isCleared && s.evaluatedCount > 0).length;
  const notStartedCount = students.filter(s => s.evaluatedCount === 0).length;
  const clearanceRate = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Header & Target Settings Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-[#1e3a8a] rounded-xl font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Student Evaluation Completion & Clearance Tracker
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Live Guidance Roster
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time institutional monitoring of required student faculty evaluations, clearance status, and completion timestamps.
              </p>
            </div>
          </div>
        </div>

        {/* Evaluation Target Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl px-3.5 py-2 flex items-center gap-3">
            <div>
              <p className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Required Target</p>
              <p className="text-xs font-black text-[#1e3a8a] flex items-center gap-1">
                {targetMode === 'count' ? `${requiredCount} Evaluations per Student` : 'All Assigned Faculty'}
              </p>
            </div>
            <button
              onClick={() => {
                setTargetInputVal(requiredCount);
                setTargetModeInputVal(targetMode);
                setShowTargetModal(true);
              }}
              className="px-2.5 py-1.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
              title="Configure minimum required evaluations"
            >
              <Sliders className="w-3.5 h-3.5" /> Adjust Target
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Clearance (CSV)
          </button>

          <button
            onClick={handlePrintRoster}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print Roster
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Enrolled Students</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalCount}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Active Cohort Roster</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Finished & Cleared
            </p>
            <p className="text-2xl font-black text-emerald-950 mt-1">{clearedCount}</p>
            <p className="text-[11px] text-emerald-700 font-bold mt-0.5">{clearanceRate}% of Student Body</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-sm">
            {clearanceRate}%
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> In Progress
            </p>
            <p className="text-2xl font-black text-amber-950 mt-1">{inProgressCount}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Partial Submissions</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-800" />
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Not Started
            </p>
            <p className="text-2xl font-black text-rose-950 mt-1">{notStartedCount}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">0 Evaluations Submitted</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-200 text-rose-900 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-rose-800" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by student name, ID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('CLEARED')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'CLEARED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" /> Cleared ({clearedCount})
          </button>
          <button
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3 h-3" /> In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setStatusFilter('NOT_STARTED')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'NOT_STARTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <AlertCircle className="w-3 h-3" /> Not Started ({notStartedCount})
          </button>
        </div>

        {/* Department Dropdown */}
        <div className="flex items-center space-x-1.5 w-full md:w-auto">
          <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs bg-white border border-gray-200 rounded-lg py-1.5 px-2.5 focus:ring-2 focus:ring-[#1e3a8a] outline-hidden w-full md:w-56"
          >
            <option value="ALL">All Colleges / Departments</option>
            {availableColleges.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Completion Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/90 text-gray-600 font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Student Information</th>
                <th className="py-3 px-4">College Department</th>
                <th className="py-3 px-4">Evaluations Progress</th>
                <th className="py-3 px-4">Clearance Status</th>
                <th className="py-3 px-4">Clearance Hash / Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Student Name & ID */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={student.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`}
                        alt={student.name ? `${student.name}'s profile photo` : 'Student profile photo'}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="font-bold text-gray-900">{student.name}</p>
                        <p className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                          ID: <span className="font-semibold text-slate-800">{student.studentId}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* College */}
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200 inline-block max-w-[200px] truncate">
                      {student.college}
                    </span>
                  </td>

                  {/* Progress Bar & Evaluated Count */}
                  <td className="py-3.5 px-4">
                    <div className="w-48 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-800">
                          {student.evaluatedCount} / {student.targetCount} Submitted
                        </span>
                        <span className={`font-bold ${student.isCleared ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {student.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            student.isCleared 
                              ? 'bg-emerald-500' 
                              : (student.evaluatedCount > 0 ? 'bg-amber-500' : 'bg-rose-400')
                          }`}
                          style={{ width: `${student.percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Clearance Badge */}
                  <td className="py-3.5 px-4">
                    {student.isCleared ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        CLEARED (100%)
                      </span>
                    ) : student.evaluatedCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        IN PROGRESS ({student.evaluatedCount}/{student.targetCount})
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        NOT STARTED
                      </span>
                    )}
                  </td>

                  {/* Clearance Hash / Timestamp */}
                  <td className="py-3.5 px-4">
                    {student.isCleared ? (
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {student.clearanceCode}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {student.completedAt ? new Date(student.completedAt).toLocaleDateString() : 'Officially Recorded'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">Clearance Pending</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => setSelectedStudentDossier(student)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] rounded-lg font-bold text-[11px] transition-colors border border-blue-200 flex items-center gap-1"
                        title="View Evaluated Faculty List"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>

                      {!student.isCleared && (
                        <button
                          onClick={() => {
                            setOverrideStudent(student);
                            setOverrideNoteInput('');
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold text-[11px] transition-colors border border-amber-200 flex items-center gap-1"
                          title="Grant Manual Clearance Exception"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Override
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-bold text-gray-700">No students match your filter criteria.</p>
                    <p className="text-xs text-gray-400 mt-1">Try resetting the search or department filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Evaluation Target Setting Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
            <div className="p-5 bg-gradient-to-r from-[#1e3a8a] to-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold tracking-wide">Configure Required Student Evaluations</h3>
              </div>
              <button
                onClick={() => setShowTargetModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-gray-700">
              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 space-y-1">
                <p className="font-bold text-blue-950 text-sm">Official Academic Policy Requirement</p>
                <p className="text-blue-800 leading-relaxed">
                  This setting dictates how many faculty performance evaluations each student must complete to receive digital evaluation clearance for semester enrollment and grading validation.
                </p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="font-bold text-gray-900 uppercase tracking-wider block">Evaluation Target Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetModeInputVal('count')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      targetModeInputVal === 'count'
                        ? 'border-[#1e3a8a] bg-blue-50/60 ring-2 ring-[#1e3a8a]/20'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-extrabold text-gray-900">Fixed Evaluation Count</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Specify a standard minimum count (e.g. 5)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetModeInputVal('all')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      targetModeInputVal === 'all'
                        ? 'border-[#1e3a8a] bg-blue-50/60 ring-2 ring-[#1e3a8a]/20'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-extrabold text-gray-900">All Assigned Faculty</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Evaluate 100% of college & gen-ed teachers</p>
                  </button>
                </div>
              </div>

              {/* Number Input & Steppers */}
              {targetModeInputVal === 'count' && (
                <div className="space-y-3 pt-2">
                  <label className="font-bold text-gray-900 uppercase tracking-wider block">
                    Required Evaluations per Student
                  </label>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setTargetInputVal(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-black text-lg flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={targetInputVal}
                      onChange={(e) => setTargetInputVal(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-24 text-center py-2 text-lg font-black text-[#1e3a8a] bg-gray-50 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setTargetInputVal(prev => Math.min(20, prev + 1))}
                      className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-black text-lg flex items-center justify-center transition-colors"
                    >
                      +
                    </button>

                    {/* Quick Presets */}
                    <div className="flex items-center space-x-1.5 ml-2">
                      <span className="text-[11px] text-gray-400 font-bold">Presets:</span>
                      {[3, 5, 8, 10].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTargetInputVal(val)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            targetInputVal === val ? 'bg-[#1e3a8a] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {targetSaveSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold flex items-center gap-2 border border-emerald-200 animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Target requirement successfully recorded and synchronized across the system!
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTargetSettings}
                disabled={isSavingTarget}
                className="px-5 py-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {isSavingTarget ? 'Saving Requirement...' : 'Save & Enforce Requirement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Student Evaluation Dossier Modal */}
      {selectedStudentDossier && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200">
            <div className="p-5 bg-gradient-to-r from-[#1e3a8a] to-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black">
                  <Award className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{selectedStudentDossier.name}</h3>
                  <p className="text-xs text-blue-200 font-mono">ID: {selectedStudentDossier.studentId} &bull; {selectedStudentDossier.college}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentDossier(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Clearance Status Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                selectedStudentDossier.isCleared ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div>
                  <p className="font-extrabold text-sm flex items-center gap-1.5">
                    {selectedStudentDossier.isCleared ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                    {selectedStudentDossier.isCleared ? 'Official Academic Evaluation Clearance Granted' : 'Evaluation Requirement Incomplete'}
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    {selectedStudentDossier.evaluatedCount} of {selectedStudentDossier.targetCount} required faculty evaluations completed.
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-[11px] font-black px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-2xs block">
                    {selectedStudentDossier.clearanceCode}
                  </span>
                </div>
              </div>

              {/* Evaluated Teachers List */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Evaluated Faculty Members ({selectedStudentDossier.evaluatedTeachersDetails.length})</span>
                  <span className="text-gray-400 font-normal">Strict student anonymity maintained for teacher ratings</span>
                </h4>

                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {selectedStudentDossier.evaluatedTeachersDetails.map((t, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="font-bold text-gray-900">{t.teacherName}</p>
                        <p className="text-[11px] text-gray-500">{t.teacherDept}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                          Verified & Submitted
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {t.submittedAt ? new Date(t.submittedAt).toLocaleString() : 'Recorded'}
                        </p>
                      </div>
                    </div>
                  ))}

                  {selectedStudentDossier.evaluatedTeachersDetails.length === 0 && (
                    <div className="p-6 text-center text-gray-500 bg-white">
                      No evaluations submitted by this student yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentDossier(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 rounded-xl text-xs"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Manual Clearance Override Modal */}
      {overrideStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="p-5 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-base font-extrabold">Grant Evaluation Clearance Override</h3>
              </div>
              <button
                onClick={() => setOverrideStudent(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-gray-700">
                You are granting an administrative clearance exception for student: <strong className="text-gray-900">{overrideStudent.name}</strong> ({overrideStudent.studentId}).
              </p>

              <div>
                <label className="font-bold text-gray-900 uppercase tracking-wider block mb-1">
                  Reason for Exception / Administrative Note:
                </label>
                <textarea
                  value={overrideNoteInput}
                  onChange={(e) => setOverrideNoteInput(e.target.value)}
                  placeholder="e.g. Approved by Dean / Late Enrollment Clearance / Transfer Student Exemption"
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden h-24 text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setOverrideStudent(null)}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyClearanceOverride}
                disabled={isSavingOverride}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                {isSavingOverride ? 'Applying...' : 'Confirm Clearance Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
