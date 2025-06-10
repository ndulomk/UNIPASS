// lib/api.ts
import { AdminExamResultItem, CandidateDetail, Course, Discipline, EnrollmentChartData, EnrollmentDoc, Exam, ExamDetail, ExamFormData, Grade, RecentCandidateInfo, SystemStats, UpcomingExamInfo, PerformanceData, StudentAnswerPayload, User, Enrollment } from "@/types";
import axios, { AxiosError } from "axios";

const API_URL = 'http://localhost:3001/api';




interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});


// async function mine(){
//   const response = await api.get(`/health`)
//   console.log(response)
// }

// mine()
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (!error.response) {
      console.error('Network error:', error);
      throw new Error('Erro de conexão com o servidor. Verifique sua conexão de internet.');
    }
    return Promise.reject(error);
  }
);

export interface LoginResponseDetails {
  accessToken: string;
  userData: User;
  enrollmentData?: Enrollment;
}

export async function loginAndFetchDetailsApi(email: string, password: string): Promise<LoginResponseDetails> {
  try {
    const response = await api.post<{ access_token: string }>('/auth/login', { email, password });
    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    const userResponse = await api.get<User>('/users/me');
    const userData = userResponse.data;

    let enrollmentData: Enrollment | undefined = undefined;

    if (userData.role === 'student' && userData.email && userData.enrollment_id) {
      try {
        const enrollmentRes = await api.get<Enrollment>(`/enrollments/${userData.enrollment_id}/details`);
        console.log(enrollmentRes);
        if (enrollmentRes.data) {
          enrollmentData = enrollmentRes.data;
          localStorage.setItem('enrollmentId', enrollmentData.id.toString());
        } else {
          console.warn(`No enrollment found for user ID: ${userData.enrollment_id}`);
        }
      } catch (enrollmentError) {
        const err = enrollmentError as AxiosError<ApiErrorResponse>;
        console.error("Error fetching enrollment data:", err.response?.data?.message || err.message);
      }
    }

    localStorage.setItem('userData', JSON.stringify(userData));
    return { accessToken: access_token, userData, enrollmentData };
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    const errorMessage = err.response?.data?.message || err.response?.data?.detail || 'Login failed. Please check your credentials.';
    console.error('Error during login or fetching details:', errorMessage);
    delete api.defaults.headers.common['Authorization'];
    throw new Error(errorMessage);
  }
}

export function clearApiToken() {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('access_token');
  localStorage.removeItem('userData');
  localStorage.removeItem('enrollmentId');
}

export async function logout() {
  clearApiToken();
}

export async function fetchCourses(): Promise<Course[]> {
  try {
    const response = await api.get<Course[]>('/courses');
    return response.data;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw new Error('Failed to fetch courses.');
  }
}
interface ApiErrorResponse {
  message?: string;
  error?: string;
}

function handleApiError(error: any): never {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as ApiErrorResponse)?.message || 'Erro na requisição.';
    throw new Error(message);
  }
  throw new Error('Erro de conexão com o servidor.');
}


