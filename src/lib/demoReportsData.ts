import { EvaluationCriterion, DEFAULT_CRITERIA } from './criteria';

export interface DemoTeacher {
  id: string;
  name: string;
  email: string;
  department: string;
  employeeId: string;
  photoUrl?: string;
  subjects?: string[];
  role: 'teacher';
  position?: string;
  majorSubjects?: string;
  otherSubjects?: string;
  verificationStatus?: string;
  isVerifiedStudent?: boolean;
  averageScore?: number;
  createdAt?: string;
}

export interface DemoEvaluation {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherDepartment: string;
  studentId?: string;
  studentName?: string;
  actualStudentId?: string;
  subject?: string;
  yearLevel?: string;
  academicYear: string;
  semester: string;
  answers: Record<string, number>;
  computedScore: number;
  comments?: string;
  sentiment?: 'positive' | 'neutral' | 'constructive';
  createdAt: string;
  timestamp?: any;
}

export const DEMO_FACULTY_MEMBERS: DemoTeacher[] = [
  {
    id: 'demo-prof-santos',
    name: 'Prof. Maria Santos, RN, MN',
    email: 'maria.santos@stalexiuscollege.edu.ph',
    department: 'College of Nursing',
    employeeId: 'EMP-7012',
    position: 'Associate Professor IV & Clinical Coordinator',
    subjects: ['NUR101: Fundamentals of Nursing Care', 'NUR204: Pharmacology for Nurses'],
    majorSubjects: 'NUR101: Fundamentals of Nursing Care, NUR204: Pharmacology for Nurses',
    otherSubjects: 'Clinical Practicum & Simulation Laboratory',
    role: 'teacher',
    verificationStatus: 'approved',
    isVerifiedStudent: true,
    averageScore: 4.88,
    createdAt: '2025-06-15T08:00:00.000Z'
  },
  {
    id: 'demo-dr-hernandez',
    name: 'Dr. Arthur Hernandez, RPh, MS Pharm',
    email: 'arthur.hernandez@stalexiuscollege.edu.ph',
    department: 'College of Pharmacy',
    employeeId: 'EMP-7018',
    position: 'Professor I & Pharmacy Department Chair',
    subjects: ['PHAR201: Pharmaceutical Biochemistry', 'PHAR305: Clinical Toxicology'],
    majorSubjects: 'PHAR201: Pharmaceutical Biochemistry, PHAR305: Clinical Toxicology',
    otherSubjects: 'Pharmacology Lab Seminar',
    role: 'teacher',
    verificationStatus: 'approved',
    isVerifiedStudent: true,
    averageScore: 4.74,
    createdAt: '2025-06-15T08:30:00.000Z'
  },
  {
    id: 'demo-prof-tan',
    name: 'Prof. Jessica Tan, RMT, MSMLS',
    email: 'jessica.tan@stalexiuscollege.edu.ph',
    department: 'College of Allied Health Sciences',
    employeeId: 'EMP-7024',
    position: 'Assistant Professor II',
    subjects: ['MLS202: Medical Microbiology', 'MLS301: Clinical Parasitology'],
    majorSubjects: 'MLS202: Medical Microbiology, MLS301: Clinical Parasitology',
    otherSubjects: 'Diagnostic Microscopy Lab',
    role: 'teacher',
    verificationStatus: 'approved',
    isVerifiedStudent: true,
    averageScore: 4.69,
    createdAt: '2025-06-16T09:00:00.000Z'
  },
  {
    id: 'demo-prof-lim',
    name: 'Prof. Stephanie Lim, MIT',
    email: 'stephanie.lim@stalexiuscollege.edu.ph',
    department: 'College of Information Technology',
    employeeId: 'EMP-7063',
    position: 'Assistant Professor III & Lead Systems Architect',
    subjects: ['IT201: Data Structures & Algorithms', 'IT304: Web Systems & Architecture'],
    majorSubjects: 'IT201: Data Structures & Algorithms, IT304: Web Systems & Architecture',
    otherSubjects: 'Capstone Project Mentorship',
    role: 'teacher',
    verificationStatus: 'approved',
    isVerifiedStudent: true,
    averageScore: 4.81,
    createdAt: '2025-06-16T10:00:00.000Z'
  },
  {
    id: 'demo-prof-villanueva',
    name: 'Prof. Dennis Villanueva, RRT',
    email: 'dennis.villanueva@stalexiuscollege.edu.ph',
    department: 'College of Radiologic Technology',
    employeeId: 'EMP-7031',
    position: 'Instructor III',
    subjects: ['RAD103: Radiation Physics & Protection', 'RAD205: Radiographic Positioning'],
    majorSubjects: 'RAD103: Radiation Physics & Protection, RAD205: Radiographic Positioning',
    otherSubjects: 'Clinical Imaging Rotation',
    role: 'teacher',
    verificationStatus: 'approved',
    isVerifiedStudent: true,
    averageScore: 4.63,
    createdAt: '2025-06-17T08:00:00.000Z'
  },
  {
    id: 'demo-prof-bautista',
    name: 'Prof. Ramon Bautista, CPA, MBA',
    email: 'ramon.bautista@stalexiuscollege.edu.ph',
    department: 'College of Business Administration',
    employeeId: 'EMP-7045',
    position: 'Associate Professor I',
    subjects: ['ACC101: Financial Accounting Theory', 'TAX202: Income Taxation & Auditing'],
    majorSubjects: 'ACC101: Financial Accounting Theory, TAX202: Income Taxation & Auditing',
    otherSubjects: 'Business Ethics & Corporate Governance',
    role: 'teacher',
    verificationStatus: 'approved',
    isVerifiedStudent: true,
    averageScore: 4.58,
    createdAt: '2025-06-17T11:00:00.000Z'
  },
  {
    id: 'demo-dr-soriano',
    name: 'Dr. Manuel Soriano, EdD',
    email: 'manuel.soriano@stalexiuscollege.edu.ph',
    department: 'College of Arts & Sciences',
    employeeId: 'EMP-7052',
    position: 'Full Professor & General Education Head',
    subjects: ['GE104: Ethics & Moral Philosophy', 'GE108: Contemporary World Dynamics'],
    majorSubjects: 'GE104: Ethics & Moral Philosophy, GE108: Contemporary World Dynamics',
    otherSubjects: 'Readings in Philippine History',
    role: 'teacher',
    verificationStatus: 'approved',
    isVerifiedStudent: true,
    averageScore: 4.46,
    createdAt: '2025-06-18T09:00:00.000Z'
  },
  {
    id: 'demo-prof-delarosa',
    name: 'Prof. Roberto Dela Rosa, RN, MSN',
    email: 'roberto.delarosa@stalexiuscollege.edu.ph',
    department: 'College of Nursing',
    employeeId: 'EMP-7071',
    position: 'Assistant Professor I',
    subjects: ['NUR302: Community Health Nursing', 'NUR401: Intensive Nursing Practicum'],
    majorSubjects: 'NUR302: Community Health Nursing, NUR401: Intensive Nursing Practicum',
    otherSubjects: 'Public Health Field Rotation',
    role: 'teacher',
    verificationStatus: 'approved',
    isVerifiedStudent: true,
    averageScore: 4.39,
    createdAt: '2025-06-18T14:00:00.000Z'
  }
];

// Qualitative sample student feedback statements
export const SAMPLE_COMMENTS = {
  outstanding: [
    "Exemplary instructor! Breaks down intricate clinical pathways with remarkable clarity and patience.",
    "Very structured and punctual. The laboratory practical demonstrations made all the difference in our understanding.",
    "Always encourages student participation and treats every inquiry with professional empathy and respect.",
    "The clinical case studies and interactive quizzes kept the entire class engaged from start to finish.",
    "Superb mastery of the subject matter. One of the best professors in the college!",
    "Clear syllabus, transparent grading, and prompt feedback on all course assignments."
  ],
  verySatisfactory: [
    "Great teaching style and thoroughly prepared for every lecture.",
    "Explains concepts very well and gives fair examinations aligned with the syllabus.",
    "Approachable during consultation hours and provides insightful feedback on case reports.",
    "Engaging class discussions and very punctual in starting our sessions.",
    "Provides practical industry examples that help us bridge theory and clinical practice."
  ],
  satisfactory: [
    "Good teaching pacing. Would appreciate more visual slides or clinical videos during lecture hours.",
    "Knowledgeable in the field; could give more time for Q&A after complex formulas.",
    "Fair grading system and clear instructions on assignments and departmental exams.",
    "Well-structured modules, though sometimes moves quickly through technical chapters."
  ],
  constructive: [
    "Covers a lot of materials very quickly. Providing lecture outlines before class would be helpful.",
    "Microphone volume in the lecture hall could be improved, but overall very knowledgeable.",
    "More practice problems during tutorial sessions would assist with board exam preparation."
  ]
};

/**
 * Generates a realistic set of evaluations for each demo teacher
 */
export function generateDemoEvaluations(): DemoEvaluation[] {
  const evaluations: DemoEvaluation[] = [];

  const teacherConfig: Record<string, { count: number; baseScores: Record<string, number> }> = {
    'demo-prof-santos': {
      count: 32,
      baseScores: { subjectKnowledge: 4.92, teachingMethods: 4.86, communication: 4.90, punctuality: 4.95, fairness: 4.88 }
    },
    'demo-dr-hernandez': {
      count: 26,
      baseScores: { subjectKnowledge: 4.85, teachingMethods: 4.70, communication: 4.75, punctuality: 4.80, fairness: 4.72 }
    },
    'demo-prof-tan': {
      count: 24,
      baseScores: { subjectKnowledge: 4.78, teachingMethods: 4.65, communication: 4.70, punctuality: 4.68, fairness: 4.66 }
    },
    'demo-prof-lim': {
      count: 25,
      baseScores: { subjectKnowledge: 4.88, teachingMethods: 4.78, communication: 4.80, punctuality: 4.75, fairness: 4.82 }
    },
    'demo-prof-villanueva': {
      count: 20,
      baseScores: { subjectKnowledge: 4.72, teachingMethods: 4.60, communication: 4.58, punctuality: 4.65, fairness: 4.60 }
    },
    'demo-prof-bautista': {
      count: 22,
      baseScores: { subjectKnowledge: 4.68, teachingMethods: 4.50, communication: 4.52, punctuality: 4.60, fairness: 4.55 }
    },
    'demo-dr-soriano': {
      count: 28,
      baseScores: { subjectKnowledge: 4.55, teachingMethods: 4.42, communication: 4.45, punctuality: 4.50, fairness: 4.40 }
    },
    'demo-prof-delarosa': {
      count: 19,
      baseScores: { subjectKnowledge: 4.45, teachingMethods: 4.35, communication: 4.38, punctuality: 4.42, fairness: 4.35 }
    }
  };

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  DEMO_FACULTY_MEMBERS.forEach((teacher) => {
    const config = teacherConfig[teacher.id] || {
      count: 18,
      baseScores: { subjectKnowledge: 4.5, teachingMethods: 4.5, communication: 4.5, punctuality: 4.5, fairness: 4.5 }
    };

    for (let i = 1; i <= config.count; i++) {
      const answers: Record<string, number> = {};
      let total = 0;
      const keys = ['subjectKnowledge', 'teachingMethods', 'communication', 'punctuality', 'fairness'];

      keys.forEach((critKey) => {
        const base = config.baseScores[critKey] || 4.5;
        const jitter = (Math.sin(i * 1.7 + critKey.length) * 0.35);
        let score = Math.round(base + jitter);
        if (score > 5) score = 5;
        if (score < 3) score = 3;
        answers[critKey] = score;
        total += score;
      });

      const computedScore = Number((total / keys.length).toFixed(2));
      const year = years[i % years.length];
      const subject = teacher.subjects ? teacher.subjects[i % teacher.subjects.length] : 'Major Course';

      let comment = '';
      let sentiment: 'positive' | 'neutral' | 'constructive' = 'positive';
      if (computedScore >= 4.7) {
        comment = SAMPLE_COMMENTS.outstanding[i % SAMPLE_COMMENTS.outstanding.length];
        sentiment = 'positive';
      } else if (computedScore >= 4.2) {
        comment = SAMPLE_COMMENTS.verySatisfactory[i % SAMPLE_COMMENTS.verySatisfactory.length];
        sentiment = 'positive';
      } else if (computedScore >= 3.8) {
        comment = SAMPLE_COMMENTS.satisfactory[i % SAMPLE_COMMENTS.satisfactory.length];
        sentiment = 'neutral';
      } else {
        comment = SAMPLE_COMMENTS.constructive[i % SAMPLE_COMMENTS.constructive.length];
        sentiment = 'constructive';
      }

      // Generate realistic timestamp in past 30 days
      const dayOffset = (i * 3) % 28;
      const evalDate = new Date();
      evalDate.setDate(evalDate.getDate() - dayOffset);

      evaluations.push({
        id: `demo-eval-${teacher.id}-${i}`,
        teacherId: teacher.id,
        teacherName: teacher.name,
        teacherDepartment: teacher.department,
        subject,
        yearLevel: year,
        academicYear: '2025-2026',
        semester: '1st Semester',
        answers,
        computedScore,
        comments: comment,
        sentiment,
        createdAt: evalDate.toISOString()
      });
    }
  });

  return evaluations;
}

