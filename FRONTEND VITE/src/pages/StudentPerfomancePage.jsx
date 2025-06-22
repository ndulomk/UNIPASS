import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../components/StudentLayout.jsx';
import { fetchStudentPerformance } from '../lib/api.js';
import { Loader2, List } from 'lucide-react';
import toast from 'react-hot-toast';

// Função auxiliar para obter cookie por nome
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

// Função auxiliar para remover cookie
const removeCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict;Secure`;
};

const StudentPerformancePage = () => {
  const navigate = useNavigate();
  const [performanceData, setPerformanceData] = useState([]);
  const [loadingPageData, setLoadingPageData] = useState(true);

  // Obter dados de autenticação dos cookies
  const accessToken = getCookie('access_token');
  let userData = null;
  let enrollmentId = null;
  let userRole = null;

  // Obter userData do cookie
  try {
    const userDataString = getCookie('userData');
    if (userDataString) {
      userData = JSON.parse(userDataString);
      enrollmentId = userData?.enrollment_id;
      userRole = userData?.role; // Extrair role para evitar dependência de objeto
    }
  } catch (err) {
    console.error('Error parsing userData cookie:', err);
  }

  // Obter enrollmentId do cookie enrollmentData, se não estiver em userData
  if (!enrollmentId) {
    try {
      const enrollmentDataString = getCookie('enrollmentData');
      if (enrollmentDataString) {
        const enrollment = JSON.parse(enrollmentDataString);
        enrollmentId = enrollment?.id;
      }
    } catch (err) {
      console.error('Error parsing enrollmentData cookie:', err);
    }
  }

  useEffect(() => {
    // Verificar role-based access
    if (userRole && userRole !== 'student') {
      toast.error('Access denied. Student role required.');
      removeCookie('access_token');
      removeCookie('userData');
      removeCookie('enrollmentData');
      removeCookie('candidateData');
      navigate('/login');
      setLoadingPageData(false);
      return;
    }

    // Verificar autenticação
    if (!accessToken || !enrollmentId) {
      removeCookie('access_token');
      removeCookie('userData');
      removeCookie('enrollmentData');
      removeCookie('candidateData');
      navigate('/login');
      setLoadingPageData(false);
      return;
    }

    let isMounted = true; // Evitar atualizações em componente desmontado

    const loadPerformance = async () => {
      setLoadingPageData(true);
      try {
        const data = await fetchStudentPerformance(enrollmentId, accessToken);
        if (isMounted) {
          setPerformanceData(data || []);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erro ao buscar desempenho do estudante:", error);
          toast.error(error.message || 'Erro ao carregar dados de desempenho.');
          if (error.response?.status === 401 || error.message.includes('Unauthorized')) {
            removeCookie('access_token');
            removeCookie('userData');
            removeCookie('enrollmentData');
            removeCookie('candidateData');
            navigate('/login');
          }
        }
      } finally {
        if (isMounted) {
          setLoadingPageData(false);
        }
      }
    };

    loadPerformance();

    return () => {
      isMounted = false; // Cleanup para evitar race conditions
    };
  }, [accessToken, enrollmentId, navigate, userRole]); // Dependência em userRole em vez de userData

  if (loadingPageData) {
    return (
      <StudentLayout enrollmentId={enrollmentId?.toString()}>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        </div>
      </StudentLayout>
    );
  }

  if (!enrollmentId && userRole === 'student') {
    return (
      <StudentLayout>
        <div className="container mx-auto p-4 md:p-8 text-center">
          <h1 className="text-2xl font-bold text-red-500 max-[1px]:text-red-400 mb-4">Matrícula não encontrada</h1>
          <p className="text-slate-600 max-[1px]:text-slate-300">
            Não foi possível encontrar os detalhes da sua matrícula ativa. 
            Por favor, entre em contato com a secretaria.
          </p>
        </div>
      </StudentLayout>
    );
  }

  const averageScore = performanceData.length > 0
    ? performanceData.reduce((acc, curr) => acc + (curr.score / curr.max_score) * 100, 0) / performanceData.length
    : 0;

  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return 'text-green-600 max-[1px]:text-green-400';
    if (percentage >= 50) return 'text-yellow-600 max-[1px]:text-yellow-400';
    return 'text-red-600 max-[1px]:text-red-400';
  };

  return (
    <StudentLayout enrollmentId={enrollmentId?.toString()}>
      <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold text-slate-800 max-[1px]:text-slate-100 mb-2">Meu Desempenho</h1>
        <p className="text-slate-600 max-[1px]:text-slate-400 mb-8">Acompanhe suas notas e progresso nas disciplinas.</p>
        {performanceData.length === 0 ? (
          <div className="text-center py-10 bg-white max-[1px]:bg-slate-800 rounded-lg shadow">
            <List size={48} className="mx-auto text-slate-400 max-[1px]:text-slate-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 max-[1px]:text-slate-200">Nenhum resultado de prova encontrado.</h2>
            <p className="text-slate-500 max-[1px]:text-slate-400">Assim que realizar provas, seus resultados aparecerão aqui.</p>
          </div>
        ) : (
          <>
            <div className="mb-8 p-6 bg-white max-[1px]:bg-slate-800 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-slate-700 max-[1px]:text-slate-200 mb-1">Resumo Geral</h2>
              <p className={`text-4xl font-bold ${averageScore >= 75 ? 'text-green-500' : averageScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                Média: {averageScore.toFixed(1)}%
              </p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-600 max-[1px]:text-slate-200 mb-4">Detalhes das Provas</h2>
              <div className="bg-white max-[1px]:bg-slate-800 rounded-lg shadow-lg">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 max-[1px]:border-gray-400">
                      <th className="p-4 text-left text-sm font-medium text-slate-700 max-[1px]:text-slate-200">Prova</th>
                      <th className="p-4 text-left text-sm font-medium text-slate-700 max-[1px]:text-slate-200">Data</th>
                      <th className="p-4 text-right text-sm font-medium text-slate-700 max-[1px]:text-slate-200">Pontuação</th>
                      <th className="p-4 text-right text-sm font-medium text-slate-700 max-[1px]:text-slate-200">Nota Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.map((perf, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 max-[1px]:border-gray-700 hover:bg-gray-50 max-[1px]:hover:bg-gray-700/30"
                      >
                        <td className="p-4 text-slate-700 max-[1px]:text-slate-200">{perf.exam_name}</td>
                        <td className="p-4 text-slate-600 max-[1px]:text-slate-400">
                          {new Date(perf.exam_date).toLocaleDateString('pt-AO')}
                        </td>
                        <td className={`p-4 text-right ${getScoreColor(perf.score, perf.max_score)}`}>
                          {perf.score} / {perf.max_score}
                        </td>
                        <td
                          className={`p-4 text-right font-semibold ${
                            parseFloat(perf.score) >= 9.5
                              ? 'text-green-600 max-[1px]:text-green-400'
                              : 'text-red-600 max-[1px]:text-red-400'
                          }`}
                        >
                          {parseFloat(perf.score).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentPerformancePage;