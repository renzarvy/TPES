import React, { useState, useEffect } from 'react';
import * as ReactJoyride from 'react-joyride';

const { STATUS = { FINISHED: 'finished', SKIPPED: 'skipped' }, ACTIONS = { CLOSE: 'close' } } = (ReactJoyride as any) || {};
// Support both ESM default and named Joyride export
const Joyride = (ReactJoyride as any).Joyride || (ReactJoyride as any).default || ReactJoyride;

export interface PortalOnboardingTourProps {
  role: 'student' | 'teacher';
  userId?: string;
  runManually?: boolean;
  onTourEnd?: () => void;
}

export const PortalOnboardingTour: React.FC<PortalOnboardingTourProps> = ({
  role,
  userId,
  runManually = false,
  onTourEnd
}) => {
  const [run, setRun] = useState(false);
  const storageKey = `sac_portal_tour_completed_${userId || 'guest'}_${role}`;

  useEffect(() => {
    if (runManually) {
      setRun(true);
      return;
    }

    // Auto trigger on first visit if not yet completed
    try {
      const hasCompleted = localStorage.getItem(storageKey);
      if (!hasCompleted) {
        // Small delay to allow DOM elements to mount smoothly
        const timer = setTimeout(() => {
          setRun(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn("Storage access failed for tour:", e);
    }
  }, [runManually, storageKey]);

  const handleJoyrideCallback = (data: any) => {
    const { status, action } = data;
    const finishedStatuses: string[] = [STATUS?.FINISHED || 'finished', STATUS?.SKIPPED || 'skipped'];

    if (finishedStatuses.includes(status) || action === (ACTIONS?.CLOSE || 'close')) {
      setRun(false);
      try {
        localStorage.setItem(storageKey, 'true');
      } catch (e) {
        console.warn("Could not save tour completion state:", e);
      }
      if (onTourEnd) {
        onTourEnd();
      }
    }
  };

  // Student specific tour steps
  const studentSteps: any[] = [
    {
      target: '#tour-welcome-banner',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>👋 Welcome to St. Alexius College</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Welcome to the official <strong>Student Faculty Evaluation Portal</strong>. Here you can securely and anonymously evaluate your professors for this academic term.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#tour-progress-tracker',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>📊 Evaluation Progress Tracker</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Keep track of your evaluation completion percentage. All faculty evaluations must be completed to generate your official clearance certificate.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#tour-predictive-search',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>🔍 Real-Time Predictive Search</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Type any teacher name or subject area (e.g., <em>"Nursing"</em>, <em>"Mathematics"</em>, <em>"IT"</em>) to see instant smart suggestions and live-filtered faculty cards!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#tour-department-filter',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>🏛️ College & Department Filtering</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Faculty are matched to your enrolled college. You can also filter by specific departments or view General Education faculty anytime.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#tour-faculty-list',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>📝 Start Faculty Evaluation</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Click <strong>"Evaluate Faculty"</strong> on any teacher card to rate them across the 4 standard categories (Commitment, Knowledge, Independent Learning, and Management).
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '#tour-evaluation-history',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>📜 Evaluation History & Certificate</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Switch to the <strong>History tab</strong> to view submitted evaluations, print completion proofs, or review your submitted ratings.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#guidance-office-info',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>🏢 The Guidance Office</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Need help with your evaluations or student welfare? Check office hours, contact email, and campus location right here.
          </p>
        </div>
      ),
      placement: 'top',
    },
  ];

  // Teacher specific tour steps
  const teacherSteps: any[] = [
    {
      target: '#tour-teacher-welcome',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>🎓 Welcome, Faculty Member!</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Welcome to your <strong>Faculty Evaluation & Performance Dashboard</strong>. Here you can monitor student feedback, view performance metrics, and submit self-reflections.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#tour-teacher-stats',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>⭐ Performance Score & Analytics</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            View your overall composite score calculated out of 5.00, total student evaluations submitted, and feedback counts in real-time.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#tour-teacher-breakdown',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>📊 Category Performance Breakdown</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Analyze your ratings across the 4 core dimensions: Commitment to Teaching, Knowledge of Subject, Teaching for Independent Learning, and Management of Learning.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '#tour-teacher-comments',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>💬 Anonymous Qualitative Feedback</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Review constructive comments and feedback submitted anonymously by your students for continuous teaching improvement.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '#tour-teacher-subjects',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>📚 Teaching Subjects & Loads</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Configure your assigned Major and Minor subjects. These subject codes and titles enable students to find and evaluate you accurately in their dashboards.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '#tour-teacher-reflection',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>✍️ Self-Reflection & Action Plan</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Document your pedagogical reflections, teaching strengths, and development goals for administrative and departmental review.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '#guidance-office-info',
      content: (
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2 text-[#1e3a8a] font-extrabold text-sm uppercase tracking-wide">
            <span>🏢 The Guidance Office</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Reach out to The Guidance Office for faculty consultations, office hours, or student counseling referrals.
          </p>
        </div>
      ),
      placement: 'top',
    },
  ];

  const steps = role === 'teacher' ? teacherSteps : studentSteps;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      scrollOffset={100}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#ffffff',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(15, 23, 42, 0.65)',
          primaryColor: '#1e3a8a',
          textColor: '#1f2937',
          width: 360,
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '16px',
          padding: '18px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#1e3a8a',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 700,
          borderRadius: '10px',
          padding: '8px 16px',
          boxShadow: '0 2px 4px rgba(30, 58, 138, 0.3)',
          outline: 'none',
        },
        buttonBack: {
          color: '#475569',
          fontSize: '12px',
          fontWeight: 600,
          marginRight: '8px',
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: '11px',
          fontWeight: 600,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Get Started',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
};
