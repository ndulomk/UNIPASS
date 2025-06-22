import  { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudentResults, fetchEnrollmentDetails } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import StudentLayout from '../components/StudentLayout.jsx';
import { Loader2, AlertTriangle, UserCircle, Printer } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
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

// Função para formatar datas no formato pt-AO
const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return "N/A";
  const options = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  try {
    return new Date(dateString).toLocaleDateString('pt-AO', options);
  } catch (e) {
    return "Data inválida";
  }
};

const StudentResultsPage = () => {
  // Hooks para navegação e Redux
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Estados para gerenciar dados da página
  const [results, setResults] = useState([]); // Resultados acadêmicos
  const [enrollmentDetails, setEnrollmentDetails] = useState(null); // Detalhes da matrícula
  const [loading, setLoading] = useState(true); // Estado de carregamento
  const [error, setError] = useState(null); // Mensagem de erro
  const [isModalOpen, setIsModalOpen] = useState(false); // Controle do modal

  // Obter dados de autenticação do Redux
  const { user, enrollment, isAuthenticated, isLoading: authLoading, token } = useSelector((state) => state.auth);

  // Fallback para cookies
  // Priorizar token e dados do Redux, mas usar cookies se necessário
  const accessToken = token || getCookie('access_token');
  let userData = user;
  let enrollmentData = enrollment;

  // Obter userData do cookie se não estiver no Redux
  if (!userData) {
    try {
      const userDataString = getCookie('userData');
      if (userDataString) userData = JSON.parse(userDataString);
    } catch (err) {
      console.error('Erro ao parsear cookie userData:', err);
    }
  }

  // Obter enrollmentData do cookie se não estiver no Redux
  if (!enrollmentData) {
    try {
      const enrollmentDataString = getCookie('enrollmentData');
      if (enrollmentDataString) enrollmentData = JSON.parse(enrollmentDataString);
    } catch (err) {
      console.error('Erro ao parsear cookie enrollmentData:', err);
    }
  }

  // Derivar enrollmentId dos dados disponíveis
  const enrollmentId = enrollmentData?.id || userData?.enrollment_id;

  // Efeito para verificar autenticação e acesso
  useEffect(() => {
    // Verificar se a autenticação está carregando
    if (authLoading) return;

    // Verificar se o usuário tem a role 'student'
    if (userData && userData.role !== 'student') {
      toast.error('Acesso negado. Requer-se a role de estudante.');
      dispatch(logout());
      removeCookie('access_token');
      removeCookie('userData');
      removeCookie('enrollmentData');
      removeCookie('candidateData');
      navigate('/login');
      return;
    }

    // Verificar se há token e enrollmentId válidos
    if (!accessToken || !enrollmentId) {
      dispatch(logout());
      removeCookie('access_token');
      removeCookie('userData');
      removeCookie('enrollmentData');
      removeCookie('candidateData');
      navigate('/login');
      setLoading(false);
      setError('Autenticação ou matrícula inválida. Faça login novamente.');
      return;
    }
  }, [authLoading, accessToken, userData, enrollmentId, navigate, dispatch]);

  // Efeito para carregar dados da matrícula e resultados
  useEffect(() => {
    if (accessToken && enrollmentId) {
      setLoading(true);
      setError(null);
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

  // Função para definir classes do status da nota
  const getStatusPillClass = (grade) => {
    const numericGrade = typeof grade === 'string' ? parseFloat(grade.replace(',', '.')) : grade;
    if (numericGrade >= 9.5) {
      return 'bg-green-500/20 text-green-300 border border-green-500';
    }
    return 'bg-red-500/20 text-red-300 border border-red-500';
  };

  // Função para definir cor da pontuação
  const getScoreColor = (score) => {
    if (score >= 9.5) return 'text-green-400';
    if (score >= 7) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Renderizar estado de carregamento
  if (loading) {
    return (
      <StudentLayout enrollmentId={enrollmentId?.toString()}>
        <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mb-4" />
          <p className="text-xl text-blue-300">A carregar os seus resultados...</p>
        </div>
      </StudentLayout>
    );
  }

  // Renderizar mensagem de erro
  if (error) {
    return (
      <StudentLayout enrollmentId={enrollmentId?.toString()}>
        <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
          <AlertTriangle className="h-16 w-16 text-red-400 mb-4" />
          <p className="text-red-300 text-xl mb-2">Oops! Algo correu mal.</p>
          <p className="text-gray-400 text-center mb-6">{error}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Ir para o Painel
          </button>
        </div>
      </StudentLayout>
    );
  }

  // Renderizar página principal
  return (
    <StudentLayout enrollmentId={enrollmentId?.toString()}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-950 p-4 md:p-8 text-gray-100">
        <div className="max-w-5xl mx-auto">
          {/* Cabeçalho com título e botões */}
          <header className="flex flex-col sm:flex-row justify-between items-center mb-10 pb-6 border-b border-gray-700">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Meus Resultados Académicos
              </h1>
              {enrollmentDetails && (
                <p className="text-gray-400 mt-1">
                  Estudante: {enrollmentDetails.user.first_name} {enrollmentDetails.user.last_name} {/* Changed from candidate to user */}
                </p>
              )}
            </div>
            <div className="flex items-center gap-x-3 mt-4 sm:mt-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <UserCircle size={18} />
                Ver Meus Dados
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg transition-colors flex items-center gap-2"
              >
                <Printer size={18} />
                Imprimir
              </button>
            </div>
          </header>
          {/* Lista de resultados ou mensagem de vazio */}
          {results.length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-md p-10 rounded-xl border border-gray-700 text-center shadow-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-blue-400 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-7.034 3.775a3.375 3.375 0 00-.569-5.545l-3.009-2.634a3.375 3.375 0 00-5.545.569m3.009 2.634l3.01 2.634m0 0l2.25 2.25m-2.25-2.25l-2.25-2.25"
                />
              </svg>
              <p className="text-xl text-gray-300">Ainda não há resultados de provas disponíveis.</p>
              <p className="text-gray-400 mt-2">Por favor, verifique mais tarde ou contacte a secretaria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-gray-800/60 backdrop-blur-lg p-6 rounded-xl border border-gray-700 shadow-2xl flex flex-col justify-between hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-400 leading-tight">
                        {result.exam_name}
                      </h2>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusPillClass(result.score)}`}> {/* Changed from grade to score */}
                        {result.score.toFixed(2)} {/* Changed from grade to score */}
                      </span>
                    </div>
                    <div className="text-sm space-y-1 mb-4 text-gray-300">
                      <p>
                        <span className="font-medium text-gray-400">Curso:</span> {result.course_name}
                      </p>
                      {/* Removed discipline_name since it's not in the backend response */}
                      <p>
                        <span className="font-medium text-gray-400">Data da Prova:</span> {formatDate(result.exam_date)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-700 flex justify-between items-baseline">
                    <p className="text-sm text-gray-400">Nota (0-20):</p>
                    <div className="text-right">
                      <span className={`text-4xl font-extrabold ${getScoreColor(result.score)}`}> {/* Changed from total_score_obtained to score */}
                        {result.score.toFixed(2)} {/* Changed from total_score_obtained to score */}
                      </span>
                      <span className="text-lg text-gray-500"> / {result.max_score}</span> {/* Changed from max_score_possible to max_score */}
                    </div>
                  </div>
                  {result.updated_at && ( // Changed from graded_at to updated_at
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      Corrigido em: {formatDate(result.updated_at, true)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Modal para exibir detalhes da matrícula */}
        {enrollmentDetails && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Meus Dados de Matrícula">
            <div className="space-y-3 text-gray-800">
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-800">Nome Completo</p>
                <p className="font-semibold text-lg">
                  {enrollmentDetails.user.first_name} {enrollmentDetails.user.last_name} {/* Changed from candidate to user */}
                </p>
              </div>
              <div className="p-4 bg-gray-200/50 rounded-lg">
                <p className="text-xs text-gray-800">Email</p>
                <p>{enrollmentDetails.user.email}</p> {/* Changed from candidate to user */}
              </div>
              <div className="p-4 bg-gray-200/50 rounded-lg">
                <p className="text-xs text-gray-800">Telefone</p>
                <p>{enrollmentDetails.user.phone || 'Não fornecido'}</p> {/* Changed from candidate to user */}
              </div>
              <hr className="border-gray-600 my-4" />
              <div className="p-4 bg-gray-200/50 rounded-lg">
                <p className="text-xs text-gray-800">Curso Matriculado</p>
                <p className="font-semibold">{enrollmentDetails.course.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-200/50 rounded-lg">
                  <p className="text-xs text-gray-800">ID Matrícula</p>
                  <p>{enrollmentDetails.id}</p>
                </div>
                <div className="p-3 bg-gray-200/50 rounded-lg">
                  <p className="text-xs text-gray-800">Data Matrícula</p>
                  <p>{formatDate(enrollmentDetails.enrolled_at)}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-200/50 rounded-lg">
                <p className="text-xs text-gray-800">Status da Matrícula</p>
                <p
                  className={`font-medium ${
                    enrollmentDetails.status === 'approved' || enrollmentDetails.status === 'ativo'
                      ? 'text-green-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {enrollmentDetails.status || 'N/A'}
                </p>
              </div>
              {enrollmentDetails.code && ( // Changed from cod to code
                <div className="p-4 bg-gray-200/50 rounded-lg">
                  <p className="text-xs text-gray-800">Código (COD)</p>
                  <p>{enrollmentDetails.code}</p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentResultsPage;