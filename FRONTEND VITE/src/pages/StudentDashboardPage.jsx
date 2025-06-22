import { useState, useEffect } from 'react';
import StudentLayout from '../components/StudentLayout';
import { useNavigate } from 'react-router-dom';
import { api, fetchStudentPerformance, fetchUpcomingExams, fetchEnrollmentDetails, fetchDocumentsByEnrollment } from '../lib/api';
import PerformanceBarChart from "../components/PerfomanceBarChart";
import { CheckCircle, FileText, ListChecks, Loader2, TrendingUp } from 'lucide-react';

// Cookie utility functions (already defined in your code)
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
    blue: 'bg-sky-500 max-[1px]:bg-sky-600',
    green: 'bg-green-500 max-[1px]:bg-green-600',
    purple: 'bg-purple-500 max-[1px]:bg-purple-600',
    yellow: 'bg-yellow-500 max-[1px]:bg-yellow-600',
    red: 'bg-red-500 max-[1px]:bg-red-600',
    indigo: 'bg-indigo-500 max-[1px]:bg-indigo-600',
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

  return link ? <a href={link} className="block h-full">{content}</a> : content;
};

const StudentDashboardPage = () => {
  const navigate = useNavigate();
  
  const [details, setDetails] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loadingPageData, setLoadingPageData] = useState(true);
  const [error, setError] = useState(null);

  // Get auth data from cookies
  const token = getCookie('access_token');
  const userDataString = getCookie('userData');
  const enrollmentDataString = getCookie('enrollmentData');
  let user = null;
  let enrollment = null;

  // Parse user and enrollment data from cookies
  try {
    if (userDataString) user = JSON.parse(userDataString);
    if (enrollmentDataString) enrollment = JSON.parse(enrollmentDataString);
  } catch (err) {
    console.error('Error parsing cookie data:', err);
    removeCookie('access_token');
    removeCookie('userData');
    removeCookie('enrollmentData');
    navigate('/login');
  }

  const isAuthenticated = !!(token && user);
  const enrollmentId = enrollment?.id || user?.enrollment_id;

  // Redirect if not authenticated or no enrollment ID
  useEffect(() => {
    if (!isAuthenticated || !enrollmentId) {
      navigate('/login');
    }
  }, [isAuthenticated, enrollmentId, navigate]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !enrollmentId || !token) {
        return;
      }

      setLoadingPageData(true);
      setError(null);

      // Set API authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      try {
        const [detailsRes, performanceRes, documentsRes] = await Promise.all([
          fetchEnrollmentDetails(enrollmentId),
          fetchStudentPerformance(enrollmentId),
          fetchDocumentsByEnrollment(enrollmentId).catch(() => []),
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
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        if (err.message.includes('Unauthorized') || err.message.includes('Invalid token') || err.status === 401) {
          // Clear cookies on auth failure
          removeCookie('access_token');
          removeCookie('userData');
          removeCookie('enrollmentData');
          navigate('/login');
        } else {
          setError(err.message || 'Erro ao carregar dados do painel.');
        }
      } finally {
        setLoadingPageData(false);
      }
    };

    fetchData();
  }, [enrollmentId, token, isAuthenticated, navigate]);

  // Show loading spinner while page data is loading
  if (loadingPageData) {
    return (
      <StudentLayout enrollmentId={enrollmentId?.toString()}>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        </div>
      </StudentLayout>
    );
  }

  // Show error if not authenticated or no enrollment ID
  if (!isAuthenticated || !enrollmentId) {
    return (
      <StudentLayout>
        <div className="flex justify-center items-center h-screen text-slate-600 max-[1px]:text-slate-300">
          Não foi possível carregar os dados do estudante.
        </div>
      </StudentLayout>
    );
  }

  // Show error if data fetch failed
  if (error) {
    return (
      <StudentLayout enrollmentId={enrollmentId.toString()}>
        <div className="flex flex-col justify-center items-center h-screen text-slate-600 max-[1px]:text-slate-300">
          <p className="text-xl mb-4">Erro ao carregar dados:</p>
          <p className="text-sm bg-red-100 text-red-700 p-3 rounded">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky- Ceiling
600"
          >
            Tentar novamente
          </button>
        </div>
      </StudentLayout>
    );
  }

  const averageScore = performanceData.length > 0
    ? performanceData.reduce((acc, curr) => acc + (curr.score / curr.max_score) * 100, 0) / performanceData.length
    : 0;

  return (
    <StudentLayout enrollmentId={enrollmentId.toString()}>
      <div className="container mx-auto p-4 space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 max-[1px]:text-slate-100">
            Bem-vindo, {details?.user?.first_name || user?.first_name || 'Estudante'}!
          </h1>
          <p className="text-slate-600 max-[1px]:text-slate-400">
            Este é o seu painel. Acompanhe o progresso de admissão
            <div>
              Status: {details?.status === "pending" ? "Em revisão" : details?.status === "approved" ? "Aprovado" : "N/A"}
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
          <div className="lg:col-span-2 bg-white max-[1px]:bg-slate-800 p-6 rounded-xl shadow-lg h-full">
            <h3 className="text-xl font-semibold mb-4 text-slate-700 max-[1px]:text-slate-200">Desempenho em Exames</h3>
            {performanceData.length > 0 ? (
              <PerformanceBarChart data={performanceData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 max-[1px]:text-slate-400">
                <CheckCircle size={48} className="mb-4 opacity-50" />
                <p>Nenhum dado de desempenho disponível ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboardPage;