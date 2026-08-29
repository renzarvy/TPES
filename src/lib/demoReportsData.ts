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
}

export interface DemoEvaluation {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherDepartment: string;
  studentId?: string;
  studentName?: string;
  subject?: string;
  yearLevel?: string;
  academicYear: string;
  semester: string;
  answers: Record<string, number>;
  computedScore: number;
  comments?: string;
  sentiment?: 'positive' | 'neutral' | 'constructive';
  createdAt: string;
}

export const DEMO_FACULTY_MEMBERS: DemoTeacher[] = [
  {
    id: 'demo-prof-santos',
    name: 'Prof. Maria Santos, RN, MN',
    email: 'maria.santos@stalexiuscollege.edu.ph',
    department: 'College of Nursing',
    employeeId: 'EMP-7012',
    subjects: ['NUR101: Fundamentals of Nursing Care', 'NUR204: Pharmacology for Nurses'],
    role: 'teacher'
  },
  {
    id: 'demo-dr-hernandez',
    name: 'Dr. Arthur Hernandez, RPh, MS Pharm',
    email: 'arthur.hernandez@stalexiuscollege.edu.ph',
    department: 'College of Pharmacy',
    employeeId: 'EMP-7018',
    subjects: ['PHAR201: Pharmaceutical Biochemistry', 'PHAR305: Clinical Toxicology'],
    role: 'teacher'
  },
  {
    id: 'demo-prof-tan',
    name: 'Prof. Jessica Tan, RMT, MSMLS',
    email: 'jessica.tan@stalexiuscollege.edu.ph',
    department: 'College of Allied Health Sciences',
    employeeId: 'EMP-7024',
    subjects: ['MLS202: Medical Microbiology', 'MLS301: Clinical Parasitology'],
    role: 'teacher'
  },
  {
    id: 'demo-prof-villanueva',
    name: 'Prof. Dennis Villanueva, RRT',
    email: 'dennis.villanueva@stalexiuscollege.edu.ph',
    department: 'College of Radiologic Technology',
    employeeId: 'EMP-7031',
    subjects: ['RAD103: Radiation Physics & Protection', 'RAD205: Radiographic Positioning'],
    role: 'teacher'
  },
  {
    id: 'demo-prof-bautista',
    name: 'Prof. Ramon Bautista, CPA, MBA',
    email: 'ramon.bautista@stalexiuscollege.edu.ph',
    department: 'College of Business Administration',
    employeeId: 'EMP-7045',
    subjects: ['ACC101: Financial Accounting Theory', 'TAX202: Income Taxation & Auditing'],
    role: 'teacher'
  },
  {
    id: 'demo-dr-soriano',
    name: 'Dr. Manuel Soriano, EdD',
    email: 'manuel.soriano@stalexiuscollege.edu.ph',
    department: 'College of Arts & Sciences',
    employeeId: 'EMP-7052',
    subjects: ['GE104: Ethics & Moral Philosophy', 'GE108: Contemporary World Dynamics'],
    role: 'teacher'
  },
  {
    id: 'demo-prof-lim',
    name: 'Prof. Stephanie Lim, MIT',
    email: 'stephanie.lim@stalexiuscollege.edu.ph',
    department: 'College of Information Technology',
    employeeId: 'EMP-7063',
    subjects: ['IT201: Data Structures & Algorithms', 'IT304: Web Systems & Architecture'],
    role: 'teacher'
  },
  {
    id: 'demo-prof-delarosa',
    name: 'Prof. Roberto Dela Rosa, RN, MSN',
    email: 'roberto.delarosa@stalexiuscollege.edu.ph',
    department: 'College of Nursing',
    employeeId: 'EMP-7071',
    subjects: ['NUR302: Community Health Nursing', 'NUR401: Intensive Nursing Practicum'],
    role: 'teacher'
  }
];

