export interface EvaluationCriterion {
  id: string;
  label: string;
  description: string;
  weight?: number;
}

export const DEFAULT_CRITERIA: EvaluationCriterion[] = [
  { id: 'subjectKnowledge', label: 'Subject Knowledge', description: 'Demonstrates deep understanding and mastery of the subject matter.' },
  { id: 'teachingMethods', label: 'Teaching Methods', description: 'Uses effective, engaging, and innovative teaching strategies.' },
  { id: 'communication', label: 'Communication', description: 'Explains concepts clearly and responds constructively to questions.' },
  { id: 'punctuality', label: 'Punctuality', description: 'Starts and ends classes on time and manages time efficiently.' },
  { id: 'fairness', label: 'Fairness & Respect', description: 'Grades fairly, adheres to rubrics, and treats all students with respect.' }
];
