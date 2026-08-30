import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export interface PortalOnboardingTourProps {
  role: 'student' | 'teacher';
  userId?: string;
  runManually?: boolean;
  onTourEnd?: () => void;
}

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon?: string;
}

export const PortalOnboardingTour: React.FC<PortalOnboardingTourProps> = ({
  role,
  userId,
  runManually = false,
  onTourEnd
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const storageKey = `sac_portal_tour_completed_${userId || 'guest'}_${role}`;

  const studentSteps: TourStep[] = [
    {
      target: '#tour-welcome-banner',
      title: 'Welcome to St. Alexius College',
      description: 'Welcome to the official Student Faculty Evaluation Portal. Here you can securely and anonymously evaluate your professors for this academic term.',
      icon: '👋'
    },
    {
      target: '#tour-progress-tracker',
      title: 'Evaluation Progress Tracker',
      description: 'Keep track of your evaluation completion percentage. All faculty evaluations must be completed to generate your official clearance certificate.',
      icon: '📊'
    },
    {
      target: '#tour-predictive-search',
      title: 'Real-Time Predictive Search',
      description: 'Type any teacher name or subject area (e.g., "Nursing", "Mathematics", "IT") to see instant smart suggestions and live-filtered faculty cards!',
      icon: '🔍'
    },
    {
      target: '#tour-department-filter',
      title: 'College & Department Filtering',
      description: 'Faculty are matched to your enrolled college. You can also filter by specific departments or view General Education faculty anytime.',
      icon: '🏛️'
    },
    {
      target: '#tour-faculty-list',
      title: 'Start Faculty Evaluation',
      description: 'Click "Evaluate Faculty" on any teacher card to rate them across the 4 standard categories (Commitment, Knowledge, Independent Learning, and Management).',
      icon: '📝'
    },
    {
      target: '#tour-evaluation-history',
      title: 'Evaluation History & Certificate',
      description: 'Switch to the History tab to view submitted evaluations, print completion proofs, or review your submitted ratings.',
      icon: '📜'
    }
  ];

  const teacherSteps: TourStep[] = [
    {
      target: '#tour-teacher-welcome',
      title: 'Welcome, Faculty Member!',
      description: 'Welcome to your Faculty Evaluation & Performance Dashboard. Here you can monitor student feedback, view performance metrics, and submit self-reflections.',
      icon: '🎓'
    },
    {
      target: '#tour-teacher-stats',
      title: 'Performance Score & Analytics',
      description: 'View your overall composite score calculated out of 5.00, total student evaluations submitted, and feedback counts in real-time.',
      icon: '⭐'
    },
    {
      target: '#tour-teacher-breakdown',
      title: 'Category Performance Breakdown',
      description: 'Analyze your ratings across the 4 core dimensions: Commitment to Teaching, Knowledge of Subject, Teaching for Independent Learning, and Management of Learning.',
      icon: '📊'
    },
    {
      target: '#tour-teacher-comments',
      title: 'Anonymous Qualitative Feedback',
      description: 'Review constructive comments and feedback submitted anonymously by your students for continuous teaching improvement.',
      icon: '💬'
    },
    {
      target: '#tour-teacher-subjects',
      title: 'Teaching Subjects & Loads',
      description: 'Configure your assigned Major and Minor subjects. These subject codes and titles enable students to find and evaluate you accurately in their dashboards.',
      icon: '📚'
    }
  ];

  const steps = role === 'teacher' ? teacherSteps : studentSteps;

  useEffect(() => {
    if (runManually) {
      setCurrentStep(0);
      setIsOpen(true);
      return;
    }

    try {
      const hasCompleted = localStorage.getItem(storageKey);
      if (!hasCompleted) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignored
    }
  }, [runManually, storageKey]);

  // Update target element highlight position
  useEffect(() => {
    if (!isOpen) return;
    const step = steps[currentStep];
    if (!step) return;

    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep, steps]);

  const handleClose = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // Ignored
    }
    if (onTourEnd) {
      onTourEnd();
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col justify-end sm:justify-center items-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs pointer-events-auto"
          onClick={handleClose}
        />

        {/* Highlight spotlight box if target found */}
        {targetRect && (
          <div
            className="fixed rounded-xl border-2 border-amber-400 bg-amber-400/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] pointer-events-none transition-all duration-300 ease-out z-[10000]"
            style={{
              top: Math.max(0, targetRect.top - 8),
              left: Math.max(0, targetRect.left - 8),
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}

        {/* Interactive Tour Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-[10001] w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-xl shrink-0">
                {currentStepData?.icon || '✨'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                    Step {currentStep + 1} of {steps.length}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {currentStepData?.title}
                </h3>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            {currentStepData?.description}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-6">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-xs font-bold text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <span>Finish</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