// Qualitative sample student feedback statements
const SAMPLE_COMMENTS = {
  outstanding: [
    "Exemplary instructor! Breaks down intricate clinical pathways with remarkable clarity and patience.",
    "Very structured and punctual. The laboratory practical demonstrations made all the difference in our understanding.",
    "Always encourages student participation and treats every inquiry with professional empathy and respect.",
    "The clinical case studies and interactive quizzes kept the entire class engaged from start to finish.",
    "Superb mastery of the subject matter. One of the best professors in the college!"
  ],
  verySatisfactory: [
    "Great teaching style and thoroughly prepared for every lecture.",
    "Explains concepts very well and gives fair examinations aligned with the syllabus.",
    "Approachable during consultation hours and provides insightful feedback on case reports.",
    "Engaging class discussions and very punctual in starting our sessions."
  ],
  satisfactory: [
    "Good teaching pacing. Would appreciate more visual slides or clinical videos during lecture hours.",
    "Knowledgeable in the field; could give more time for Q&A after complex formulas.",
    "Fair grading system and clear instructions on assignments and departmental exams."
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
      count: 28,
      baseScores: { subjectKnowledge: 4.92, teachingMethods: 4.86, communication: 4.90, punctuality: 4.95, fairness: 4.88 }
    },
    'demo-dr-hernandez': {
      count: 24,
      baseScores: { subjectKnowledge: 4.85, teachingMethods: 4.70, communication: 4.75, punctuality: 4.80, fairness: 4.72 }
    },
    'demo-prof-tan': {
      count: 22,
      baseScores: { subjectKnowledge: 4.78, teachingMethods: 4.65, communication: 4.70, punctuality: 4.68, fairness: 4.66 }
    },
    'demo-prof-villanueva': {
      count: 19,
      baseScores: { subjectKnowledge: 4.72, teachingMethods: 4.60, communication: 4.58, punctuality: 4.65, fairness: 4.60 }
    },
    'demo-prof-bautista': {
      count: 21,
      baseScores: { subjectKnowledge: 4.68, teachingMethods: 4.50, communication: 4.52, punctuality: 4.60, fairness: 4.55 }
    },
    'demo-dr-soriano': {
      count: 26,
      baseScores: { subjectKnowledge: 4.55, teachingMethods: 4.42, communication: 4.45, punctuality: 4.50, fairness: 4.40 }
    },
    'demo-prof-lim': {
      count: 20,
      baseScores: { subjectKnowledge: 4.88, teachingMethods: 4.78, communication: 4.80, punctuality: 4.75, fairness: 4.82 }
    },
    'demo-prof-delarosa': {
      count: 18,
      baseScores: { subjectKnowledge: 4.45, teachingMethods: 4.35, communication: 4.38, punctuality: 4.42, fairness: 4.35 }
    }
  };

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  DEMO_FACULTY_MEMBERS.forEach((teacher) => {
    const config = teacherConfig[teacher.id] || {
      count: 15,
      baseScores: { subjectKnowledge: 4.5, teachingMethods: 4.5, communication: 4.5, punctuality: 4.5, fairness: 4.5 }
    };

    for (let i = 1; i <= config.count; i++) {
      // Add slight organic variation
      const answers: Record<string, number> = {};
      let total = 0;
      const keys = ['subjectKnowledge', 'teachingMethods', 'communication', 'punctuality', 'fairness'];

      keys.forEach((critKey) => {
        const base = config.baseScores[critKey] || 4.5;
        // Jitter between -0.5 and +0.3, clamped to 1-5
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

      // Pick comment
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
 * Seeds comprehensive demo benchmark dataset into LocalStorage
 */
export function seedDemoDataToStorage(): { teacherCount: number; evalCount: number } {
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
    localStorage.setItem('sac_local_evaluations', JSON.stringify(localEvals));

    // 3. Mark seeded
    localStorage.setItem('sac_demo_seeded', 'true');
    localStorage.setItem('sac_demo_seeded_at', new Date().toISOString());

    return {
      teacherCount: DEMO_FACULTY_MEMBERS.length,
      evalCount: demoEvals.length
    };
  } catch (err) {
    console.error("Error seeding demo data:", err);
    return { teacherCount: 0, evalCount: 0 };
  }
}

/**
 * Clears demo records from LocalStorage
 */
export function clearDemoDataFromStorage(): void {
  try {
    // Clean local teachers
    const localTeachers: Record<string, any> = JSON.parse(localStorage.getItem('sac_local_teachers') || '{}');
    DEMO_FACULTY_MEMBERS.forEach(t => {
      delete localTeachers[t.id];
    });
    localStorage.setItem('sac_local_teachers', JSON.stringify(localTeachers));

    // Clean local evaluations
    const localEvals: Record<string, any> = JSON.parse(localStorage.getItem('sac_local_evaluations') || '{}');
    Object.keys(localEvals).forEach(k => {
      if (k.startsWith('demo-eval-')) {
        delete localEvals[k];
      }
    });
    localStorage.setItem('sac_local_evaluations', JSON.stringify(localEvals));

    localStorage.removeItem('sac_demo_seeded');
    localStorage.removeItem('sac_demo_seeded_at');
  } catch (err) {
    console.error("Error clearing demo data:", err);
  }
}
