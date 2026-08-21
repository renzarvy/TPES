import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface ActivityLogItem {
  id?: string;
  action: 'APPROVAL' | 'REJECTION' | 'TEACHER_UPDATE' | 'TEACHER_CREATE' | 'TEACHER_DELETE' | 'SETTINGS_UPDATE' | 'EVALUATION_SUBMISSION' | 'ADMIN_GRANT' | 'ADMIN_REVOKE' | 'CRITERIA_UPDATE' | 'COLLEGE_UPDATE' | 'REPORT_GENERATION';
  entity: 'STUDENT' | 'TEACHER' | 'SETTINGS' | 'EVALUATION' | 'ADMIN' | 'COLLEGE' | 'REPORT';
  details: string;
  performedBy: string;
  performedByEmail: string;
  targetId?: string;
  targetName?: string;
  createdAt?: string;
  timestamp?: any;
}

export const logActivity = async (payload: {
  action: ActivityLogItem['action'];
  entity: ActivityLogItem['entity'];
  details: string;
  performedBy: string;
  performedByEmail: string;
  targetId?: string;
  targetName?: string;
}) => {
  try {
    const nowIso = new Date().toISOString();
    const logData = {
      action: payload.action,
      entity: payload.entity,
      details: payload.details,
      performedBy: payload.performedBy || 'System User',
      performedByEmail: payload.performedByEmail || 'N/A',
      adminEmail: payload.performedByEmail || 'N/A',
      targetId: payload.targetId || null,
      targetName: payload.targetName || null,
      timestamp: serverTimestamp(),
      createdAt: nowIso,
    };

    // Write entry to activity_logs collection in Firestore
    await addDoc(collection(db, 'activity_logs'), logData);

    // Also write to audit_logs collection for backward compatibility
    await addDoc(collection(db, 'audit_logs'), logData);
  } catch (error) {
    console.warn("Activity logger info:", error);
  }
};
