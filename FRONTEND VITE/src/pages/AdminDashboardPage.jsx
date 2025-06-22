import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, CalendarDays, Loader2, Users, FileCheck, Edit3 } from 'lucide-react';
import Modal from '../components/Modal';
import QuestionInput from '../components/QuestionInput';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:3001/api';

// Cookie management functions
const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

const removeCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict;Secure`;
};

const StatCard = ({ title, value, icon, color = 'blue', link, className }) => {
  const colorClasses = {
    blue: 'border-l-sky-500',
    green: 'border-l-green-500',
    purple: 'border-l-purple-500',
    yellow: 'border-l-yellow-500',
    red: 'border-l-red-500',
    indigo: 'border-l-indigo-500',
  };

  const iconColorClasses = {
    blue: 'text-sky-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
    indigo: 'text-indigo-500',
  };

  const CardContent = () => (
    <div className={`bg-white max-[1px]:bg-slate-800 p-6 rounded-xl shadow-lg border-l-4 ${colorClasses[color]} hover:shadow-xl transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 max-[1px]:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-800 max-[1px]:text-slate-100">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-slate-50 max-[1px]:bg-slate-700 ${iconColorClasses[color]}`}>
          {icon}
        </div>
      </div>
      {link && (
        <div className="mt-4 flex items-center text-sm text-slate-500 max-[1px]:text-slate-400 hover:text-slate-700 max-[1px]:hover:text-slate-200 transition-colors">
          <span>Ver mais</span>
          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  if (link) {
    return <a href={link} className="block h-full"><CardContent /></a>;
  }
  return <CardContent />;
};

function AdminDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [disciplines, setDisciplines] = useState([]);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    name: '',
    discipline_id: '',
    course_id: '',
    academic_period_id: '',
    exam_date: '',
    duration_minutes: '',
    type: 'objective',
    max_score: '',
    questions: [],
  });
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    enrollment_id: '',
    score: '',
    max_score: '',
    evaluation_type: 'final',
    discipline_id: '',
    academic_period_id: '',
  });
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  function createApiInstance() {
    const accessToken = getCookie('access_token');
    console.debug('Creating API instance with token:', accessToken ? 'Present' : 'Absent');
    return axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      withCredentials: true,
    });
  }

  async function fetchSystemStats() {
    try {
      const api = createApiInstance();
      console.debug('Fetching system stats...');
      const response = await api.get("/admin/dashboard/stats");
      console.debug('System stats fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching system stats:', error);
      const message = error.response?.data?.message || "Erro ao buscar estatísticas.";
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      throw new Error(message);
    }
  }

  async function fetchRecentCandidates() {
    try {
      const api = createApiInstance();
      console.debug('Fetching recent candidates...');
      const response = await api.get("/users/recent?role=candidate&limit=5");
      console.debug('Recent candidates fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent candidates:', error);
      const message = error.response?.data?.message || "Erro ao buscar candidatos recentes.";
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      throw new Error(message);
    }
  }

  async function fetchUpcomingExams(courseId) {
    try {
      const api = createApiInstance();
      let url = "/exams/upcoming/details?limit=3";
      if (courseId) {
        url += `&course_id=${courseId}`;
      }
      console.debug('Fetching upcoming exams with URL:', url);
      const response = await api.get(url);
      console.debug('Upcoming exams fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming exams:', error);
      const message = error.response?.data?.detail || "Failed to fetch upcoming exams.";
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      throw new Error(message);
    }
  }

  async function fetchCourses() {
    try {
      const api = createApiInstance();
      console.debug('Fetching courses...');
      const response = await api.get("/courses");
      console.debug('Courses fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching courses:", error);
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      throw new Error("Failed to fetch courses.");
    }
  }

  async function fetchDisciplinesByCourse(courseId) {
    try {
      const api = createApiInstance();
      console.debug('Fetching disciplines for course:', courseId);
      const response = await api.get(`/disciplines/courses/${courseId}`);
      console.debug('Disciplines fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching disciplines:", error);
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      throw new Error("Failed to fetch disciplines.");
    }
  }

  async function uploadExam(examData) {
    const payload = {
      name: examData.name,
      course_id: examData.course_id,
      academic_period_id: examData.academic_period_id,
      type: examData.type,
      exam_date: new Date(examData.exam_date).toISOString(),
      duration_minutes: examData.duration_minutes,
      max_score: examData.max_score || 20,
      second_call_eligible: examData.second_call_eligible || false,
      second_call_date:
        examData.second_call_eligible && examData.second_call_date
          ? new Date(examData.second_call_date).toISOString()
          : null,
      publication_date: examData.publication_date
        ? new Date(examData.publication_date).toISOString()
        : new Date().toISOString(),
      content_matrix_id: examData.content_matrix_id,
      questions: examData.questions.map((q) => ({
        text: q.text,
        type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        score: q.score || 1,
      })),
    };
    try {
      const api = createApiInstance();
      console.debug('Uploading exam with payload:', payload);
      const response = await api.post("/exams", payload);
      console.debug('Exam uploaded:', response.data);
      return response.data;
    } catch (error) {
      console.error("Error uploading exam:", error);
      const message = error.response?.data?.message || "Error creating exam.";
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      throw new Error(message);
    }
  }

  async function approveEnrollment(enrollmentId, data) {
    try {
      const api = createApiInstance();
      console.debug('Approving enrollment:', enrollmentId, data);
      const response = await api.patch(`/enrollments/${enrollmentId}`, data);
      console.debug('Enrollment approved:', response.data);
      return response.data;
    } catch (error) {
      console.error("Error approving enrollment:", error);
      const message = error.response?.data?.message || "Erro ao aprovar matrícula.";
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      throw new Error(message);
    }
  }

  async function gradeExam(data) {
    try {
      const api = createApiInstance();
      console.debug('Grading exam with data:', data);
      const response = await api.post("/grades", data);
      console.debug('Exam graded:', response.data);
      return response.data;
    } catch (error) {
      console.error("Error grading exam:", error);
      const message = error.response?.data?.message || "Erro ao corrigir prova.";
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
      throw new Error(message);
    }
  }

  function handleUnauthorized() {
    console.debug('Handling unauthorized access');
    // Uncomment these lines in production to clear cookies and redirect
    // removeCookie('access_token');
    // removeCookie('userData');
    // removeCookie('candidateData');
    // removeCookie('enrollmentData');
    // navigate('/login');
    toast.error('Sessão expirada. Faça login novamente.');
  }

  async function fetchData() {
    try {
      console.debug('Fetching initial dashboard data...');
      const [stats, candidates, exams] = await Promise.all([
        fetchSystemStats(),
        fetchRecentCandidates(),
        fetchUpcomingExams(),
      ]);
      setSystemStats(stats);
      setRecentCandidates(candidates);
      setUpcomingExams(exams);
      console.debug('Dashboard data fetched successfully');
    } catch (err) {
      console.error('Error in fetchData:', err);
      throw err;
    }
  }

  async function loadCourses() {
    try {
      setIsLoadingCourses(true);
      console.debug('Loading courses...');
      const fetchedCourses = await fetchCourses();
      setCourses(fetchedCourses ?? []);
      console.debug('Courses loaded:', fetchedCourses);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
      toast.error('Falha ao carregar cursos.');
    } finally {
      setIsLoadingCourses(false);
    }
  }

  async function loadDisciplines() {
    if (!examForm.course_id) {
      setDisciplines([]);
      setExamForm((prev) => ({ ...prev, discipline_id: '' }));
      console.debug('No course ID selected, clearing disciplines');
      return;
    }
    try {
      setIsLoadingDisciplines(true);
      console.debug('Loading disciplines for course:', examForm.course_id);
      const courseIdNum = parseInt(examForm.course_id, 10);
      const fetchedDisciplines = await fetchDisciplinesByCourse(courseIdNum);
      setDisciplines(fetchedDisciplines ?? []);
      console.debug('Disciplines loaded:', fetchedDisciplines);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Falha ao carregar disciplinas.');
    } finally {
      setIsLoadingDisciplines(false);
    }
  }

  function handleAddQuestion() {
    setExamForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          text: '',
          type: 'multiple_choice',
          options: '',
          correct_answer: '',
          score: 0,
        },
      ],
    }));
    console.debug('Added new question to exam form');
  }

  function handleQuestionChange(index, field, value) {
    setExamForm((prev) => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
      return { ...prev, questions: updatedQuestions };
    });
    console.debug('Updated question at index:', index, 'Field:', field, 'Value:', value);
  }

  function handleRemoveQuestion(index) {
    setExamForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
    console.debug('Removed question at index:', index);
  }

  async function handleExamSubmit(e) {
    e.preventDefault();
    try {
      const parsedForm = {
        ...examForm,
        course_id: parseInt(examForm.course_id),
        discipline_id: examForm.discipline_id ? parseInt(examForm.discipline_id) : undefined,
        academic_period_id: examForm.academic_period_id ? parseInt(examForm.academic_period_id) : undefined,
        duration_minutes: parseInt(examForm.duration_minutes),
        max_score: parseFloat(examForm.max_score),
        questions: examForm.questions.map((q) => ({
          ...q,
          score: parseFloat(q.score.toString()),
          options: q.type === 'multiple_choice' ? q.options.split(',').map((o) => o.trim()) : undefined,
        })),
      };
      console.debug('Submitting exam form:', parsedForm);
      await uploadExam(parsedForm);
      toast.success('Prova carregada com sucesso!');
      setIsUploadModalOpen(false);
      setExamForm({
        name: '',
        discipline_id: '',
        course_id: '',
        academic_period_id: '',
        exam_date: '',
        duration_minutes: '',
        type: 'objective',
        max_score: '',
        questions: [],
      });
      const exams = await fetchUpcomingExams();
      setUpcomingExams(exams);
      console.debug('Exam submitted and upcoming exams updated');
    } catch (err) {
      setError(err.message || 'Erro ao carregar prova.');
      toast.error(err.message || 'Erro ao carregar prova.');
      console.error('Error submitting exam:', err);
    }
  }

  async function handleApproveEnrollment() {
    if (!selectedEnrollmentId) return;
    try {
      console.debug('Approving enrollment ID:', selectedEnrollmentId);
      await approveEnrollment(selectedEnrollmentId, { status: 'approved' });
      setIsApprovalModalOpen(false);
      setSelectedEnrollmentId(null);
      const candidates = await fetchRecentCandidates();
      setRecentCandidates(candidates);
      toast.success('Matrícula aprovada com sucesso!');
      console.debug('Enrollment approved successfully');
    } catch (err) {
      setError(err.message || 'Erro ao aprovar matrícula.');
      toast.error(err.message || 'Erro ao aprovar matrícula.');
      console.error('Error approving enrollment:', err);
    }
  }

  async function handleGradeExam(e) {
    e.preventDefault();
    if (!selectedExamId) return;
    try {
      const gradeData = {
        exam_id: selectedExamId,
        enrollment_id: parseInt(gradeForm.enrollment_id),
        discipline_id: parseInt(gradeForm.discipline_id),
        academic_period_id: parseInt(gradeForm.academic_period_id),
        score: parseFloat(gradeForm.score),
        max_score: parseFloat(gradeForm.max_score),
        evaluation_type: gradeForm.evaluation_type,
      };
      console.debug('Submitting grade data:', gradeData);
      await gradeExam(gradeData);
      setIsGradingModalOpen(false);
      setSelectedExamId(null);
      setGradeForm({
        enrollment_id: '',
        score: '',
        max_score: '',
        evaluation_type: 'final',
        discipline_id: '',
        academic_period_id: '',
      });
      const stats = await fetchSystemStats();
      setSystemStats(stats);
      toast.success('Prova corrigida com sucesso!');
      console.debug('Exam graded successfully');
    } catch (err) {
      setError(err.message || 'Erro ao corrigir prova.');
      toast.error(err.message || 'Erro ao corrigir prova.');
      console.error('Error grading exam:', err);
    }
  }

  // Load user data from cookies
  useEffect(() => {
    const token = getCookie('access_token');
    const userDataString = getCookie('userData');

    console.debug('Checking cookies - Token:', token ? 'Present' : 'Absent', 'UserData:', userDataString || 'Absent');

    // Allow access even without token or user data for debugging
    if (!token || !userDataString) {
      console.warn('No token or user data found, proceeding with default user for debugging');
      setUser({ first_name: 'Debug User', role: 'debug' });
      // Proceed to load data
    } else {
      try {
        const parsedUser = JSON.parse(userDataString);
        console.debug('Parsed user data:', parsedUser);

        // Fix: Correct the validation logic
        if (!parsedUser || !parsedUser.id) {
          throw new Error('Invalid user data: Missing user or ID');
        }

        setUser(parsedUser);

        // Remove admin role check to allow non-admin access
        // if (parsedUser.role !== 'admin') {
        //   toast.error('Acesso negado. Requer-se a função de administrador.');
        //   handleUnauthorized();
        //   return;
        // }
        console.debug('User role:', parsedUser.role, '- Allowing access for debugging');
      } catch (error) {
        console.error('Error parsing user data from cookies:', error);
        setError('Dados de usuário inválidos.');
        // Allow access with default user for debugging
        setUser({ first_name: 'Debug User', role: 'debug' });
        console.warn('Proceeding with default user due to parsing error');
      }
    }

    // Load initial data
    const loadInitialData = async () => {
      try {
        setLoading(true);
        console.debug('Loading initial data...');
        await Promise.allSettled([
          fetchData(),
          loadCourses(),
        ]).then((results) => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error(`Failed to load data ${index}:`, result.reason);
            }
          });
        });
        console.debug('Initial data loaded');
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError(error.message || 'Erro ao carregar dados iniciais.');
        toast.error(error.message || 'Erro ao carregar dados iniciais.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [navigate]);

  // Load disciplines when course_id changes
  useEffect(() => {
    loadDisciplines();
  }, [examForm.course_id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-red-600" />
        <h2 className="text-2xl font-semibold text-red-700 max-[1px]:text-red-400 mb-2">Erro no Painel</h2>
        <p className="text-slate-600 max-[1px]:text-slate-300 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Allow rendering even if user is not fully loaded
  return (
    <div className="min-h-screen bg-slate-50 max-[1px]:bg-gray-900">
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 max-[1px]:text-slate-100">
            Bem-vindo, {user?.first_name || 'Administrador'}!
          </h1>
          <p className="text-slate-600 max-[1px]:text-slate-400">
            Gerencie provas, matrículas e resultados a partir do seu painel.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          <StatCard
            title="Inscrições"
            value={systemStats?.registrations || 0}
            icon={<Users className="w-7 h-7" />}
            color="indigo"
            link="/admin/candidatos"
          />
          <StatCard
            title="Revisão"
            value={systemStats?.exams_corrected || 0}
            icon={<FileCheck className="w-7 h-7" />}
            color="green"
            link="/admin/resultados"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white max-[1px]:bg-slate-800 p-8 rounded-xl shadow-lg border-l-4 border-l-slate-400">
            <h3 className="text-xl font-semibold mb-6 text-slate-700 max-[1px]:text-slate-200">Ações Administrativas</h3>
            <div className="space-y-4">
              <a
                href="/admin/candidatos"
                className="w-full p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Users className="w-5 h-5" /> Gerenciar Matrículas
              </a>
        
            </div>
          </div>
          <div className="bg-white max-[1px]:bg-slate-800 p-8 rounded-xl shadow-lg border-l-4 border-l-sky-400 flex flex-col">
            <h3 className="text-xl font-semibold mb-6 text-slate-700 max-[1px]:text-slate-200">Próximas Provas</h3>
            {upcomingExams.length > 0 ? (
              <ul className="space-y-4 overflow-y-auto flex-grow">
                {upcomingExams.slice(0, 5).map((exam) => (
                  <li
                    key={exam.id}
                    className="p-4 bg-slate-50 max-[1px]:bg-slate-700/50 rounded-lg hover:shadow-md transition-all duration-300 border-l-2 border-l-sky-300"
                  >
                    <p className="font-medium text-slate-800 max-[1px]:text-slate-100">{exam.name}</p>
                    <p className="text-sm text-slate-600 max-[1px]:text-slate-300">{exam.discipline_name}</p>
                    <p className="text-xs text-sky-600 max-[1px]:text-sky-400 mt-1">
                      {new Date(exam.exam_date).toLocaleDateString('pt-AO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setGradeForm({
                          ...gradeForm,
                          discipline_id: exam.discipline_id?.toString() || '',
                          academic_period_id: exam.academic_period_id?.toString() || '',
                        });
                        setIsGradingModalOpen(true);
                      }}
                      className="mt-2 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      Corrigir Prova
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 max-[1px]:text-slate-400 flex-grow">
                <CalendarDays size={48} className="mb-4 opacity-50" />
                <p>Nenhuma prova agendada.</p>
              </div>
            )}
            <a
              href="/admin/agendamentos"
              className="block mt-auto pt-4 text-center text-sm text-sky-600 hover:text-sky-700 max-[1px]:text-sky-400 max-[1px]:hover:text-sky-300 font-medium transition-colors"
            >
              Ver Todas as Provas →
            </a>
          </div>
        </div>

        <div className="bg-white max-[1px]:bg-slate-800 p-8 rounded-xl shadow-lg border-l-4 border-l-green-400">
          <h3 className="text-xl font-semibold mb-6 text-slate-700 max-[1px]:text-slate-200">Últimos Candidatos</h3>
          {recentCandidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 max-[1px]:border-gray-700 text-left">
                    <th className="py-3 px-2 font-medium text-slate-700 max-[1px]:text-slate-300">Nome</th>
                    <th className="py-3 px-2 font-medium text-slate-700 max-[1px]:text-slate-300">Curso</th>
                    <th className="py-3 px-2 font-medium text-slate-700 max-[1px]:text-slate-300">Status</th>
                
                  </tr>
                </thead>
                <tbody>
                  {recentCandidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="border-b border-gray-100 max-[1px]:border-gray-700 hover:bg-gray-50 max-[1px]:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-2 text-slate-800 max-[1px]:text-slate-200">
                        {candidate.first_name} {candidate.last_name}
                      </td>
                      <td className="py-3 px-2 text-slate-600 max-[1px]:text-slate-400">{candidate.course_name}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            candidate.enrollment_status === 'approved'
                              ? 'bg-green-100 text-green-800 max-[1px]:bg-green-900 max-[1px]:text-green-200'
                              : candidate.enrollment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 max-[1px]:bg-yellow-900 max-[1px]:text-yellow-200'
                              : 'bg-red-100 text-red-800 max-[1px]:bg-red-900 max-[1px]:text-red-200'
                          }`}
                        >
                          {candidate.enrollment_status === 'approved'
                            ? 'Aprovado'
                            : candidate.enrollment_status === 'pending'
                            ? 'Pendente'
                            : 'Rejeitado'}
                        </span>
                      </td>
                  
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 max-[1px]:text-slate-400">
              <Users size={48} className="mb-4 opacity-50" />
              <p>Nenhum candidato recente.</p>
            </div>
          )}
        </div>

        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title="Carregar Nova Prova"
          className="max-w-3xl w-full"
        >
          <form onSubmit={handleExamSubmit} className="space-y-6 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-200 mb-1">Nome da Prova</label>
              <input
                type="text"
                value={examForm.name}
                onChange={(e) => setExamForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da prova"
                className="w-full px-4 py-2.5 rounded-lg bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-200 mb-1">Curso</label>
              <select
                name="course_id"
                value={examForm.course_id}
                onChange={(e) => setExamForm((prev) => ({ ...prev, course_id: e.target.value, discipline_id: '' }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              >
                <option value="">Selecione um curso</option>
                {isLoadingCourses ? (
                  <option disabled>Carregando cursos...</option>
                ) : courses.length > 0 ? (
                  courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Nenhum curso disponível</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-200 mb-1">Disciplina</label>
              <select
                value={examForm.discipline_id}
                onChange={(e) => setExamForm((prev) => ({ ...prev, discipline_id: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                disabled={isLoadingDisciplines || !examForm.course_id}
              >
                <option value="">Selecione uma disciplina</option>
                {isLoadingDisciplines ? (
                  <option disabled>Carregando disciplinas...</option>
                ) : disciplines.length > 0 ? (
                  disciplines.map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Nenhuma disciplina disponível</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-200 mb-1">Período Acadêmico ID</label>
              <input
                type="number"
                value={examForm.academic_period_id}
                onChange={(e) => setExamForm((prev) => ({ ...prev, academic_period_id: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-200 mb-1">Data da Prova</label>
              <input
                type="datetime-local"
                value={examForm.exam_date}
                onChange={(e) => setExamForm((prev) => ({ ...prev, exam_date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-200 mb-1">Duração (minutos)</label>
              <input
                type="number"
                value={examForm.duration_minutes}
                onChange={(e) => setExamForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-200 mb-1">Tipo</label>
              <select
                value={examForm.type}
                onChange={(e) => setExamForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              >
                <option value="objective">Objetiva</option>
                <option value="discursive">Discursiva</option>
                <option value="mixed">Mista</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-200 mb-1">Pontuação Máxima</label>
              <input
                type="number"
                value={examForm.max_score}
                onChange={(e) => setExamForm((prev) => ({ ...prev, max_score: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 max-[1px]:text-gray-200 mb-4">Questões</h4>
              {examForm.questions.map((question, index) => (
                <QuestionInput
                  key={index}
                  question={question}
                  index={index}
                  onChange={(field, value) => handleQuestionChange(index, field, value)}
                  onRemove={() => handleRemoveQuestion(index)}
                  className="mb-4"
                />
              ))}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              >
                Adicionar Questão
              </button>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:ring-2 focus:ring-sky-500/20 transition-colors font-medium"
            >
              Carregar Prova
            </button>
          </form>
        </Modal>

        <Modal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          title="Aprovar Matrícula"
        >
          <div className="space-y-4">
            <p>Deseja aprovar a matrícula selecionada?</p>
            <button
              onClick={handleApproveEnrollment}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Aprovar
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={isGradingModalOpen}
          onClose={() => setIsGradingModalOpen(false)}
          title="Corrigir Prova"
        >
          <form onSubmit={handleGradeExam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-300">ID da Matrícula</label>
              <input
                type="number"
                value={gradeForm.enrollment_id}
                onChange={(e) => setGradeForm((prev) => ({ ...prev, enrollment_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-300">Disciplina ID</label>
              <input
                type="number"
                value={gradeForm.discipline_id}
                onChange={(e) => setGradeForm((prev) => ({ ...prev, discipline_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-300">Período Acadêmico ID</label>
              <input
                type="number"
                value={gradeForm.academic_period_id}
                onChange={(e) => setGradeForm((prev) => ({ ...prev, academic_period_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-300">Nota Obtida</label>
              <input
                type="number"
                step="0.01"
                value={gradeForm.score}
                onChange={(e) => setGradeForm((prev) => ({ ...prev, score: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-300">Pontuação Máxima</label>
              <input
                type="number"
                step="0.01"
                value={gradeForm.max_score}
                onChange={(e) => setGradeForm((prev) => ({ ...prev, max_score: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 max-[1px]:text-gray-300">Tipo de Avaliação</label>
              <select
                value={gradeForm.evaluation_type}
                onChange={(e) => setGradeForm((prev) => ({ ...prev, evaluation_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-white max-[1px]:bg-slate-700 text-gray-900 max-[1px]:text-gray-100 border border-gray-300 max-[1px]:border-gray-600 focus:outline-none transition-colors"
                required
              >
                <option value="midterm">Intermediária</option>
                <option value="final">Final</option>
                <option value="makeup">Recuperação</option>
                <option value="continuous">Contínuo</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
            >
              Salvar Correção
            </button>
          </form>
        </Modal>
      </div>
    </div>
  );
}

export default AdminDashboardPage;