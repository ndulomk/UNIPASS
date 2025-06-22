import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { AlertTriangle, BookOpen, CheckCircle, Loader2, PlusCircle } from 'lucide-react';

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

const CreateContentMatrixPage = () => {
  const [accessToken, setAccessToken] = useState(getCookie('access_token'));
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    course_id: '',
    theme: '',
    competencies: [''],
    skills: [''],
    syllabus: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fetchingCourses, setFetchingCourses] = useState(true);

  // Configure API headers with access token
  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      setError('Token de autenticação não encontrado. Faça login novamente.');
      setFetchingCourses(false);
    }
  }, [accessToken]);

  // Fetch courses for dropdown
  useEffect(() => {
    if (!accessToken) return;

    const fetchCourses = async () => {
      setFetchingCourses(true);
      try {
        const response = await api.get('/courses');
        setCourses(response.data);
      } catch (err) {
        console.error('Erro ao buscar cursos:', err);
        setError('Erro ao carregar cursos. Tente novamente.');
      } finally {
        setFetchingCourses(false);
      }
    };
    fetchCourses();
  }, [accessToken]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle array inputs (competencies, skills)
  const handleArrayInputChange = (index, value, field) => {
    setFormData((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  // Add new input for competencies or skills
  const addArrayInput = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  // Remove input from competencies or skills
  const removeArrayInput = (index, field) => {
    setFormData((prev) => {
      const newArray = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: newArray };
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Validate form
    if (!formData.course_id || !formData.theme) {
      setError('Curso e tema são obrigatórios.');
      setLoading(false);
      return;
    }

    const competencies = formData.competencies.filter((c) => c.trim());
    const skills = formData.skills.filter((s) => s.trim());

    if (competencies.length === 0 && skills.length === 0) {
      setError('Adicione pelo menos uma competência ou habilidade.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/content-matrices', {
        course_id: parseInt(formData.course_id, 10),
        theme: formData.theme,
        competencies,
        skills,
        syllabus: formData.syllabus || null,
      });
      setSuccess('Matriz curricular criada com sucesso!');
      // Reset form
      setFormData({
        course_id: '',
        theme: '',
        competencies: [''],
        skills: [''],
        syllabus: '',
      });
    } catch (err) {
      console.error('Erro ao criar matriz:', err);
      if (err.response?.status === 400) {
        setError(err.response.data.message || 'Dados inválidos. Verifique os campos.');
      } else {
        setError('Erro ao criar matriz curricular. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="text-center bg-white p-10 rounded-lg shadow">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-lg font-medium text-slate-900">
          Sessão Expirada
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Por favor, faça login novamente para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 flex items-center">
        <BookOpen className="mr-2 h-6 w-6 text-sky-600" />
        Criar Matriz Curricular
      </h1>
      <p className="text-slate-600 mb-6">
        Preencha os detalhes para adicionar uma nova matriz curricular a um curso.
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {fetchingCourses ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course Selection */}
          <div>
            <label htmlFor="course_id" className="block text-sm font-medium text-slate-700 mb-1">
              Curso
            </label>
            <select
              id="course_id"
              name="course_id"
              value={formData.course_id}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              required
            >
              <option value="">Selecione um curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-slate-700 mb-1">
              Tema
            </label>
            <input
              id="theme"
              name="theme"
              type="text"
              value={formData.theme}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Ex.: Fundamentos de Programação"
              required
            />
          </div>

          {/* Competencies */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Competências
            </label>
            {formData.competencies.map((comp, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  value={comp}
                  onChange={(e) => handleArrayInputChange(index, e.target.value, 'competencies')}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder={`Competência ${index + 1}`}
                />
                {formData.competencies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayInput(index, 'competencies')}
                    className="ml-2 p-2 text-red-500 hover:text-red-700"
                    aria-label="Remover competência"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayInput('competencies')}
              className="mt-2 flex items-center text-sky-600 hover:text-sky-800"
            >
              <PlusCircle className="h-5 w-5 mr-1" />
              Adicionar Competência
            </button>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Habilidades
            </label>
            {formData.skills.map((skill, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  value={skill}
                  onChange={(e) => handleArrayInputChange(index, e.target.value, 'skills')}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder={`Habilidade ${index + 1}`}
                />
                {formData.skills.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayInput(index, 'skills')}
                    className="ml-2 p-2 text-red-500 hover:text-red-700"
                    aria-label="Remover habilidade"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayInput('skills')}
              className="mt-2 flex items-center text-sky-600 hover:text-sky-800"
            >
              <PlusCircle className="h-5 w-5 mr-1" />
              Adicionar Habilidade
            </button>
          </div>

          {/* Syllabus */}
          <div>
            <label htmlFor="syllabus" className="block text-sm font-medium text-slate-700 mb-1">
              Ementa / Conteúdo Programático
            </label>
            <textarea
              id="syllabus"
              name="syllabus"
              value={formData.syllabus}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              rows={5}
              placeholder="Descreva o conteúdo programático da matriz..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Criar Matriz
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateContentMatrixPage;