import React, { useState, useEffect } from 'react';
import StudentLayout from '../components/StudentLayout';
import { api } from '../lib/api';
import { BookOpen, Brain, Target, Loader2, AlertTriangle } from 'lucide-react';

// Função auxiliar para obter cookie por nome
const getCookie = (name) => {
  const nameEQ = `${name}=`;
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

const ContentMatrixPage = () => {
  const [enrollmentId, setEnrollmentId] = useState(null);
  const [matrices, setMatrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentCourseId, setStudentCourseId] = useState(null);
  const [error, setError] = useState(null);

  // Fetch access token and user data from cookies
  const accessToken = getCookie('access_token');
  let userData = null;

  // Parse userData from cookie
  try {
    const userDataString = getCookie('userData');
    if (userDataString) {
      userData = JSON.parse(userDataString);
    }
  } catch (err) {
    console.error('Erro ao parsear cookie userData:', err);
    setError('Erro ao carregar dados do usuário.');
  }

  // Set enrollmentId and courseId from userData
  useEffect(() => {
    if (userData && userData.enrollment_id && userData.course_id) {
      setEnrollmentId(parseInt(userData.enrollment_id, 10));
      setStudentCourseId(parseInt(userData.course_id, 10));
    } else {
      setLoading(false);
      setError('Dados de matrícula ou curso não encontrados.');
    }
  }, []);

  // Configure API headers with access token
  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      setError('Token de autenticação não encontrado.');
      setLoading(false);
    }
  }, [accessToken]);

  // Fetch content matrices for the course
  useEffect(() => {
    if (!studentCourseId || !enrollmentId || !accessToken) {
      return;
    }

    const fetchMatrices = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/content-matrices/by-course/${studentCourseId}`);
        const matrices = response.data.map((m) => ({
          ...m,
          competencies: Array.isArray(m.competencies)
            ? m.competencies
            : JSON.parse(m.competencies || '[]'),
          skills: Array.isArray(m.skills) ? m.skills : JSON.parse(m.skills || '[]'),
        }));

        setMatrices(matrices);
      } catch (error) {
        console.error('Erro ao buscar matrizes de conteúdo:', error);
        setError('Erro ao carregar matrizes curriculares.');
      } finally {
        setLoading(false);
      }
    };
    fetchMatrices();
  }, [studentCourseId, enrollmentId, accessToken]);

  if (!accessToken) {
    return (
      <StudentLayout enrollmentId={enrollmentId}>
        <div className="text-center bg-white p-10 rounded-lg shadow">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-slate-900">
            Sessão Expirada
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Por favor, faça login novamente para acessar esta página.
          </p>
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout enrollmentId={enrollmentId}>
        <div className="text-center bg-white p-10 rounded-lg shadow">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
          <h3 className="mt-2 text-lg font-medium text-slate-900">Erro</h3>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
      </StudentLayout>
    );
  }

  if (loading) {
    return (
      <StudentLayout enrollmentId={enrollmentId}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout enrollmentId={enrollmentId}>
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Matrizes Curriculares
        </h1>
        <p className="text-slate-600 mb-8">
          Consulte os temas, competências e habilidades do seu curso.
        </p>

        {matrices.length > 0 ? (
          <div className="space-y-6">
            {matrices.map((matrix) => (
              <div
                key={matrix.id}
                className="bg-white p-6 rounded-xl shadow-lg"
              >
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-sky-600 flex items-center">
                    <BookOpen className="mr-3 h-6 w-6" /> {matrix.theme}
                  </h2>
                  <p className="text-md font-medium text-slate-700 mt-1">
                    Curso: {matrix.course_name}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-600 mb-2 flex items-center">
                      <Brain className="mr-2 h-5 w-5 text-purple-500" />
                      Competências:
                    </h4>
                    {matrix.competencies && matrix.competencies.length > 0 ? (
                      <ul className="list-disc list-inside pl-2 space-y-1 text-sm text-slate-600">
                        {matrix.competencies.map((comp, i) => (
                          <li key={i}>{comp}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 italic">
                        Nenhuma competência listada.
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-600 mb-2 flex items-center">
                      <Target className="mr-2 h-5 w-5 text-green-500" />
                      Habilidades:
                    </h4>
                    {matrix.skills && matrix.skills.length > 0 ? (
                      <ul className="list-disc list-inside pl-2 space-y-1 text-sm text-slate-600">
                        {matrix.skills.map((skill, i) => (
                          <li key={i}>{skill}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 italic">
                        Nenhuma habilidade listada.
                      </p>
                    )}
                  </div>
                </div>

                {matrix.syllabus && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-slate-600 mb-2">
                      Ementa / Conteúdo Programático:
                    </h4>
                    <div className="prose prose-sm max-w-none text-slate-600 p-3 bg-slate-50 rounded-md whitespace-pre-wrap">
                      {matrix.syllabus}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center bg-white p-10 rounded-lg shadow">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="mt-2 text-lg font-medium text-slate-900">
              Nenhuma Matriz Encontrada
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Não há matrizes curriculares disponíveis para o seu curso no momento.
            </p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default ContentMatrixPage;