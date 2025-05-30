import { AdminExamResultItem, Candidate, CandidateDetail, Course, Discipline, EnrollmentChartData, EnrollmentDetail, Exam, ExamDetail, ExamFormData, RecentCandidateInfo, StudentExamResult, SystemStats, UpcomingExamInfo } from "@/types";
import axios from "axios";

const API_URL = 'http://localhost:3001/api'; 

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
export async function fetchCourses(): Promise<Course[] | undefined> {
  try {
    const response = await axios.get(`${API_URL}/courses`)
    return response.data
  } catch (error: any) {
    console.log(error)
    return undefined;
  }
}

export async function fetchDisciplinesByCourse(courseId: number): Promise<Discipline[] | undefined> {
  try {
    const response = await axios.get(`${API_URL}/courses/${courseId}/disciplines`)
    return response.data 
  } catch (error) {
    console.error('Error fetching disciplines:', error)
    return undefined
  }  
}

export async function createExam(examData: ExamFormData): Promise<unknown> {
  const courseId = parseInt(examData.course_id as string, 10);
  const disciplineId = parseInt(examData.discipline_id as string, 10);
  const duration = parseInt(examData.examDuration, 10);

  if (isNaN(courseId) || isNaN(disciplineId) || isNaN(duration)) {
    throw new Error('IDs do curso/disciplina ou duração inválidos');
  }

  const payload = {
    exam_name: examData.examName,
    course_id: courseId,
    discipline_id: disciplineId,
    exam_type: examData.examType,
    exam_date: new Date(examData.examDate).toISOString(),
    duration: duration,
    second_call_eligible: examData.secondCallEligible,
    second_call_date: examData.secondCallEligible && examData.secondCallDate 
      ? new Date(examData.secondCallDate).toISOString()
      : null,
    publication_date: new Date(examData.publicationDate).toISOString(),
    questions: examData.questions.map(q => ({
      ...q,
      score: Number(q.score) || 1 
    }))
  };

  try {
    const response = await axios.post(`${API_URL}/exams`, payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Erro desconhecido ao criar prova';
      throw new Error(message);
    }
    throw new Error('Erro de conexão com o servidor');
  }
}

export async function fetchSystemStats(): Promise<SystemStats> {
    try {
        const response = await api.get('/admin/dashboard/stats'); // This matches your Express route
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.detail 
                || error.response?.data?.message 
                || 'Falha ao buscar estatísticas do sistema';
            console.error('Error fetching stats:', error);
            throw new Error(message);
        }
        throw new Error('Erro de conexão com o servidor');
    }
}

export async function fetchRecentCandidates(): Promise<RecentCandidateInfo[]> {
    try {
        const response = await api.get('/candidates/recent?limit=5');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.detail || 'Falha ao buscar candidatos recentes';
            throw new Error(message);
        }
        throw new Error('Erro de conexão com o servidor');
    }
}

export async function fetchUpcomingExams(): Promise<UpcomingExamInfo[]> {
    try {
        const response = await api.get('/exams/upcoming/details?limit=3');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.detail || 'Falha ao buscar próximos exames';
            throw new Error(message);
        }
        throw new Error('Erro de conexão com o servidor');
    }
}
export async function fetchStudentResults(enrollmentId: number): Promise<StudentExamResult[]> {
  try {
    const response = await axios.get(`${API_URL}/exam_results/student/${enrollmentId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Falha ao buscar resultados do estudante.';
      throw new Error(message);
    }
    throw new Error('Erro de conexão com o servidor');
  }
}

export async function fetchAdminAllExamResults(): Promise<AdminExamResultItem[]> {
  try {
    const response = await axios.get(`${API_URL}/exam_results/admin/all-details`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Falha ao buscar todos os resultados de provas.';
      throw new Error(message);
    }
    throw new Error('Erro de conexão com o servidor');
  }
}

export async function fetchEnrollmentDetails(enrollmentId: number): Promise<EnrollmentDetail> {
  try {
    const response = await axios.get(`${API_URL}/enrollments/${enrollmentId}/details`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Falha ao buscar detalhes da matrícula.';
      throw new Error(message);
    }
    throw new Error('Erro de conexão com o servidor');
  }
}



export async function fetchCandidates(): Promise<Candidate[]> {
    try {
        const response = await api.get('/candidates');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.detail || 'Falha ao buscar candidatos';
            throw new Error(message);
        }
        throw new Error('Erro de conexão com o servidor');
    }
}

export async function fetchCandidateDetails(id: number): Promise<CandidateDetail> {
    try {
        const response = await api.get(`/candidates/${id}`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.detail || 'Falha ao buscar detalhes do candidato';
            throw new Error(message);
        }
        throw new Error('Erro de conexão com o servidor');
    }
}

export async function fetchExams(): Promise<Exam[]> {
    try {
        const response = await api.get('/exams');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.detail || 'Falha ao buscar exames';
            throw new Error(message);
        }
        throw new Error('Erro de conexão com o servidor');
    }
}

export async function fetchExamDetails(id: number): Promise<ExamDetail> {
    try {
        const response = await api.get(`/exams/${id}`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.detail || 'Falha ao buscar detalhes do exame';
            throw new Error(message);
        }
        throw new Error('Erro de conexão com o servidor');
    }
}

export async function fetchEnrollmentChartData(): Promise<EnrollmentChartData[]> {
    try {
        const response = await api.get('/stats/enrollments-by-month');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.detail || 'Falha ao buscar dados do gráfico';
            throw new Error(message);
        }
        throw new Error('Erro de conexão com o servidor');
    }
}

export async function login(email: string, password: string) {
    try {
        const response = await api.post('/auth/token', { email, password });
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token); 
        return access_token;
    } catch (error: any) {
        console.error('Login error:', error);
        throw new Error(error.response?.data?.message || 'Login failed');
    }
}



export async function logout() {
    localStorage.removeItem('access_token');
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use(
    response => response,
    error => {
        if (!error.response) {
            console.error('Network error:', error);
            throw new Error('Erro de conexão com o servidor. Verifique sua conexão de internet.');
        }
        return Promise.reject(error);
    }
);