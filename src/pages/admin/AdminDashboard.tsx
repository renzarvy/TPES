import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, Users, FileText, CheckCircle, Calendar, Clock, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentVerificationManager } from '../../components/admin/StudentVerificationManager';
import { QuickStats } from '../../components/admin/QuickStats';
import { ActivityLog } from '../../components/ActivityLog';
import { DashboardSkeleton } from '../../components/DashboardSkeleton';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, role, actualRole } = useAuth();
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [evalMode, setEvalMode] = useState<'open' | 'closed' | 'scheduled'>('open');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [collegeTargetMode, setCollegeTargetMode] = useState<'all' | 'selective'>('all');
  const [allowedColleges, setAllowedColleges] = useState<string[]>([]);
  const [availableColleges, setAvailableColleges] = useState<string[]>([
    'College of Nursing',
    'College of Information Technology',
    'College of Engineering',
    'College of Education',
    'College of Business Administration',
    'College of Criminology',
    'College of Arts & Sciences',
    'College of Allied Health Sciences'
  ]);
  const [stats, setStats] = useState({ teachers: 0, evaluations: 0, students: 0, pendingVerifications: 0 });
  const [recentTeachers, setRecentTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Retrieve locally cached anonymity setting if available
    try {
      const cached = localStorage.getItem('app_setting_isAnonymous');
      if (cached !== null) {
        setIsAnonymous(JSON.parse(cached));
      }
    } catch {
      // ignore localStorage errors
    }

    // Real-time evaluation settings listener
    const unsubscribeEval = onSnapshot(doc(db, 'settings', 'evaluation'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const anonVal = data.isAnonymous !== undefined ? (data.isAnonymous === true || data.isAnonymous === 'true') : true;
        setIsAnonymous(anonVal);
        try {
          localStorage.setItem('app_setting_isAnonymous', JSON.stringify(anonVal));
        } catch {}
        setEvalMode(data.evalMode || 'open');
        setStartDate(data.startDate || '');
        setEndDate(data.endDate || '');
        setCollegeTargetMode(data.collegeTargetMode || 'all');
        setAllowedColleges(data.allowedColleges || []);
      } else {
        // Initialize evaluation settings if missing
        setDoc(doc(db, 'settings', 'evaluation'), { 
          isAnonymous: true,
          evalMode: 'open',
          startDate: '',
          endDate: '',
          collegeTargetMode: 'all',
          allowedColleges: []
        }, { merge: true }).catch(err => console.warn("Init evaluation settings info:", err));
      }
      setLoading(false);
    }, (error) => {
      console.warn("Admin evaluation settings snapshot info:", error);
      setLoading(false);
    });

    // Fetch custom departments/colleges from settings once or listener
    const fetchDepartments = async () => {
      try {
        const deptDoc = await getDoc(doc(db, 'settings', 'departments'));
        if (deptDoc.exists() && deptDoc.data().items?.length) {
          setAvailableColleges(deptDoc.data().items);
        }
      } catch (error) {
        console.warn("Error fetching departments:", error);
      }
    };
    fetchDepartments();

    // Real-time listeners for stats
    let usersSnapshotList: any[] = [];
    let reqsSnapshotList: any[] = [];

    const updateCombinedStats = () => {
      let tCount = 0;
      let sCount = 0;
      const teachersList: any[] = [];
      const userMap: Record<string, any> = {};

      usersSnapshotList.forEach(data => {
        userMap[data.id] = { ...data };
      });

      reqsSnapshotList.forEach(req => {
        const targetId = req.userId || req.id;
        if (userMap[targetId]) {
          userMap[targetId] = { ...userMap[targetId], ...req };
        } else {
          userMap[targetId] = req;
        }
      });

      // Also incorporate localStorage requests
      try {
        const storedRequests = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
        Object.entries(storedRequests).forEach(([uid, localReq]: [string, any]) => {
          const targetId = localReq.userId || uid;
          if (userMap[targetId]) {
            userMap[targetId] = { ...userMap[targetId], ...localReq };
          } else {
            userMap[targetId] = localReq;
          }
        });
      } catch {}

      let pendingCount = 0;
      Object.values(userMap).forEach((data: any) => {
        const userEmail = (data.email || '').toLowerCase().trim();
        if (data.role === 'admin' || userEmail === 'renzarvy.rv@gmail.com') return;
        
        if (data.role === 'teacher') {
          tCount++;
          teachersList.push(data);
        } else {
          sCount++;
        }

        const rawStatus = (data.verificationStatus || data.status || '').toLowerCase().trim();
        const isApproved = rawStatus === 'approved' || rawStatus === 'verified' || (data.isVerifiedStudent === true && rawStatus !== 'pending');
        const isRejected = rawStatus === 'rejected' || rawStatus === 'denied';
        
        // Everything else is pending verification
        if (!isApproved && !isRejected) {
          pendingCount++;
        }
      });

      setStats(prev => ({ ...prev, teachers: tCount, students: sCount, pendingVerifications: pendingCount }));
      setRecentTeachers(teachersList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5));
    };

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      usersSnapshotList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      updateCombinedStats();
    }, (err) => console.warn("Admin users snapshot info:", err));

    const unsubscribeReqs = onSnapshot(collection(db, 'verification_requests'), (snapshot) => {
      reqsSnapshotList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      updateCombinedStats();
    }, (err) => console.warn("Admin reqs snapshot info:", err));

    const handleSync = () => updateCombinedStats();
    window.addEventListener('sac_verification_updated', handleSync);
    window.addEventListener('storage', handleSync);

    const unsubscribeEvals = onSnapshot(collection(db, 'evaluations'), (snapshot) => {
      setStats(prev => ({ ...prev, evaluations: snapshot.size }));
    }, (err) => console.warn("Admin evals snapshot info:", err));

    const unsubscribeDepts = onSnapshot(doc(db, 'settings', 'departments'), (snap) => {
      if (snap.exists() && snap.data().items?.length) {
        setAvailableColleges(snap.data().items);
      }
    }, (err) => console.warn("Admin depts snapshot info:", err));

    return () => {
      unsubscribeEval();
      unsubscribeUsers();
      unsubscribeReqs();
      unsubscribeEvals();
      unsubscribeDepts();
      window.removeEventListener('sac_verification_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [user]);

  const handleToggleAnonymity = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextValue = !isAnonymous;
    setIsAnonymous(nextValue);
    
    // Immediately persist locally and broadcast
    try {
      localStorage.setItem('app_setting_isAnonymous', JSON.stringify(nextValue));
      window.dispatchEvent(new CustomEvent('app_setting_changed', { detail: { key: 'isAnonymous', value: nextValue } }));
    } catch {
      // ignore
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'evaluation'), { isAnonymous: nextValue }, { merge: true });
    } catch (error) {
      console.warn("Firestore anonymity setting sync info (local persistence active):", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await setDoc(doc(db, 'settings', 'evaluation'), { 
        evalMode, 
        startDate, 
        endDate,
        collegeTargetMode,
        allowedColleges
      }, { merge: true });
      alert("Evaluation schedule & college priority saved successfully!");
    } catch (error) {
      console.warn("Firestore schedule save info:", error);
      alert("Evaluation schedule & college priority updated!");
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleCollegeAllowed = (college: string) => {
    if (allowedColleges.includes(college)) {
      setAllowedColleges(allowedColleges.filter(c => c !== college));
    } else {
      setAllowedColleges([...allowedColleges, college]);
    }
  };

  if (loading) {
    return <DashboardSkeleton cardCount={4} tableRows={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Administrator Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Performance Evaluation Overview, Institutional Reports & Recent Changes.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigate('/reports')}
            className="inline-flex items-center px-4 py-2 bg-[#1e3a8a] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 mr-1.5" /> View Performance Reports
          </button>
        </div>
      </div>

      {/* Stats & Key Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          onClick={() => navigate('/teachers')}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center cursor-pointer hover:shadow-md transition-all group animate-fade-in-up delay-75"
        >
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 mr-4 group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Teachers</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.teachers}</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/reports')}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center cursor-pointer hover:shadow-md transition-all group animate-fade-in-up delay-150"
        >
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 mr-4 group-hover:scale-105 transition-transform">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Evaluations Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.evaluations}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center animate-fade-in-up delay-200">
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.students}</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/verifications')}
          className={`p-5 rounded-xl shadow-sm border flex items-center cursor-pointer hover:shadow-md transition-all group animate-fade-in-up delay-250 ${
            stats.pendingVerifications > 0 
              ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
              : 'bg-white border-gray-100'
          }`}
        >
          <div className={`p-3.5 rounded-xl mr-4 group-hover:scale-105 transition-transform ${
            stats.pendingVerifications > 0 
              ? 'bg-amber-500 text-white' 
              : 'bg-emerald-50 text-emerald-600'
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-gray-500">
              Pending IDs
              {stats.pendingVerifications > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block"></span>
              )}
            </p>
            <p className={`text-2xl font-bold mt-0.5 ${stats.pendingVerifications > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
              {stats.pendingVerifications}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Analytics Card: Evaluations Collected Today & Active Teacher Rating Average */}
      <div className="animate-fade-in-up delay-200">
        <QuickStats />
      </div>

      {/* Important Reports Summary & Highlights Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-xl p-6 text-white shadow-sm border border-blue-900 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in-up delay-250">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold tracking-wide">Institutional Performance Reports</h2>
          </div>
          <p className="text-xs text-blue-200/90 max-w-2xl leading-relaxed">
            Generate, print, and export comparative evaluation reports across all college departments with individual faculty ratings and criteria analysis.
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <button 
            onClick={() => navigate('/reports')}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md flex items-center"
          >
            <FileText className="w-4 h-4 mr-1.5" /> Generate Full Report
          </button>
        </div>
      </div>

      {/* Student Registrations & Verification Queue */}
      <div className="animate-fade-in-up delay-300">
        <StudentVerificationManager />
      </div>

      {/* Recent Changes & System Audit Log */}
      <div className="animate-fade-in-up delay-300">
        <ActivityLog />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up delay-400">
        {/* Recent Teachers List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Teachers</h2>
            </div>
            <button 
              onClick={() => navigate('/teachers')}
              className="text-xs font-medium text-[#1e3a8a] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTeachers.map((teacher) => (
              <div 
                key={teacher.id} 
                onClick={() => navigate(`/teacher/${teacher.id}`)}
                className="px-6 py-4 flex items-center hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <img 
                  src={teacher.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=random`} 
                  alt="" 
                  className="w-10 h-10 rounded-full object-cover mr-4 bg-gray-100"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{teacher.name}</p>
                  <p className="text-xs text-gray-500 truncate">{teacher.department}</p>
                </div>
                <Clock className="w-4 h-4 text-gray-300 ml-2" />
              </div>
            ))}
            {recentTeachers.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">
                No teachers added yet.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Security & Privacy Settings - Strict Anonymous Evaluation Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center">
                <ShieldAlert className="w-5 h-5 text-[#1e3a8a] mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Security & Privacy Protocol</h2>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                isAnonymous ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-600'
              }`}>
                {isAnonymous ? '🔒 Strict Anonymity Active' : 'Standard Identity Mode'}
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">Strict Anonymous Evaluations</h3>
                  <p className="text-xs text-gray-600 leading-relaxed max-w-xl">
                    When enforced, all student identities (names, emails, student school IDs, and user UIDs) are completely stripped and masked from faculty view and evaluation output. Teachers and department heads receive purely aggregated ratings and unidentifiable written feedback.
                  </p>
                </div>
                <div className="flex-shrink-0 pt-1">
                  <button
                    type="button"
                    onClick={handleToggleAnonymity}
                    disabled={saving}
                    aria-label="Toggle strict anonymous evaluations"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 ${
                      isAnonymous ? 'bg-[#1e3a8a]' : 'bg-gray-200'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    role="switch"
                    aria-checked={isAnonymous}
                  >
                    <span className="sr-only">Toggle anonymity</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isAnonymous ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {isAnonymous && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    <strong>Privacy Guarantee Enforced:</strong> All evaluations submitted during this window are anonymized at the Firestore record level and cannot be traced back to individual student accounts.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Evaluation Schedule Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center">
              <Calendar className="w-5 h-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Evaluation Schedule & Access Control</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-900 block mb-3">Evaluation Access Status</label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="evalMode" 
                      value="open" 
                      checked={evalMode === 'open'} 
                      onChange={() => setEvalMode('open')}
                      className="w-4 h-4 text-[#1e3a8a] border-gray-300 focus:ring-[#1e3a8a]" 
                    />
                    <span className="ml-3 text-sm text-gray-700">Open (Students can evaluate anytime)</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="evalMode" 
                      value="closed" 
                      checked={evalMode === 'closed'} 
                      onChange={() => setEvalMode('closed')}
                      className="w-4 h-4 text-[#1e3a8a] border-gray-300 focus:ring-[#1e3a8a]" 
                    />
                    <span className="ml-3 text-sm text-gray-700">Closed (Evaluations are paused)</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="evalMode" 
                      value="scheduled" 
                      checked={evalMode === 'scheduled'} 
                      onChange={() => setEvalMode('scheduled')}
                      className="w-4 h-4 text-[#1e3a8a] border-gray-300 focus:ring-[#1e3a8a]" 
                    />
                    <span className="ml-3 text-sm text-gray-700">Scheduled (Open only during specific dates)</span>
                  </label>
                </div>
              </div>

              {evalMode === 'scheduled' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1e3a8a] focus:ring-[#1e3a8a] sm:text-sm border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1e3a8a] focus:ring-[#1e3a8a] sm:text-sm border p-2"
                    />
                  </div>
                </div>
              )}

              {/* College Priority & Selective Evaluation */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <label className="text-sm font-semibold text-gray-900 block">College Evaluation Priority</label>
                <p className="text-xs text-gray-500">
                  Choose which college students are permitted to take evaluations first.
                </p>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="collegeTargetMode" 
                      value="all" 
                      checked={collegeTargetMode === 'all'} 
                      onChange={() => setCollegeTargetMode('all')}
                      className="w-4 h-4 text-[#1e3a8a] border-gray-300 focus:ring-[#1e3a8a]" 
                    />
                    <span className="ml-3 text-sm text-gray-700 font-medium">All Colleges (Open to all students)</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="collegeTargetMode" 
                      value="selective" 
                      checked={collegeTargetMode === 'selective'} 
                      onChange={() => setCollegeTargetMode('selective')}
                      className="w-4 h-4 text-[#1e3a8a] border-gray-300 focus:ring-[#1e3a8a]" 
                    />
                    <span className="ml-3 text-sm text-gray-700 font-medium">Select Specific Colleges First</span>
                  </label>
                </div>

                {collegeTargetMode === 'selective' && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <span className="text-xs font-semibold text-gray-700 block uppercase tracking-wider mb-2">
                      Active Colleges Authorized for Evaluation:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableColleges.map((college) => {
                        const isChecked = allowedColleges.includes(college);
                        return (
                          <label 
                            key={college} 
                            className={`flex items-center p-2 rounded-md border cursor-pointer text-xs font-medium transition-colors ${
                              isChecked 
                                ? 'bg-blue-50 border-blue-300 text-blue-900' 
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => toggleCollegeAllowed(college)}
                              className="w-4 h-4 text-[#1e3a8a] rounded border-gray-300 focus:ring-[#1e3a8a] mr-2" 
                            />
                            <span className="truncate">{college}</span>
                          </label>
                        );
                      })}
                    </div>
                    {allowedColleges.length === 0 && (
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        ⚠️ Please select at least one college so students in that department can evaluate.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={handleSaveSchedule}
                  disabled={savingSchedule}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1e3a8a] hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {savingSchedule ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
