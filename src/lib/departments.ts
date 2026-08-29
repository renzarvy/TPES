import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export const DEFAULT_COLLEGES: string[] = [
  'College of Nursing',
  'College of Pharmacy',
  'College of Radiologic Technology',
  'College of Medical Laboratory Science',
  'College of Information Technology',
  'College of Engineering',
  'College of Education',
  'College of Business Administration',
  'College of Criminology',
  'College of Arts & Sciences',
  'College of Allied Health Sciences'
];

const STORAGE_KEY = 'sac_settings_departments';

/**
 * Filter out legacy or non-college entries like Senior High School
 */
export function sanitizeDepartments(list: string[]): string[] {
  if (!Array.isArray(list)) return [...DEFAULT_COLLEGES];
  const cleaned = list
    .map(d => typeof d === 'string' ? d.trim() : '')
    .filter(d => d.length > 0 && !d.toLowerCase().includes('senior high') && !d.toLowerCase().includes('high school') && !d.toLowerCase().includes('highschool'));
  
  return cleaned.length > 0 ? cleaned : [...DEFAULT_COLLEGES];
}

/**
 * Retrieve cached or default college departments list
 */
export function getStoredDepartments(): string[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizeDepartments(parsed);
      }
    }
  } catch (err) {
    console.warn('Could not read cached departments:', err);
  }
  return [...DEFAULT_COLLEGES];
}

/**
 * Persist departments list locally and dispatch sync event
 */
export function setStoredDepartments(depts: string[]): void {
  const sanitized = sanitizeDepartments(depts);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent('sac_departments_updated', { detail: sanitized }));
  } catch (err) {
    console.warn('Could not store departments:', err);
  }
}

/**
 * Subscribe to real-time changes in Firestore settings/departments
 */
export function subscribeToDepartments(callback: (depts: string[]) => void): () => void {
  // Call immediately with cached / default
  callback(getStoredDepartments());

  // Firestore real-time listener
  const unsubscribe = onSnapshot(
    doc(db, 'settings', 'departments'),
    (snapshot) => {
      if (snapshot.exists()) {
        const items = snapshot.data().items;
        if (Array.isArray(items) && items.length > 0) {
          const sanitized = sanitizeDepartments(items);
          setStoredDepartments(sanitized);
          callback(sanitized);
          return;
        }
      }
    },
    (err) => {
      console.warn('Firestore departments listener notice:', err);
    }
  );

  // Local window event listener for cross-tab or immediate intra-page sync
  const handleLocalSync = (e: Event) => {
    if (e instanceof CustomEvent && Array.isArray(e.detail)) {
      callback(e.detail);
    } else {
      callback(getStoredDepartments());
    }
  };

  window.addEventListener('sac_departments_updated', handleLocalSync);
  window.addEventListener('storage', handleLocalSync);

  return () => {
    unsubscribe();
    window.removeEventListener('sac_departments_updated', handleLocalSync);
    window.removeEventListener('storage', handleLocalSync);
  };
}

/**
 * Save updated department list to Firestore and local storage
 */
export async function saveDepartmentsToStorage(newDepts: string[]): Promise<void> {
  const sanitized = sanitizeDepartments(newDepts);
  setStoredDepartments(sanitized);
  try {
    await setDoc(doc(db, 'settings', 'departments'), { items: sanitized }, { merge: true });
  } catch (err) {
    console.error('Failed to save departments to Firestore:', err);
    throw err;
  }
}