/**
 * Generates completed evaluations for the student demo user (Juan Dela Cruz)
 */
export function generateStudentDemoEvaluations(studentId: string = 'student-demo-uid'): DemoEvaluation[] {
  return [
    {
      id: `student-completed-eval-1`,
      teacherId: 'demo-prof-santos',
      teacherName: 'Prof. Maria Santos, RN, MN',
      teacherDepartment: 'College of Nursing',
      studentId: '2024-10294',
      studentName: 'Juan A. Dela Cruz',
      actualStudentId: studentId,
      subject: 'NUR101: Fundamentals of Nursing Care',
      yearLevel: '3rd Year',
      academicYear: '2025-2026',
      semester: '1st Semester',
      answers: {
        subjectKnowledge: 5,
        teachingMethods: 5,
        communication: 5,
        punctuality: 5,
        fairness: 5
      },
      computedScore: 5.0,
      comments: 'Prof. Santos is exceptional at breaking down clinical procedures. Highly recommended!',
      sentiment: 'positive',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: `student-completed-eval-2`,
      teacherId: 'demo-dr-hernandez',
      teacherName: 'Dr. Arthur Hernandez, RPh, MS Pharm',
      teacherDepartment: 'College of Pharmacy',
      studentId: '2024-10294',
      studentName: 'Juan A. Dela Cruz',
      actualStudentId: studentId,
      subject: 'PHAR201: Pharmaceutical Biochemistry',
      yearLevel: '3rd Year',
      academicYear: '2025-2026',
      semester: '1st Semester',
      answers: {
        subjectKnowledge: 5,
        teachingMethods: 4,
        communication: 5,
        punctuality: 5,
        fairness: 4
      },
      computedScore: 4.6,
      comments: 'Very comprehensive lectures and helpful clinical laboratory reviews.',
      sentiment: 'positive',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
    }
  ];
}

/**
 * Demo pending student verification requests for Admin dashboard
 */
export const DEMO_VERIFICATION_REQUESTS = {
  'demo-student-samantha': {
    id: 'demo-student-samantha',
    userId: 'demo-student-samantha',
    studentName: 'Samantha Cruz',
    displayName: 'Samantha Cruz',
    name: 'Samantha Cruz',
    email: 'samantha.cruz@stalexiuscollege.edu.ph',
    studentId: '2025-10821',
    idNumber: '2025-10821',
    department: 'College of Nursing',
    college: 'College of Nursing',
    yearLevel: '2nd Year',
    idProofUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
    verificationStatus: 'pending',
    status: 'pending',
    role: 'student',
    submittedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  'demo-student-kevin': {
    id: 'demo-student-kevin',
    userId: 'demo-student-kevin',
    studentName: 'Kevin Alcantara',
    displayName: 'Kevin Alcantara',
    name: 'Kevin Alcantara',
    email: 'kevin.alcantara@stalexiuscollege.edu.ph',
    studentId: '2025-10499',
    idNumber: '2025-10499',
    department: 'College of Information Technology',
    college: 'College of Information Technology',
    yearLevel: '1st Year',
    idProofUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    verificationStatus: 'pending',
    status: 'pending',
    role: 'student',
    submittedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString()
  },
  'demo-student-bea': {
    id: 'demo-student-bea',
    userId: 'demo-student-bea',
    studentName: 'Bea Nicole Soriano',
    displayName: 'Bea Nicole Soriano',
    name: 'Bea Nicole Soriano',
    email: 'bea.soriano@stalexiuscollege.edu.ph',
    studentId: '2024-09812',
    idNumber: '2024-09812',
    department: 'College of Pharmacy',
    college: 'College of Pharmacy',
    yearLevel: '3rd Year',
    idProofUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    verificationStatus: 'pending',
    status: 'pending',
    role: 'student',
    submittedAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 720).toISOString()
  }
};

/**
 * Demo institutional audit log entries for Admin Dashboard
 */
export const DEMO_AUDIT_LOGS = [
  {
    id: 'audit-demo-1',
    action: 'SETTINGS_UPDATE',
    entity: 'SETTINGS',
    details: 'Dr. Alexius Admin verified faculty teaching load schedules for 1st Semester 2025-2026',
    performedBy: 'Dr. Alexius Admin',
    performedByEmail: 'admin@stalexiuscollege.edu.ph',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 'audit-demo-2',
    action: 'APPROVAL',
    entity: 'STUDENT',
    details: 'Approved student ID verification for Juan A. Dela Cruz (College of Computer Studies - 2024-10294)',
    performedBy: 'Dr. Alexius Admin',
    performedByEmail: 'admin@stalexiuscollege.edu.ph',
    targetName: 'Juan A. Dela Cruz',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: 'audit-demo-3',
    action: 'REPORT_GENERATION',
    entity: 'REPORT',
    details: 'Compiled College of Nursing Midterm Faculty Performance Summary Report',
    performedBy: 'Dean Arthur Reyes, RN, PhD',
    performedByEmail: 'dean.nursing@stalexiuscollege.edu.ph',
    createdAt: new Date(Date.now() - 1000 * 60 * 320).toISOString()
  },
  {
    id: 'audit-demo-4',
    action: 'CRITERIA_UPDATE',
    entity: 'SETTINGS',
    details: 'Validated SAC 5-Point Core Evaluation Criteria rubrics and qualitative sentiment analysis models',
    performedBy: 'Dr. Alexius Admin',
    performedByEmail: 'admin@stalexiuscollege.edu.ph',
    createdAt: new Date(Date.now() - 1000 * 60 * 540).toISOString()
  },
  {
    id: 'audit-demo-5',
    action: 'APPROVAL',
    entity: 'TEACHER',
    details: 'Verified and approved faculty teaching credentials for Prof. Maria Santos (College of Nursing)',
    performedBy: 'Dean Arthur Reyes, RN, PhD',
    performedByEmail: 'dean.nursing@stalexiuscollege.edu.ph',
    targetName: 'Prof. Maria Santos',
    createdAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString()
  }
];

/**
 * Checks if demo benchmark data is currently populated in LocalStorage
 */
export function isDemoDataSeeded(): boolean {
  try {
    return localStorage.getItem('sac_demo_seeded') === 'true';
  } catch {
    return false;
  }
}

/**
 * Seeds comprehensive master demo benchmark dataset into LocalStorage
 */
