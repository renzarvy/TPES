import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface EmailNotificationPayload {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  department?: string;
  triggerType: 'NEW_EVALUATION' | 'REPORT_PUBLISHED' | 'ADMIN_DISPATCH';
  academicYear?: string;
  semester?: string;
  evaluationCount?: number;
  averageScore?: number;
  customNote?: string;
  sentBy?: string;
}

export interface EmailNotificationRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  recipientEmail: string;
  department: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  triggerType: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  readByTeacher: boolean;
  evaluationCount: number;
  averageScore: number;
  sentBy: string;
  createdAt: string;
}

/**
 * Generates professional HTML email template for St. Alexius College Evaluation Reports
 */
export function generateEvaluationReportEmailHtml(params: {
  teacherName: string;
  department?: string;
  academicYear?: string;
  semester?: string;
  evaluationCount?: number;
  averageScore?: number;
  customNote?: string;
  loginUrl?: string;
}): string {
  const {
    teacherName,
    department = 'Faculty Member',
    academicYear = '2025-2026',
    semester = '1st Semester',
    evaluationCount = 0,
    averageScore = 0,
    customNote,
    loginUrl = typeof window !== 'undefined' ? window.location.origin + '/login' : 'https://stalexius.edu/login'
  } = params;

  const scoreBadgeColor = averageScore >= 4.5 ? '#10b981' : averageScore >= 3.5 ? '#3b82f6' : averageScore >= 2.5 ? '#f59e0b' : '#ef4444';
  const scoreRatingLabel = averageScore >= 4.5 ? 'Excellent' : averageScore >= 3.5 ? 'Very Satisfactory' : averageScore >= 2.5 ? 'Satisfactory' : 'Needs Improvement';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
        .header { background-color: #1e3a8a; color: #ffffff; padding: 28px 24px; text-align: center; border-bottom: 4px solid #d4af37; }
        .header-title { font-size: 20px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #d4af37; }
        .header-sub { font-size: 13px; margin-top: 4px; color: #93c5fd; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; }
        .message { font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; }
        .stats-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
        .stat-grid { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px; }
        .stat-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
        .stat-val { font-size: 13px; font-weight: 600; color: #1e293b; }
        .score-badge { display: inline-block; background-color: ${scoreBadgeColor}; color: white; font-weight: 700; font-size: 18px; padding: 6px 16px; border-radius: 6px; }
        .note-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; font-size: 13px; color: #1e40af; border-radius: 4px; margin-bottom: 24px; }
        .cta-container { text-align: center; margin: 28px 0; }
        .cta-button { background-color: #1e3a8a; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; display: inline-block; }
        .footer { background-color: #f9fafb; border-top: 1px solid #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="header-title">ST. ALEXIUS COLLEGE</h1>
          <div class="header-sub">Teachers Performance Evaluation System</div>
        </div>
        <div class="content">
          <div class="greeting">Dear Professor ${teacherName},</div>
          <p class="message">
            An updated faculty evaluation performance report has been processed and is now available for your view in the St. Alexius College Evaluation Portal.
          </p>

          <div class="stats-box">
            <div class="stat-grid">
              <span class="stat-label">Academic Period</span>
              <span class="stat-val">${academicYear} - ${semester}</span>
            </div>
            <div class="stat-grid">
              <span class="stat-label">Department / College</span>
              <span class="stat-val">${department}</span>
            </div>
            <div class="stat-grid">
              <span class="stat-label">Total Student Evaluations</span>
              <span class="stat-val">${evaluationCount} Submission(s)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
              <div>
                <div class="stat-label">Overall Average Rating</div>
                <div style="font-size: 12px; color: ${scoreBadgeColor}; font-weight: 600; margin-top: 2px;">${scoreRatingLabel}</div>
              </div>
              <div class="score-badge">${averageScore ? averageScore.toFixed(2) : '0.00'} / 5.00</div>
            </div>
          </div>

          ${customNote ? `<div class="note-box"><strong>Message from Administration:</strong><br>${customNote}</div>` : ''}

          <div class="cta-container">
            <a href="${loginUrl}" class="cta-button">View Performance Report</a>
          </div>

          <p class="message" style="font-size: 12px; color: #6b7280; margin-bottom: 0;">
            * All individual student responses remain completely anonymized to preserve feedback integrity. You may access your rating breakdown and submit self-reflection entries directly in your portal.
          </p>
        </div>
        <div class="footer">
          St. Alexius College Administration &bull; Teachers Evaluation Service<br>
          Automated Notification System &bull; Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatches automated email notification to teacher and logs notification event in Firestore
 */
export async function sendEvaluationNotificationEmail(payload: EmailNotificationPayload): Promise<EmailNotificationRecord> {
  const {
    teacherId,
    teacherName,
    teacherEmail,
    department = 'Faculty Member',
    triggerType,
    academicYear = '2025-2026',
    semester = '1st Semester',
    evaluationCount = 1,
    averageScore = 0,
    customNote,
    sentBy = 'System Automated Service'
  } = payload;

  const subject = triggerType === 'NEW_EVALUATION' 
    ? `[St. Alexius College] New Student Evaluation Submitted - Prof. ${teacherName}`
    : `[St. Alexius College] Performance Evaluation Report Ready for Review - ${academicYear} (${semester})`;

  const bodyHtml = generateEvaluationReportEmailHtml({
    teacherName,
    department,
    academicYear,
    semester,
    evaluationCount,
    averageScore,
    customNote
  });

  const bodyText = `Dear Prof. ${teacherName},\n\n` +
    `An updated performance evaluation report for ${academicYear} (${semester}) is ready for your review on the St. Alexius College Faculty Portal.\n\n` +
    `Summary Highlights:\n` +
    `- Department: ${department}\n` +
    `- Total Student Evaluations: ${evaluationCount}\n` +
    `- Overall Average Score: ${averageScore.toFixed(2)} / 5.00\n\n` +
    `Log in to view complete details: ${typeof window !== 'undefined' ? window.location.origin + '/login' : 'https://stalexius.edu/login'}\n\n` +
    `St. Alexius College Administration`;

  const notificationDoc = {
    teacherId,
    teacherName,
    recipientEmail: teacherEmail,
    department,
    subject,
    bodyText,
    bodyHtml,
    triggerType,
    status: 'SENT',
    readByTeacher: false,
    evaluationCount,
    averageScore,
    sentBy,
    timestamp: serverTimestamp(),
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, 'notifications'), notificationDoc);

  return {
    id: docRef.id,
    ...notificationDoc,
    status: 'SENT',
    createdAt: new Date().toISOString()
  } as EmailNotificationRecord;
}

export interface StudentApprovalNotificationPayload {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentSchoolId?: string;
  approvedBy?: string;
}

/**
 * Generates HTML email template for Student Account Approval Notification
 */
export function generateStudentApprovalEmailHtml(params: {
  studentName: string;
  studentEmail: string;
  studentSchoolId?: string;
  loginUrl?: string;
}): string {
  const {
    studentName,
    studentEmail,
    studentSchoolId = 'N/A',
    loginUrl = typeof window !== 'undefined' ? window.location.origin + '/login' : 'https://stalexius.edu/login'
  } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
        .header { background-color: #1e3a8a; color: #ffffff; padding: 28px 24px; text-align: center; border-bottom: 4px solid #d4af37; }
        .header-title { font-size: 20px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #d4af37; }
        .header-sub { font-size: 13px; margin-top: 4px; color: #93c5fd; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; }
        .message { font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; }
        .badge-verified { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; font-weight: 700; padding: 8px 16px; border-radius: 8px; font-size: 13px; display: inline-block; margin-bottom: 20px; }
        .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 24px; }
        .info-row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px; font-size: 13px; }
        .info-row:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
        .info-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .info-val { font-weight: 700; color: #1e293b; }
        .cta-container { text-align: center; margin: 28px 0; }
        .cta-button { background-color: #1e3a8a; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; display: inline-block; }
        .footer { background-color: #f9fafb; border-top: 1px solid #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="header-title">ST. ALEXIUS COLLEGE</h1>
          <div class="header-sub">Student Portal & Verification Office</div>
        </div>
        <div class="content">
          <div class="greeting">Congratulations, ${studentName}!</div>
          <div class="badge-verified">✓ STUDENT IDENTIFICATION VERIFIED & APPROVED</div>
          <p class="message">
            Great news! The St. Alexius College Administration has reviewed and officially approved your student identification credentials. Your account is now fully verified and activated for the Student Evaluation System.
          </p>
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Student Name</span>
              <span class="info-val">${studentName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Registered Email</span>
              <span class="info-val">${studentEmail}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Student ID No.</span>
              <span class="info-val">${studentSchoolId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Account Clearance</span>
              <span class="info-val" style="color: #059669;">FULL ACCESS GRANTED</span>
            </div>
          </div>
          <p class="message">
            You may now log in to access your student dashboard, view your course checklist, and evaluate your faculty instructors.
          </p>
          <div class="cta-container">
            <a href="${loginUrl}" class="cta-button">Go to Student Dashboard</a>
          </div>
        </div>
        <div class="footer">
          St. Alexius College Administration &bull; Registrar & Verification Office<br>
          Automated Notification Service &bull; Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Mock email notification dispatcher for Student Account Approvals.
 * Triggers when admin approves a pending student verification.
 */
export async function sendStudentApprovalNotificationEmail(payload: StudentApprovalNotificationPayload): Promise<EmailNotificationRecord> {
  const {
    studentId,
    studentName,
    studentEmail,
    studentSchoolId = 'N/A',
    approvedBy = 'Admin Office'
  } = payload;

  const subject = `[St. Alexius College] Student Account Approved - Access Granted!`;
  const bodyHtml = generateStudentApprovalEmailHtml({
    studentName,
    studentEmail,
    studentSchoolId
  });

  const bodyText = `Dear ${studentName},\n\n` +
    `Congratulations! Your St. Alexius College student account and ID proof have been officially verified and approved by the administration.\n\n` +
    `Student ID No: ${studentSchoolId}\n` +
    `Email: ${studentEmail}\n` +
    `Status: VERIFIED & APPROVED\n\n` +
    `You can now log in and access your student evaluation dashboard:\n` +
    `${typeof window !== 'undefined' ? window.location.origin + '/login' : 'https://stalexius.edu/login'}\n\n` +
    `St. Alexius College Administration`;

  const notificationDoc = {
    studentId,
    teacherId: studentId,
    teacherName: studentName,
    recipientEmail: studentEmail,
    department: 'Student Account Verification',
    subject,
    bodyText,
    bodyHtml,
    triggerType: 'STUDENT_ACCOUNT_APPROVED',
    status: 'SENT',
    readByTeacher: false,
    evaluationCount: 0,
    averageScore: 0,
    sentBy: approvedBy,
    timestamp: serverTimestamp(),
    createdAt: new Date().toISOString()
  };

  // Mock console dispatch log
  console.log(`%c[MOCK EMAIL SERVICE] Verification Email Sent to ${studentEmail}`, 'color: #10b981; font-weight: bold;', {
    to: studentEmail,
    subject,
    studentName,
    studentSchoolId,
    sentAt: new Date().toLocaleString()
  });

  let docId = 'mock-id-' + Date.now();
  try {
    const docRef = await addDoc(collection(db, 'notifications'), notificationDoc);
    docId = docRef.id;
  } catch (err) {
    console.warn("Could not record approval notification document in Firestore, proceeding with mock email return:", err);
  }

  return {
    id: docId,
    ...notificationDoc,
    status: 'SENT',
    createdAt: new Date().toISOString()
  } as EmailNotificationRecord;
}
