'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { useRouter } from 'next/navigation';
import {
  fetchSystemStats,
  fetchRecentCandidates,
  fetchUpcomingExams,
  uploadExam,
  approveEnrollment,
  gradeExam,
  fetchCourses,
  fetchDisciplinesByCourse,
} from '@/lib/api';
import { SystemStats, RecentCandidateInfo, UpcomingExamInfo, QuestionFormData, Course, Discipline } from '@/types';
import { logout } from '@/store/authSlice';
import Link from 'next/link';
import { AlertTriangle, CalendarDays, Loader2, Users, FileCheck, Edit3 } from 'lucide-react';
import Modal from '@/components/Modal';
import QuestionInput from '@/app/(dashboard)/admin/addExam/QuestionInput';
import toast from 'react-hot-toast';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'indigo';
  link?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'blue', link, className }) => {
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
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border-l-4 ${colorClasses[color]} hover:shadow-xl transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-slate-50 dark:bg-slate-700 ${iconColorClasses[color]}`}>
          {icon}
        </div>
      </div>
      {link && (
        <div className="mt-4 flex items-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <span>Ver mais</span>
          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  if (link) {
    return <Link href={link} className="block h-full"><CardContent /></Link>;
  }
  return <CardContent />;
};

interface ExamFormData {
  name: string;
  discipline_id: string;
  course_id: string;
  academic_period_id: string;
  exam_date: string;
  duration_minutes: string;
  type: 'objective' | 'discursive' | 'mixed';
  max_score: string;
  questions: QuestionFormData[];
}

const AdminDashboardPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading: authLoading, isAuthenticated, token } = useSelector((state: RootState) => state.auth);

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [recentCandidates, setRecentCandidates] = useState<RecentCandidateInfo[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for exam upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [examForm, setExamForm] = useState<ExamFormData>({
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

  // States for enrollment approval
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // States for grading exams
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [gradeForm, setGradeForm] = useState({
    enrollment_id: '',
    score: '',
    max_score: '',
    evaluation_type: 'final' as 'midterm' | 'final' | 'makeup' | 'continuous',
    discipline_id: '',
    academic_period_id: '',
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !token)) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, token, router]);

  useEffect(() => {
    if (authLoading || !user || !token) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [stats, candidates, exams] = await Promise.all([
          fetchSystemStats().catch(() => null),
          fetchRecentCandidates().catch(() => []),
          fetchUpcomingExams().catch(() => []),
        ]);
        setSystemStats(stats);
        setRecentCandidates(candidates);
        setUpcomingExams(exams);
      } catch (err: any) {
        if (err.message.includes('Unauthorized') || err.message.includes('Invalid token')) {
          dispatch(logout());
          router.push('/login');
        }
        setError(err.message || 'Erro ao carregar dados do painel.');
        console.error('Erro no painel admin:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, isAuthenticated, token, dispatch, router]);

  // Fetch courses
  useEffect(() => {
    async function loadCourses() {
      try {
        setIsLoadingCourses(true);
        const fetchedCourses = await fetchCourses();
        setCourses(fetchedCourses ?? []);
      } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        toast.error('Falha ao carregar cursos.');
      } finally {
        setIsLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

  // Fetch disciplines based on selected course
  useEffect(() => {
    async function loadDisciplines() {
      if (!examForm.course_id) {
        setDisciplines([]);
        setExamForm((prev) => ({ ...prev, discipline_id: '' }));
        return;
      }
      try {
        setIsLoadingDisciplines(true);
        const courseIdNum = parseInt(examForm.course_id as string, 10);
        const fetchedDisciplines = await fetchDisciplinesByCourse(courseIdNum);
        setDisciplines(fetchedDisciplines ?? []);
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        toast.error('Falha ao carregar disciplinas.');
      } finally {
        setIsLoadingDisciplines(false);
      }
    }
    loadDisciplines();
  }, [examForm.course_id]);

  // Handle adding a new question
  const handleAddQuestion = () => {
    setExamForm({
      ...examForm,
      questions: [
        ...examForm.questions,
        {
          text: '',
          type: 'multiple_choice' as 'multiple_choice' | 'true_false' | 'essay',
          options: '',
          correct_answer: '',
          score: 0,
        },
      ],
    });
  };

  // Handle question field changes
  const handleQuestionChange = (index: number, field: keyof QuestionFormData, value: string | number) => {
    const updatedQuestions = [...examForm.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setExamForm({ ...examForm, questions: updatedQuestions });
  };

  // Handle removing a question
  const handleRemoveQuestion = (index: number) => {
    setExamForm({
      ...examForm,
      questions: examForm.questions.filter((_, i) => i !== index),
    });
  };

  // Handle exam submission
  const handleExamSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar prova.');
      toast.error(err.message || 'Erro ao carregar prova.');
    }
  };

  // Handle enrollment approval
  const handleApproveEnrollment = async () => {
    if (!selectedEnrollmentId) return;
    try {
      await approveEnrollment(selectedEnrollmentId, { status: 'approved' });
      setIsApprovalModalOpen(false);
      setSelectedEnrollmentId(null);
      const candidates = await fetchRecentCandidates();
      setRecentCandidates(candidates);
      toast.success('Matrícula aprovada com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao aprovar matrícula.');
      toast.error(err.message || 'Erro ao aprovar matrícula.');
    }
  };

  // Handle exam grading
  const handleGradeExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;
    try {
      await gradeExam({
        exam_id: selectedExamId,
        enrollment_id: parseInt(gradeForm.enrollment_id),
        discipline_id: parseInt(gradeForm.discipline_id),
        academic_period_id: parseInt(gradeForm.academic_period_id),
        score: parseFloat(gradeForm.score),
        max_score: parseFloat(gradeForm.max_score),
        evaluation_type: gradeForm.evaluation_type,
      });
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
    } catch (err: any) {
      setError(err.message || 'Erro ao corrigir prova.');
      toast.error(err.message || 'Erro ao corrigir prova.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 dark:text-red-400 mb-2">Erro no Painel</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{error}</p>
        <button
          onClick={() => router.refresh()}
          className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen text-slate-600 dark:text-slate-300">
        Não foi possível carregar os dados do administrador.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Bem-vindo, {user.first_name || 'Administrador'}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
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
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border-l nick border-l-slate-400">
            <h3 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-200">Ações Administrativas</h3>
            <div className="space-y-4">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full p-4 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Edit3 className="w-5 h-5" /> Carregar Nova Prova
              </button>
              <Link
                href="/admin/candidatos"
                className="w-full p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Users className="w-5 h-5" /> Gerenciar Matrículas
              </Link>
              <Link
                href="/admin/resultados"
                className="w-full p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FileCheck className="w-5 h-5" /> Corrigir Provas
              </Link>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border-l-4 border-l-sky-400 flex flex-col">
            <h3 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-200">Próximas Provas</h3>
            {upcomingExams.length > 0 ? (
              <ul className="space-y-4 overflow-y-auto flex-grow">
                {upcomingExams.slice(0, 5).map((exam) => (
                  <li
                    key={exam.id}
                    className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:shadow-md transition-all duration-300 border-l-2 border-l-sky-300"
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-100">{exam.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{exam.discipline_name}</p>
                    <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
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
              <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 flex-grow">
                <CalendarDays size={48} className="mb-4 opacity-50" />
                <p>Nenhuma prova agendada.</p>
              </div>
            )}
            <Link
              href="/admin/agendamentos"
              className="block mt-auto pt-4 text-center text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium transition-colors"
            >
              Ver Todas as Provas →
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border-l-4 border-l-green-400">
          <h3 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-200">Últimos Candidatos</h3>
          {recentCandidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-3 px-2 font-medium text-slate-700 dark:text-slate-300">Nome</th>
                    <th className="py-3 px-2 font-medium text-slate-700 dark:text-slate-300">Curso</th>
                    <th className="py-3 px-2 font-medium text-slate-700 dark:text-slate-300">Status</th>
                    <th className="py-3 px-2 font-medium text-slate-700 dark:text-slate-300">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCandidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-2 text-slate-800 dark:text-slate-200">
                        {candidate.first_name} {candidate.last_name}
                      </td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{candidate.course_name}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            candidate.enrollment_status === 'approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : candidate.enrollment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {candidate.enrollment_status === 'approved'
                            ? 'Aprovado'
                            : candidate.enrollment_status === 'pending'
                            ? 'Pendente'
                            : 'Rejeitado'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {candidate.enrollment_status === 'pending' && (
                          <button
                            onClick={() => {
                              setSelectedEnrollmentId(candidate.id);
                              setIsApprovalModalOpen(true);
                            }}
                            className="text-xs text-green-600 hover:text-green-700 transition-colors"
                          >
                            Aprovar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
              <Users size={48} className="mb-4 opacity-50" />
              <p>Nenhum candidato recente.</p>
            </div>
          )}
        </div>

        {/* Modal for Uploading Exam */}
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title="Carregar Nova Prova"
          className="max-w-3xl w-full"
        >
          <form onSubmit={handleExamSubmit} className="space-y-6 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome da Prova</label>
              <input
                type="text"
                value={examForm.name}
                onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                placeholder="Nome da prova"
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Curso</label>
              <select
                name="course_id"
                value={examForm.course_id}
                onChange={(e) => setExamForm({ ...examForm, course_id: e.target.value, discipline_id: '' })}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Disciplina</label>
              <select
                value={examForm.discipline_id}
                onChange={(e) => setExamForm({ ...examForm, discipline_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Período Acadêmico ID</label>
              <input
                type="number"
                value={examForm.academic_period_id}
                onChange={(e) => setExamForm({ ...examForm, academic_period_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data da Prova</label>
              <input
                type="datetime-local"
                value={examForm.exam_date}
                onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Duração (minutos)</label>
              <input
                type="number"
                value={examForm.duration_minutes}
                onChange={(e) => setExamForm({ ...examForm, duration_minutes: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipo</label>
              <select
                value={examForm.type}
                onChange={(e) =>
                  setExamForm({ ...examForm, type: e.target.value as 'objective' | 'discursive' | 'mixed' })
                }
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              >
                <option value="objective">Objetiva</option>
                <option value="discursive">Discursiva</option>
                <option value="mixed">Mista</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Pontuação Máxima</label>
              <input
                type="number"
                value={examForm.max_score}
                onChange={(e) => setExamForm({ ...examForm, max_score: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-colors"
                required
              />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-4">Questões</h4>
              {examForm.questions.map((question, index) => (
                <QuestionInput
                  key={index}
                  question={question}
                  index={index}
                  onChange={handleQuestionChange}
                  onRemove={handleRemoveQuestion}
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

        {/* Modal for Approving Enrollment */}
        <Modal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          title="Aprovar Matrícula"
        >
          <div className="space-y-4">
            <p>Deseja aprovar a matrícula selecionada?</p>
            <button
              onClick={handleApproveEnrollment}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Aprovar
            </button>
          </div>
        </Modal>

        {/* Modal for Grading Exam */}
        <Modal isOpen={isGradingModalOpen} onClose={() => setIsGradingModalOpen(false)} title="Corrigir Prova">
          <form onSubmit={handleGradeExam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID da Matrícula</label>
              <input
                type="number"
                value={gradeForm.enrollment_id}
                onChange={(e) => setGradeForm({ ...gradeForm, enrollment_id: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-white/10 text-white border border-white/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Disciplina ID</label>
              <input
                type="number"
                value={gradeForm.discipline_id}
                onChange={(e) => setGradeForm({ ...gradeForm, discipline_id: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-white/10 text-white border border-white/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Período Acadêmico ID</label>
              <input
                type="number"
                value={gradeForm.academic_period_id}
                onChange={(e) => setGradeForm({ ...gradeForm, academic_period_id: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-white/10 text-white border border-white/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nota Obtida</label>
              <input
                type="number"
                step="0.01"
                value={gradeForm.score}
                onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-white/10 text-white border border-white/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pontuação Máxima</label>
              <input
                type="number"
                step="0.01"
                value={gradeForm.max_score}
                onChange={(e) => setGradeForm({ ...gradeForm, max_score: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-white/10 text-white border border-white/10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Avaliação</label>
              <select
                value={gradeForm.evaluation_type}
                onChange={(e) =>
                  setGradeForm({
                    ...gradeForm,
                    evaluation_type: e.target.value as 'midterm' | 'final' | 'makeup' | 'continuous',
                  })
                }
                className="w-full px-3 py-2 rounded-md bg-white/10 text-white border border-white/10"
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
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
            >
              Salvar Correção
            </button>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default AdminDashboardPage;