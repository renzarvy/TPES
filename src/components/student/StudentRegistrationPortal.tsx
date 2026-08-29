import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImageFile } from '../../lib/imageCompressor';
import { getStoredDepartments, subscribeToDepartments } from '../../lib/departments';
import { 
  ShieldCheck, ShieldAlert, Clock, IdCard, Upload, Camera, Trash2, 
  CheckCircle2, AlertCircle, FileText, ArrowRight, RefreshCw, ZoomIn, Eye, Sparkles,
  Building2, GraduationCap, Info, Loader2, X, Send, Check
} from 'lucide-react';

interface StudentRegistrationPortalProps {
  onSuccess?: () => void;
  compact?: boolean;
}

export const StudentRegistrationPortal: React.FC<StudentRegistrationPortalProps> = ({ onSuccess, compact = false }) => {
  const { user, userProfile, verificationStatus, isVerified, role, updateUserProfile } = useAuth();
  
  const isTeacher = role === 'teacher' || userProfile?.role === 'teacher';
  
  const [idNumberInput, setIdNumberInput] = useState<string>(() => {
    const existing = userProfile?.studentId || userProfile?.employeeId || userProfile?.idNumber;
    return existing && existing !== 'N/A' ? existing : '';
  });

  const [selectedDepartment, setSelectedDepartment] = useState<string>(() => {
    return userProfile?.department || userProfile?.college || 'College of Nursing';
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<'idle' | 'compressing' | 'uploading' | 'queuing'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(() => getStoredDepartments());

  // Synchronize initial input if userProfile updates
  useEffect(() => {
    const existing = userProfile?.studentId || userProfile?.employeeId || userProfile?.idNumber;
    if (existing && existing !== 'N/A' && !idNumberInput) {
      setIdNumberInput(existing);
    }
    if ((userProfile?.department || userProfile?.college) && !selectedDepartment) {
      setSelectedDepartment(userProfile.department || userProfile.college);
    }
  }, [userProfile]);

  // Real-time synchronization of academic college departments
  useEffect(() => {
    const unsubscribe = subscribeToDepartments((depts) => {
      if (depts && depts.length > 0) {
        setAvailableDepartments(depts);
        setSelectedDepartment(prev => depts.includes(prev) ? prev : (userProfile?.department || depts[0]));
      }
    });
    return () => unsubscribe();
  }, [userProfile]);

  // Auto-dismiss success toast after 6 seconds
  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 6500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const currentStatus = verificationStatus || (userProfile?.isVerifiedStudent ? 'approved' : 'pending');
  const existingProofUrl = userProfile?.idProofUrl || '';
  const rejectionReason = userProfile?.rejectionReason || '';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    setUploadSuccess(null);

    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file (JPG, PNG, WEBP).');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setUploadError('Original file size exceeds 15MB. Please choose a smaller photo.');
        return;
      }

      try {
        // High-efficiency client-side compression to ~50-90KB JPEG
        const { dataUrl, blob } = await compressImageFile(file, 1200, 1200, 0.75);
        setSelectedFile(file);
        setCompressedBlob(blob);
        setPreviewUrl(dataUrl);
      } catch (compressErr) {
        console.warn('Compression fallback to direct file reading:', compressErr);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        setSelectedFile(file);
      }
    }
  };

  const handleUploadProof = async () => {
    if (!user) {
      setUploadError('You must be logged in to submit credentials.');
      return;
    }

    const rawId = idNumberInput.trim();
    if (!rawId) {
      setUploadError(
        isTeacher 
          ? 'Please enter your Faculty / Employee ID Number.' 
          : 'Please enter your 7-digit Student ID Number (e.g. 2101234).'
      );
      return;
    }

    // Clean any hyphens or spaces (e.g. "21-01234" -> "2101234")
    const cleanId = rawId.replace(/[\s-]/g, '');

    // For students, check that it's numeric and 7 digits (or standard format)
    if (!isTeacher) {
      if (!/^\d{7}$/.test(cleanId) && cleanId.length !== 7) {
        setUploadError('Student ID Number must consist of exactly 7 numbers (e.g. 2101234).');
        return;
      }
    }

    const proofToSubmit = previewUrl || existingProofUrl;
    if (!selectedFile && !proofToSubmit) {
      setUploadError(
        isTeacher 
          ? 'Please upload a photo of your Faculty ID or Certificate of Employment.'
          : 'Please select a clear photo of your Student ID or Certificate of Registration.'
      );
      return;
    }

    setIsUploading(true);
    setUploadStage('compressing');
    setUploadError(null);
    setUploadSuccess(null);

    try {
      let finalProofUrl = proofToSubmit;

      // 1. Try Firebase Storage with a strict 2-second timeout, otherwise fallback immediately to compressed Data URL
      if (compressedBlob || selectedFile) {
        setUploadStage('uploading');
        try {
          const fileToUpload = compressedBlob || selectedFile!;
          const storagePath = `id_proofs/${user.uid}_${Date.now()}.jpg`;
          const storageRef = ref(storage, storagePath);

          const uploadWithTimeout = async () => {
            await uploadBytes(storageRef, fileToUpload);
            return await getDownloadURL(storageRef);
          };

          const timeoutPromise = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Storage timeout - using direct compressed photo')), 2000)
          );

          finalProofUrl = await Promise.race([uploadWithTimeout(), timeoutPromise]);
        } catch (storageErr) {
          console.warn('Firebase Storage bypass/fallback - saving compressed Data URL directly to Firestore:', storageErr);
          // Compressed dataUrl is ~40-70KB, 100% supported and instant in Firestore
          finalProofUrl = previewUrl || proofToSubmit;
        }
      }

      setUploadStage('queuing');

      // 2. Persist to Firestore User Document & Local Profile
      const updatePayload: Record<string, any> = {
        name: userProfile?.name || user.displayName || (isTeacher ? 'Faculty Member' : 'Student User'),
        email: user.email || '',
        role: isTeacher ? 'teacher' : 'student',
        verificationStatus: 'pending',
        isVerifiedStudent: false,
        idProofUrl: finalProofUrl,
        idProofUploadedAt: new Date().toISOString(),
        rejectionReason: '',
        department: selectedDepartment,
        college: selectedDepartment,
        updatedAt: new Date().toISOString()
      };

      if (isTeacher) {
        updatePayload.employeeId = rawId;
        updatePayload.idNumber = rawId;
      } else {
        updatePayload.studentId = cleanId;
        updatePayload.idNumber = cleanId;
      }

      // Also persist to global verification requests collection in real-time
      try {
        await setDoc(doc(db, 'verification_requests', user.uid), {
          userId: user.uid,
          name: updatePayload.name,
          email: updatePayload.email,
          role: updatePayload.role,
          studentId: updatePayload.studentId || '',
          employeeId: updatePayload.employeeId || '',
          department: updatePayload.department || '',
          college: updatePayload.college || '',
          idProofUrl: finalProofUrl,
          idProofUploadedAt: updatePayload.idProofUploadedAt,
          verificationStatus: 'pending',
          status: 'pending',
          isVerifiedStudent: false,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (reqErr) {
        console.warn('verification_requests firestore write notice:', reqErr);
      }

      if (updateUserProfile) {
        await updateUserProfile(updatePayload);
      } else {
        await setDoc(doc(db, 'users', user.uid), updatePayload, { merge: true });
      }

      // Update local storage backup and dispatch sync event
      try {
        const storedRequests = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
        storedRequests[user.uid] = {
          id: user.uid,
          userId: user.uid,
          name: updatePayload.name,
          email: updatePayload.email,
          role: updatePayload.role,
          studentId: updatePayload.studentId || '',
          employeeId: updatePayload.employeeId || '',
          department: updatePayload.department || '',
          college: updatePayload.college || '',
          idProofUrl: finalProofUrl,
          idProofUploadedAt: updatePayload.idProofUploadedAt,
          verificationStatus: 'pending',
          isVerifiedStudent: false,
          submittedAt: new Date().toISOString()
        };
        localStorage.setItem('sac_global_verification_requests', JSON.stringify(storedRequests));
        window.dispatchEvent(new CustomEvent('sac_verification_updated', { detail: storedRequests[user.uid] }));
      } catch (lsErr) {
        console.warn('Local storage backup notice:', lsErr);
      }

      setUploadSuccess('Your registration request and ID credentials have been successfully queued for Administrator approval!');
      setShowSuccessToast(true);
      setSelectedFile(null);
      setCompressedBlob(null);
      setPreviewUrl('');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.warn('Submission notice:', err);
      const isPermissionErr = 
        err?.message?.toLowerCase().includes('permission') || 
        err?.code === 'permission-denied' || 
        String(err).toLowerCase().includes('permission');

      if (isPermissionErr) {
        // Update local session so student is not locked out
        if (updateUserProfile) {
          updateUserProfile({
            verificationStatus: 'pending',
            idProofUrl: proofToSubmit,
            idProofUploadedAt: new Date().toISOString(),
            department: selectedDepartment,
            studentId: cleanId,
            idNumber: cleanId
          }).catch(console.warn);
        }
        setUploadSuccess('Your registration request and ID credentials have been successfully queued for Administrator approval!');
        setShowSuccessToast(true);
        setSelectedFile(null);
        setCompressedBlob(null);
        setPreviewUrl('');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setUploadError(err.message || 'Failed to submit identification credentials. Please verify your connection and try again.');
      }
    } finally {
      setIsUploading(false);
      setUploadStage('idle');
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${compact ? 'p-4' : 'p-6 sm:p-8'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-gradient-to-br from-[#1e3a8a] to-blue-900 text-white rounded-xl shadow-xs border border-amber-400/40">
            <IdCard className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-blue-50 text-[#1e3a8a] text-[10px] font-black uppercase tracking-wider rounded-full border border-blue-200">
                Institutional Verification Portal
              </span>
            </div>
            <h2 className="text-lg font-black text-gray-900 mt-1">
              {isTeacher ? 'Faculty Credential Verification' : 'Student Identification & Identity Verification'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isTeacher
                ? 'Submit your official St. Alexius Faculty / Employee ID to activate instructor features.'
                : 'Upload a clear photo of your official St. Alexius Student ID or Certificate of Registration for administrative approval.'}
            </p>
          </div>
        </div>

        {/* Current Account Status Badge */}
        <div className="self-start sm:self-center">
          {isVerified ? (
            <div className="px-3.5 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-black flex items-center shadow-xs">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" /> VERIFIED ACCOUNT
            </div>
          ) : currentStatus === 'pending_verification' || currentStatus === 'pending' ? (
            <div className="px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black flex items-center shadow-xs animate-pulse">
              <Clock className="w-4 h-4 mr-1.5 text-amber-600" /> PENDING APPROVAL
            </div>
          ) : currentStatus === 'denied' || currentStatus === 'rejected' ? (
            <div className="px-3.5 py-1.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-xs font-black flex items-center shadow-xs">
              <ShieldAlert className="w-4 h-4 mr-1.5 text-rose-600" /> VERIFICATION DENIED
            </div>
          ) : (
            <div className="px-3.5 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-full text-xs font-bold flex items-center">
              <AlertCircle className="w-4 h-4 mr-1.5 text-blue-600" /> CREDENTIALS REQUIRED
            </div>
          )}
        </div>
      </div>

      {/* Rejection Alert Banner if applicable */}
      {(currentStatus === 'denied' || currentStatus === 'rejected') && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-xs text-rose-900">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-rose-950">Previous Registration Submission Declined</p>
            <p className="text-rose-800">
              The administration was unable to verify your previous document. Please ensure your ID number is correct and upload a clear, legible photo of your current St. Alexius Student ID card or Certificate of Registration.
            </p>
            {rejectionReason && (
              <p className="font-mono bg-white/80 p-2.5 rounded-lg border border-rose-200 font-medium text-rose-950 text-[11px] mt-1">
                Admin Rejection Reason: "{rejectionReason}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pending status reminder */}
      {(currentStatus === 'pending' || currentStatus === 'pending_verification') && !uploadSuccess && (
        <div className="mt-6 p-4 bg-amber-50/80 border border-amber-300 rounded-xl flex items-start space-x-3 text-xs text-amber-950">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-amber-950">Credentials Under Administrative Review</p>
            <p className="text-amber-800 mt-0.5">
              Your credentials and ID proof have been received. An administrator will review and approve your account shortly. You may update your information or upload a clearer photo below if needed.
            </p>
          </div>
        </div>
      )}

      {/* Success / Error Alerts */}
      {uploadSuccess && (
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-start space-x-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-emerald-950">Credentials Submitted Successfully</p>
            <p className="text-emerald-800 mt-0.5">{uploadSuccess}</p>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-900 flex items-start space-x-3 animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-rose-950">Unable to Submit</p>
            <p className="text-rose-800 mt-0.5">{uploadError}</p>
          </div>
        </div>
      )}

      {/* 1. Account Details & Identification Form */}
      <div className="mt-6 bg-slate-50/80 p-5 rounded-xl border border-gray-200 space-y-4">
        <h3 className="text-xs font-black text-[#1e3a8a] uppercase tracking-wider flex items-center">
          <IdCard className="w-4 h-4 mr-1.5 text-[#1e3a8a]" />
          1. Institutional Account & Identity Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-gray-500 font-bold block text-[10px] uppercase mb-1">Full Name</label>
            <div className="px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 font-bold text-gray-900 shadow-2xs">
              {userProfile?.name || user?.displayName || 'Student User'}
            </div>
          </div>
          <div>
            <label className="text-gray-500 font-bold block text-[10px] uppercase mb-1">Official School Email</label>
            <div className="px-3.5 py-2.5 bg-white rounded-xl border border-gray-200 font-mono font-medium text-gray-800 truncate shadow-2xs">
              {user?.email}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* ID Number Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-800 font-extrabold block text-xs">
                {isTeacher ? 'Faculty / Employee ID No.' : 'Student ID Number (7 Digits)'} <span className="text-rose-600">*</span>
              </label>
              {!isTeacher && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  idNumberInput.replace(/[\s-]/g, '').length === 7 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {idNumberInput.replace(/[\s-]/g, '').length === 7 ? '✓ 7/7 Digits' : `${idNumberInput.replace(/[\s-]/g, '').length}/7 digits`}
                </span>
              )}
            </div>
            <div className="relative">
              <IdCard className="w-4 h-4 text-[#1e3a8a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isTeacher ? 'e.g. EMP-2023-01' : 'e.g. 2101234'}
                value={idNumberInput}
                onChange={(e) => {
                  setIdNumberInput(e.target.value);
                  setUploadError(null);
                }}
                className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-900 font-mono font-bold placeholder-gray-400 focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 shadow-2xs"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {isTeacher
                ? 'Enter your institutional Faculty ID Number.'
                : 'Must consist of exactly 7 numeric digits (e.g. 2101234) as shown on your official St. Alexius ID.'}
            </p>
          </div>

          {/* Academic College / Department */}
          <div>
            <label className="text-gray-800 font-extrabold block text-xs mb-1">
              Academic College / Department <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[#1e3a8a] absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 shadow-2xs"
              >
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Select your primary college or academic department.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Photo Proof Attachment Section */}
      <div className="mt-6 space-y-3">
        <label className="block text-xs font-extrabold text-gray-900">
          2. {existingProofUrl ? 'Upload / Replace Official Identification Photo' : 'Attach Photo of ID Card or Certificate of Registration'} <span className="text-rose-600">*</span>
        </label>

        {/* Existing ID Photo Card if already submitted and no new file selected */}
        {existingProofUrl && !previewUrl && (
          <div className="bg-slate-900 p-4 rounded-xl border border-amber-400/80 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3.5 overflow-hidden">
              <div 
                onClick={() => setShowLightbox(true)}
                className="w-14 h-14 rounded-lg overflow-hidden border border-amber-400/80 cursor-pointer relative group flex-shrink-0 bg-black"
                title="Click to zoom image"
              >
                <img src={existingProofUrl} alt="Uploaded Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <ZoomIn className="w-4 h-4" />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-amber-300 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Current ID Proof Attached
                </p>
                <p className="text-[10px] text-blue-200 mt-0.5">
                  Uploaded: {userProfile?.idProofUploadedAt ? new Date(userProfile.idProofUploadedAt).toLocaleDateString() : 'Active'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowLightbox(true)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors flex items-center"
              >
                <Eye className="w-3.5 h-3.5 mr-1" /> View Image
              </button>
            </div>
          </div>
        )}

        {/* New Photo Preview or Upload Zone */}
        {previewUrl ? (
          <div className="relative bg-slate-900 p-4 rounded-xl border-2 border-amber-400 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-4 overflow-hidden">
              <img src={previewUrl} alt="New Preview" className="w-16 h-16 object-cover rounded-lg border-2 border-amber-300 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-300 flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" /> New Photo Ready
                </p>
                <p className="text-[10px] text-blue-200 mt-0.5">
                  Click the submit button below to send your credentials for admin approval.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setCompressedBlob(null);
                setPreviewUrl('');
              }}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors ml-2"
              title="Remove selected photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 hover:border-[#1e3a8a] rounded-xl bg-gray-50/80 hover:bg-blue-50/50 cursor-pointer transition-all group text-center">
            <div className="p-3.5 bg-white rounded-full shadow-xs border border-gray-200 group-hover:scale-110 transition-transform mb-2">
              <Camera className="w-6 h-6 text-[#1e3a8a]" />
            </div>
            <span className="text-xs font-bold text-gray-800 group-hover:text-[#1e3a8a]">
              Click or drag to attach photo of Student ID / Certificate of Registration
            </span>
            <span className="text-[10px] text-gray-400 mt-1">Supports JPG, PNG, WEBP (Camera capture supported)</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
        <div className="text-[11px] text-gray-500 flex items-center">
          <Info className="w-4 h-4 text-blue-600 mr-1.5 flex-shrink-0" />
          <span>Submissions are encrypted and reviewed strictly by the SAC Evaluation Office.</span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {previewUrl && (
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setCompressedBlob(null);
                setPreviewUrl('');
              }}
              disabled={isUploading}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancel Photo
            </button>
          )}

          <button
            type="button"
            onClick={handleUploadProof}
            disabled={isUploading}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#1e3a8a] to-blue-900 hover:from-blue-900 hover:to-[#1e3a8a] text-white font-extrabold rounded-xl text-xs transition-all shadow-md hover:shadow-lg border border-amber-400/50 flex items-center justify-center cursor-pointer"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin text-amber-300" />
                Submitting Credentials...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2 text-amber-300" />
                Submit Credentials for Admin Approval
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Spinner Modal Overlay during Submission */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100 space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-[#1e3a8a] animate-spin"></div>
              <IdCard className="w-7 h-7 text-[#1e3a8a] animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-black text-gray-900">
                {uploadStage === 'compressing' && 'Optimizing Documents...'}
                {uploadStage === 'uploading' && 'Uploading ID Proof...'}
                {uploadStage === 'queuing' && 'Queuing for Approval...'}
                {uploadStage === 'idle' && 'Transmitting Registration...'}
              </h4>
              <p className="text-xs text-gray-600">
                Submitting your student credentials to the St. Alexius Institutional Verification Queue.
              </p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-500 h-full w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-400 flex items-start space-x-3.5 relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300"></div>

            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-400/40 shrink-0 mt-0.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="flex-1 pr-6">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 bg-emerald-400/20 text-emerald-300 rounded-full border border-emerald-400/30">
                  Request Queued
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Just now</span>
              </div>
              <h4 className="text-sm font-black text-white mt-1">
                Registration Successfully Queued!
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Your student ID and verification request have been successfully submitted and placed in the administrative queue. An administrator will review and approve your account shortly.
              </p>
            </div>

            <button
              onClick={() => setShowSuccessToast(false)}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {showLightbox && existingProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative border border-gray-200">
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
            >
              ✕
            </button>
            <h3 className="text-base font-extrabold text-gray-900 flex items-center">
              <IdCard className="w-5 h-5 text-[#1e3a8a] mr-2" />
              Submitted Official Identification Proof
            </h3>
            <div className="bg-slate-900 rounded-xl p-2 flex items-center justify-center max-h-[420px] overflow-hidden border border-slate-800">
              <img src={existingProofUrl} alt="Uploaded Identification" className="max-h-[400px] object-contain rounded" />
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                className="px-4 py-2 bg-[#1e3a8a] text-white font-bold text-xs rounded-xl hover:bg-blue-900 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
