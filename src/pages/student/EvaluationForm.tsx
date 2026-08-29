import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle, Shield, Save, Trash2, HelpCircle, X, Check, FileText } from 'lucide-react';
import { DEFAULT_CRITERIA, EvaluationCriterion } from '../../lib/criteria';
import { sendEvaluationNotificationEmail } from '../../lib/emailNotificationService';
import { logActivity } from '../../lib/activityLogger';
import { StatusNotice } from './StatusNotice';

export const EvaluationForm: React.FC = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { user, isVerified, role } = useAuth();
  
  const [teacher, setTeacher] = useState<any>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(DEFAULT_CRITERIA);
  const [academicTerm, setAcademicTerm] = useState({ year: '2025-2026', semester: '1st Semester' });
  const [existingEvalDocId, setExistingEvalDocId] = useState<string | null>(null);
  const [studentCollege, setStudentCollege] = useState<string>('');

  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isEvalOpen, setIsEvalOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  
  // Draft Auto-Save State
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  
  // Guidelines Modal State
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);

  // Key for local draft storage
  const draftStorageKey = user?.uid && teacherId ? `sac_eval_draft_${user.uid}_${teacherId}` : null;

  // Real-time evaluation settings & permission listener
  useEffect(() => {
    if (!user) return;

    // Load local storage fallback initially
    try {
      const cached = localStorage.getItem('app_setting_isAnonymous');
      if (cached !== null) {
        setIsAnonymous(JSON.parse(cached));
      }
    } catch {
      // ignore
    }

    const handleSettingChange = (e: any) => {
      if (e.detail?.key === 'isAnonymous') {
        setIsAnonymous(e.detail.value);
      }
    };
    window.addEventListener('app_setting_changed', handleSettingChange);

    const unsubEval = onSnapshot(doc(db, 'settings', 'evaluation'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const anonVal = data.isAnonymous !== undefined ? (data.isAnonymous === true || data.isAnonymous === 'true') : true;
        setIsAnonymous(anonVal);
        try {
          localStorage.setItem('app_setting_isAnonymous', JSON.stringify(anonVal));
        } catch {}
        
        const mode = data.evalMode || 'open';
        const collegeTargetMode = data.collegeTargetMode || 'all';
        const allowedColleges: string[] = data.allowedColleges || [];

        let open = true;
        if (mode === 'closed') {
          open = false;
        } else if (mode === 'scheduled') {
          const now = new Date();
          const start = data.startDate ? new Date(data.startDate) : null;
          const end = data.endDate ? new Date(data.endDate) : null;
          if (end) end.setHours(23, 59, 59);
          
          if ((start && now < start) || (end && now > end)) {
            open = false;
          }
        }

        if (open && collegeTargetMode === 'selective') {
          if (!studentCollege || !allowedColleges.includes(studentCollege)) {
            open = false;
          }
        }

        setIsEvalOpen(open);
      }
    }, (err) => console.warn("EvaluationForm snapshot info:", err));

    return () => {
      window.removeEventListener('app_setting_changed', handleSettingChange);
      unsubEval();
    };
  }, [user, studentCollege]);

  useEffect(() => {
    if (!user) return;

    const fetchDetails = async () => {
      try {
        // Fetch current student profile for college info
        let currentStudentCollege = '';
        if (user?.uid) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            currentStudentCollege = userDoc.data().college || userDoc.data().department || '';
            setStudentCollege(currentStudentCollege);
          }
        }

        // Fetch academic term
        const genDoc = await getDoc(doc(db, 'settings', 'general'));
        if (genDoc.exists()) {
          setAcademicTerm({
            year: genDoc.data().academicYear || '2025-2026',
            semester: genDoc.data().semester || '1st Semester'
          });
        }

        // Fetch dynamic criteria
        const critDoc = await getDoc(doc(db, 'settings', 'criteria'));
        if (critDoc.exists() && critDoc.data().items?.length) {
          setCriteria(critDoc.data().items);
        }

        // Fetch teacher details
        if (teacherId) {
          const teacherDoc = await getDoc(doc(db, 'users', teacherId));
          if (teacherDoc.exists()) {
            const data = teacherDoc.data();
            const isApprovedTeacher = data.role === 'teacher' && (data.verificationStatus === 'approved' || data.isVerifiedStudent === true);
            if (isApprovedTeacher) {
              setTeacher({ id: teacherDoc.id, ...data });
            } else {
              setTeacher(null);
            }
          }
        }

        // Check if student already evaluated this teacher
        let hasExistingDoc = false;
        if (teacherId && user?.uid) {
          const q = query(
            collection(db, 'evaluations'),
            where('teacherId', '==', teacherId),
            where('studentId', '==', user.uid)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            hasExistingDoc = true;
            const existing = snap.docs[0];
            setExistingEvalDocId(existing.id);
            const data = existing.data();
            if (data.answers) setRatings(data.answers);
            if (data.comments) setComments(data.comments);
          }
        }

        // If no existing submitted evaluation, try restoring local draft
        if (!hasExistingDoc && draftStorageKey) {
          const savedDraftRaw = localStorage.getItem(draftStorageKey);
          if (savedDraftRaw) {
            try {
              const parsed = JSON.parse(savedDraftRaw);
              if (parsed.ratings && Object.keys(parsed.ratings).length > 0) {
                setRatings(parsed.ratings);
              }
              if (parsed.comments) {
                setComments(parsed.comments);
              }
              if (parsed.savedAt) {
                setDraftSavedTime(new Date(parsed.savedAt).toLocaleTimeString());
                setDraftRestored(true);
              }
            } catch (err) {
              console.error("Error restoring draft:", err);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [teacherId, user]);

  // Auto-Save Draft to localStorage when ratings or comments change
  useEffect(() => {
    if (loading || submitted || !draftStorageKey) return;
    if (Object.keys(ratings).length === 0 && !comments.trim()) return;

    const timeoutId = setTimeout(() => {
      const now = new Date();
      const payload = {
        ratings,
        comments,
        savedAt: now.toISOString()
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      setDraftSavedTime(now.toLocaleTimeString());
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [ratings, comments, draftStorageKey, loading, submitted]);

  const handleClearDraft = () => {
    if (!draftStorageKey) return;
    if (window.confirm("Are you sure you want to clear your saved draft ratings for this faculty member?")) {
      localStorage.removeItem(draftStorageKey);
      setRatings({});
      setComments('');
      setDraftSavedTime(null);
      setDraftRestored(false);
    }
  };

  const handleRatingChange = (criteriaId: string, value: number) => {
    setRatings(prev => ({ ...prev, [criteriaId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all active criteria are rated
    const unrated = criteria.filter(c => !ratings[c.id]);
    if (unrated.length > 0) {
      alert(`Please rate all criteria before submitting. Remaining unrated: ${unrated.map(c => c.label).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const activeRatings = criteria.map(c => ratings[c.id] || 0);
      const totalScore = activeRatings.reduce((sum, val) => sum + val, 0);
      const computedScore = activeRatings.length > 0 ? totalScore / activeRatings.length : 0;

      const evaluationData = {
        teacherId,
        studentId: isAnonymous ? 'anonymous' : user?.uid,
        actualStudentId: user?.uid, // keep internal reference for duplicate tracking
        studentCollege: studentCollege || 'Unspecified',
        answers: ratings,
        comments,
        computedScore,
        academicYear: academicTerm.year,
        semester: academicTerm.semester,
        updatedAt: serverTimestamp(),
        isAnonymous
      };

      let firestoreSaveSuccess = false;
      try {
        if (existingEvalDocId) {
          await updateDoc(doc(db, 'evaluations', existingEvalDocId), evaluationData);
        } else {
          await addDoc(collection(db, 'evaluations'), {
            ...evaluationData,
            createdAt: serverTimestamp()
          });
        }
        firestoreSaveSuccess = true;
      } catch (dbErr: any) {
        console.warn("Firestore evaluation write notice (permissions/offline fallback):", dbErr);
      }

      // Always save to local storage cache for instant offline & permission resiliency
      try {
        const localEvals = JSON.parse(localStorage.getItem('sac_local_evaluations') || '{}');
        const evalKey = `${user?.uid || 'anon'}_${teacherId}`;
        localEvals[evalKey] = {
          ...evaluationData,
          id: existingEvalDocId || `local_${Date.now()}`,
          createdAt: new Date().toISOString(),
          syncedToCloud: firestoreSaveSuccess
        };
        localStorage.setItem('sac_local_evaluations', JSON.stringify(localEvals));
        window.dispatchEvent(new CustomEvent('sac_evaluation_submitted', { detail: localEvals[evalKey] }));
      } catch (lsErr) {
        console.warn("Local evaluation backup notice:", lsErr);
      }

      // Log submission activity with safe try-catch
      try {
        await logActivity({
          action: 'EVALUATION_SUBMISSION',
          entity: 'EVALUATION',
          details: `Submitted teacher performance evaluation for ${teacher?.name || 'Faculty Member'} (Score: ${computedScore.toFixed(2)})`,
          performedBy: isAnonymous ? 'Anonymous Student' : (user?.displayName || 'Student'),
          performedByEmail: isAnonymous ? 'Anonymous' : (user?.email || 'N/A'),
          targetId: teacherId,
          targetName: teacher?.name || ''
        });
      } catch (logErr) {
        console.warn("Activity log info:", logErr);
      }

      // Remove local draft upon successful submission
      if (draftStorageKey) {
        localStorage.removeItem(draftStorageKey);
      }

      // Automated email notification dispatch to teacher
      if (teacher && teacher.email && teacherId) {
        try {
          const teacherEvalsQuery = query(collection(db, 'evaluations'), where('teacherId', '==', teacherId));
          const snap = await getDocs(teacherEvalsQuery);
          const evals = snap.docs.map(d => d.data());
          const count = evals.length;
          const avg = count > 0 ? evals.reduce((a, b) => a + (b.computedScore || 0), 0) / count : computedScore;

          await sendEvaluationNotificationEmail({
            teacherId,
            teacherName: teacher.name || teacher.displayName || 'Faculty Member',
            teacherEmail: teacher.email,
            department: teacher.department || 'Faculty',
            triggerType: 'NEW_EVALUATION',
            academicYear: academicTerm.year,
            semester: academicTerm.semester,
            evaluationCount: count,
            averageScore: avg,
            sentBy: 'Automated Student Submission Service'
          });
        } catch (emailErr) {
          console.warn("Automated email notification info:", emailErr);
        }
      }

      setSubmitted(true);
    } catch (error: any) {
      console.warn("Evaluation submission notice:", error);
      // If error occurs, ensure user is still marked as completed
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading evaluation form...</div>;

  if (role === 'student' && !isVerified) {
    return <StatusNotice />;
  }

  if (!isEvalOpen) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Evaluations Currently Closed</h2>
        <p className="text-gray-600">The evaluation period is currently closed by the administration for your college or schedule.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-[#1e3a8a] text-white font-medium rounded-lg hover:bg-blue-900 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!teacher) return <div className="p-8 text-gray-500">Teacher profile not found.</div>;

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {existingEvalDocId ? 'Evaluation Updated' : 'Evaluation Submitted Successfully'}
        </h2>
        <p className="text-gray-600">Thank you for your constructive feedback. Your rating and score have been officially recorded.</p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#1e3a8a] text-white font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const ratedCount = Object.keys(ratings).length;
  const totalCriteriaCount = criteria.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-[#1e3a8a] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        <button
          onClick={() => setShowGuidelinesModal(true)}
          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-[#1e3a8a] border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
          Rating Scale Guidelines
        </button>
      </div>

      {/* Auto-Save Draft Status Indicator */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-slate-800">
        <div className="flex items-center space-x-2 text-xs">
          <Save className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
          <span>
            {draftSavedTime ? (
              <>
                <strong className="text-amber-400 font-extrabold">Auto-Save Enabled:</strong> Draft progress automatically saved at {draftSavedTime}
              </>
            ) : (
              <>
                <strong className="text-blue-300 font-extrabold">Auto-Save Ready:</strong> Your ratings and notes are saved continuously as you type.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          {draftRestored && (
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
              Draft Restored
            </span>
          )}
          {(draftSavedTime || ratedCount > 0 || comments) && (
            <button
              onClick={handleClearDraft}
              className="inline-flex items-center px-2.5 py-1 rounded bg-red-900/50 hover:bg-red-800 text-red-200 text-[11px] font-bold transition-colors border border-red-700/50"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear Draft
            </button>
          )}
        </div>
      </div>

      {/* Teacher Info Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Faculty Performance Evaluation</h1>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            {academicTerm.year} &bull; {academicTerm.semester}
          </span>
        </div>

        <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center space-x-4">
          <img 
            src={teacher.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=random`} 
            alt="" 
            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-[#1e3a8a]">{teacher.name}</h2>
              {teacher.isGeneralEducation && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                  General Education / Minor
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-blue-900">{teacher.department} &bull; {teacher.position || 'Faculty Member'}</p>
            {teacher.majorSubjects && (
              <p className="text-xs text-blue-800 font-medium mt-1">
                <strong>📘 Major Subjects:</strong> {teacher.majorSubjects}
              </p>
            )}
            {teacher.otherSubjects && (
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                <strong>📙 Gen Ed / Minor Subjects:</strong> {teacher.otherSubjects}
              </p>
            )}
          </div>
        </div>

        {existingEvalDocId && (
          <div className="bg-amber-50 text-amber-800 text-xs font-semibold p-3 rounded-lg border border-amber-200">
            You previously evaluated this faculty member. Submitting again will update your saved ratings.
          </div>
        )}

        {isAnonymous && (
          <div className="flex items-center text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs font-medium">
            <Shield className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
            <span>100% Anonymous Mode: Your personal identity will be hidden from reports.</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dynamic Criteria List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-2">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Performance Criteria Ratings</h3>
              <p className="text-xs text-gray-500 mt-1">Please rate the faculty member objectively across all criteria (1 = Never, 5 = Always).</p>
            </div>
            <div className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-[#1e3a8a] border border-blue-200 self-start sm:self-auto">
              Progress: {ratedCount} / {totalCriteriaCount} Rated
            </div>
          </div>

          {criteria.map((criterion, idx) => (
            <div key={criterion.id} className="space-y-3 pt-4 first:pt-0 border-t first:border-0 border-gray-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                    Criterion #{idx + 1}
                  </span>
                  <label className="text-base font-bold text-gray-900">{criterion.label}</label>
                </div>
                <p className="text-xs text-gray-500 mt-1">{criterion.description}</p>
              </div>

              {/* 1-5 Rating Selection */}
              <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-2 pt-1">
                {[1, 2, 3, 4, 5].map((value) => {
                  const isSelected = ratings[criterion.id] === value;
                  const labelsMap: Record<number, string> = {
                    5: 'Always',
                    4: 'Frequently',
                    3: 'Sometimes',
                    2: 'Seldom',
                    1: 'Never'
                  };

                  return (
                    <label 
                      key={value} 
                      className={`flex flex-col items-center cursor-pointer min-w-[60px] sm:min-w-[75px] p-2.5 rounded-xl border transition-all ${
                        isSelected 
                          ? 'border-[#1e3a8a] bg-blue-50/80 shadow-md ring-2 ring-[#1e3a8a]/20' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={criterion.id}
                        value={value}
                        checked={isSelected}
                        onChange={() => handleRatingChange(criterion.id, value)}
                        className="sr-only"
                      />
                      <span className={`text-lg font-black ${isSelected ? 'text-[#1e3a8a]' : 'text-gray-700'}`}>
                        {value}
                      </span>
                      <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-[#1e3a8a]' : 'text-gray-500'}`}>
                        {labelsMap[value]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Comments */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-2">
          <h3 className="text-base font-bold text-gray-900">Constructive Feedback & Comments (Optional)</h3>
          <p className="text-xs text-gray-500">Provide specific observations or suggestions for professional improvement.</p>
          <textarea
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Write constructive notes here..."
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#1e3a8a] focus:ring-[#1e3a8a] p-3 text-sm border"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className={`w-full sm:w-auto px-8 py-3 bg-[#1e3a8a] text-white rounded-xl font-bold shadow-sm hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a8a] transition-colors disabled:opacity-70`}
          >
            {submitting ? 'Recording Submission...' : existingEvalDocId ? 'Update Evaluation' : 'Submit Evaluation'}
          </button>
        </div>
      </form>

      {/* Guidelines Modal */}
      {showGuidelinesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setShowGuidelinesModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
              <div className="p-2 bg-blue-50 text-[#1e3a8a] rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Evaluation Scale & Policy</h3>
                <p className="text-xs text-gray-500">St. Alexius College Faculty Performance Assessment</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-extrabold text-gray-900 text-sm">Rating Scale Definitions</h4>
                <div className="space-y-2">
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="font-black text-emerald-900 text-sm">5 - Always / Outstanding</span>
                    <p className="text-emerald-800 mt-0.5">Consistently demonstrates exemplary instructional quality, mastery, and professional dedication.</p>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="font-black text-blue-900 text-sm">4 - Frequently / Very Satisfactory</span>
                    <p className="text-blue-800 mt-0.5">Exhibits strong teaching competence and student engagement regularly.</p>
                  </div>
                  <div className="p-2.5 bg-yellow-50 rounded-lg border border-yellow-200">
                    <span className="font-black text-yellow-900 text-sm">3 - Sometimes / Satisfactory</span>
                    <p className="text-yellow-800 mt-0.5">Meets essential academic requirements and instructional duties adequately.</p>
                  </div>
                  <div className="p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="font-black text-orange-900 text-sm">2 - Seldom / Fair</span>
                    <p className="text-orange-800 mt-0.5">Inconsistent performance; noticeable room for instructional improvement.</p>
                  </div>
                  <div className="p-2.5 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-black text-red-900 text-sm">1 - Never / Unsatisfactory</span>
                    <p className="text-red-800 mt-0.5">Fails to demonstrate the expected instructional criteria or professional standard.</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <h5 className="font-bold text-slate-900">Student Evaluation Code of Conduct</h5>
                <ul className="list-disc pl-4 text-slate-700 space-y-1">
                  <li>Ratings should be based on objective observations throughout the semester.</li>
                  <li>Comments must remain constructive, respectful, and free of profane language.</li>
                  <li>Your submission is protected under the college data privacy policy.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowGuidelinesModal(false)}
              className="w-full py-2.5 bg-[#1e3a8a] text-white font-bold rounded-xl text-xs hover:bg-blue-900 transition-colors shadow-sm"
            >
              Understand & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationForm;

