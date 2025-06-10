'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import StudentLayout from "@/components/StudentLayout";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { useRouter } from 'next/navigation';
import { api, fetchStudentPerformance, fetchUpcomingExams, fetchEnrollmentDetails, fetchDocumentsByEnrollment } from '@/lib/api';
import { Enrollment, PerformanceData } from '@/types';
import { UpcomingExamInfo } from '@/types';
import PerformanceBarChart from "@/components/PerfomanceBarChart";
import { AlertTriangle, CalendarDays, CheckCircle, FileText, ListChecks, Loader2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { logout } from '@/store/authSlice';

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
    blue: 'bg-sky-500 dark:bg-sky-600',
    green: 'bg-green-500 dark:bg-green-600',
    purple: 'bg-purple-500 dark:bg-purple-600',
    yellow: 'bg-yellow-500 dark:bg-yellow-600',
    red: 'bg-red-500 dark:bg-red-600',
    indigo: 'bg-indigo-500 dark:bg-indigo-600',
  };

  const content = (
    <div className={`p-5 rounded-xl shadow-lg text-white flex flex-col justify-between h-full ${colorClasses[color]} ${className}`}>
      <div>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold opacity-80">{title}</h3>
          <div className="p-2 bg-white/20 rounded-full">{icon}</div>
        </div>
        <p className="text-3xl font-bold mt-2">{value}</p>
      </div>
      {link && <div className="mt-4 text-sm opacity-90 hover:opacity-100">Ver mais →</div>}
    </div>
  );

  return link ? <Link href={link} className="block h-full">{content}</Link> : content;
};


const StudentDashboardPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, enrollment, isLoading: authLoading, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [details, setDetails] = useState<Enrollment | null>(null);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExamInfo[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loadingPageData, setLoadingPageData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  console.log(details)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading || !enrollment || !user) {
      if (!authLoading && isAuthenticated && !enrollment) {
        setError('Detalhes de inscrição não disponíveis. Entre em contacto com o suporte.');
        setLoadingPageData(false);
      }
      return;
    }

    const fetchData = async () => {
      console.log("INIT")
      setLoadingPageData(true);
      setError(null);
      try {
        if (!enrollment.id) {
          throw new Error('ID de inscrição não encontrado.');
        }

        const [detailsRes, performanceRes, documentsRes] = await Promise.all([
          fetchEnrollmentDetails(enrollment.id),
          fetchStudentPerformance(enrollment.id),
          fetchDocumentsByEnrollment(enrollment.id).catch(() => []),
        ]);

        setDetails(detailsRes);
        setPerformanceData(performanceRes || []);
        setTotalDocuments(documentsRes.length || 0);

        if (detailsRes?.course_id) {
          const examsRes = await fetchUpcomingExams(detailsRes.course_id);
          setUpcomingExams(examsRes || []);
        } else {
          setUpcomingExams([]);
        }
      } catch (err: any) {
        if (err.message.includes('Unauthorized') || err.message.includes('Invalid token')) {
          dispatch(logout());
          router.push('/login');
        }
        setError(err.message || 'Erro ao carregar dados do painel.');
      } finally {
        setLoadingPageData(false);
      }
    };

    fetchData();
  }, [enrollment, user, authLoading, isAuthenticated, dispatch, router]);

  if (authLoading || loadingPageData) {
    return (
      <StudentLayout enrollmentId={enrollment?.id?.toString()}>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    console.log(error)
    // return (
    //   <StudentLayout enrollmentId={enrollment?.id?.toString()}>
    //     <div className="flex flex-col justify-center items-center h-screen p-4 text-center">
    //       <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
    //       <h2 className="text-2xl font-semibold text-red-700 dark:text-red-400 mb-2">Erro no Painel</h2>
    //       <p className="text-slate-600 dark:text-slate-300 mb-6">{error}</p>
    //       <button onClick={() => router.refresh()} className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors">
    //         Tentar Novamente
    //       </button>
    //     </div>
    //   </StudentLayout>
    // );
  }

  if (!enrollment || !user) {
    return (
      <StudentLayout>
        <div className="flex justify-center items-center h-screen text-slate-600 dark:text-slate-300">
          Não foi possível carregar os dados do estudante.
        </div>
      </StudentLayout>
    );
  }

  const averageScore = performanceData.length > 0
    ? performanceData.reduce((acc, curr) => acc + (curr.score / curr.max_score) * 100, 0) / performanceData.length
    : 0;

  return (
    <StudentLayout enrollmentId={enrollment.id.toString()}>
      <div className="container mx-auto p-4  space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Bem-vindo, {details?.user?.first_name || user.first_name || 'Estudante'}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Este é o seu painel. Acompanhe o progresso de admissão
            <div>
              Status {details?.status === "pending"? "Em revisão":"Aprovado"}
            </div>
          </p>
        </div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
  <div className="h-full">
    <StatCard
      title="Curso Atual"
      value={details?.course?.name || 'N/A'}
      icon={<ListChecks className="w-7 h-7" />}
      color="indigo"
    />
  </div>
  {/* <div className="h-full">
    <StatCard
      title="Exames Próximos"
      value={upcomingExams.length}
      icon={<CalendarDays className="w-7 h-7" />}
      link="/student/exams"
      color="blue"
    />
  </div> */}
  <div className="h-full">
    <StatCard
      title="Média Geral"
      value={`${averageScore.toFixed(1)}%`}
      icon={<TrendingUp className="w-7 h-7" />}
      link="/student/performance"
      color="green"
    />
  </div>
  <div className="h-full">
    <StatCard
      title="Documentos Carregados"
      value={totalDocuments}
      icon={<FileText className="w-7 h-7" />}
      link="/student/documents"
      color="yellow"
    />
  </div>
</div>



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg h-full">
            <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Desempenho em Exames</h3>
            {performanceData.length > 0 ? (
              <PerformanceBarChart data={performanceData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <CheckCircle size={48} className="mb-4 opacity-50" />
                <p>Nenhum dado de desempenho disponível ainda.</p>
              </div>
            )}
          </div>
          {/* <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg h-full flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Exames Próximos</h3>
            {upcomingExams.length > 0 ? (
              <ul className="space-y-3 overflow-y-auto flex-grow">
                {upcomingExams.slice(0, 5).map(exam => (
                  <li key={exam.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:shadow-md transition-shadow">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{exam.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {exam.discipline_name || 'Disciplina não especificada'}
                    </p>
                    <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                      {new Date(exam.exam_date).toLocaleDateString('pt-AO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 flex-grow">
                <CalendarDays size={48} className="mb-4 opacity-50" />
                <p>Nenhum exame agendado em breve.</p>
              </div>
            )}
            <Link href="/student/exams" className="block mt-auto pt-4 text-center text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium">
              Ver Todos os Exames →
            </Link>
          </div> */}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboardPage;