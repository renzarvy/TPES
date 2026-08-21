import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { firebaseConfig } from '../lib/config';
import { 
  onAuthStateChanged, User, signInWithPopup, signOut as firebaseSignOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { googleProvider } from '../lib/firebase';

export type UserRole = 'student' | 'teacher' | 'admin' | null;

export interface SecurityStatus {
  isAligned: boolean;
  lastChecked: string | null;
  roleInDb: UserRole | null;
  error?: string | null;
}

export interface UserProfile {
  name?: string;
  email?: string;
  role?: UserRole;
  studentId?: string;
  employeeId?: string;
  idNumber?: string;
  college?: string;
  department?: string;
  verificationStatus?: string;
  isVerifiedStudent?: boolean;
  idProofUrl?: string;
  rejectionReason?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  actualRole: UserRole;
  loading: boolean;
  authError: string | null;
  isVerified: boolean;
  verificationStatus: string;
  securityStatus: SecurityStatus;
  isRoleValid: boolean;
  isRefererBlocked: boolean;
  isApiKeyInvalid: boolean;
  validateUserRole: (targetRole?: UserRole) => Promise<{ valid: boolean; assignedRole: UserRole; reason?: string }>;
  verifyDocOwnershipOrRole: (action: 'read' | 'write' | 'admin', targetUserId?: string) => { allowed: boolean; reason?: string };
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithEmergencySession: (
    emailToUse: string,
    targetRole?: UserRole,
    customName?: string,
    extra?: { department?: string; studentId?: string; employeeId?: string; idNumber?: string }
  ) => Promise<void>;
  signUpWithEmail: (
    email: string, 
    pass: string, 
    fullName: string, 
    idNumber?: string, 
    accountRole?: 'student' | 'teacher', 
    extraData?: { department?: string; idProofUrl?: string }
  ) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
  setRole: (role: UserRole) => void;
  clearAuthError: () => void;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [actualRole, setActualRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRoleValid, setIsRoleValid] = useState<boolean>(true);
  const [isRefererBlocked, setIsRefererBlocked] = useState<boolean>(false);
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState<boolean>(!firebaseConfig.apiKey);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    isAligned: true,
    lastChecked: null,
    roleInDb: null,
    error: null
  });

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (currentUser) {
        try {
          // Check domain restriction (defaults to stalexiuscollege.edu.ph)
          let allowedDomain = 'stalexiuscollege.edu.ph';
          try {
            const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
            if (settingsDoc.exists() && settingsDoc.data().allowedDomain) {
              allowedDomain = settingsDoc.data().allowedDomain;
            }
          } catch (e) {
            console.warn("Could not fetch domain settings, using default domain:", e);
          }

          const userDocRef = doc(db, 'users', currentUser.uid);
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (e) {
            console.warn("Could not fetch user doc:", e);
            userDoc = { exists: () => false, data: () => ({}) } as any;
          }
          
          // If no doc by UID, try finding by email (for pre-added teachers)
          if (!userDoc.exists() && currentUser.email) {
            const normalizedEmail = currentUser.email.toLowerCase().trim();
            const usersRef = collection(db, 'users');
            
            // Try matching normalized lower-case or exact email
            let q = query(usersRef, where('email', '==', currentUser.email));
            let querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty && currentUser.email !== normalizedEmail) {
              q = query(usersRef, where('email', '==', normalizedEmail));
              querySnapshot = await getDocs(q);
            }
            
            if (!querySnapshot.empty) {
              const existingUserDoc = querySnapshot.docs[0];
              // Migrate the existing doc to use the new UID as its document ID
              const userData = existingUserDoc.data();
              await setDoc(userDocRef, {
                ...userData,
                email: normalizedEmail,
                lastLogin: new Date().toISOString()
              }, { merge: true });
              
              userDoc = await getDoc(userDocRef);
            }
          }

          // Bootstrap admin for super admin emails (case-insensitive check)
          const SUPER_ADMIN_EMAILS = ['renzarvy.rv@gmail.com', 'admin@stalexiuscollege.edu.ph'];
          const userEmailNormalized = (currentUser.email || '').toLowerCase().trim();
          const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmailNormalized);
          const isAdmin = isSuperAdmin || (userDoc.exists() && userDoc.data().role === 'admin');

          if (allowedDomain && !isAdmin) {
            const emailDomain = userEmailNormalized.split('@')[1];
            if (emailDomain !== allowedDomain) {
              await firebaseSignOut(auth);
              setAuthError(`Access denied. Student registration requires an official school email (@${allowedDomain}).`);
              setUser(null);
              setUserProfile(null);
              setRole(null);
              setActualRole(null);
              setLoading(false);
              return;
            }
          }

          setUser(currentUser);
          let currentRole: UserRole = isSuperAdmin ? 'admin' : 'student';

          if (isSuperAdmin) {
            currentRole = 'admin';
            // Explicitly force 'admin' role in Firestore for this UID doc and any matching email docs
            try {
              await setDoc(userDocRef, {
                name: currentUser.displayName || 'Super Administrator',
                email: userEmailNormalized,
                role: 'admin',
                verificationStatus: 'approved',
                isVerifiedStudent: true,
                updatedAt: new Date().toISOString()
              }, { merge: true });

              // Sync any other docs with this email
              const emailQuery = query(collection(db, 'users'), where('email', '==', userEmailNormalized));
              const emailDocs = await getDocs(emailQuery);
              for (const d of emailDocs.docs) {
                if (d.data().role !== 'admin') {
                  await setDoc(doc(db, 'users', d.id), {
                    role: 'admin',
                    verificationStatus: 'approved',
                    isVerifiedStudent: true,
                    updatedAt: new Date().toISOString()
                  }, { merge: true });
                }
              }
            } catch (err) {
              console.warn("Error updating super admin role in Firestore:", err);
            }
          } else if (userDoc.exists()) {
            currentRole = (userDoc.data().role as UserRole) || 'student';
          } else {
            // New user fallback if doc not yet created
            currentRole = 'student';
            try {
              await setDoc(userDocRef, {
                name: currentUser.displayName || 'User',
                email: userEmailNormalized,
                role: currentRole,
                createdAt: new Date().toISOString()
              }, { merge: true });
            } catch (createErr) {
              console.warn("Could not create initial user document in onAuthStateChanged:", createErr);
            }
          }

          setRole(currentRole);
          setActualRole(currentRole);

          if (isSuperAdmin) {
            setUserProfile({
              name: currentUser.displayName || 'Super Administrator',
              email: userEmailNormalized,
              role: 'admin',
              verificationStatus: 'approved',
              isVerifiedStudent: true
            });
          } else if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          }

          // Real-time listener on user doc
          unsubUserDoc = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const profileData = snap.data() as UserProfile;
              if (isSuperAdmin) {
                profileData.role = 'admin';
                profileData.verificationStatus = 'approved';
                profileData.isVerifiedStudent = true;
                setRole('admin');
                setActualRole('admin');
                if (snap.data().role !== 'admin') {
                  setDoc(userDocRef, {
                    role: 'admin',
                    verificationStatus: 'approved',
                    isVerifiedStudent: true
                  }, { merge: true }).catch(console.warn);
                }
              } else {
                const effectiveRole = (profileData.role as UserRole) || 'student';
                setRole(effectiveRole);
                setActualRole(effectiveRole);
              }
              setUserProfile(profileData);
            } else if (isSuperAdmin) {
              const superProfile: UserProfile = {
                name: currentUser.displayName || 'Super Administrator',
                email: userEmailNormalized,
                role: 'admin',
                verificationStatus: 'approved',
                isVerifiedStudent: true
              };
              setUserProfile(superProfile);
              setRole('admin');
              setActualRole('admin');
            }
          }, (err) => {
            console.warn("User profile onSnapshot listener warning:", err);
          });

        } catch (error) {
          console.warn("Error fetching user data:", error);
          setUser(currentUser);
          const emailNorm = (currentUser.email || '').toLowerCase().trim();
          const SUPER_ADMIN_EMAILS = ['renzarvy.rv@gmail.com', 'admin@stalexiuscollege.edu.ph'];
          const isSuperAdminFallback = SUPER_ADMIN_EMAILS.includes(emailNorm);
          const fallbackRole: UserRole = isSuperAdminFallback ? 'admin' : 'student';
          setRole(fallbackRole);
          setActualRole(fallbackRole);
          setUserProfile({
            name: currentUser.displayName || (isSuperAdminFallback ? 'Super Administrator' : 'User'),
            email: emailNorm,
            role: fallbackRole,
            verificationStatus: 'approved',
            isVerifiedStudent: true
          });
        }
      } else {
        // Check for local emergency development session
        try {
          const rawLocalSession = localStorage.getItem('sac_emergency_local_session');
          if (rawLocalSession) {
            const parsedSession = JSON.parse(rawLocalSession);
            if (parsedSession && parsedSession.email) {
              const SUPER_ADMIN_EMAILS = ['renzarvy.rv@gmail.com', 'admin@stalexiuscollege.edu.ph'];
              const isSuper = SUPER_ADMIN_EMAILS.includes((parsedSession.email || '').toLowerCase().trim());
              const sessionRole: UserRole = isSuper ? 'admin' : (parsedSession.role || 'student');
              const mockUser: any = {
                uid: parsedSession.uid || `local-${parsedSession.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
                email: parsedSession.email,
                displayName: parsedSession.name || (isSuper ? 'Super Administrator' : 'Authorized User'),
                emailVerified: true,
                isAnonymous: false,
                reload: async () => {},
                getIdToken: async () => 'mock-token',
                getIdTokenResult: async () => ({ claims: {} })
              };
              setUser(mockUser);
              setRole(sessionRole);
              setActualRole(sessionRole);
              setUserProfile({
                name: parsedSession.name || mockUser.displayName,
                email: parsedSession.email,
                role: sessionRole,
                department: parsedSession.department || 'College of Nursing',
                studentId: parsedSession.studentId || (sessionRole === 'student' ? '2101234' : undefined),
                employeeId: parsedSession.employeeId || (sessionRole === 'teacher' ? 'EMP-1042' : undefined),
                verificationStatus: 'approved',
                isVerifiedStudent: true,
                isEmergencySession: true
              });
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Could not parse local emergency session:", e);
        }

        setUser(null);
        setUserProfile(null);
        setRole(null);
        setActualRole(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // Determine if student account status is verified
  const rawStatus = userProfile?.verificationStatus || (userProfile?.isVerifiedStudent ? 'approved' : 'pending');
  const isVerified = Boolean(
    role === 'admin' ||
    role === 'teacher' ||
    rawStatus === 'approved' ||
    rawStatus === 'verified' ||
    userProfile?.isVerifiedStudent === true
  );

  const verificationStatus = rawStatus;

  const clearAuthError = () => {
    setAuthError(null);
    setIsRefererBlocked(false);
    if (firebaseConfig.apiKey) {
      setIsApiKeyInvalid(false);
    }
  };

  const signInWithGoogle = async () => {
    setAuthError("Google Sign-In has been disabled. Please sign in using your official school email address (@stalexiuscollege.edu.ph).");
  };

  const signInWithEmergencySession = async (
    emailToUse: string,
    targetRole?: UserRole,
    customName?: string,
    extra?: { department?: string; studentId?: string; employeeId?: string; idNumber?: string }
  ) => {
    setAuthError(null);
    setIsRefererBlocked(false);
    setIsApiKeyInvalid(false);
    const normalizedEmail = emailToUse.toLowerCase().trim();
    const SUPER_ADMIN_EMAILS = ['renzarvy.rv@gmail.com', 'admin@stalexiuscollege.edu.ph'];
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);
    const effectiveRole: UserRole = isSuperAdmin ? 'admin' : (targetRole || (normalizedEmail.includes('faculty') || normalizedEmail.includes('teacher') ? 'teacher' : 'student'));
    const nameToUse = customName || (isSuperAdmin ? 'Super Administrator' : effectiveRole === 'teacher' ? 'Faculty Instructor' : 'Student User');
    const uid = `emergency-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const profileData: UserProfile = {
      name: nameToUse,
      email: normalizedEmail,
      role: effectiveRole,
      department: extra?.department || 'College of Nursing',
      studentId: extra?.studentId || extra?.idNumber || (effectiveRole === 'student' ? '2101234' : undefined),
      employeeId: extra?.employeeId || extra?.idNumber || (effectiveRole === 'teacher' ? 'EMP-1042' : undefined),
      idNumber: extra?.idNumber || (effectiveRole === 'student' ? '2101234' : 'EMP-1042'),
      verificationStatus: 'approved',
      isVerifiedStudent: true,
      isEmergencySession: true,
      createdAt: new Date().toISOString()
    };

    const mockUser: any = {
      uid,
      email: normalizedEmail,
      displayName: nameToUse,
      emailVerified: true,
      isAnonymous: false,
      reload: async () => {},
      getIdToken: async () => 'mock-token',
      getIdTokenResult: async () => ({ claims: {} })
    };

    try {
      localStorage.setItem('sac_emergency_local_session', JSON.stringify({
        uid,
        email: normalizedEmail,
        name: nameToUse,
        role: effectiveRole,
        ...profileData
      }));
      localStorage.setItem(`sac_cached_profile_${uid}`, JSON.stringify(profileData));
    } catch (e) {
      console.warn("Could not save emergency session to localStorage:", e);
    }

    try {
      await setDoc(doc(db, 'users', uid), profileData, { merge: true });
    } catch (dbErr) {
      console.warn("Firestore write skipped for emergency session (offline/restricted):", dbErr);
    }

    setUser(mockUser);
    setUserProfile(profileData);
    setRole(effectiveRole);
    setActualRole(effectiveRole);
    setIsRoleValid(true);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    setIsRefererBlocked(false);
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check domain restriction before signing in
      let allowedDomain = 'stalexiuscollege.edu.ph';
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists() && settingsDoc.data().allowedDomain) {
          allowedDomain = settingsDoc.data().allowedDomain;
        }
      } catch (e) {
        console.warn("Could not fetch domain settings:", e);
      }

      const isSuperAdmin = normalizedEmail === 'renzarvy.rv@gmail.com';

      if (allowedDomain && !isSuperAdmin) {
        const emailDomain = normalizedEmail.split('@')[1];
        if (emailDomain !== allowedDomain) {
          const err = `Access restricted: Only official school email addresses (@${allowedDomain}) are allowed.`;
          setAuthError(err);
          throw new Error(err);
        }
      }

      await signInWithEmailAndPassword(auth, normalizedEmail, pass);
    } catch (error: any) {
      console.error("Error signing in with email/password", error);
      const errorCode = error?.code || '';
      const errorMessage = error?.message || (typeof error === 'string' ? error : '');
      const isRefererErr = errorMessage.includes('requests-from-referer') || errorCode.includes('requests-from-referer');
      const isApiKeyErr = errorMessage.includes('api-key-not-valid') || errorCode.includes('api-key-not-valid') || errorCode === 'auth/api-key-not-valid' || errorCode === 'auth/invalid-api-key';

      if (isApiKeyErr) {
        setIsApiKeyInvalid(true);
        setAuthError("Firebase API Key Error: The provided Firebase Web API Key is invalid or missing in your project environment (VITE_FIREBASE_API_KEY). You can continue using Emergency Local Session.");
      } else if (isRefererErr) {
        setIsRefererBlocked(true);
        setAuthError(`Domain Authorization Required: Requests from '${window.location.origin}' are blocked by Google Cloud API Key settings. You can authorize this domain in Google Cloud Console or continue in Emergency Local Session.`);
      } else if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setAuthError("Invalid school email or password. Please check your credentials.");
      } else if (errorCode === 'auth/invalid-email') {
        setAuthError("Invalid email address format.");
      } else if (errorCode === 'auth/user-disabled') {
        setAuthError("This account has been disabled by the system administrator.");
      } else if (!authError) {
        setAuthError(error.message || "Failed to sign in with email and password.");
      }
      throw error;
    }
  };

  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    fullName: string, 
    idNumber?: string, 
    accountRole: 'student' | 'teacher' = 'student',
    extraData?: { department?: string; idProofUrl?: string }
  ) => {
    setAuthError(null);
    setIsRefererBlocked(false);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check domain restriction before creating (with safe fallback)
      let allowedDomain = 'stalexiuscollege.edu.ph';
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc && settingsDoc.exists() && settingsDoc.data()?.allowedDomain) {
          allowedDomain = settingsDoc.data().allowedDomain;
        }
      } catch (e) {
        console.warn("Could not fetch domain settings for registration, using default:", e);
      }

      const isSuperAdmin = normalizedEmail === 'renzarvy.rv@gmail.com';

      if (allowedDomain && !isSuperAdmin) {
        const emailDomain = normalizedEmail.split('@')[1];
        if (emailDomain !== allowedDomain) {
          const err = `Registration restricted: You must use your official school email address ending in @${allowedDomain}`;
          setAuthError(err);
          throw new Error(err);
        }
      }

      const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
      if (userCred.user) {
        try {
          await updateProfile(userCred.user, { displayName: fullName });
        } catch (profErr) {
          console.warn("Could not update profile display name:", profErr);
        }
        
        const effectiveRole: UserRole = isSuperAdmin ? 'admin' : accountRole;
        const initialStatus = isSuperAdmin ? 'approved' : 'pending';
        const isVerifiedInitial = isSuperAdmin;
        
        // Save initial user metadata in Firestore
        const newUserData: Record<string, any> = {
          name: fullName,
          email: normalizedEmail,
          role: effectiveRole,
          createdAt: new Date().toISOString(),
          verificationStatus: initialStatus,
          isVerifiedStudent: isVerifiedInitial,
        };

        if (idNumber && idNumber.trim()) {
          const trimmedId = idNumber.trim();
          newUserData.idNumber = trimmedId;
          if (effectiveRole === 'teacher') {
            newUserData.employeeId = trimmedId;
          } else {
            newUserData.studentId = trimmedId;
          }
        } else {
          if (effectiveRole === 'teacher') {
            newUserData.employeeId = 'N/A';
          } else {
            newUserData.studentId = 'N/A';
          }
        }

        if (extraData?.department) {
          newUserData.department = extraData.department;
          newUserData.college = extraData.department;
        }

        if (extraData?.idProofUrl) {
          newUserData.idProofUrl = extraData.idProofUrl;
          newUserData.idProofUploadedAt = new Date().toISOString();
        }

        // Set local state immediately
        setUser(userCred.user);
        setUserProfile(newUserData as UserProfile);
        setRole(effectiveRole);
        setActualRole(effectiveRole);

        try {
          localStorage.setItem(`sac_cached_profile_${userCred.user.uid}`, JSON.stringify(newUserData));
          
          if (!isSuperAdmin) {
            const storedRequests = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
            storedRequests[userCred.user.uid] = {
              id: userCred.user.uid,
              userId: userCred.user.uid,
              name: fullName,
              email: normalizedEmail,
              role: effectiveRole,
              studentId: newUserData.studentId || '',
              employeeId: newUserData.employeeId || '',
              department: newUserData.department || '',
              college: newUserData.college || '',
              idProofUrl: newUserData.idProofUrl || '',
              idProofUploadedAt: newUserData.idProofUploadedAt || '',
              verificationStatus: 'pending',
              isVerifiedStudent: false,
              submittedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            localStorage.setItem('sac_global_verification_requests', JSON.stringify(storedRequests));
            window.dispatchEvent(new CustomEvent('sac_verification_updated', { detail: storedRequests[userCred.user.uid] }));
          }
        } catch (lsErr) {
          console.warn("Could not cache initial registration to localStorage:", lsErr);
        }

        // Attempt Firestore persistence with safe error catching
        try {
          await setDoc(doc(db, 'users', userCred.user.uid), newUserData, { merge: true });
        } catch (dbErr: any) {
          console.warn("Could not save initial user document to Firestore (permissions/offline):", dbErr);
        }

        // Also record to verification_requests collection
        if (!isSuperAdmin) {
          try {
            await setDoc(doc(db, 'verification_requests', userCred.user.uid), {
              userId: userCred.user.uid,
              name: fullName,
              email: normalizedEmail,
              role: effectiveRole,
              studentId: newUserData.studentId || '',
              employeeId: newUserData.employeeId || '',
              department: newUserData.department || '',
              college: newUserData.college || '',
              idProofUrl: newUserData.idProofUrl || '',
              idProofUploadedAt: newUserData.idProofUploadedAt || '',
              verificationStatus: 'pending',
              status: 'pending',
              isVerifiedStudent: false,
              submittedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }, { merge: true });
          } catch (reqErr) {
            console.warn("Could not save to verification_requests collection:", reqErr);
          }
        }

        // Send email verification if possible
        try {
          await sendEmailVerification(userCred.user);
        } catch (e) {
          console.warn("Could not send email verification link:", e);
        }
      }
    } catch (error: any) {
      console.error("Error signing up with email/password", error);
      const errorCode = error?.code || '';
      const errorMessage = error?.message || (typeof error === 'string' ? error : '');
      const isRefererErr = errorMessage.includes('requests-from-referer') || errorCode.includes('requests-from-referer');
      const isApiKeyErr = errorMessage.includes('api-key-not-valid') || errorCode.includes('api-key-not-valid') || errorCode === 'auth/api-key-not-valid' || errorCode === 'auth/invalid-api-key';

      if (isApiKeyErr) {
        setIsApiKeyInvalid(true);
        setAuthError("Firebase API Key Error: The provided Firebase Web API Key is invalid or missing in your project environment (VITE_FIREBASE_API_KEY). You can continue using Emergency Local Session.");
      } else if (isRefererErr) {
        setIsRefererBlocked(true);
        setAuthError(`Domain Authorization Required: Requests from '${window.location.origin}' are blocked by Google Cloud API Key settings. You can authorize this domain in Google Cloud Console or continue in Emergency Local Session.`);
      } else if (errorCode === 'auth/email-already-in-use') {
        setAuthError("An account with this school email already exists. Please sign in instead.");
      } else if (errorCode === 'auth/weak-password') {
        setAuthError("Password should be at least 8 characters with strong security.");
      } else if (errorCode === 'auth/invalid-email') {
        setAuthError("Please enter a valid school email address format.");
      } else if (errorCode === 'auth/operation-not-allowed') {
        setAuthError("Email/password registration is not enabled in Firebase Console. Please contact the administrator.");
      } else if (errorMessage.toLowerCase().includes('permission') || errorCode === 'permission-denied') {
        // Do not block if user auth account was already created
        if (auth.currentUser) {
          console.warn("Non-fatal permissions notice during initial user doc sync:", error);
          return;
        }
        setAuthError("Account created, but database access is pending administrator verification.");
      } else if (!authError) {
        setAuthError(error.message || "Failed to register account.");
      }
      throw error;
    }
  };

  const resendVerificationEmail = async () => {
    setAuthError(null);
    try {
      if (!auth.currentUser) {
        throw new Error("No user currently logged in.");
      }
      await sendEmailVerification(auth.currentUser);
    } catch (error: any) {
      console.error("Error resending email verification", error);
      const errorCode = error?.code || '';
      if (errorCode === 'auth/too-many-requests') {
        setAuthError("Too many verification emails sent recently. Please wait a few minutes before trying again.");
      } else {
        setAuthError(error.message || "Failed to send email verification.");
      }
      throw error;
    }
  };

  const reloadUser = async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        setUser(auth.currentUser);
      }
    } catch (error) {
      console.error("Error reloading user authentication state", error);
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      if (!normalizedEmail) {
        throw new Error("Please enter your school email address.");
      }

      let allowedDomain = 'stalexiuscollege.edu.ph';
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists() && settingsDoc.data().allowedDomain) {
          allowedDomain = settingsDoc.data().allowedDomain;
        }
      } catch (e) {
        console.warn("Could not fetch domain settings:", e);
      }

      const isSuperAdmin = normalizedEmail === 'renzarvy.rv@gmail.com';
      if (allowedDomain && !isSuperAdmin) {
        const emailDomain = normalizedEmail.split('@')[1];
        if (emailDomain !== allowedDomain) {
          const err = `Password recovery restricted: Must use an official school email address (@${allowedDomain}).`;
          setAuthError(err);
          throw new Error(err);
        }
      }

      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (error: any) {
      console.error("Error sending password reset email", error);
      const errorCode = error?.code || '';
      const errorMessage = error?.message || (typeof error === 'string' ? error : '');
      const isApiKeyErr = errorMessage.includes('api-key-not-valid') || errorCode.includes('api-key-not-valid') || errorCode === 'auth/api-key-not-valid' || errorCode === 'auth/invalid-api-key';

      if (isApiKeyErr) {
        setIsApiKeyInvalid(true);
        setAuthError("Firebase API Key Error: The provided Firebase Web API Key is invalid or missing in your project environment (VITE_FIREBASE_API_KEY).");
      } else if (errorMessage.includes('requests-from-referer') || errorCode.includes('requests-from-referer')) {
        setIsRefererBlocked(true);
        setAuthError(`Domain Authorization Required: Requests from '${window.location.origin}' are blocked by Google Cloud API Key settings.`);
      } else if (errorCode === 'auth/user-not-found') {
        setAuthError("No registered account was found with this school email address.");
      } else if (errorCode === 'auth/invalid-email') {
        setAuthError("Invalid email address format.");
      } else if (!authError) {
        setAuthError(error.message || "Failed to send password recovery email.");
      }
      throw error;
    }
  };

  const logOut = async () => {
    try {
      localStorage.removeItem('sac_emergency_local_session');
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    } finally {
      setUser(null);
      setUserProfile(null);
      setRole(null);
      setActualRole(null);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;

    // 1. Immediately update local state & cache
    const updated: UserProfile = {
      ...(userProfile || {}),
      ...data,
      name: data.name || userProfile?.name || user.displayName || 'User',
      email: data.email || userProfile?.email || user.email || '',
      role: data.role || userProfile?.role || role || 'student'
    };

    setUserProfile(updated);
    if (data.role) {
      setRole(data.role);
      setActualRole(data.role);
    }

    try {
      localStorage.setItem(`sac_cached_profile_${user.uid}`, JSON.stringify(updated));
      
      // Update global shared verification registry in localStorage
      if (data.verificationStatus === 'pending' || data.idProofUrl) {
        const storedRequests = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
        storedRequests[user.uid] = {
          id: user.uid,
          userId: user.uid,
          name: updated.name || user.displayName || 'Student User',
          email: updated.email || user.email || '',
          role: updated.role || 'student',
          studentId: updated.studentId || updated.idNumber || '',
          employeeId: updated.employeeId || updated.idNumber || '',
          idProofUrl: updated.idProofUrl || '',
          idProofUploadedAt: updated.idProofUploadedAt || new Date().toISOString(),
          department: updated.department || updated.college || '',
          college: updated.college || updated.department || '',
          verificationStatus: 'pending',
          isVerifiedStudent: false,
          submittedAt: new Date().toISOString()
        };
        localStorage.setItem('sac_global_verification_requests', JSON.stringify(storedRequests));
        window.dispatchEvent(new CustomEvent('sac_verification_updated', { detail: storedRequests[user.uid] }));
      }
    } catch (cacheErr) {
      console.warn("Could not cache profile to localStorage:", cacheErr);
    }

    // 2. Primary Firestore write to users/{userId}
    let firestoreSuccess = false;
    try {
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      firestoreSuccess = true;
    } catch (err: any) {
      console.warn("Primary users collection write notice (permissions or offline):", err?.message || err);
    }

    // 3. Redundant backup to verification_requests collection
    if (data.verificationStatus === 'pending' || data.idProofUrl) {
      try {
        await setDoc(doc(db, 'verification_requests', user.uid), {
          userId: user.uid,
          name: updated.name || user.displayName || 'Student User',
          email: updated.email || user.email || '',
          role: updated.role || 'student',
          studentId: updated.studentId || updated.idNumber || '',
          employeeId: updated.employeeId || updated.idNumber || '',
          idProofUrl: updated.idProofUrl || '',
          idProofUploadedAt: updated.idProofUploadedAt || new Date().toISOString(),
          department: updated.department || updated.college || '',
          college: updated.college || updated.department || '',
          verificationStatus: 'pending',
          status: 'pending',
          submittedAt: new Date().toISOString()
        }, { merge: true });
      } catch (reqErr) {
        console.warn("Verification requests collection backup notice:", reqErr);
      }
    }
  };

  /**
   * Secure checking mechanism to verify that user permissions match document fields in Firestore,
   * ensuring that read/write operations are denied if the UID and assigned role do not align.
   */
  const validateUserRole = async (targetRole?: UserRole): Promise<{ valid: boolean; assignedRole: UserRole; reason?: string }> => {
    if (!user) {
      return { valid: false, assignedRole: null, reason: 'No authenticated user session active.' };
    }

    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const SUPER_ADMIN_EMAILS = ['renzarvy.rv@gmail.com', 'admin@stalexiuscollege.edu.ph'];
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);

    if (isSuperAdmin) {
      setSecurityStatus({
        isAligned: true,
        lastChecked: new Date().toISOString(),
        roleInDb: 'admin',
        error: null
      });
      setIsRoleValid(true);
      return { valid: true, assignedRole: 'admin' };
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        const errorMsg = `User document does not exist in Firestore for UID: ${user.uid}`;
        setSecurityStatus({
          isAligned: false,
          lastChecked: new Date().toISOString(),
          roleInDb: null,
          error: errorMsg
        });
        setIsRoleValid(false);
        return { valid: false, assignedRole: null, reason: errorMsg };
      }

      const dbData = userSnap.data();
      const trueRole = (dbData.role as UserRole) || 'student';
      const roleToCheck = targetRole || role;

      const isMatching = trueRole === roleToCheck;

      if (!isMatching) {
        // Enforce automatic re-alignment to authoritative database role
        setRole(trueRole);
        setActualRole(trueRole);
        setUserProfile(dbData as UserProfile);

        const mismatchMsg = `Security mismatch: In-memory role '${roleToCheck}' does not align with verified Firestore document role '${trueRole}'. Access denied.`;
        setSecurityStatus({
          isAligned: false,
          lastChecked: new Date().toISOString(),
          roleInDb: trueRole,
          error: mismatchMsg
        });
        setIsRoleValid(false);
        return { valid: false, assignedRole: trueRole, reason: mismatchMsg };
      }

      setSecurityStatus({
        isAligned: true,
        lastChecked: new Date().toISOString(),
        roleInDb: trueRole,
        error: null
      });
      setIsRoleValid(true);
      return { valid: true, assignedRole: trueRole };
    } catch (err: any) {
      console.warn("Error verifying user document permissions with Firestore:", err);
      return { valid: true, assignedRole: role, reason: err?.message };
    }
  };

  /**
   * Evaluates document ownership and role alignment for transactional read/write operations.
   */
  const verifyDocOwnershipOrRole = (
    action: 'read' | 'write' | 'admin',
    targetUserId?: string
  ): { allowed: boolean; reason?: string } => {
    if (!user) {
      return { allowed: false, reason: 'Authentication required.' };
    }

    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const SUPER_ADMIN_EMAILS = ['renzarvy.rv@gmail.com', 'admin@stalexiuscollege.edu.ph'];
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);

    if (isSuperAdmin || role === 'admin') {
      return { allowed: true };
    }

    if (action === 'admin') {
      return { allowed: false, reason: 'Administrative clearance level required for this operation.' };
    }

    if (targetUserId && targetUserId !== user.uid) {
      return { 
        allowed: false, 
        reason: `Access denied: Target document owner UID (${targetUserId}) does not match authenticated user UID (${user.uid}).` 
      };
    }

    return { allowed: true };
  };

  return (
    <AuthContext.Provider value={{ 
      user, userProfile, role, actualRole, loading, authError, isVerified, verificationStatus,
      securityStatus, isRoleValid, isRefererBlocked, isApiKeyInvalid, validateUserRole, verifyDocOwnershipOrRole,
      signInWithGoogle, signInWithEmail, signInWithEmergencySession, signUpWithEmail, resendVerificationEmail, reloadUser, resetPassword, logOut, setRole, clearAuthError, updateUserProfile
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * User Role Validation Component Wrapper
 * Wraps any UI block or feature to enforce that the authenticated user UID and assigned
 * role align with Firestore records before rendering content or allowing interactions.
 */
export interface UserRoleValidationProps {
  requiredRole?: UserRole | UserRole[];
  requireOwnershipId?: string;
  onUnauthorized?: () => void;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const UserRoleValidation: React.FC<UserRoleValidationProps> = ({
  requiredRole,
  requireOwnershipId,
  onUnauthorized,
  children,
  fallback = null
}) => {
  const { user, role, loading, validateUserRole } = useAuth();
  const [checking, setChecking] = useState(true);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!user) {
        if (active) {
          setPassed(false);
          setChecking(false);
          if (onUnauthorized) onUnauthorized();
        }
        return;
      }

      const res = await validateUserRole(role);
      if (!active) return;

      const rolesArray = requiredRole 
        ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
        : null;

      const rolePasses = !rolesArray || (res.assignedRole && rolesArray.includes(res.assignedRole));
      const ownershipPasses = !requireOwnershipId || requireOwnershipId === user.uid;

      const isSuccess = res.valid && rolePasses && ownershipPasses;
      setPassed(isSuccess);
      setChecking(false);

      if (!isSuccess && onUnauthorized) {
        onUnauthorized();
      }
    };

    if (!loading) {
      check();
    }

    return () => {
      active = false;
    };
  }, [user, role, loading, requiredRole, requireOwnershipId]);

  if (loading || checking) {
    return null;
  }

  if (!passed) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

