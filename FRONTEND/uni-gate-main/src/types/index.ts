export interface Course {
  id: number,
  name: string,
  created_at: string;
  updated_at: string;
}

export interface Discipline {
  id: number,
  name: string,
  course_id: number,
  code?: string | null,
  created_at: string,
  updated_at: string 
}

export interface QuestionFormData {
  question_text: string,
  correct_answer: string,
  question_type: string,
  score: number 
}

export interface ExamFormData {
  examName: string,
  course_id: string | number,
  discipline_id: string | number,
  examType: string,
  examDate: string,
  examDuration: string,
  secondCallEligible: boolean,
  secondCallDate: string,
  publicationDate: string,
  questions: QuestionFormData[];
}


export interface RecentCandidateInfo {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    course_name?: string | null;
    enrollment_status?: string | null;
    enrolled_at?: string | null; 
}

export interface UpcomingExamInfo {
    id: number;
    exam_name: string;
    course_name?: string | null;
    discipline_name?: string | null;
    exam_date: string; 
    exam_type: string;
}

export interface SystemStats {
    registrations: number;
    exams_scheduled: number;
    exams_corrected: number;
    pending_reviews: number;
}


export interface StudentExamResult {
    id: number;
    enrollment_id: number;
    exam_id: number;
    total_score_obtained: number; 
    max_score_possible: number; 
    grade: string; 
    graded_at?: string | null;
    exam_name: string;
    exam_date: string;
    course_name: string;
    discipline_name: string;
}

export interface StudentExamResult {
    id: number;
    enrollment_id: number;
    exam_id: number;
    total_score_obtained: number;
    max_score_possible: number;
    grade: string;
    graded_at?: string | null;
    exam_name: string;
    exam_date: string;
    course_name: string;
    discipline_name: string;
}

export interface AdminExamResultItem {
    result_id: number;
    enrollment_id: number;
    exam_id: number;
    total_score_obtained: number;
    max_score_possible: number;
    grade: string | null;
    graded_at: string | null;
    candidate_first_name: string;
    candidate_last_name: string;
    candidate_email: string;
    exam_name: string;
    exam_date: string;
    course_name: string;
    discipline_name: string;
}


export interface Candidate { 
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    created_at: string;
    updated_at: string;
}
export interface EnrollmentDetail {
    id: number;
    candidate_id: number;
    course_id: number;
    enrolled_at: string;
    updated_at: string;
    status?: string | null;
    cod?: string | null;
    candidate: Candidate;
    course: Course; 
}

export interface Candidate {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    created_at: string;
    courses_applied: string[];
    latest_enrollment_status: string;
}

export interface Enrollment {
    id: number;
    status: string;
    enrolled_at: string;
    COD: string;
    course_name: string;
}

export interface CandidateDetail extends Candidate {
    enrollments: Enrollment[];
}

export interface Exam {
    id: number;
    exam_name: string;
    exam_date: string;
    exam_type: string;
    course_name: string;
    discipline_name: string;
}

export interface Question {
    id: number;
    question_text: string;
    question_type: string;
    score: number;
}

export interface ExamDetail extends Exam {
    questions: Question[];
    duration: number;
    publication_date: string;
}

export interface EnrollmentChartData {
    name: string; // ex: "Jan", "Fev"
    total: number;
}