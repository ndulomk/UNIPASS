import React, { useState, useEffect, useMemo } from 'react';
import StudentLayout from '../components/StudentLayout.jsx';
import { fetchEnrollmentDetails, fetchExams, fetchStudentPerformance, fetchStudentResults } from '../lib/api.js';
import { CalendarDays, CheckSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import toast from 'react-hot-toast';

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

const StudentExamsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [allExams, setAllExams] = useState([]);
  const [performanceResults, setPerformanceResults] = useState([]);
  const [loadingPageData, setLoadingPageData] = useState(true);
  const [selectedExamForModal, setSelectedExamForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para gerenciar dados da página
  const [results, setResults] = useState([]); // Resultados acadêmicos
  const [enrollmentDetails, setEnrollmentDetails] = useState(null); // Detalhes da matrícula
  // Get auth data from Redux
  const { user, enrollment, isAuthenticated, isLoading: authLoading, token } = useSelector((state) => state.auth);

  // Fallback to cookies
  const accessToken = token || getCookie('access_token');
  let userData = user;
  let enrollmentData = enrollment;

  if (!userData) {
    try {
      const userDataString = getCookie('userData');
      if (userDataString) userData = JSON.parse(userDataString);
    } catch (err) {
      console.error('Error parsing userData cookie:', err);
    }
  }

  if (!enrollmentData) {
    try {
      const enrollmentDataString = getCookie('enrollmentData');
      if (enrollmentDataString) enrollmentData = JSON.parse(enrollmentDataString);
    } catch (err) {
      console.error('Error parsing enrollmentData cookie:', err);
    }
  }

  const enrollmentId = enrollmentData?.id || userData?.enrollment_id;
  const courseId = enrollmentData?.course_id;

  useEffect(() => {
    if (accessToken && enrollmentId) {
      // Chamar APIs para buscar resultados e detalhes da matrícula
      Promise.all([
        fetchStudentResults(enrollmentId, accessToken),
        fetchEnrollmentDetails(enrollmentId, accessToken),
      ])
        .then(([resultsData, enrollmentData]) => {
          setResults(resultsData || []);
          setEnrollmentDetails(enrollmentData);
        })
        .catch((err) => {
          console.error('Erro ao carregar dados:', err);
          setError(err.message || 'Falha ao carregar dados. Tente mais tarde.');
          toast.error(err.message || 'Erro ao carregar resultados.');
          // Tratar erro 401 (não autorizado)
          if (err.response?.status === 401 || err.message.includes('Unauthorized')) {
            dispatch(logout());
            removeCookie('access_token');
            removeCookie('userData');
            removeCookie('enrollmentData');
            removeCookie('candidateData');
            navigate('/login');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [accessToken, enrollmentId, navigate, dispatch]);

  useEffect(() => {
    // Check role-based access
    if (!authLoading && userData && userData.role !== 'student') {
      toast.error('Access denied. Student role required.');
      dispatch(logout());
      removeCookie('access_token');
      removeCookie('userData');
      removeCookie('enrollmentData');
      removeCookie('candidateData');
      navigate('/login');
      return;
    }

    // Check authentication and enrollment
    if (!authLoading && (!accessToken || !enrollmentId || !courseId)) {
      dispatch(logout());
      removeCookie('access_token');
      removeCookie('userData');
      removeCookie('enrollmentData');
      removeCookie('candidateData');
      navigate('/login');
      setLoadingPageData(false);
      return;
    }
  }, [authLoading, accessToken, userData, enrollmentId, courseId, navigate, dispatch]);

  useEffect(() => {
    if (accessToken && enrollmentId && courseId) {
      const fetchData = async () => {
        setLoadingPageData(true);
        try {
          const [examsRes, performanceRes] = await Promise.all([
            fetchExams(courseId, accessToken),
            fetchStudentPerformance(enrollmentId, accessToken),
          ]);
          setAllExams(examsRes || []);
          setPerformanceResults(performanceRes || []);
        } catch (error) {
          console.error('Erro ao carregar dados da página de exames:', error);
          toast.error(error.message || 'Erro ao carregar dados de exames.');
          if (error.response?.status === 401 || error.message.includes('Unauthorized')) {
            dispatch(logout());
            removeCookie('access_token');
            removeCookie('userData');
            removeCookie('enrollmentData');
            removeCookie('candidateData');
            navigate('/login');
          }
        } finally {
          setLoadingPageData(false);
        }
      };
      fetchData();
    }
  }, [accessToken, enrollmentId, courseId, navigate, dispatch]);

  const { upcomingExams, pastExams } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const categorizedExams = {
      upcomingExams: [],
      pastExams: [],
    };

    allExams.forEach((examFromApi) => {
      const examDate = new Date(examFromApi.exam_date);
      const disciplineName = examFromApi.discipline?.name || 'Disciplina Indefinida';

      const result = performanceResults.find(
        (r) =>
          r.exam_name === examFromApi.exam_name &&
          r.discipline_name === disciplineName &&
          new Date(r.exam_date).toISOString().split('T')[0] === examDate.toISOString().split('T')[0]
      );

      const examWithDetails = {
        ...examFromApi,
        result,
        discipline_name: disciplineName,
        duration: examFromApi.duration_minutes || examFromApi.duration || 60, // Fallback duration
        exam_type: examFromApi.type || 'objective', // Fallback type
      };

      if (examDate >= today && !result) {
        categorizedExams.upcomingExams.push(examWithDetails);
      } else {
        categorizedExams.pastExams.push(examWithDetails);
      }
    });

    categorizedExams.upcomingExams.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
    categorizedExams.pastExams.sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

    return categorizedExams;
  }, [allExams, performanceResults]);

  const openExamDetailsModal = (exam) => {
    setSelectedExamForModal(exam);
    setIsModalOpen(true);
  };

  const handleStartExam = (examId) => {
    navigate(`/student/exams/${examId}/take`);
  };

  if (!enrollmentId && accessToken && userData?.role === 'student') {
    return (
      <StudentLayout>
        <div className="container mx-auto p-4 md:p-8 text-center">
          <h1 className="text-2xl font-bold text-red-500 max-[1px]:text-red-400 mb-4">Matrícula não encontrada</h1>
          <p className="text-slate-600 max-[1px]:text-slate-300">
            Não foi possível encontrar os detalhes da sua matrícula ativa para carregar os exames. Por favor, entre em
            contato com a secretaria.
          </p>
        </div>
      </StudentLayout>
    );
  }
  console.log("RESULTADOS",results.length)
  if(results.length > 0){
    return (
      <StudentLayout>
        <div className="container mx-auto p-4 md:p-8 text-center">
          <h1 className="text-2xl font-bold text-red-500 max-[1px]:text-red-400 mb-4">Veja os seus Resultados na outra aba</h1>
          <p className="text-slate-600 max-[1px]:text-slate-300">Muito obrigado por usar a nossa plataforma
          </p>
        </div>
      </StudentLayout>
    )
  }
return (
  <StudentLayout enrollmentId={enrollmentId?.toString()}>
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 max-[1px]:text-slate-100">Meus Exames</h1>
        <p className="text-slate-600 max-[1px]:text-slate-400">Consulte seus exames agendados e resultados anteriores.</p>
      </div>
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-slate-700 max-[1px]:text-slate-200 flex items-center">
          <CalendarDays className="mr-3 h-7 w-7 text-sky-500" /> Próximos Exames
        </h2>
        {upcomingExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingExams.map((exam) => {
              const isExamDateToday = new Date(exam.exam_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
              
              return (
                <div
                  key={exam.id}
                  className="bg-white max-[1px]:bg-slate-800 p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-lg text-sky-600 max-[1px]:text-sky-400">{exam.name || exam.exam_name}</h3>
                    <p className="text-sm text-slate-500 max-[1px]:text-slate-400">{exam.discipline_name}</p>
                    <p className="text-sm text-gray-600 max-[1px]:text-gray-300">
                      Data:{' '}
                      {new Date(exam.exam_date).toLocaleDateString('pt-AO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-slate-600 max-[1px]:text-slate-300">Duração: {exam.duration} min</p>
                    <p className="text-xs mt-2 px-2 py-1 inline-block bg-sky-100 text-sky-700 max-[1px]:bg-sky-700 max-[1px]:text-sky-200 rounded-full">
                      {exam.exam_type}
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => handleStartExam(exam.id)}
                      disabled={new Date(exam.exam_date) > new Date() && !isExamDateToday}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-400 max-[1px]:disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                      Iniciar Prova
                    </button>
                    <button
                      onClick={() => openExamDetailsModal(exam)}
                      className="w-full text-sm text-sky-500 hover:underline"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 max-[1px]:text-slate-400 bg-white max-[1px]:bg-slate-800 p-6 rounded-lg shadow text-center">
            <AlertTriangle className="inline-block mr-2 h-5 w-5 text-yellow-500" />
            Nenhum exame agendado para os próximos dias.
          </p>
        )}
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-slate-700 max-[1px]:text-slate-200 flex items-center">
          <CheckSquare className="mr-3 h-7 w-7 text-green-500" /> Exames Realizados
        </h2>
        {pastExams.length > 0 ? (
          <div className="overflow-x-auto bg-white max-[1px]:bg-slate-800 p-1 rounded-xl shadow-lg">
            <table className="min-w-full">
              <thead className="bg-slate-50 max-[1px]:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 max-[1px]:text-slate-300 uppercase tracking-wider">
                    Exame
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 max-[1px]:text-slate-300 uppercase tracking-wider">
                    Disciplina
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 max-[1px]:text-slate-300 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 max-[1px]:text-slate-300 uppercase tracking-wider">
                    Pontuação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 max-[1px]:text-slate-300 uppercase tracking-wider">
                    Nota / Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 max-[1px]:text-slate-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 max-[1px]:divide-slate-700">
                {pastExams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-slate-50 max-[1px]:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 max-[1px]:text-slate-100">
                      {exam.name || exam.exam_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 max-[1px]:text-slate-300">
                      {exam.discipline_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 max-[1px]:text-slate-300">
                      {new Date(exam.exam_date).toLocaleDateString('pt-AO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 max-[1px]:text-slate-300">
                      {exam.result ? `${exam.result.score} / ${exam.result.max_score}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {exam.result ? (
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            parseFloat(exam.result.grade) >= 9.5
                              ? 'bg-green-100 text-green-800 max-[1px]:bg-green-700 max-[1px]:text-green-100'
                              : parseFloat(exam.result.grade) >= 0
                              ? 'bg-red-100 text-red-800 max-[1px]:bg-red-700 max-[1px]:text-red-100'
                              : 'bg-yellow-100 text-yellow-800 max-[1px]:bg-yellow-700 max-[1px]:text-yellow-100'
                          }`}
                        >
                          {parseFloat(exam.result.grade).toFixed(1)}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600 max-[1px]:bg-slate-600 max-[1px]:text-slate-200">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openExamDetailsModal(exam)}
                        className="text-sky-600 hover:text-sky-800 max-[1px]:text-sky-400 max-[1px]:hover:text-sky-300"
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 max-[1px]:text-slate-400 bg-white max-[1px]:bg-slate-800 p-6 rounded-lg shadow text-center">
            <AlertTriangle className="inline-block mr-2 h-5 w-5 text-yellow-500" />
            Nenhum exame realizado encontrado.
          </p>
        )}
      </section>
    </div>
  </StudentLayout>
);
};

export default StudentExamsPage;