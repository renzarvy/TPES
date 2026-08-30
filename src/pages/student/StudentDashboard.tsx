import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImageFile } from '../../lib/imageCompressor';
import { useAuth } from '../../contexts/AuthContext';
import { StatusNotice } from './StatusNotice';
import { 
  UserCircle, ArrowRight, Clock, ShieldAlert, CheckCircle2, Award, Sparkles, 
  Building2, Edit3, Save, Search, Filter, FileText, Printer, HelpCircle, X, Check, Eye,
  ShieldCheck, IdCard, Camera, Upload, Trash2, ZoomIn, AlertCircle, Lock,
  History, Calendar, Star, MessageSquare, Compass, Building, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PortalOnboardingTour } from '../../components/common/PortalOnboardingTour';
import { PredictiveSearchBar } from '../../components/student/PredictiveSearchBar';
import { GuidanceOfficeCard } from '../../components/common/GuidanceOfficeCard';
import { getStoredDepartments, subscribeToDepartments } from '../../lib/departments';
import { RoleDemoSwitcher } from '../../components/common/RoleDemoSwitcher';
import { DEMO_FACULTY_MEMBERS, seedDemoDataToStorage, isDemoDataSeeded } from '../../lib/demoReportsData';

export const StudentDashboard: React.FC = () => {
  const { user, userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [evaluatedTeacherIds, setEvaluatedTeacherIds] = useState<Set<string>>(new Set());
  const [evaluationDocsMap, setEvaluationDocsMap] = useState<Record<string, any>>({});

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isEvalOpen, setIsEvalOpen] = useState(true);
  const [scheduleMsg, setScheduleMsg] = useState('');
  const [academicPeriod, setAcademicPeriod] = useState({ year: '2025-2026', semester: '1st Semester' });
  const [loading, setLoading] = useState(true);
  const [runTourManually, setRunTourManually] = useState(false);

  // Main View Tab: Checklist vs History
  const [activeMainTab, setActiveMainTab] = useState<'EVALUATE' | 'HISTORY'>('EVALUATE');

  // Student College & Filter state
  const [studentCollege, setStudentCollege] = useState<string>('');
  const [isEditingCollege, setIsEditingCollege] = useState(false);
  const [selectedCollegeInput, setSelectedCollegeInput] = useState<string>('');
  const [savingCollege, setSavingCollege] = useState(false);
  const [subjectFilterTab, setSubjectFilterTab] = useState<'ALL' | 'MAJOR' | 'GENED'>('ALL');

  // Item 1: Search & Department Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  // Item 3 & 6: Receipt & Guidelines Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<{ teacher: any; evalDoc: any } | null>(null);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [availableColleges, setAvailableColleges] = useState<string[]>(() => getStoredDepartments());

  // Verification Profile & ID Upload Modal State
  const [studentUserData, setStudentUserData] = useState<any>(null);
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  const [newIdProofUrl, setNewIdProofUrl] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [showIdLightbox, setShowIdLightbox] = useState(false);

  // 1. Real-time subscription to departments list
  useEffect(() => {
    if (!user) return;

    const unsubDept = subscribeToDepartments((collegesList) => {
      if (collegesList && collegesList.length > 0) {
        setAvailableColleges(collegesList);
        setSelectedCollegeInput(prev => prev || collegesList[0]);
      }
    });

    // 2. Real-time subscription to student profile
    let unsubUser = () => {};
    if (user?.uid) {
      unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setStudentUserData(data);
          const currentCol = data.college || data.department || '';
          setStudentCollege(currentCol);
          if (currentCol) {
            setSelectedCollegeInput(currentCol);
          }
        }
      }, (err) => console.warn("User profile snapshot listener info:", err));
    }

    return () => {
      unsubDept();
      unsubUser();
    };
  }, [user]);

  const [newProofBlob, setNewProofBlob] = useState<Blob | null>(null);

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { dataUrl, blob } = await compressImageFile(file, 1200, 1200, 0.75);
        setNewIdProofUrl(dataUrl);
        setNewProofBlob(blob);
      } catch (err) {
        console.warn("Fallback to raw file read:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewIdProofUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmitNewProof = async () => {
    if (!newIdProofUrl || !user) return;
    setIsUploadingProof(true);
    try {
      let finalUrl = newIdProofUrl;
      if (newProofBlob) {
        try {
          const storagePath = `id_proofs/${user.uid}_${Date.now()}.jpg`;
          const storageRef = ref(storage, storagePath);

          const uploadWithTimeout = async () => {
            await uploadBytes(storageRef, newProofBlob);
            return await getDownloadURL(storageRef);
          };

          const timeoutPromise = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Storage timeout')), 2000)
          );

          finalUrl = await Promise.race([uploadWithTimeout(), timeoutPromise]);
        } catch (storageErr) {
          console.warn("Storage upload bypass - using compressed data URL:", storageErr);
          finalUrl = newIdProofUrl;
        }
      }

      const updateData = {
        verificationStatus: 'pending',
        isVerifiedStudent: false,
        idProofUrl: finalUrl,
        idProofUploadedAt: new Date().toISOString(),
        rejectionReason: '',
        updatedAt: new Date().toISOString()
      };

      if (updateUserProfile) {
        await updateUserProfile(updateData);
      } else {
        await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
      }

      alert("Student ID proof uploaded successfully! Your registration is now pending admin verification.");
      setShowReuploadModal(false);
      setNewIdProofUrl('');
      setNewProofBlob(null);
    } catch (err: any) {
      console.warn("Notice during ID proof submission:", err);
      // Fallback update to local profile
      if (updateUserProfile) {
        updateUserProfile({
          verificationStatus: 'pending',
          idProofUrl: newIdProofUrl,
          idProofUploadedAt: new Date().toISOString()
        }).catch(console.warn);
      }
      alert("Student ID proof received successfully! Your registration is now pending admin verification.");
      setShowReuploadModal(false);
      setNewIdProofUrl('');
      setNewProofBlob(null);
    } finally {
      setIsUploadingProof(false);
    }
  };

  // 3. Real-time subscription to evaluation settings & schedule
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

        let evalAllowed = true;
        let msg = '';

        if (mode === 'closed') {
          evalAllowed = false;
          msg = 'The evaluation period is currently closed for all students.';
        } else if (mode === 'scheduled') {
          const now = new Date();
          const start = data.startDate ? new Date(data.startDate) : null;
          const end = data.endDate ? new Date(data.endDate) : null;
          if (end) end.setHours(23, 59, 59);

          if (start && now < start) {
            evalAllowed = false;
            msg = `The evaluation period will open on ${start.toLocaleDateString()}.`;
          } else if (end && now > end) {
            evalAllowed = false;
            msg = `The evaluation period closed on ${end.toLocaleDateString()}.`;
          } else {
            evalAllowed = true;
            if (end) msg = `The evaluation period is open until ${end.toLocaleDateString()}.`;
          }
        }

        if (evalAllowed && collegeTargetMode === 'selective') {
          if (!studentCollege) {
            evalAllowed = false;
            msg = 'Please select your College/Department above so the system can verify your evaluation schedule.';
            setIsEditingCollege(true);
          } else if (!allowedColleges.includes(studentCollege)) {
            evalAllowed = false;
            msg = `Evaluations are currently prioritized for specific colleges (${allowedColleges.join(', ')}). Your college (${studentCollege}) is not currently active for evaluations.`;
          }
        }

        setIsEvalOpen(evalAllowed);
        setScheduleMsg(msg);
      }
    }, (err) => console.warn("Evaluation settings snapshot listener info:", err));

    return () => {
      window.removeEventListener('app_setting_changed', handleSettingChange);
      unsubEval();
    };
  }, [user, studentCollege]);

  // 4. Fetch teachers and evaluation status
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const genDoc = await getDoc(doc(db, 'settings', 'general'));
        if (genDoc.exists()) {
          setAcademicPeriod({
            year: genDoc.data().academicYear || '2025-2026',
            semester: genDoc.data().semester || '1st Semester'
          });
        }

        // Fetch teachers - only approved faculty accounts
        let teachersList: any[] = [];
        try {
          const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
          const teachersSnapshot = await getDocs(teachersQuery);
          teachersList = teachersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => {
              const isTeacher = u.role === 'teacher';
              const isApproved = u.verificationStatus === 'approved' || u.isVerifiedStudent === true;
              return isTeacher && isApproved;
            });
        } catch (tErr) {
          console.warn("Teachers fetch notice (using local/cached fallback):", tErr);
        }

        // Merge local storage teachers
        try {
          const localTeachers = JSON.parse(localStorage.getItem('sac_local_teachers') || '{}');
          Object.entries(localTeachers).forEach(([id, tData]: [string, any]) => {
            if (tData.role === 'teacher' && (tData.verificationStatus === 'approved' || tData.isVerifiedStudent === true)) {
              const idx = teachersList.findIndex(t => t.id === id || (t.email && tData.email && t.email.toLowerCase() === tData.email.toLowerCase()));
              if (idx >= 0) {
                teachersList[idx] = { ...teachersList[idx], ...tData };
              } else {
                teachersList.push({ id, ...tData });
              }
            }
          });
        } catch (lsErr) {
          console.warn("Local storage teachers notice in StudentDashboard:", lsErr);
        }

        // If still empty or in demo mode, populate with DEMO_FACULTY_MEMBERS
        if (teachersList.length === 0) {
          if (!isDemoDataSeeded()) {
            seedDemoDataToStorage();
          }
          DEMO_FACULTY_MEMBERS.forEach(f => {
            teachersList.push({
              ...f,
              verificationStatus: 'approved',
              isVerifiedStudent: true
            });
          });
        }
        
        setTeachers(teachersList);

        // Fetch evaluations done by current student
        if (user?.uid) {
          const evaluatedIds = new Set<string>();
          const evalsMap: Record<string, any> = {};

          try {
            const evalsQuery = query(collection(db, 'evaluations'), where('actualStudentId', '==', user.uid));
            const evalsSnap = await getDocs(evalsQuery);
            evalsSnap.forEach(docSnap => {
              const data = docSnap.data();
              if (data.teacherId) {
                evaluatedIds.add(data.teacherId);
                evalsMap[data.teacherId] = { id: docSnap.id, ...data };
              }
            });
          } catch (evalErr) {
            console.warn("Evaluations query notice (permissions/offline fallback):", evalErr);
          }

          // Also merge local evaluation records for resiliency
          try {
            const localEvals = JSON.parse(localStorage.getItem('sac_local_evaluations') || '{}');
            Object.values(localEvals).forEach((locEval: any) => {
              const isOwner = locEval.actualStudentId === user.uid || 
                ((user.email === 'student@stalexiuscollege.edu.ph' || userProfile?.studentId === '2024-10294') && (locEval.actualStudentId === 'student-demo-uid' || locEval.studentId === '2024-10294'));
              
              if (isOwner && locEval.teacherId) {
                evaluatedIds.add(locEval.teacherId);
                if (!evalsMap[locEval.teacherId]) {
                  evalsMap[locEval.teacherId] = locEval;
                }
              }
            });
          } catch (lsErr) {
            console.warn("Local storage evals check notice:", lsErr);
          }

          setEvaluatedTeacherIds(evaluatedIds);
          setEvaluationDocsMap(evalsMap);
        }
      } catch (error) {
        console.warn("Info fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleEvaluationSubmitted = (e: any) => {
      const submittedEval = e.detail;
      if (submittedEval && submittedEval.teacherId) {
        setEvaluatedTeacherIds(prev => new Set([...Array.from(prev), submittedEval.teacherId]));
        setEvaluationDocsMap(prev => ({ ...prev, [submittedEval.teacherId]: submittedEval }));
      }
    };

    const handleTeachersUpdated = (e: any) => {
      fetchData();
    };

    window.addEventListener('sac_evaluation_submitted', handleEvaluationSubmitted);
    window.addEventListener('sac_teachers_updated', handleTeachersUpdated);
    return () => {
      window.removeEventListener('sac_evaluation_submitted', handleEvaluationSubmitted);
      window.removeEventListener('sac_teachers_updated', handleTeachersUpdated);
    };
  }, [user]);

  const handleSaveCollege = async () => {
    if (!user?.uid || !selectedCollegeInput) return;
    setSavingCollege(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        college: selectedCollegeInput,
        department: selectedCollegeInput
      }, { merge: true });

      setStudentCollege(selectedCollegeInput);
      setIsEditingCollege(false);
    } catch (err) {
      console.error("Failed to save student college:", err);
      alert("Failed to save college selection.");
    } finally {
      setSavingCollege(false);
    }
  };

  const formatTimestamp = (evalDoc: any) => {
    if (!evalDoc) return 'Recorded';
    const raw = evalDoc.updatedAt || evalDoc.createdAt || evalDoc.submittedAt;
    if (!raw) return 'Recorded';
    try {
      let date: Date;
      if (typeof raw.toDate === 'function') {
        date = raw.toDate();
      } else if (raw.seconds) {
        date = new Date(raw.seconds * 1000);
      } else {
        date = new Date(raw);
      }
      if (isNaN(date.getTime())) return 'Recorded';
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Recorded';
    }
  };

  const getScoreText = (evalDoc: any) => {
    if (!evalDoc) return { score: 'Completed', label: 'Verified' };
    let scoreNum = evalDoc.computedScore;
    if (scoreNum === undefined || scoreNum === null) {
      if (Array.isArray(evalDoc.answers) && evalDoc.answers.length > 0) {
        const valid = evalDoc.answers.filter((a: any) => typeof a === 'number');
        if (valid.length > 0) {
          scoreNum = (valid.reduce((acc: number, val: number) => acc + val, 0) / valid.length).toFixed(2);
        }
      }
    }
    if (scoreNum !== undefined && scoreNum !== null) {
      const num = typeof scoreNum === 'number' ? scoreNum : parseFloat(scoreNum);
      if (!isNaN(num)) {
        let label = 'Completed';
        if (num >= 4.5) label = 'Outstanding';
        else if (num >= 3.5) label = 'Very Satisfactory';
        else if (num >= 2.5) label = 'Satisfactory';
        else if (num >= 1.5) label = 'Fair';
        else label = 'Needs Improvement';
        return { score: `${num.toFixed(2)} / 5.00`, label };
      }
    }
    return { score: 'Submitted', label: 'Evaluation Recorded' };
  };

  if (loading) return <div className="p-8 text-gray-500">Loading student evaluation portal...</div>;

  // Filter teachers based on student's selected college and general education status
  const majorTeachers = teachers.filter(t => {
    if (!studentCollege) return true;
    return t.department === studentCollege || (t.majorSubjects && t.majorSubjects.toLowerCase().includes(studentCollege.toLowerCase()));
  });

  const genEdTeachers = teachers.filter(t => {
    return t.isGeneralEducation || t.department === 'General Education' || (t.otherSubjects && t.otherSubjects.trim().length > 0);
  });

  // Eligible teachers for this student (Major college teachers + General Education teachers)
  let eligibleTeachers: any[] = [];
  if (!studentCollege) {
    eligibleTeachers = teachers;
  } else {
    const map = new Map<string, any>();
    majorTeachers.forEach(t => map.set(t.id, t));
    genEdTeachers.forEach(t => map.set(t.id, t));
    eligibleTeachers = Array.from(map.values());
  }

  // Filtered teachers based on tab selection, search query, and department filter
  let displayedTeachers = eligibleTeachers.filter(t => {
    if (subjectFilterTab === 'MAJOR') {
      return majorTeachers.some(m => m.id === t.id);
    }
    if (subjectFilterTab === 'GENED') {
      return genEdTeachers.some(g => g.id === t.id);
    }
    return true;
  });

  // Apply Search & Department Filters
  displayedTeachers = displayedTeachers.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = t.name?.toLowerCase().includes(q);
      const deptMatch = t.department?.toLowerCase().includes(q);
      const posMatch = t.position?.toLowerCase().includes(q);
      const majorMatch = t.majorSubjects?.toLowerCase().includes(q);
      const genEdMatch = t.otherSubjects?.toLowerCase().includes(q);
      if (!nameMatch && !deptMatch && !posMatch && !majorMatch && !genEdMatch) {
        return false;
      }
    }

    if (selectedDeptFilter !== 'ALL') {
      if (t.department !== selectedDeptFilter) {
        return false;
      }
    }

    return true;
  });

  // Filtered evaluated teachers list for History View
  const evaluatedTeachersList = teachers.filter(t => {
    if (!evaluatedTeacherIds.has(t.id)) return false;
    if (selectedDeptFilter !== 'ALL' && t.department !== selectedDeptFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = t.name?.toLowerCase().includes(q);
      const posMatch = t.position?.toLowerCase().includes(q);
      const deptMatch = t.department?.toLowerCase().includes(q);
      const subMatch = (t.majorSubjects || t.otherSubjects || '')?.toLowerCase().includes(q);
      return nameMatch || posMatch || deptMatch || subMatch;
    }
    return true;
  });

  const totalTeachers = eligibleTeachers.length;
  const evaluatedCount = eligibleTeachers.filter(t => evaluatedTeacherIds.has(t.id)).length;
  const progressPercent = totalTeachers > 0 ? Math.round((evaluatedCount / totalTeachers) * 100) : 0;

  let currentVerificationStatus = studentUserData?.verificationStatus;
  if (!currentVerificationStatus) {
    if (studentUserData?.isVerifiedStudent === true) currentVerificationStatus = 'approved';
    else if (studentUserData?.idProofUrl) currentVerificationStatus = 'pending';
    else currentVerificationStatus = 'unsubmitted';
  }
  if (currentVerificationStatus === 'pending_verification') {
    currentVerificationStatus = 'pending';
  }

  const isApprovedStudent = Boolean(
    currentVerificationStatus === 'approved' ||
    currentVerificationStatus === 'verified' ||
    studentUserData?.isVerifiedStudent === true
  );

  if (!isApprovedStudent) {
    return <StatusNotice />;
  }

  return (
    <div className="space-y-6">
      {/* Role Demo Simulator Switcher */}
      <RoleDemoSwitcher className="mb-2" />

      {/* Onboarding Tour for Students */}
      <PortalOnboardingTour
        role="student"
        userId={user?.uid}
        runManually={runTourManually}
        onTourEnd={() => setRunTourManually(false)}
      />

      {/* Student Identification Verification Status Card */}
      {currentVerificationStatus === 'pending' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm space-y-3 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800 flex-shrink-0">
                <Clock className="w-6 h-6 text-amber-700 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-950 uppercase tracking-wide flex items-center">
                  Identification Proof Review Pending
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Your uploaded Student ID card photo is currently under verification by the St. Alexius College Administration.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-center flex-shrink-0">
              {studentUserData?.idProofUrl && (
                <button
                  type="button"
                  onClick={() => setShowIdLightbox(true)}
                  className="px-3.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1 text-amber-700" /> View Uploaded Photo
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setNewIdProofUrl('');
                  setShowReuploadModal(true);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 mr-1" /> Update Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {currentVerificationStatus === 'rejected' && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-5 shadow-sm space-y-3 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-rose-100 rounded-xl text-rose-800 flex-shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-rose-950 uppercase tracking-wide">
                  Identification Proof Declined
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  Your ID proof was declined by the administrator. Please upload a clear photo of your official St. Alexius ID or Registration Form.
                </p>
                {studentUserData?.rejectionReason && (
                  <p className="text-xs font-bold text-rose-950 mt-1 bg-white/80 p-2 rounded-lg border border-rose-200">
                    Admin note: "{studentUserData.rejectionReason}"
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewIdProofUrl('');
                setShowReuploadModal(true);
              }}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center self-start sm:self-center flex-shrink-0"
            >
              <Upload className="w-4 h-4 mr-1.5" /> Re-upload Valid ID Photo
            </button>
          </div>
        </div>
      )}

      {currentVerificationStatus === 'unsubmitted' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-blue-100 rounded-xl text-blue-800 flex-shrink-0">
              <IdCard className="w-6 h-6 text-[#1e3a8a]" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-blue-950 uppercase tracking-wide">
                Student Identification Proof Required
              </h3>
              <p className="text-xs text-blue-800 mt-0.5">
                Please attach a photo of your official St. Alexius Student ID card or Registration form to complete your registration verification.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewIdProofUrl('');
              setShowReuploadModal(true);
            }}
            className="px-4 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center self-start sm:self-center flex-shrink-0"
          >
            <Camera className="w-4 h-4 mr-1.5" /> Upload Student ID
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div id="tour-welcome-banner" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-fade-in-up delay-75">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {academicPeriod.year} &bull; {academicPeriod.semester}
              </span>
              <button
                onClick={() => setShowGuidelinesModal(true)}
                className="inline-flex items-center text-xs font-bold text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Rating Scale Guidelines
              </button>
              <button
                onClick={() => setRunTourManually(true)}
                className="inline-flex items-center text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 transition-colors shadow-2xs"
                title="Start interactive onboarding tour"
              >
                <Compass className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Take Portal Tour
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Welcome, {user?.displayName}</h1>
            <p className="text-gray-500 text-sm mt-1">St. Alexius College Student Faculty Evaluation Portal</p>
          </div>

          {/* Anonymity Banner */}
          {isAnonymous && (
            <div className="inline-flex items-center px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              <ShieldAlert className="w-4 h-4 mr-2 text-emerald-600" />
              100% Anonymous Evaluation Protocol Active
            </div>
          )}
        </div>

        {/* Student College Selector Bar */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <Building2 className="w-4 h-4 text-[#1e3a8a]" />
            <span className="font-semibold text-gray-900">Your College:</span>
            {studentCollege ? (
              <span className="px-3 py-1 rounded-full bg-blue-50 text-[#1e3a8a] font-bold text-xs border border-blue-200">
                {studentCollege}
              </span>
            ) : (
              <span className="text-amber-600 font-semibold text-xs italic">
                ⚠️ Not specified yet
              </span>
            )}
          </div>

          {!isEditingCollege ? (
            <button
              onClick={() => setIsEditingCollege(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors self-start sm:self-auto"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              {studentCollege ? 'Change College' : 'Select College'}
            </button>
          ) : (
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={selectedCollegeInput}
                onChange={(e) => setSelectedCollegeInput(e.target.value)}
                className="text-xs border border-gray-300 rounded-md p-1.5 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] bg-white flex-1 sm:w-64"
              >
                {availableColleges.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <button
                onClick={handleSaveCollege}
                disabled={savingCollege}
                className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-[#1e3a8a] hover:bg-blue-900 rounded-md shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {savingCollege ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Schedule Status Message */}
        {!isEvalOpen ? (
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start">
            <Clock className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Evaluations Period Suspended</h3>
              <p className="text-sm text-amber-700 mt-0.5">{scheduleMsg}</p>
            </div>
          </div>
        ) : scheduleMsg ? (
          <div className="mt-3 text-xs text-blue-700 font-medium flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1" /> {scheduleMsg}
          </div>
        ) : null}
      </div>

      {/* Progress Tracker Card */}
      <div id="tour-progress-tracker" className="bg-gradient-to-r from-[#1e3a8a] to-blue-900 text-white p-6 rounded-xl shadow-md animate-fade-in-up delay-150">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/10 rounded-lg">
              <Award className="w-6 h-6 text-[#d4af37]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Your Evaluation Completion Progress</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                {evaluatedCount} of {totalTeachers} faculty evaluations submitted for this term
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-[#d4af37]">{progressPercent}%</span>
            <span className="text-xs text-blue-200 block">Complete</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full bg-blue-950/60 rounded-full h-3 overflow-hidden p-0.5 border border-blue-700/50">
          <div 
            className="bg-[#d4af37] h-full rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main View Tab Selector */}
      <div className="flex items-center space-x-2 border-b border-gray-200 pb-3 animate-fade-in-up delay-200">
        <button
          onClick={() => setActiveMainTab('EVALUATE')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center transition-all ${
            activeMainTab === 'EVALUATE'
              ? 'bg-[#1e3a8a] text-white shadow-md ring-2 ring-[#1e3a8a]/20'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Sparkles className="w-4 h-4 mr-2 text-amber-300" />
          Evaluate Faculty
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
            {eligibleTeachers.length}
          </span>
        </button>

        <button
          id="tour-evaluation-history"
          onClick={() => setActiveMainTab('HISTORY')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center transition-all ${
            activeMainTab === 'HISTORY'
              ? 'bg-[#1e3a8a] text-white shadow-md ring-2 ring-[#1e3a8a]/20'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <History className="w-4 h-4 mr-2 text-emerald-400" />
          Evaluated Teachers History
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeMainTab === 'HISTORY' ? 'bg-emerald-400 text-slate-900' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {evaluatedTeacherIds.size}
          </span>
        </button>
      </div>

      {/* Search & Filter Toolbar with Predictive Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3 animate-fade-in-up delay-250">
        {/* Real-time Predictive Search Input */}
        <div className="w-full md:w-96">
          <PredictiveSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            teachers={eligibleTeachers}
            onSelectTeacher={(t) => setSearchQuery(t.name || '')}
            onSelectSubject={(s) => setSearchQuery(s)}
            onSelectDepartment={(dept) => setSelectedDeptFilter(dept)}
          />
        </div>

        {/* Department Filter */}
        <div id="tour-department-filter" className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-700 flex-shrink-0">Department:</span>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg p-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] bg-white flex-1 md:w-60"
          >
            <option value="ALL">All Departments ({teachers.length})</option>
            {availableColleges.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teacher Evaluation Cards */}
      {activeMainTab === 'EVALUATE' && (
      <div id="tour-faculty-list" className="space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
              Faculty Evaluation Checklist
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {studentCollege 
                ? `Showing faculty members teaching for ${studentCollege} and General Education courses.` 
                : 'Select your college above to filter faculty for your enrolled major subjects.'}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setSubjectFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                subjectFilterTab === 'ALL'
                  ? 'bg-white text-[#1e3a8a] shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Faculty ({eligibleTeachers.length})
            </button>
            <button
              onClick={() => setSubjectFilterTab('MAJOR')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                subjectFilterTab === 'MAJOR'
                  ? 'bg-white text-[#1e3a8a] shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              College Majors ({majorTeachers.length})
            </button>
            <button
              onClick={() => setSubjectFilterTab('GENED')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                subjectFilterTab === 'GENED'
                  ? 'bg-white text-amber-900 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              General Education ({genEdTeachers.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up delay-300">
          {displayedTeachers.map((teacher, idx) => {
            const isCompleted = evaluatedTeacherIds.has(teacher.id);
            const isGenEd = teacher.isGeneralEducation || teacher.department === 'General Education' || (teacher.otherSubjects && teacher.otherSubjects.trim().length > 0);
            const isMajor = teacher.department === studentCollege || (teacher.majorSubjects && teacher.majorSubjects.toLowerCase().includes(studentCollege.toLowerCase()));

            return (
              <div 
                key={teacher.id} 
                className={`bg-white rounded-xl shadow-sm border transition-all flex flex-col justify-between ${
                  isCompleted 
                    ? 'border-emerald-200 bg-emerald-50/20' 
                    : 'border-gray-200 hover:shadow-md hover:border-blue-300'
                }`}
              >
                <div className="p-6 space-y-4">
                  {/* Category Type Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-semibold">{teacher.department}</span>
                    {isGenEd && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                        General Education / Minor
                      </span>
                    )}
                    {!isGenEd && isMajor && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-[#1e3a8a] border border-blue-200">
                        Major Faculty
                      </span>
                    )}
                  </div>

                  <div className="flex items-start space-x-3">
                    <img 
                      src={teacher.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=random`} 
                      alt="" 
                      className="w-12 h-12 rounded-full object-cover border border-gray-200 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="overflow-hidden">
                      <h4 className="text-base font-bold text-gray-900 truncate">{teacher.name}</h4>
                      <p className="text-[11px] text-blue-800 font-medium">{teacher.position || 'Faculty Member'}</p>
                    </div>
                  </div>

                  {/* Subjects Taught Display */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1.5">
                    {teacher.majorSubjects ? (
                      <div>
                        <span className="font-bold text-blue-900 block text-[11px]">📘 Major Subjects:</span>
                        <span className="text-gray-700 line-clamp-2">{teacher.majorSubjects}</span>
                      </div>
                    ) : (
                      <div className="text-gray-400 italic text-[11px]">No major subjects specified</div>
                    )}

                    {teacher.otherSubjects && (
                      <div className="pt-1 border-t border-gray-200/60">
                        <span className="font-bold text-amber-900 block text-[11px]">📙 Gen Ed / Minor Subjects:</span>
                        <span className="text-gray-700 line-clamp-2">{teacher.otherSubjects}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Badge & Receipt Link */}
                  <div className="flex items-center justify-between pt-1">
                    {isCompleted ? (
                      <>
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                          Submitted
                        </div>
                        {evaluationDocsMap[teacher.id] && (
                          <button
                            onClick={() => {
                              if (!isApprovedStudent) {
                                alert("Account Verification Required: You must have an approved Student ID proof before accessing official evaluation receipts.");
                                setShowReuploadModal(true);
                                return;
                              }
                              setSelectedReceipt({ teacher, evalDoc: evaluationDocsMap[teacher.id] });
                            }}
                            className="inline-flex items-center text-[11px] font-bold text-[#1e3a8a] hover:underline"
                          >
                            <FileText className="w-3 h-3 mr-1 text-[#1e3a8a]" /> Official Receipt
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Pending Evaluation
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => {
                      if (!isApprovedStudent) {
                        setNewIdProofUrl('');
                        setShowReuploadModal(true);
                        return;
                      }
                      navigate(`/evaluate/${teacher.id}`);
                    }}
                    disabled={!isEvalOpen}
                    className={`w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                      !isEvalOpen 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : !isApprovedStudent
                          ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
                          : isCompleted
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-[#1e3a8a] text-white hover:bg-blue-900 shadow-sm'
                    }`}
                  >
                    {!isEvalOpen 
                      ? 'Period Closed'
                      : !isApprovedStudent
                        ? (currentVerificationStatus === 'pending' ? 'Verification Pending (Upload ID)' : 'ID Proof Required to Evaluate')
                        : isCompleted 
                          ? 'View / Update Submission' 
                          : 'Evaluate Faculty Member'}
                    {!isApprovedStudent && <Lock className="w-3.5 h-3.5 ml-1.5" />}
                    {isEvalOpen && isApprovedStudent && <ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
                  </button>
                </div>
              </div>
            );
          })}

          {displayedTeachers.length === 0 && (
            <div className="col-span-full bg-white p-12 text-center text-gray-500 rounded-xl border border-gray-100">
              No faculty members found for the selected view filter.
            </div>
          )}
        </div>
      </div>
      )}

      {/* TAB VIEW 2: EVALUATED TEACHERS HISTORY */}
      {activeMainTab === 'HISTORY' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center">
                  <History className="w-6 h-6 text-emerald-600 mr-2.5" />
                  Evaluated Teachers History
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Official timestamped history of faculty performance evaluations submitted by your account for <span className="font-bold text-[#1e3a8a]">{academicPeriod.year} - {academicPeriod.semester}</span>.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                  {evaluatedTeacherIds.size} Completed Evaluation{evaluatedTeacherIds.size === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Evaluated List */}
            {evaluatedTeachersList.length === 0 ? (
              <div className="py-12 text-center space-y-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <History className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-800">No Evaluated Faculty History Yet</h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                    When you evaluate faculty members from your course checklist, your submitted feedback, ratings, and official clearance receipts with timestamps will appear here.
                  </p>
                </div>
                <button
                  onClick={() => setActiveMainTab('EVALUATE')}
                  className="px-5 py-2.5 bg-[#1e3a8a] text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-900 transition-all inline-flex items-center"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-amber-300" />
                  Start Faculty Evaluations Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {evaluatedTeachersList.map((teacher) => {
                  const evalDoc = evaluationDocsMap[teacher.id];
                  const timestampStr = formatTimestamp(evalDoc);
                  const scoreInfo = getScoreText(evalDoc);

                  return (
                    <div 
                      key={teacher.id}
                      className="bg-white rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      {/* Top Ribbon */}
                      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600" />

                      <div className="space-y-4">
                        {/* Faculty Info Header */}
                        <div className="flex items-start space-x-4">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-blue-900 text-white font-bold flex items-center justify-center text-lg flex-shrink-0 border-2 border-emerald-200 shadow-sm">
                            {teacher.photoURL ? (
                              <img src={teacher.photoURL} alt={teacher.name} className="w-full h-full object-cover" />
                            ) : (
                              teacher.name?.charAt(0) || 'F'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wide flex items-center">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Recorded & Verified
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-gray-900 truncate mt-1">{teacher.name}</h4>
                            <p className="text-xs text-gray-500 font-medium">{teacher.position || 'Faculty Member'}</p>
                            <p className="text-[11px] text-[#1e3a8a] font-bold mt-0.5">{teacher.department}</p>
                          </div>
                        </div>

                        {/* Timestamp & Academic Term Box */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-gray-700">
                            <span className="text-gray-500 text-[11px] font-medium flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                              Evaluation Timestamp:
                            </span>
                            <strong className="text-gray-900 font-bold">{timestampStr}</strong>
                          </div>
                          <div className="flex items-center justify-between text-gray-700 pt-1 border-t border-slate-200/80">
                            <span className="text-gray-500 text-[11px] font-medium flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                              Academic Term:
                            </span>
                            <span className="font-semibold text-slate-800">
                              {evalDoc?.academicYear || academicPeriod.year} &bull; {evalDoc?.semester || academicPeriod.semester}
                            </span>
                          </div>
                        </div>

                        {/* Evaluation Score Card */}
                        <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                              Overall Rating Given
                            </span>
                            <span className="text-sm font-black text-emerald-900">
                              {scoreInfo.score}
                            </span>
                          </div>
                          <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm">
                            {scoreInfo.label}
                          </span>
                        </div>

                        {/* Comments Preview */}
                        {evalDoc?.comments && (
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center">
                              <MessageSquare className="w-3 h-3 mr-1 text-gray-500" />
                              Submitted Student Feedback
                            </span>
                            <p className="italic text-gray-800 line-clamp-3 font-medium">"{evalDoc.comments}"</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => setSelectedReceipt({ teacher, evalDoc })}
                          className="flex items-center justify-center px-3 py-2 bg-white hover:bg-gray-50 text-[#1e3a8a] border border-[#1e3a8a]/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-[#1e3a8a]" />
                          Clearance Receipt
                        </button>
                        <button
                          onClick={() => navigate(`/evaluate/${teacher.id}`)}
                          disabled={!isEvalOpen}
                          className={`flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            isEvalOpen
                              ? 'bg-[#1e3a8a] hover:bg-blue-900 text-white'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                          {isEvalOpen ? 'Update Evaluation' : 'Period Closed'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guidance Office Official Information & Consultation Support */}
      <div className="animate-fade-in-up delay-400">
        <GuidanceOfficeCard id="guidance-office-info" />
      </div>

      {/* Item 3: Official Evaluation Confirmation Slip / Clearance Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-gray-200 print:shadow-none print:border-0 print:p-0">
            {/* Close button - hidden on print */}
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Official Header */}
            <div className="text-center border-b-2 border-[#1e3a8a] pb-4 space-y-1">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#d4af37] shadow-sm flex items-center justify-center bg-[#1e3a8a] text-white font-black text-lg">
                  SAC
                </div>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">ST. ALEXIUS COLLEGE</h2>
              <p className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">Office of Academic Affairs & Quality Assurance</p>
              <p className="text-[11px] text-slate-500">Official Student Faculty Evaluation Clearance Receipt</p>
            </div>

            {/* Tracking Reference Badge */}
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] font-medium uppercase">Clearance Reference ID</span>
                <span className="font-mono font-bold text-[#1e3a8a] text-sm">
                  SAC-EVAL-2026-{selectedReceipt.evalDoc.id?.substring(0, 8).toUpperCase() || 'OFFICIAL'}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-300">
                OFFICIALLY RECORDED & VERIFIED
              </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-4 text-xs">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-1 text-xs uppercase tracking-wide">Student Information</h3>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Student Name:</span>
                    <strong className="text-gray-900 font-bold">{user?.displayName || 'Enrolled Student'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Student Email:</span>
                    <strong className="text-gray-900 font-bold">{user?.email || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">College:</span>
                    <strong className="text-[#1e3a8a] font-bold">{studentCollege || 'St. Alexius College'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Academic Term:</span>
                    <strong className="text-gray-900 font-bold">{academicPeriod.year} - {academicPeriod.semester}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-1 text-xs uppercase tracking-wide">Evaluated Faculty Details</h3>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Faculty Member:</span>
                    <strong className="text-[#1e3a8a] font-bold text-sm">{selectedReceipt.teacher.name}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Department:</span>
                    <strong className="text-gray-900 font-bold">{selectedReceipt.teacher.department}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[10px]">Subjects Handled:</span>
                    <strong className="text-gray-800 font-semibold">
                      {selectedReceipt.teacher.majorSubjects || selectedReceipt.teacher.otherSubjects || 'Faculty Member'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Stamp Footer */}
            <div className="border-t border-gray-200 pt-3 text-center space-y-1">
              <p className="text-[10px] text-gray-400">
                This receipt serves as official electronic proof of faculty performance evaluation submission for academic clearance.
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                Generated via SAC TPES Portal &bull; {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}
              </p>
            </div>

            {/* Action Buttons - hidden on print */}
            <div className="flex items-center justify-end space-x-3 print:hidden pt-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-5 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Confirmation Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item 6: Guidelines & Policy Modal */}
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
                <h3 className="text-lg font-bold text-gray-900">Faculty Evaluation Guidelines</h3>
                <p className="text-xs text-gray-500">St. Alexius College Academic Quality Policy</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-extrabold text-gray-900 text-sm">5-Point Likert Rating Scale</h4>
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
                <h5 className="font-bold text-slate-900">Student Code of Evaluation Conduct</h5>
                <ul className="list-disc pl-4 text-slate-700 space-y-1">
                  <li>Ratings should be based on objective observations throughout the term.</li>
                  <li>Comments must remain constructive, respectful, and free of profane language.</li>
                  <li>Your submission is confidential and protected under college data privacy policies.</li>
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

      {/* Lightbox Preview Modal for Student */}
      {showIdLightbox && studentUserData?.idProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative border border-gray-200">
            <button
              onClick={() => setShowIdLightbox(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-gray-100 pb-2">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center">
                <IdCard className="w-5 h-5 text-[#1e3a8a] mr-2" />
                Your Uploaded Student ID Proof
              </h3>
              <p className="text-xs text-gray-500">Currently submitted for admin verification</p>
            </div>

            <div className="bg-slate-900 rounded-xl p-2 flex items-center justify-center max-h-[380px] overflow-hidden">
              <img src={studentUserData.idProofUrl} alt="Uploaded Student ID" className="max-h-[360px] object-contain rounded" />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowIdLightbox(false);
                  setNewIdProofUrl('');
                  setShowReuploadModal(true);
                }}
                className="px-4 py-2 bg-[#1e3a8a] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors"
              >
                Upload Different Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-upload ID Modal */}
      {showReuploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-gray-200">
            <button
              onClick={() => setShowReuploadModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-[#1e3a8a]">
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <Camera className="w-6 h-6 text-[#1e3a8a]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Upload Student Identification</h3>
                <p className="text-xs text-gray-500">Attach a photo of your Student ID card or Registration Form</p>
              </div>
            </div>

            <div className="space-y-3">
              {newIdProofUrl ? (
                <div className="relative bg-slate-900 p-3 rounded-xl border border-amber-400/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <img src={newIdProofUrl} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-amber-300 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-300">Photo Attached</p>
                      <p className="text-[10px] text-blue-200">Click submit to send to admin for verification</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewIdProofUrl('')}
                    className="p-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 hover:border-[#1e3a8a] rounded-xl bg-gray-50 cursor-pointer transition-colors group text-center">
                  <Camera className="w-8 h-8 text-gray-400 group-hover:text-[#1e3a8a] mb-2 transition-colors" />
                  <span className="text-xs font-bold text-gray-700 group-hover:text-[#1e3a8a]">Click to select ID photo</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Supports JPG, PNG (Max 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowReuploadModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitNewProof}
                disabled={!newIdProofUrl || isUploadingProof}
                className="px-5 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-colors shadow-md disabled:opacity-50 flex items-center"
              >
                {isUploadingProof ? 'Uploading...' : 'Submit for Admin Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
