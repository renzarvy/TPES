import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Star, FileText, TrendingUp, MessageSquare, Save, CheckCircle2, BookOpen, 
  PenTool, Bell, Mail, X, Eye, Compass, Sparkles, Database, Users, ChevronDown 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DEFAULT_CRITERIA, EvaluationCriterion } from '../../lib/criteria';
import { logActivity } from '../../lib/activityLogger';
import { PortalOnboardingTour } from '../../components/common/PortalOnboardingTour';
import { GuidanceOfficeCard } from '../../components/common/GuidanceOfficeCard';
import { 
  DEMO_FACULTY_MEMBERS, 
  seedDemoDataToStorage, 
  isDemoDataSeeded 
} from '../../lib/demoReportsData';
import { RoleDemoSwitcher } from '../../components/common/RoleDemoSwitcher';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [criteriaList, setCriteriaList] = useState<EvaluationCriterion[]>(DEFAULT_CRITERIA);
  const [reflection, setReflection] = useState('');
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runTourManually, setRunTourManually] = useState(false);

  // Email Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotifModal, setSelectedNotifModal] = useState<any | null>(null);

  // Teaching Subjects Profile State
  const [majorSubjects, setMajorSubjects] = useState('');
  const [otherSubjects, setOtherSubjects] = useState('');
  const [isGeneralEducation, setIsGeneralEducation] = useState(false);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [subjectsSaved, setSubjectsSaved] = useState(false);
  const [selectedDemoFacultyId, setSelectedDemoFacultyId] = useState<string>('demo-prof-santos');

  useEffect(() => {
    if (!user) return;

    const fetchCriteriaAndReflection = async () => {
      try {
        // Fetch active criteria
        const critDoc = await getDoc(doc(db, 'settings', 'criteria'));
        if (critDoc.exists() && critDoc.data().items?.length) {
          setCriteriaList(critDoc.data().items);
        }

        // Fetch teacher profile for subjects
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          setMajorSubjects(uData.majorSubjects || uData.subjects || '');
          setOtherSubjects(uData.otherSubjects || uData.minorSubjects || '');
          setIsGeneralEducation(!!uData.isGeneralEducation || uData.department === 'General Education');
        } else {
          // Fallback demo subjects
          setMajorSubjects('NUR101: Fundamentals of Nursing Care, NUR204: Pharmacology');
          setOtherSubjects('Clinical Practicum');
        }

        // Fetch teacher reflection
        const refDoc = await getDoc(doc(db, 'reflections', user.uid));
        if (refDoc.exists()) {
          setReflection(refDoc.data().content || '');
        } else {
          const cachedRef = localStorage.getItem(`sac_teacher_reflection_${user.uid}`);
          if (cachedRef) setReflection(cachedRef);
        }
      } catch (e) {
        console.error("Error fetching reflection:", e);
      }
    };

    fetchCriteriaAndReflection();

    // Combine Firestore and LocalStorage demo evaluations
    const loadCombinedEvaluations = (firestoreDocs: any[] = []) => {
      const combinedMap: Record<string, any> = {};
      
      firestoreDocs.forEach(d => {
        combinedMap[d.id] = { id: d.id, ...d };
      });

      try {
        const localEvals = JSON.parse(localStorage.getItem('sac_local_evaluations') || '{}');
        const userEmail = (user.email || '').toLowerCase().trim();
        const userName = (user.displayName || '').toLowerCase().trim();

        Object.values(localEvals).forEach((ev: any) => {
          const evTeacherId = ev.teacherId || '';
          const evTeacherEmail = (ev.teacherEmail || '').toLowerCase().trim();
          const evTeacherName = (ev.teacherName || '').toLowerCase().trim();

          const isDirectMatch = evTeacherId === user.uid || 
            (userEmail && evTeacherEmail === userEmail) || 
            (userName && evTeacherName.includes(userName.replace('prof. ', '').replace('dr. ', '')));

          const isDemoFacultyMatch = (userEmail.includes('santos') || userEmail.includes('faculty') || user.uid.includes('demo')) && 
            (evTeacherId === 'demo-prof-santos' || evTeacherId === selectedDemoFacultyId);

          if (isDirectMatch || isDemoFacultyMatch) {
            combinedMap[ev.id] = ev;
          }
        });
      } catch (e) {
        console.warn("Local evaluations parse info:", e);
      }

      let evalsList = Object.values(combinedMap);

      // Auto-seed if completely empty so demo is immediately visible
      if (evalsList.length === 0 && (user.email?.includes('santos') || user.email?.includes('faculty') || !isDemoDataSeeded())) {
        seedDemoDataToStorage();
        try {
          const reloaded = JSON.parse(localStorage.getItem('sac_local_evaluations') || '{}');
          evalsList = Object.values(reloaded).filter((ev: any) => ev.teacherId === 'demo-prof-santos');
        } catch {}
      }

      setEvaluations(evalsList);
      setLoading(false);
    };

    // Listen to teacher's evaluations in Firestore
    const evalsQuery = query(collection(db, 'evaluations'), where('teacherId', '==', user.uid));
    const unsubEvals = onSnapshot(evalsQuery, (snapshot) => {
      const evalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadCombinedEvaluations(evalsData);
    }, (error) => {
      console.warn("Info fetching teacher evaluations (using fallback):", error);
      loadCombinedEvaluations([]);
    });

    // Listen to email notifications sent to this teacher
    const notifsQuery = query(collection(db, 'notifications'), where('teacherId', '==', user.uid));
    const unsubNotifs = onSnapshot(notifsQuery, (snapshot) => {
      let notifsData: any[] = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      if (notifsData.length === 0) {
        notifsData = [
          {
            id: 'demo-notif-1',
            subject: 'Midterm 2025-2026 Faculty Evaluation Summary Published',
            content: 'Dear Prof. Santos, your 1st Semester 2025-2026 faculty evaluation report has been finalized by the Dean of Nursing. Your composite score is 4.88 / 5.0 (Outstanding) across 32 student evaluations.',
            sender: 'Dean Arthur Reyes, RN, PhD (College of Nursing)',
            sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            readByTeacher: false
          }
        ];
      }
      notifsData.sort((a, b) => new Date(b.sentAt || b.createdAt || 0).getTime() - new Date(a.sentAt || a.createdAt || 0).getTime());
      setNotifications(notifsData);
    }, (error) => {
      console.warn("Info fetching notifications:", error);
      setNotifications([
        {
          id: 'demo-notif-1',
          subject: 'Midterm 2025-2026 Faculty Evaluation Summary Published',
          content: 'Dear Prof. Santos, your 1st Semester 2025-2026 faculty evaluation report has been finalized by the Dean of Nursing. Your composite score is 4.88 / 5.0 (Outstanding) across 32 student evaluations.',
          sender: 'Dean Arthur Reyes, RN, PhD (College of Nursing)',
          sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          readByTeacher: false
        }
      ]);
    });

    const handleStorageChange = () => loadCombinedEvaluations();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sac_demo_data_toggled', handleStorageChange);

    return () => {
      unsubEvals();
      unsubNotifs();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sac_demo_data_toggled', handleStorageChange);
    };
  }, [user, selectedDemoFacultyId]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { readByTeacher: true });
    } catch (e) {
      console.error("Error updating notification read status:", e);
    }
  };

  const handleSaveSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingSubjects(true);
    setSubjectsSaved(false);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        majorSubjects: majorSubjects.trim(),
        otherSubjects: otherSubjects.trim(),
        isGeneralEducation: isGeneralEducation
      });
      setSubjectsSaved(true);
      setTimeout(() => setSubjectsSaved(false), 4000);

      await logActivity({
        action: 'TEACHER_UPDATE',
        entity: 'TEACHER',
        details: `Faculty member ${user.displayName || user.email} updated assigned subjects & teaching loads`,
        performedBy: user.displayName || 'Faculty Member',
        performedByEmail: user.email || 'N/A',
        targetId: user.uid,
        targetName: user.displayName || user.email || ''
      });
    } catch (e) {
      console.error("Error updating teacher subjects:", e);
      // Fallback if user doc needs setDoc merge
      try {
        await setDoc(doc(db, 'users', user.uid), {
          majorSubjects: majorSubjects.trim(),
          otherSubjects: otherSubjects.trim(),
          isGeneralEducation: isGeneralEducation
        }, { merge: true });
        setSubjectsSaved(true);
        setTimeout(() => setSubjectsSaved(false), 4000);

        await logActivity({
          action: 'TEACHER_UPDATE',
          entity: 'TEACHER',
          details: `Faculty member ${user.displayName || user.email} updated assigned subjects & teaching loads`,
          performedBy: user.displayName || 'Faculty Member',
          performedByEmail: user.email || 'N/A',
          targetId: user.uid,
          targetName: user.displayName || user.email || ''
        });
      } catch (err2) {
        alert("Failed to save subjects. Please try again.");
      }
    } finally {
      setSavingSubjects(false);
    }
  };

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingReflection(true);
    try {
      await setDoc(doc(db, 'reflections', user.uid), {
        teacherId: user.uid,
        teacherName: user.displayName || 'Faculty Member',
        content: reflection,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setReflectionSaved(true);
      setTimeout(() => setReflectionSaved(false), 4000);
    } catch (e) {
      console.error("Error saving reflection:", e);
      alert("Failed to save reflection.");
    } finally {
      setSavingReflection(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading faculty dashboard...</div>;

  const totalEvals = evaluations.length;
  const avgScore = totalEvals > 0 
    ? evaluations.reduce((acc, curr) => acc + (curr.computedScore || 0), 0) / totalEvals 
    : 0;

  // Chart data based on dynamic criteria
  const chartData = criteriaList.map(crit => {
    const scores = evaluations.map(e => e.answers?.[crit.id] || 0).filter(s => s > 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      name: crit.label,
      score: Number(avg.toFixed(2))
    };
  });

  return (
    <div className="space-y-6">
      {/* Interactive Role Switcher Banner */}
      <RoleDemoSwitcher className="mb-2" />

      {/* Teacher Onboarding Tour */}
      <PortalOnboardingTour
        role="teacher"
        userId={user?.uid}
        runManually={runTourManually}
        onTourEnd={() => setRunTourManually(false)}
      />

      <div id="tour-teacher-welcome" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in-up">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Faculty Portal
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              {totalEvals} Live Student Evaluations
            </span>
            <button
              onClick={() => setRunTourManually(true)}
              className="inline-flex items-center text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 transition-colors shadow-2xs"
              title="Start interactive faculty tour"
            >
              <Compass className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Take Faculty Tour
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.displayName || 'Professor'}</h1>
          <p className="text-gray-500 text-sm">Faculty Evaluation Insights & Self-Reflection Workspace.</p>
        </div>

        {/* Demo Faculty Profile Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Preview Professor:</span>
          </div>
          <select
            value={selectedDemoFacultyId}
            onChange={(e) => setSelectedDemoFacultyId(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {DEMO_FACULTY_MEMBERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.department})
              </option>
            ))}
          </select>
        </div>

        {/* Notifications Count Badge */}
        {notifications.length > 0 && (
          <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-full text-indigo-900 text-xs font-semibold">
            <Bell className="w-4 h-4 text-indigo-600 animate-bounce" />
            <span>{notifications.length} Email Report Alert(s) Received</span>
          </div>
        )}
      </div>

      {/* Automated Email Notifications Alert Banner for Faculty */}
      {notifications.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-lg border border-blue-800 space-y-3 animate-fade-in-up delay-75">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-base text-amber-300 tracking-wide">Automated Email Notifications</h2>
            </div>
            <span className="text-xs bg-blue-800/80 px-2.5 py-1 rounded-md text-blue-200 font-medium">
              Report Service
            </span>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed">
            The automated notification service dispatches email alerts to your registered faculty inbox whenever a student evaluation is processed or when an official performance report is published.
          </p>

          <div className="space-y-2 pt-1">
            {notifications.slice(0, 3).map((notif) => (
              <div 
                key={notif.id}
                className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/15 transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{notif.subject}</span>
                    {!notif.readByTeacher && (
                      <span className="bg-amber-400 text-blue-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase">New</span>
                    )}
                  </div>
                  <p className="text-[11px] text-blue-200">
                    Dispatched: {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Recently'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedNotifModal(notif);
                    handleMarkAsRead(notif.id);
                  }}
                  className="px-3 py-1.5 bg-[#d4af37] text-[#1e3a8a] hover:bg-amber-300 font-bold text-xs rounded-md transition-colors flex items-center justify-center self-start sm:self-auto"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View Email
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div id="tour-teacher-stats" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center animate-fade-in-up delay-75">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600 mr-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Overall Rating</p>
            <p className="text-2xl font-bold text-gray-900">{avgScore > 0 ? avgScore.toFixed(2) : 'N/A'} <span className="text-xs text-gray-400 font-normal">/ 5.0</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center animate-fade-in-up delay-150">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 mr-4">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Student Evaluations</p>
            <p className="text-2xl font-bold text-gray-900">{totalEvals}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center animate-fade-in-up delay-200">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600 mr-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Constructive Feedback Notes</p>
            <p className="text-2xl font-bold text-gray-900">{evaluations.filter(e => e.comments).length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up delay-250">
        {/* Chart */}
        <div id="tour-teacher-breakdown" className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Performance Breakdown by Criteria</h3>
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 4.5 ? '#059669' : entry.score >= 3.5 ? '#1e3a8a' : '#d97706'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Student Comments */}
        <div id="tour-teacher-comments" className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900">Student Comments</h3>
          </div>
          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[380px]">
            {evaluations.filter(e => e.comments).slice(0, 10).map((evalItem) => (
              <div key={evalItem.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span className="ml-1 text-sm font-bold text-gray-900">{evalItem.computedScore?.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">
                    {evalItem.updatedAt?.toDate ? evalItem.updatedAt.toDate().toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 italic">"{evalItem.comments}"</p>
              </div>
            ))}
            {evaluations.filter(e => e.comments).length === 0 && (
              <div className="p-12 text-center text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No comments submitted yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Teaching Subjects & Course Load Management Box */}
      <div id="tour-teacher-subjects" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up delay-300">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-[#1e3a8a]" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Teaching Subjects & Course Load</h3>
              <p className="text-xs text-gray-500">Input your assigned major subjects and general education / minor subjects for student evaluations.</p>
            </div>
          </div>
          {subjectsSaved && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSubjects} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Major Subjects */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Major Subjects Taught <span className="text-blue-600 font-normal">(College Specific)</span>
              </label>
              <textarea
                rows={3}
                value={majorSubjects}
                onChange={e => setMajorSubjects(e.target.value)}
                placeholder="E.g., Web Development 101, Database Systems, Software Engineering, Object Oriented Programming"
                className="w-full border border-gray-300 rounded-lg p-3 text-xs focus:ring-[#1e3a8a] focus:border-[#1e3a8a] bg-white"
              />
              <p className="text-[11px] text-gray-500">
                Comma-separated list of major courses you handle for your primary college department.
              </p>
            </div>

            {/* Other / Minor / General Education Subjects */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Minor / General Education Subjects Taught
              </label>
              <textarea
                rows={3}
                value={otherSubjects}
                onChange={e => setOtherSubjects(e.target.value)}
                placeholder="E.g., Ethics, Life and Works of Rizal, Art Appreciation, Purposive Communication, NSTP"
                className="w-full border border-gray-300 rounded-lg p-3 text-xs focus:ring-[#1e3a8a] focus:border-[#1e3a8a] bg-white"
              />
              <p className="text-[11px] text-gray-500">
                Courses you teach that cross over to students from other colleges as General Education or minor electives.
              </p>
            </div>
          </div>

          {/* General Education Checkbox */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start space-x-3">
            <input
              type="checkbox"
              id="isGenEdToggle"
              checked={isGeneralEducation}
              onChange={e => setIsGeneralEducation(e.target.checked)}
              className="mt-1 h-4 w-4 text-[#1e3a8a] focus:ring-[#1e3a8a] border-gray-300 rounded"
            />
            <label htmlFor="isGenEdToggle" className="text-xs text-amber-900 cursor-pointer select-none">
              <strong className="font-bold block text-amber-950">Tag as General Education / Cross-Department Faculty Member</strong>
              Checking this enables your teacher profile to appear in student evaluation checklists under the "General Education & Minor Subjects" group across all college departments.
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSubjects}
              className="px-6 py-2.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition-colors flex items-center shadow-sm"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savingSubjects ? 'Saving Subjects...' : 'Save Teaching Subjects'}
            </button>
          </div>
        </form>
      </div>

      {/* Faculty Reflection & Development Plan Box */}
      <div id="tour-teacher-reflection" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up delay-300">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PenTool className="w-5 h-5 text-[#1e3a8a]" />
            <h3 className="text-lg font-bold text-gray-900">Faculty Self-Reflection & Action Plan</h3>
          </div>
          {reflectionSaved && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveReflection} className="p-6 space-y-4">
          <p className="text-xs text-gray-500">
            Write your self-reflection, response to student evaluation feedback, or personal professional development goals for this academic term. This will be archived in your official employee profile for administrative review.
          </p>

          <textarea 
            rows={5}
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            placeholder="E.g., Based on the student feedback regarding class interaction, I plan to integrate more group activities and allocate 10 minutes at the end of lectures for Q&A..."
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingReflection}
              className="px-6 py-2.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition-colors flex items-center shadow-sm"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savingReflection ? 'Saving Reflection...' : 'Save Self-Reflection'}
            </button>
          </div>
        </form>
      </div>

      {/* Guidance Office Official Information & Consultation Support */}
      <div className="animate-fade-in-up delay-400">
        <GuidanceOfficeCard id="guidance-office-info" />
      </div>

      {/* Teacher Email Modal Preview */}
      {selectedNotifModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="teacher-email-preview-title">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-4 bg-[#1e3a8a] text-white flex items-center justify-between border-b border-blue-900">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-amber-400" aria-hidden="true" />
                <h3 id="teacher-email-preview-title" className="font-bold text-sm text-white">Dispatched Email Notification Preview</h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedNotifModal(null)}
                aria-label="Close email preview dialog"
                className="p-1 hover:bg-blue-800 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-200 text-xs space-y-1">
              <div><strong className="text-gray-700">Recipient Email:</strong> {selectedNotifModal.recipientEmail}</div>
              <div><strong className="text-gray-700">Subject:</strong> {selectedNotifModal.subject}</div>
              <div><strong className="text-gray-700">Dispatched Date:</strong> {new Date(selectedNotifModal.createdAt).toLocaleString()}</div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-gray-100">
              <div className="bg-white rounded-xl shadow-inner overflow-hidden border border-gray-200">
                <iframe
                  title="Received Email Preview"
                  srcDoc={selectedNotifModal.bodyHtml}
                  className="w-full h-96 border-0 rounded-lg"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedNotifModal(null)}
                className="px-5 py-2 bg-[#1e3a8a] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition-colors"
              >
                Close Email View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