export function seedDemoDataToStorage(studentUid?: string): { teacherCount: number; evalCount: number } {
  try {
    // 1. Teachers
    const localTeachers: Record<string, any> = JSON.parse(localStorage.getItem('sac_local_teachers') || '{}');
    DEMO_FACULTY_MEMBERS.forEach(t => {
      localTeachers[t.id] = { ...t };
    });
    localStorage.setItem('sac_local_teachers', JSON.stringify(localTeachers));

    // 2. Evaluations
    const demoEvals = generateDemoEvaluations();
    const localEvals: Record<string, any> = JSON.parse(localStorage.getItem('sac_local_evaluations') || '{}');
    demoEvals.forEach(ev => {
      localEvals[ev.id] = ev;
    });

    // 3. Student specific completed evaluations
    const studentEvals = generateStudentDemoEvaluations(studentUid || 'student-demo-uid');
    studentEvals.forEach(ev => {
      localEvals[ev.id] = ev;
    });
    localStorage.setItem('sac_local_evaluations', JSON.stringify(localEvals));

    // 4. Pending verification requests for Admin dashboard
    const localReqs: Record<string, any> = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
    Object.entries(DEMO_VERIFICATION_REQUESTS).forEach(([id, req]) => {
      if (!localReqs[id]) {
        localReqs[id] = req;
      }
    });
    localStorage.setItem('sac_global_verification_requests', JSON.stringify(localReqs));

    // 5. Audit logs for Admin dashboard
    const localAuditLogs: any[] = JSON.parse(localStorage.getItem('sac_local_audit_logs') || '[]');
    if (localAuditLogs.length === 0) {
      localStorage.setItem('sac_local_audit_logs', JSON.stringify(DEMO_AUDIT_LOGS));
    }

    // 6. Pre-fill reflection and notifications for teacher
    if (!localStorage.getItem('sac_teacher_reflection_demo-prof-santos')) {
      localStorage.setItem(
        'sac_teacher_reflection_demo-prof-santos',
        'For 1st Semester 2025-2026, clinical simulation workshops improved nursing procedure retention. Students demonstrated notable mastery in dosage calculation drills.'
      );
    }

    // 7. Mark seeded
    localStorage.setItem('sac_demo_seeded', 'true');
    localStorage.setItem('sac_demo_seeded_at', new Date().toISOString());

    return {
      teacherCount: DEMO_FACULTY_MEMBERS.length,
      evalCount: demoEvals.length + studentEvals.length
    };
  } catch (err) {
    console.error("Error seeding demo data:", err);
    return { teacherCount: 0, evalCount: 0 };
  }
}

/**
 * Ensures master demo data is automatically seeded upon app bootstrap / first login
 */
export function ensureMasterDemoDataSeeded(studentUid?: string): void {
  try {
    const isSeeded = isDemoDataSeeded();
    const localTeachers = localStorage.getItem('sac_local_teachers');
    const localEvals = localStorage.getItem('sac_local_evaluations');
    
    if (!isSeeded || !localTeachers || !localEvals || Object.keys(JSON.parse(localTeachers || '{}')).length === 0) {
      console.log("Auto-seeding master SAC demo dataset for Admin, Teacher, and Student portals...");
      seedDemoDataToStorage(studentUid);
    }
  } catch (err) {
    console.warn("Notice checking demo data seeding:", err);
  }
}

/**
 * Clears demo records from LocalStorage
 */
export function clearDemoDataFromStorage(): void {
  try {
    const localTeachers: Record<string, any> = JSON.parse(localStorage.getItem('sac_local_teachers') || '{}');
    DEMO_FACULTY_MEMBERS.forEach(t => {
      delete localTeachers[t.id];
    });
    localStorage.setItem('sac_local_teachers', JSON.stringify(localTeachers));

    const localEvals: Record<string, any> = JSON.parse(localStorage.getItem('sac_local_evaluations') || '{}');
    Object.keys(localEvals).forEach(k => {
      if (k.startsWith('demo-eval-') || k.startsWith('student-completed-eval-')) {
        delete localEvals[k];
      }
    });
    localStorage.setItem('sac_local_evaluations', JSON.stringify(localEvals));

    const localReqs: Record<string, any> = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
    Object.keys(DEMO_VERIFICATION_REQUESTS).forEach(k => {
      delete localReqs[k];
    });
    localStorage.setItem('sac_global_verification_requests', JSON.stringify(localReqs));

    localStorage.removeItem('sac_local_audit_logs');
    localStorage.removeItem('sac_demo_seeded');
    localStorage.removeItem('sac_demo_seeded_at');
  } catch (err) {
    console.error("Error clearing demo data:", err);
  }
}
