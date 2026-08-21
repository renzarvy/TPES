import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { sendStudentApprovalNotificationEmail } from '../../lib/emailNotificationService';
import { 
  ShieldCheck, ShieldAlert, Clock, Search, Filter, CheckCircle2, XCircle, 
  Eye, IdCard, AlertTriangle, RefreshCw, X, UserCheck, UserX, Mail, Check, ZoomIn, Download, ExternalLink
} from 'lucide-react';

interface StudentUser {
  id: string;
  name?: string;
  email?: string;
  role?: 'student' | 'teacher' | 'admin';
  studentId?: string;
  employeeId?: string;
  college?: string;
  department?: string;
  createdAt?: string;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  isVerifiedStudent?: boolean;
  idProofUrl?: string;
  idProofUploadedAt?: string;
  rejectionReason?: string;
}

export const StudentVerificationManager: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'student' | 'teacher'>('ALL');
  
  // Lightbox modal for ID preview
  const [previewStudent, setPreviewStudent] = useState<StudentUser | null>(null);
  
  // Reject reason modal
  const [rejectingStudent, setRejectingStudent] = useState<StudentUser | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  
  // Action feedback
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [realtimeAlert, setRealtimeAlert] = useState<string | null>(null);
  const prevPendingCountRef = React.useRef<number | null>(null);

  const extractProofUrl = (data: any): string => {
    return (
      data?.idProofUrl ||
      data?.id_proof_url ||
      data?.idPhotoUrl ||
      data?.idPhoto ||
      data?.idProof ||
      data?.proofUrl ||
      data?.photoUrl ||
      data?.imageUrl ||
      ''
    );
  };

  const extractIdNumber = (data: any): string => {
    return (
      data?.studentId ||
      data?.employeeId ||
      data?.idNumber ||
      data?.schoolId ||
      data?.student_id ||
      data?.employee_id ||
      ''
    );
  };

  const extractProofDate = (data: any): string => {
    return (
      data?.idProofUploadedAt ||
      data?.submittedAt ||
      data?.uploadedAt ||
      data?.updatedAt ||
      data?.createdAt ||
      ''
    );
  };

  const normalizeStatus = (data: any): 'pending' | 'approved' | 'rejected' => {
    const rawStatus = (data.verificationStatus || data.status || '').toLowerCase().trim();
    const emailNorm = (data.email || '').toLowerCase().trim();
    
    // Super admin is always approved
    if (emailNorm === 'renzarvy.rv@gmail.com' || data.role === 'admin') {
      return 'approved';
    }

    // Explicitly rejected
    if (rawStatus === 'rejected' || rawStatus === 'denied') {
      return 'rejected';
    }

    // Explicitly approved by admin
    if (rawStatus === 'approved' || rawStatus === 'verified' || (data.isVerifiedStudent === true && rawStatus !== 'pending' && rawStatus !== 'unsubmitted')) {
      return 'approved';
    }

    // Every other student / teacher applicant account is PENDING review!
    return 'pending';
  };

  const recomputeUserList = useCallback((usersMap: Record<string, StudentUser>, reqsMap: Record<string, any>) => {
    const mergedMap: Record<string, StudentUser> = { ...usersMap };

    // Merge verification_requests collection
    Object.entries(reqsMap).forEach(([reqId, reqData]) => {
      const targetKey = reqData.userId || reqData.id || reqId;
      const reqEmail = (reqData.email || '').toLowerCase().trim();
      const existing = mergedMap[targetKey] || Object.values(mergedMap).find(u => u.email && reqEmail && u.email.toLowerCase().trim() === reqEmail);
      
      const proofUrl = extractProofUrl(reqData);
      const idNum = extractIdNumber(reqData);
      const proofDate = extractProofDate(reqData);
      const status = normalizeStatus(reqData);

      if (existing) {
        if (reqData.verificationStatus || reqData.status) {
          existing.verificationStatus = status;
        }
        if (proofUrl) existing.idProofUrl = proofUrl;
        if (idNum) {
          if (existing.role === 'teacher') existing.employeeId = idNum;
          else existing.studentId = idNum;
        }
        if (reqData.studentId) existing.studentId = reqData.studentId;
        if (reqData.employeeId) existing.employeeId = reqData.employeeId;
        if (reqData.name && (!existing.name || existing.name === 'User' || existing.name === 'Student User')) {
          existing.name = reqData.name;
        }
        if (reqData.department) existing.department = reqData.department;
        if (reqData.college) existing.college = reqData.college;
        if (proofDate) existing.idProofUploadedAt = proofDate;
        if (reqData.rejectionReason) existing.rejectionReason = reqData.rejectionReason;
      } else if (reqData.role !== 'admin' && reqEmail !== 'renzarvy.rv@gmail.com') {
        const isTeacher = reqData.role === 'teacher';
        mergedMap[targetKey] = {
          id: targetKey,
          name: reqData.name || 'Applicant User',
          email: reqData.email || '',
          role: isTeacher ? 'teacher' : 'student',
          studentId: isTeacher ? '' : idNum,
          employeeId: isTeacher ? idNum : '',
          department: reqData.department || reqData.college || '',
          college: reqData.college || reqData.department || '',
          idProofUrl: proofUrl,
          idProofUploadedAt: proofDate,
          verificationStatus: status,
          createdAt: reqData.submittedAt || reqData.createdAt || new Date().toISOString()
        };
      }
    });

    // Merge local storage backup
    try {
      const storedRequests = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
      Object.entries(storedRequests).forEach(([uid, localReq]: [string, any]) => {
        const targetKey = localReq.userId || localReq.id || uid;
        const localEmail = (localReq.email || '').toLowerCase().trim();
        const existing = mergedMap[targetKey] || Object.values(mergedMap).find(u => u.email && localEmail && u.email.toLowerCase().trim() === localEmail);
        
        const proofUrl = extractProofUrl(localReq);
        const idNum = extractIdNumber(localReq);
        const proofDate = extractProofDate(localReq);

        if (existing) {
          if (localReq.verificationStatus) existing.verificationStatus = normalizeStatus(localReq);
          if (proofUrl) existing.idProofUrl = proofUrl;
          if (idNum) {
            if (existing.role === 'teacher') existing.employeeId = idNum;
            else existing.studentId = idNum;
          }
          if (localReq.name && (!existing.name || existing.name === 'User' || existing.name === 'Student User')) {
            existing.name = localReq.name;
          }
          if (localReq.department) existing.department = localReq.department;
          if (localReq.college) existing.college = localReq.college;
          if (proofDate) existing.idProofUploadedAt = proofDate;
        } else if (localReq.role !== 'admin' && localEmail !== 'renzarvy.rv@gmail.com') {
          const isTeacher = localReq.role === 'teacher';
          mergedMap[targetKey] = {
            id: targetKey,
            name: localReq.name || 'Applicant User',
            email: localReq.email || '',
            role: isTeacher ? 'teacher' : 'student',
            studentId: isTeacher ? '' : idNum,
            employeeId: isTeacher ? idNum : '',
            department: localReq.department || localReq.college || '',
            college: localReq.college || localReq.department || '',
            idProofUrl: proofUrl,
            idProofUploadedAt: proofDate,
            verificationStatus: normalizeStatus(localReq),
            createdAt: localReq.submittedAt || localReq.createdAt || new Date().toISOString()
          };
        }
      });
    } catch (e) {
      console.warn("Local storage verification merge notice:", e);
    }

    const userList = Object.values(mergedMap).filter(u => {
      const userEmail = (u.email || '').toLowerCase().trim();
      return u.role !== 'admin' && userEmail !== 'renzarvy.rv@gmail.com';
    });

    // Sort: Pending first, then by createdAt desc
    userList.sort((a, b) => {
      if (a.verificationStatus === 'pending' && b.verificationStatus !== 'pending') return -1;
      if (a.verificationStatus !== 'pending' && b.verificationStatus === 'pending') return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const currentPendingCount = userList.filter(s => s.verificationStatus === 'pending').length;
    if (prevPendingCountRef.current !== null && currentPendingCount > prevPendingCountRef.current) {
      setRealtimeAlert(`⚡ Real-time Update: ${currentPendingCount - prevPendingCountRef.current} new registration request(s) received!`);
      setTimeout(() => setRealtimeAlert(null), 6000);
    }
    prevPendingCountRef.current = currentPendingCount;

    setStudents(userList);
    setLoading(false);
  }, []);

  useEffect(() => {
    let usersDataMap: Record<string, StudentUser> = {};
    let reqsDataMap: Record<string, any> = {};

    // 1. Listen to users collection
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const map: Record<string, StudentUser> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userEmail = (data.email || '').toLowerCase().trim();
        if (data.role !== 'admin' && userEmail !== 'renzarvy.rv@gmail.com') {
          const idNum = extractIdNumber(data);
          const isTeacher = data.role === 'teacher';
          map[docSnap.id] = {
            id: docSnap.id,
            ...data,
            idProofUrl: extractProofUrl(data),
            studentId: isTeacher ? (data.studentId || '') : (data.studentId || idNum),
            employeeId: isTeacher ? (data.employeeId || idNum) : (data.employeeId || ''),
            idProofUploadedAt: extractProofDate(data),
            verificationStatus: normalizeStatus(data)
          };
        }
      });
      usersDataMap = map;
      recomputeUserList(usersDataMap, reqsDataMap);
    }, (err) => {
      console.warn("Users snapshot warning:", err);
      setLoading(false);
    });

    // 2. Listen to verification_requests collection
    const unsubReqs = onSnapshot(collection(db, 'verification_requests'), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.forEach((docSnap) => {
        map[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      reqsDataMap = map;
      recomputeUserList(usersDataMap, reqsDataMap);
    }, (err) => {
      console.warn("Verification requests snapshot notice:", err);
    });

    // 3. Listen to window custom events and storage events
    const handleSyncEvent = () => recomputeUserList(usersDataMap, reqsDataMap);
    window.addEventListener('sac_verification_updated', handleSyncEvent);
    window.addEventListener('storage', handleSyncEvent);

    return () => {
      unsubUsers();
      unsubReqs();
      window.removeEventListener('sac_verification_updated', handleSyncEvent);
      window.removeEventListener('storage', handleSyncEvent);
    };
  }, [recomputeUserList]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [usersSnap, reqsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'verification_requests'))
      ]);

      const usersMap: Record<string, StudentUser> = {};
      usersSnap.forEach(docSnap => {
        const data = docSnap.data();
        const userEmail = (data.email || '').toLowerCase().trim();
        if (data.role !== 'admin' && userEmail !== 'renzarvy.rv@gmail.com') {
          const idNum = extractIdNumber(data);
          const isTeacher = data.role === 'teacher';
          usersMap[docSnap.id] = {
            id: docSnap.id,
            ...data,
            idProofUrl: extractProofUrl(data),
            studentId: isTeacher ? (data.studentId || '') : (data.studentId || idNum),
            employeeId: isTeacher ? (data.employeeId || idNum) : (data.employeeId || ''),
            idProofUploadedAt: extractProofDate(data),
            verificationStatus: normalizeStatus(data)
          };
        }
      });

      const reqsMap: Record<string, any> = {};
      reqsSnap.forEach(docSnap => {
        reqsMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });

      recomputeUserList(usersMap, reqsMap);
      showToast("Successfully refreshed registration records!", "success");
    } catch (err) {
      console.warn("Manual refresh notice:", err);
      showToast("Synchronized from local and cached records.", "success");
    } finally {
      setIsRefreshing(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async (student: StudentUser) => {
    setActionLoadingId(student.id);
    try {
      const targetRole = student.role === 'teacher' ? 'teacher' : 'student';
      const normEmail = (student.email || '').toLowerCase().trim();
      const nowIso = new Date().toISOString();
      
      // 1. Update primary users doc
      try {
        await setDoc(doc(db, 'users', student.id), {
          role: targetRole,
          verificationStatus: 'approved',
          isVerifiedStudent: true,
          rejectionReason: '',
          verifiedAt: nowIso
        }, { merge: true });
      } catch (uErr) {
        console.warn("Approve users collection notice:", uErr);
      }

      // 2. Query any other docs in users collection with this email
      if (normEmail) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', normEmail));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await setDoc(doc(db, 'users', d.id), {
              role: targetRole,
              verificationStatus: 'approved',
              isVerifiedStudent: true,
              rejectionReason: '',
              verifiedAt: nowIso
            }, { merge: true });
          }
        } catch (e) {
          console.warn("Sync email users error:", e);
        }
      }

      // 3. Update verification_requests collection
      try {
        await setDoc(doc(db, 'verification_requests', student.id), {
          status: 'approved',
          verificationStatus: 'approved',
          isVerifiedStudent: true,
          verifiedAt: nowIso
        }, { merge: true });
      } catch (rErr) {
        console.warn("Approve verification_requests notice:", rErr);
      }

      if (normEmail) {
        try {
          const q = query(collection(db, 'verification_requests'), where('email', '==', normEmail));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await setDoc(doc(db, 'verification_requests', d.id), {
              status: 'approved',
              verificationStatus: 'approved',
              isVerifiedStudent: true,
              verifiedAt: nowIso
            }, { merge: true });
          }
        } catch (e) {}
      }

      // 4. Update localStorage cache and dispatch sync event
      try {
        const storedRequests = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
        Object.keys(storedRequests).forEach(k => {
          if (k === student.id || (storedRequests[k].email && storedRequests[k].email.toLowerCase() === normEmail)) {
            storedRequests[k].verificationStatus = 'approved';
            storedRequests[k].isVerifiedStudent = true;
          }
        });
        localStorage.setItem('sac_global_verification_requests', JSON.stringify(storedRequests));
        window.dispatchEvent(new CustomEvent('sac_verification_updated', { detail: { id: student.id, email: normEmail, verificationStatus: 'approved', isVerifiedStudent: true } }));
      } catch (lsErr) {
        console.warn("Approve localStorage update notice:", lsErr);
      }

      // 5. Update local state immediately
      setStudents(prev => prev.map(s => s.id === student.id || (normEmail && s.email?.toLowerCase() === normEmail) ? { ...s, role: targetRole, verificationStatus: 'approved', isVerifiedStudent: true } : s));

      // Record activity log in Firestore
      const isTeacher = targetRole === 'teacher';
      const idLabel = student.employeeId || student.studentId || 'N/A';
      try {
        await logActivity({
          action: 'APPROVAL',
          entity: isTeacher ? 'TEACHER' : 'STUDENT',
          details: `Approved ${isTeacher ? 'faculty/teacher' : 'student'} account verification for ${student.name || student.email} (ID: ${idLabel})`,
          performedBy: user?.displayName || 'Admin Verification Office',
          performedByEmail: user?.email || 'N/A',
          targetId: student.id,
          targetName: student.name || student.email
        });
      } catch (actErr) {
        console.warn("Activity log notice:", actErr);
      }

      // Trigger email notification system mock function
      try {
        await sendStudentApprovalNotificationEmail({
          studentId: student.id,
          studentName: student.name || 'User',
          studentEmail: student.email || '',
          studentSchoolId: idLabel,
          approvedBy: 'Admin Verification Office'
        });
      } catch (emailErr) {
        console.warn("Email notification dispatch error:", emailErr);
      }

      showToast(`Approved registration & implemented ${isTeacher ? 'Teacher' : 'Student'} role for ${student.name || student.email}.`, 'success');
      if (previewStudent?.id === student.id) {
        setPreviewStudent(prev => prev ? { ...prev, role: targetRole, verificationStatus: 'approved', isVerifiedStudent: true } : null);
      }
    } catch (err) {
      console.error("Failed to approve user:", err);
      showToast("Failed to approve user registration.", 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingStudent) return;
    const reason = rejectionReasonInput.trim() || 'Proof of ID provided was invalid or incomplete.';
    const normEmail = (rejectingStudent.email || '').toLowerCase().trim();
    const nowIso = new Date().toISOString();
    setActionLoadingId(rejectingStudent.id);
    
    try {
      // 1. Update users collection
      try {
        await setDoc(doc(db, 'users', rejectingStudent.id), {
          verificationStatus: 'rejected',
          isVerifiedStudent: false,
          rejectionReason: reason,
          rejectedAt: nowIso
        }, { merge: true });
      } catch (uErr) {
        console.warn("Reject users doc notice:", uErr);
      }

      if (normEmail) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', normEmail));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await setDoc(doc(db, 'users', d.id), {
              verificationStatus: 'rejected',
              isVerifiedStudent: false,
              rejectionReason: reason,
              rejectedAt: nowIso
            }, { merge: true });
          }
        } catch (e) {}
      }

      // 2. Update verification_requests collection
      try {
        await setDoc(doc(db, 'verification_requests', rejectingStudent.id), {
          status: 'rejected',
          verificationStatus: 'rejected',
          isVerifiedStudent: false,
          rejectionReason: reason,
          rejectedAt: nowIso
        }, { merge: true });
      } catch (rErr) {
        console.warn("Reject verification_requests notice:", rErr);
      }

      if (normEmail) {
        try {
          const q = query(collection(db, 'verification_requests'), where('email', '==', normEmail));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await setDoc(doc(db, 'verification_requests', d.id), {
              status: 'rejected',
              verificationStatus: 'rejected',
              isVerifiedStudent: false,
              rejectionReason: reason,
              rejectedAt: nowIso
            }, { merge: true });
          }
        } catch (e) {}
      }

      // 3. Update localStorage cache
      try {
        const storedRequests = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
        Object.keys(storedRequests).forEach(k => {
          if (k === rejectingStudent.id || (storedRequests[k].email && storedRequests[k].email.toLowerCase() === normEmail)) {
            storedRequests[k].verificationStatus = 'rejected';
            storedRequests[k].isVerifiedStudent = false;
            storedRequests[k].rejectionReason = reason;
          }
        });
        localStorage.setItem('sac_global_verification_requests', JSON.stringify(storedRequests));
        window.dispatchEvent(new CustomEvent('sac_verification_updated', { detail: { id: rejectingStudent.id, email: normEmail, verificationStatus: 'rejected', isVerifiedStudent: false } }));
      } catch (lsErr) {
        console.warn("Reject localStorage update notice:", lsErr);
      }

      // 4. Update local state immediately
      setStudents(prev => prev.map(s => s.id === rejectingStudent.id || (normEmail && s.email?.toLowerCase() === normEmail) ? { ...s, verificationStatus: 'rejected', isVerifiedStudent: false, rejectionReason: reason } : s));

      // Record activity log in Firestore
      try {
        await logActivity({
          action: 'REJECTION',
          entity: 'STUDENT',
          details: `Denied student account verification for ${rejectingStudent.name || rejectingStudent.email}. Reason: ${reason}`,
          performedBy: user?.displayName || 'Admin Verification Office',
          performedByEmail: user?.email || 'N/A',
          targetId: rejectingStudent.id,
          targetName: rejectingStudent.name || rejectingStudent.email
        });
      } catch (actErr) {
        console.warn("Activity log notice:", actErr);
      }

      showToast(`Denied registration for ${rejectingStudent.name || rejectingStudent.email}`, 'success');
      setRejectingStudent(null);
      setRejectionReasonInput('');
      if (previewStudent?.id === rejectingStudent.id) {
        setPreviewStudent(prev => prev ? { ...prev, verificationStatus: 'rejected', isVerifiedStudent: false, rejectionReason: reason } : null);
      }
    } catch (err) {
      console.error("Failed to reject student:", err);
      showToast("Failed to deny student registration.", 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered list based on search, status tab, and role tab
  const filteredStudents = students.filter(s => {
    if (filterStatus !== 'ALL' && s.verificationStatus !== filterStatus) {
      return false;
    }
    if (roleFilter !== 'ALL') {
      const userRole = s.role === 'teacher' ? 'teacher' : 'student';
      if (userRole !== roleFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = s.name?.toLowerCase().includes(q);
      const emailMatch = s.email?.toLowerCase().includes(q);
      const idMatch = s.studentId?.toLowerCase().includes(q) || s.employeeId?.toLowerCase().includes(q);
      const collegeMatch = s.college?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
      const roleMatch = (s.role || '').toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !idMatch && !collegeMatch && !roleMatch) return false;
    }
    return true;
  });

  const pendingCount = students.filter(s => s.verificationStatus === 'pending').length;
  const approvedCount = students.filter(s => s.verificationStatus === 'approved').length;
  const rejectedCount = students.filter(s => s.verificationStatus === 'rejected').length;
  const teachersCount = students.filter(s => s.role === 'teacher').length;
  const studentsCount = students.filter(s => s.role !== 'teacher').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden space-y-0">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`p-3 text-xs font-bold text-white flex items-center justify-between animate-fade-in ${
          toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          <div className="flex items-center space-x-2">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="hover:opacity-80">✕</button>
        </div>
      )}

      {/* Real-time Dynamic Alert Banner */}
      {realtimeAlert && (
        <div className="p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-[#1e3a8a] text-white text-xs font-black flex items-center justify-between shadow-md animate-bounce">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
            </span>
            <span>{realtimeAlert}</span>
          </div>
          <button onClick={() => setRealtimeAlert(null)} className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-slate-900 via-[#1e3a8a] to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-300">
              Registration Control
            </span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {pendingCount} PENDING
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
          <h2 className="text-lg font-black text-white mt-1.5 flex items-center">
            <ShieldCheck className="w-5 h-5 text-amber-300 mr-2" />
            Account Registrations & Role Implementation
          </h2>
          <p className="text-xs text-blue-200 mt-0.5">
            Real-time verification queue automatically updates when student and faculty credentials are submitted.
          </p>
        </div>

        {/* Quick Summary Pill Badges */}
        <div className="flex items-center space-x-2 text-xs font-bold self-start sm:self-center flex-wrap gap-y-1">
          <div className="px-3 py-1 bg-white/10 rounded-lg border border-white/15 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-300" />
            <span>{pendingCount} Pending</span>
          </div>
          <div className="px-3 py-1 bg-white/10 rounded-lg border border-white/15 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            <span>{approvedCount} Verified</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center whitespace-nowrap ${
                filterStatus === 'pending'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Pending Review ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center whitespace-nowrap ${
                filterStatus === 'approved'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Verified ({approvedCount})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center whitespace-nowrap ${
                filterStatus === 'rejected'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
              Denied ({rejectedCount})
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center whitespace-nowrap ${
                filterStatus === 'ALL'
                  ? 'bg-[#1e3a8a] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({students.length})
            </button>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 text-xs font-bold">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all ${roleFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              All Roles
            </button>
            <button
              onClick={() => setRoleFilter('teacher')}
              className={`px-2.5 py-1 rounded-lg transition-all ${roleFilter === 'teacher' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Teachers ({teachersCount})
            </button>
            <button
              onClick={() => setRoleFilter('student')}
              className={`px-2.5 py-1 rounded-lg transition-all ${roleFilter === 'student' ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Students ({studentsCount})
            </button>
          </div>
        </div>

        {/* Search Input and Refresh Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, email, ID number, college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1e3a8a] focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 flex items-center shadow-xs transition-colors shrink-0 disabled:opacity-60"
            title="Force refresh & sync all registrations"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-blue-700 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Records'}</span>
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="divide-y divide-gray-100">
        {filteredStudents.map((student) => {
          const isPending = student.verificationStatus === 'pending';
          const isApproved = student.verificationStatus === 'approved';
          const isRejected = student.verificationStatus === 'rejected';
          const isTeacher = student.role === 'teacher';
          const idNumber = student.employeeId || student.studentId || 'N/A';
          const isLoading = actionLoadingId === student.id;

          return (
            <div key={student.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* User Info */}
              <div className="flex items-start space-x-3.5">
                <div className="relative">
                  {student.idProofUrl ? (
                    <div 
                      onClick={() => setPreviewStudent(student)}
                      className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-xs cursor-pointer group relative bg-slate-900"
                      title="Click to view ID proof"
                    >
                      <img src={student.idProofUrl} alt="ID Proof" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ZoomIn className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded-xl border font-bold text-sm flex items-center justify-center flex-shrink-0 ${
                      isTeacher 
                        ? 'bg-blue-100 border-blue-300 text-blue-900' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      {student.name ? student.name[0]?.toUpperCase() : (isTeacher ? 'T' : 'S')}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="font-bold text-sm text-gray-900">{student.name || 'Unnamed User'}</span>
                    
                    {/* Role Pill */}
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${
                      isTeacher 
                        ? 'bg-blue-50 text-[#1e3a8a] border-blue-200' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {isTeacher ? 'Faculty / Teacher' : 'Student'}
                    </span>

                    {/* Status Badge */}
                    {isPending && (
                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 rounded-full flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-amber-600" /> PENDING REVIEW
                      </span>
                    )}
                    {isPending && (student.createdAt || student.idProofUploadedAt) && (Date.now() - new Date(student.createdAt || student.idProofUploadedAt || 0).getTime()) < 15 * 60 * 1000 && (
                      <span className="px-2 py-0.5 text-[9px] font-black bg-blue-600 text-white rounded-full flex items-center shadow-xs animate-pulse">
                        ⚡ JUST SUBMITTED
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> APPROVED & IMPLEMENTED
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300 rounded-full flex items-center">
                        <XCircle className="w-3 h-3 mr-1 text-rose-600" /> DENIED
                      </span>
                    )}
                    {isPending && !student.idProofUrl && (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                        AWAITING ID PROOF
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="font-mono text-gray-700 font-semibold">{student.email}</span>
                    <span>&bull;</span>
                    <span className="font-mono font-medium">
                      {isTeacher ? 'Employee ID' : 'Student ID'}: <strong className="text-gray-800">{idNumber}</strong>
                    </span>
                    {(student.college || student.department) && (
                      <>
                        <span>&bull;</span>
                        <span className="text-[#1e3a8a] font-semibold">{student.college || student.department}</span>
                      </>
                    )}
                  </div>

                  {isRejected && student.rejectionReason && (
                    <p className="text-[11px] text-rose-700 font-medium mt-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Reason: "{student.rejectionReason}"
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 self-start md:self-center flex-shrink-0">
                {student.idProofUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewStudent(student)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View ID Proof
                  </button>
                )}

                {!isApproved && (
                  <button
                    type="button"
                    onClick={() => handleApprove(student)}
                    disabled={isLoading}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center shadow-xs disabled:opacity-50"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                    {isLoading ? 'Processing...' : isTeacher ? 'Approve Faculty Role' : 'Approve Student Role'}
                  </button>
                )}

                {!isRejected && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingStudent(student);
                      setRejectionReasonInput('');
                    }}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center disabled:opacity-50"
                  >
                    <UserX className="w-3.5 h-3.5 mr-1" /> Deny
                  </button>
                )}

                {isApproved && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingStudent(student);
                      setRejectionReasonInput('Revoking previous approval for verification re-evaluation.');
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                    title="Revoke Verification"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-sm text-gray-700">No registrations found matching the current filter.</p>
            <p className="text-xs text-gray-400 mt-1">All applicant submissions in this category have been processed.</p>
          </div>
        )}
      </div>

      {/* ID Proof Lightbox Preview Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative border border-gray-200">
            <button
              onClick={() => setPreviewStudent(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center">
                <IdCard className="w-5 h-5 text-[#1e3a8a] mr-2" />
                Student Identification Proof Document
              </h3>
              <p className="text-xs text-gray-500">
                Uploaded by <strong className="text-gray-800">{previewStudent.name}</strong> ({previewStudent.email})
              </p>
            </div>

            {/* High Res Image Box */}
            <div className="bg-slate-900 rounded-xl overflow-hidden max-h-[420px] flex items-center justify-center p-2 border border-slate-700 relative">
              <img 
                src={previewStudent.idProofUrl} 
                alt="Student Official ID Proof" 
                className="max-h-[400px] w-auto object-contain rounded"
              />
            </div>

            {/* Details & Actions Footer */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Student ID Number</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{previewStudent.studentId || 'N/A'}</span>
              </div>

              <div className="flex items-center space-x-2">
                {previewStudent.verificationStatus !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleApprove(previewStudent)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center"
                  >
                    <UserCheck className="w-4 h-4 mr-1.5" /> Accept ID Proof
                  </button>
                )}
                {previewStudent.verificationStatus !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingStudent(previewStudent);
                      setRejectionReasonInput('');
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center"
                  >
                    <UserX className="w-4 h-4 mr-1.5" /> Deny / Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-gray-200">
            <button
              onClick={() => setRejectingStudent(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-rose-700">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <ShieldAlert className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Deny Student Registration</h3>
                <p className="text-xs text-gray-500">Specify why the ID proof was invalid or rejected</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-700">
                Student: <strong>{rejectingStudent.name}</strong> ({rejectingStudent.email})
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Rejection</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Blurry ID photo, name mismatch, or expired ID card. Please upload a clear photo."
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Preset Quick Reasons */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Quick Presets:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Blurry or unreadable ID photo',
                    'Name on ID does not match account name',
                    'Expired Student ID card',
                    'Invalid school document uploaded'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReasonInput(preset)}
                      className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border border-gray-200 font-medium"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectingStudent(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center"
              >
                <UserX className="w-4 h-4 mr-1.5" /> Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
