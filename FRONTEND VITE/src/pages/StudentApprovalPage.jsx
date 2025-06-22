import { useState, useEffect } from 'react';
import { User, GraduationCap, CheckCircle, XCircle, Clock, Loader2, FileText, Download, Eye, UserCheck, UserX, AlertTriangle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getCookie } from '../lib/api'; // Adjust path to your API service module
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 15; // Adjusted to match your preference

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return 'Data inválida';
  }
};

export default function StudentApprovalPage() {
  const [studentsData, setStudents] = useState([]);
  const [loading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDocuments, setStudentDocuments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const translateStatus = (status) => {
    const statusMap = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      canceled: 'Cancelado',
      active: 'Ativo',
    };
    return statusMap[status?.toLowerCase()] || status || 'N/A';
  };

  useEffect(() => {
    const fetchStudents = async () => {
      const token = getCookie('access_token');
      console.debug('Fetching students - Token:', token ? 'Present' : 'Absent');

      if (!token) {
        console.warn('No access token found, redirecting to login');
        setError('Sessão expirada. Faça login novamente.');
        // Uncomment in production to redirect
        // removeCookie('access_token');
        // removeCookie('userData');
        // window.location.href = '/login';
        return;
      }

      try {
        console.debug('Fetching students from /api/users');
        const response = await api.get('/users');
        const data = response.data;
        console.debug('Students fetched:', data);

        setStudents(data || []);
        setTotalPages(Math.ceil(data.length / ITEMS_PER_PAGE));
      } catch (err) {
        console.error('Error fetching students:', err);
        const message = err.response?.data?.message || err.response?.data?.detail || 'Erro ao buscar candidatos';
        setError(message);

        if (err.response?.status === 401) {
          console.warn('Unauthorized access, clearing cookies');
          // Uncomment in production
          // removeCookie('access_token');
          // removeCookie('userData');
          // window.location.href = '/login';
          toast.error('Sessão expirada. Faça login novamente.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const fetchDocumentsByEnrollment = async (enrollmentId) => {
    console.debug('Fetching documents for enrollment ID:', enrollmentId);
    try {
      const response = await api.get(`/enrollments/${enrollmentId}/documents`);
      console.debug('Documents fetched:', response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching documents:', err);
      const message = err.response?.data?.message || 'Failed to fetch documents';
      throw new Error(message);
    }
  };

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return studentsData.slice(startIndex, endIndex);
  };

  const handlePageChange = (page) => {
    console.debug('Changing to page:', page);
    setCurrentPage(page);
  };

  const handleViewDetails = async (student) => {
    console.debug('Viewing details for student:', student.id);
    setLoadingDetails(true);
    setIsModalOpen(true);
    setSelectedStudent(student);

    try {
      if (student.enrollments?.length > 0) {
        const enrollmentId = student.enrollments[0].id;
        const documents = await fetchDocumentsByEnrollment(enrollmentId);
        setStudentDocuments(documents || []);
      } else {
        setStudentDocuments([]);
      }
    } catch (err) {
      console.error('Error fetching student details:', err);
      setError('Erro ao carregar detalhes do candidato');
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEnrollmentAction = async (enrollmentId, action) => {
    console.debug('Processing enrollment action:', { enrollmentId, action });
    setProcessingAction(action);

    try {
      const response = await api.patch(`/enrollments/${enrollmentId}`, { status: action });
      console.debug('Enrollment action response:', response.data);

      // Refresh students list
      const updatedStudents = await api.get('/users');
      const data = updatedStudents.data;
      setStudents(data || []);
      setTotalPages(Math.ceil(data.length / ITEMS_PER_PAGE));

      // Update selected student
      if (selectedStudent) {
        const updatedStudent = data.find((c) => c.id === selectedStudent.id);
        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        }
      }

      const actionMessage = action === 'approved' ? 'aprovada' : action === 'rejected' ? 'rejeitada' : 'cancelada';
      toast.success(`Matrícula ${actionMessage} com sucesso!`);
    } catch (err) {
      console.error('Error processing enrollment action:', err);
      const message = err.response?.data?.message || 'Erro ao processar ação';
      toast.error(message);

      if (err.response?.status === 401) {
        console.warn('Unauthorized access, clearing cookies');
        // Uncomment in production
        // removeCookie('access_token');
        // removeCookie('userData');
        // window.location.href = '/login';
        toast.error('Sessão expirada. Faça login novamente.');
      }
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Tem certeza que deseja deletar este aluno? Esta ação não pode ser desfeita.')) {
      console.debug('Delete student action canceled');
      return;
    }

    console.debug('Deleting student ID:', studentId);
    try {
      await api.delete(`/users/${studentId}`);
      console.debug('Student deleted successfully');

      // Refresh students list
      const updatedStudents = await api.get('/users');
      const data = updatedStudents.data;
      setStudents(data || []);
      setTotalPages(Math.ceil(data.length / ITEMS_PER_PAGE));

      // Adjust page if necessary
      if (currentPage > Math.ceil(data.length / ITEMS_PER_PAGE)) {
        setCurrentPage(Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE)));
      }

      toast.success('Aluno deletado com sucesso!');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error deleting student:', err);
      const message = err.response?.data?.message || 'Erro ao deletar aluno';
      toast.error(message);

      if (err.response?.status === 401) {
        console.warn('Unauthorized access, clearing cookies');
        // Uncomment in production
        // removeCookie('access_token');
        // removeCookie('userData');
        // window.location.href = '/login';
        toast.error('Sessão expirada. Faça login novamente.');
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
      case 'canceled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Carregando candidatos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  const currentPageData = getCurrentPageData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Aprovação de Estudantes</h1>
        <div className="text-sm text-gray-500">
          {studentsData.filter((c) => c.latest_enrollment_status === 'pending').length} candidatos pendentes
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cursos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Inscrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPageData.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.phone || 'Telefone não informado'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {student.courses_applied?.length > 0
                        ? student.courses_applied.join(', ')
                        : 'Nenhum curso'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(student.latest_enrollment_status || '')}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(student.latest_enrollment_status || '')}`}>
                        {translateStatus(student.latest_enrollment_status || '')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.latest_enrollment_date ? formatDate(student.latest_enrollment_date) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(student)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Eye className="h-4 w-4 inline mr-1" />
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> até{' '}
                  <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, studentsData.length)}</span> de{' '}
                  <span className="font-medium">{studentsData.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalhes do Candidato
                </h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleDeleteStudent(selectedStudent.id)}
                    className="text-red-600 hover:text-red-900 flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Deletar Aluno
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Carregando detalhes...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Informações Pessoais
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Nome Completo</label>
                        <p className="text-gray-900">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{selectedStudent.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Telefone</label>
                        <p className="text-gray-900">{selectedStudent.phone || 'Não informado'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Data de Cadastro</label>
                        <p className="text-gray-900">{formatDate(selectedStudent.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <GraduationCap className="h-5 w-5 mr-2" />
                      Matrículas
                    </h4>
                    {selectedStudent.enrollments?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedStudent.enrollments.map((enrollment) => (
                          <div key={enrollment.id} className="bg-white rounded-lg p-4 border">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-gray-900">{enrollment.course_name}</h5>
                                <p className="text-sm text-gray-500">
                                  Matrícula: {formatDate(enrollment.enrolled_at)}
                                  {enrollment.code && ` • Código: ${enrollment.code}`}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(enrollment.status)}
                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(enrollment.status)}`}>
                                  {translateStatus(enrollment.status)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 flex space-x-2">
                              <button
                                onClick={() => handleEnrollmentAction(enrollment.id, 'approved')}
                                disabled={processingAction !== null}
                                className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {processingAction === 'approved' ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <UserCheck className="h-4 w-4 mr-1" />
                                )}
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleEnrollmentAction(enrollment.id, 'rejected')}
                                disabled={processingAction !== null}
                                className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                {processingAction === 'rejected' ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <UserX className="h-4 w-4 mr-1" />
                                )}
                                Rejeitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Nenhuma matrícula encontrada</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Documentos ({studentDocuments.length})
                    </h4>
                    {studentDocuments.length > 0 ? (
                      <div className="space-y-3">
                        {studentDocuments.map((doc) => (
                          <div key={doc.id} className="bg-white rounded-lg p-4 border flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <p className="font-medium text-gray-900">{doc.type}</p>
                                <p className="text-sm text-gray-500">
                                  {doc.file_type} • {(doc.file_size / 1024).toFixed(1)} KB •
                                  Enviado em {formatDate(doc.uploaded_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(doc.validation_status)}`}>
                                {translateStatus(doc.validation_status)}
                              </span>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Nenhum documento encontrado</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}