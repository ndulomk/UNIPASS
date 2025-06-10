// types/index.ts
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'staff' | 'student' | 'candidate';
  phone?: string;
  course_id?: number;
  course?: string;
  status?: 'active' | 'inactive' | 'suspended';
  enrollment_id?:number
}

export interface StudentAnswer {
  question_id: number;
  answer: string;
  is_correct: boolean;
  score_awarded: number;
  question_text: string;
  correct_answer: string;
}

export interface Course {
  id: number;
  name: string;
  description?: string | null;
  duration_months?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Discipline {
  id: number;
  course_id: number;
  academic_period_id: number;
  name: string;
  code: string;
  credits?: number | null;
  course_name?: string;
  academic_period_name?: string;
  created_at?: string;
  updated_at?: string;
}
export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  academic_period_id: number;
  code: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'canceled';
  enrolled_at: string;
  updated_at: string;
  course?: { name: string };
  user?: User;
}

export interface EnrollmentDoc {
  id: number;
  enrollment_id: number;
  type: string;
  file_path: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  validation_status?: 'pending' | 'approved' | 'rejected';
  validation_comments?: string;
  validated_at?: string;
  uploaded_at: string;
  updated_at: string;
}

export interface Question {
  id: number;
  exam_id: number;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'essay';
  options?: string; // JSON string
  correct_answer?: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: number;
  exam_name: string;  // Changed from 'name'
  exam_date: string;
  exam_type: 'objective' | 'discursive' | 'mixed';  // Changed from 'type'
  duration_minutes: number;
  max_score: number;
  course_name: string;
  discipline_name?: string;
  questions?: Question[];
}

export interface ContentMatrix {
  id: number;
  discipline_id: number;
  discipline_name: string;
  theme: string;
  competencies: string[];
  skills: string[];
  syllabus: string | null;
}


export interface QuestionFormData {
  text: string;
  type: 'multiple_choice' | 'true_false' | 'essay';
  options?: string | string[] | null;
  correct_answer?: string;
  score: number;
}


export interface ExamDetail extends Exam {
  questions: Question[];
}

export interface QuestionFormData {
  text: string;
  type: 'multiple_choice' | 'true_false' | 'essay';
  options?: string; // JSON string
  correct_answer?: string;
  score: number;
}

export interface ExamFormData {
  name: string;
  course_id: number | string;
  discipline_id: number | string;
  academic_period_id: number | string;
  type: 'normal' | 'recuperation' | 'special';
  exam_date: string;
  duration_minutes: number;
  second_call_eligible: boolean;
  second_call_date?: string;
  publication_date: string;
  max_score?: number;
  questions: QuestionFormData[];
}

export interface Grade {
  id: number;
  enrollment_id: number;
  discipline_id: number;
  academic_period_id: number;
  exam_id?: number;
  score: number;
  max_score: number;
  evaluation_type: 'midterm' | 'final' | 'makeup' | 'continuous';
  created_at: string;
  updated_at: string;
  exam_name?: string;
  exam_date?: string;
  course_name?: string;
  discipline_name?: string;
}

export interface StudentAnswerPayload {
  enrollment_id: number;
  exam_id: number;
  question_id: number;
  answer: string | string[] | null;
  is_correct?: boolean;
  score_awarded?: number;
}

export interface SystemStats {
  registrations: number;
  exams_scheduled: number;
  exams_corrected: number;
  pending_reviews: number;
}

export interface RecentCandidateInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  course_name?: string;
  enrollment_status?: string;
  enrolled_at?: string;
}

export interface UpcomingExamInfo {
  id: number;
  name: string;
  course_name?: string;
  discipline_name?: string;
  exam_date: string;
  type: 'normal' | 'recuperation' | 'special';
}

export interface PerformanceData {
  discipline_name: string;
  exam_name: string;
  exam_date: string;
  score: number;
  max_score: number;
  evaluation_type: 'midterm' | 'final' | 'makeup' | 'continuous';
}

export interface EnrollmentChartData {
  name: string; 
  total: number;
}
export interface SystemStats {
  registrations: number;
  exams_scheduled: number;
  exams_corrected: number;
  pending_reviews: number;
}

export interface RecentCandidateInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  enrollment_id: number;
  course_name?: string;
  enrollment_status?: string;
  enrolled_at?: string;
}

export interface QuestionFormData {
  text: string;
  type: 'multiple_choice' | 'true_false' | 'essay';
  options?: string;
  correct_answer?: string;
  score: number;
}