export async function fetchDisciplinesByCourse(courseId: number): Promise<Discipline[]> {
  try {
    const response = await api.get<Discipline[]>(`/disciplines/courses/${courseId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching disciplines:', error);
    throw new Error('Failed to fetch disciplines.');
  }
}

export async function createCourse(data: { name: string; description?: string; duration_months?: number }): Promise<{ status: string; message: string }> {
  try {
    const response = await api.post<{ status: string; message: string }>('/courses', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function createDiscipline(data: {
  course_id: number;
  academic_period_id: number;
  name: string;
  code: string;
  credits?: number;
}): Promise<Discipline> {
  try {
    const response = await api.post<Discipline>('/disciplines', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function createExam(examData: ExamFormData): Promise<Exam> {
  const courseId = Number(examData.course_id);
  const disciplineId = Number(examData.discipline_id);
  const academicPeriodId = Number(examData.academic_period_id);
  const duration = Number(examData.duration_minutes);

  if (isNaN(courseId) || isNaN(disciplineId) || isNaN(academicPeriodId) || isNaN(duration)) {
    throw new Error('Invalid course, discipline, academic period ID, or duration.');
  }

  const payload = {
    name: examData.name,
    course_id: courseId,
    discipline_id: disciplineId,
    academic_period_id: academicPeriodId,
    type: examData.type,
    exam_date: new Date(examData.exam_date).toISOString(),
    duration_minutes: duration,
    max_score: examData.max_score || 20,
    second_call_eligible: examData.second_call_eligible,
    second_call_date: examData.second_call_eligible && examData.second_call_date
      ? new Date(examData.second_call_date).toISOString()
      : null,
    publication_date: new Date(examData.publication_date).toISOString(),
    questions: examData.questions.map(q => ({
      text: q.text,
      type: q.type,
      options: q.options,
      correct_answer: q.correct_answer,
      score: Number(q.score) || 1,
    })),
  };

  try {
    const response = await api.post<Exam>('/exams', payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Error creating exam.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchSystemStats(): Promise<SystemStats> {
  try {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar estatísticas.');
    }
    throw new Error('Erro de conexão com o servidor.');
  }
}


export async function fetchRecentCandidates(): Promise<RecentCandidateInfo[]> {
  try {
    const response = await api.get('/users/recent?role=candidate&limit=5');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar candidatos recentes.');
    }
    throw new Error('Erro de conexão com o servidor.');
  }
}
interface ApiErrorResponse {
  message?: string;
  error?: string;
}

interface ExamFormData {
  name: string;
  discipline_id: number;
  course_id: number;
  academic_period_id: number;
  exam_date: string;
  duration_minutes: number;
  type: 'objective' | 'discursive' | 'mixed';
  max_score: number;
  second_call_eligible?: boolean;
  second_call_date?: string | null;
  publication_date?: string;
  content_matrix_id?: number; // New field
  questions: {
    text: string;
    type: 'multiple_choice' | 'true_false' | 'essay';
    options: string[] | null;
    correct_answer: string;
    score: number;
  }[];
}

interface Exam {
  id: number;
  name: string;
  discipline_id: number;
  course_id: number;
  academic_period_id: number;
  exam_date: string;
  duration_minutes: number;
  type: 'objective' | 'discursive' | 'mixed';
  max_score: number;
  content_matrix_id?: number;
}

export async function uploadExam(examData: ExamFormData): Promise<Exam> {
  const payload = {
    name: examData.name,
    course_id: examData.course_id,
    academic_period_id: examData.academic_period_id,
    type: examData.type,
    exam_date: new Date(examData.exam_date).toISOString(),
    duration_minutes: examData.duration_minutes,
    max_score: examData.max_score || 20,
    second_call_eligible: examData.second_call_eligible || false,
    second_call_date: examData.second_call_eligible && examData.second_call_date
      ? new Date(examData.second_call_date).toISOString()
      : null,
    publication_date: examData.publication_date ? new Date(examData.publication_date).toISOString() : new Date().toISOString(),
    content_matrix_id: examData.content_matrix_id, // Include content_matrix_id
    questions: examData.questions.map((q) => ({
      text: q.text,
      type: q.type,
      options: q.options,
      correct_answer: q.correct_answer,
      score: q.score || 1,
    })),
  };

  try {
    const response = await api.post<Exam>('/exams', payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.message || 'Error creating exam.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}
export async function approveEnrollment(enrollmentId: number, data: { status: string }) {
  try {
    const response = await api.patch(`/enrollments/${enrollmentId}`, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Erro ao aprovar matrícula.');
    }
    throw new Error('Erro de conexão com o servidor.');
  }
}

export async function gradeExam(data: {
  exam_id: number;
  enrollment_id: number;
  discipline_id: number;
  academic_period_id: number;
  score: number;
  max_score: number;
  evaluation_type: 'midterm' | 'final' | 'makeup' | 'continuous';
}) {
  try {
    const response = await api.post('/grades', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Erro ao corrigir prova.');
    }
    throw new Error('Erro de conexão com o servidor.');
  }
}
export async function fetchUpcomingExams(courseId?: number): Promise<UpcomingExamInfo[]> {
  try {
    let url = '/exams/upcoming/details?limit=3';
    if (courseId) {
      url += `&course_id=${courseId}`;
    }
    const response = await api.get<UpcomingExamInfo[]>(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch upcoming exams.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchStudentResults(enrollmentId: number): Promise<Grade[]> {
  try {
    const response = await api.get<Grade[]>(`/grades/student/${enrollmentId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch student results.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchAdminAllExamResults(): Promise<Grade[]> {
  try {
    const response = await api.get<Grade[]>('/exams');
    console.log(response)
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch all exam results.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchEnrollmentDetails(enrollmentId: number): Promise<Enrollment> {
  try {
    const response = await api.get<Enrollment>(`/enrollments/${enrollmentId}/details`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch enrollment details.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchCandidates(): Promise<User[]> {
  try {
    const response = await api.get<User[]>('users');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch candidates.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchCandidateDetails(id: number): Promise<User> {
  try {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch candidate details.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchExams(courseId?: number): Promise<Exam[]> {
  try {
    const url = courseId ? `/exams?course_id=${courseId}` : '/exams';
    const response = await api.get<Exam[]>(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch exams.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}
export async function fetchStudentAnswers(enrollmentId: number, examId: number): Promise<StudentAnswer[]> {
  try {
    const response = await api.get(`/exam_results/by-student/${enrollmentId}/answers/${examId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.message || 'Failed to fetch student answers.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}


export interface StudentAnswer {
  question_id: number;
  answer: string;
  is_correct: boolean;
  score_awarded: number;
  question_text: string;
  correct_answer: string;
}
export async function fetchEnrollmentsByUser(): Promise<Enrollment[]> {
  try {
    const response = await api.get('/enrollments/by-user');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.message || 'Failed to fetch enrollments.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export interface Enrollment {
  id: string;
  user_id: number;
  course_id: string;
  academic_period_id: string;
  enrolled_at: string;
  updated_at: string;
  status: string;
  code: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    created_at: string;
    updated_at: string;
  };
  course: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  };
  academic_period: {
    id: string;
    name: string;
  };
}

export async function fetchExamDetails(id: number): Promise<ExamDetail> {
  try {
    const response = await api.get<ExamDetail>(`/exams/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch exam details.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchEnrollmentChartData(): Promise<EnrollmentChartData[]> {
  try {
    const response = await api.get<EnrollmentChartData[]>('/stats/enrollments-by-month');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch chart data.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchStudentPerformance(enrollmentId: string | number): Promise<PerformanceData[]> {
  try {
    const response = await api.get<PerformanceData[]>(`/grades/student/${enrollmentId}/performance`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || 'Failed to fetch student performance.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function submitExamAnswers(answers: StudentAnswerPayload[]): Promise<{ message: string }> {
  try {
    const response = await api.post<{ message: string }>('/student_answers/submit_bulk', { answers });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.detail || (error.response?.data as ApiErrorResponse)?.message || 'Failed to submit answers.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}

export async function fetchDocumentsByEnrollment(enrollmentId: string | number): Promise<EnrollmentDoc[]> {
  try {
    const response = await api.get<EnrollmentDoc[]>(`/enrollment_docs/by-enrollment/${enrollmentId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = (error.response?.data as ApiErrorResponse)?.message || 'Failed to fetch documents.';
      throw new Error(message);
    }
    throw new Error('Server connection error.');
  }
}