'use client';

import React, { useEffect, useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  FileText, 
  Download,
  Eye,
  UserCheck,
  UserX,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface EnrollmentDocument {
  id: number;
  type: string;
  file_path: string;
  file_size: number;
  file_type: string;
  validation_status: 'pending' | 'approved' | 'rejected';
  validation_comments?: string;
  uploaded_at: string;
  file_url: string;
}

interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  status: string;
  enrolled_at: string;
  code?: string;
  course_name: string;
  created_at?: string;
  updated_at?: string;
}

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
  enrollments: Enrollment[];
  courses_applied: string[];
  latest_enrollment_status: string | null;
  latest_enrollment_date: string | null;
}

const ITEMS_PER_PAGE = 10;

// Mock API functions (replace with your actual API calls)
const fetchCandidates = async (): Promise<Candidate[]> => {
  const response = await fetch('/api/users');
  if (!response.ok) throw new Error('Failed to fetch candidates');
  return response.json();
};

const fetchDocumentsByEnrollment = async (enrollmentId: number): Promise<EnrollmentDocument[]> => {
  const response = await fetch(`/api/enrollments/${enrollmentId}/documents`);
  if (!response.ok) throw new Error('Failed to fetch documents');
  return response.json();
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export default function StudentApprovalPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateDocuments, setCandidateDocuments] = useState<EnrollmentDocument[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Tradução de status
  const translateStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendente',
      'approved': 'Aprovado',
      'rejected': 'Rejeitado',
      'canceled': 'Cancelado',
      'active': 'Ativo'
    };
    return statusMap[status?.toLowerCase()] || status || 'N/A';
  };

  useEffect(() => {
    fetchCandidates()
      .then(data => {
        setCandidates(data);
        setTotalPages(Math.ceil(data.length / ITEMS_PER_PAGE));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Paginação com slice
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return candidates.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewDetails = async (candidate: Candidate) => {
    setLoadingDetails(true);
    setIsModalOpen(true);
    setSelectedCandidate(candidate);
    
    try {
      // Fetch documents using the enrollment data we already have
      if (candidate.enrollments?.length > 0) {
        const enrollmentId = candidate.enrollments[0].id;
        try {
          const documents = await fetchDocumentsByEnrollment(enrollmentId);
          setCandidateDocuments(documents);
        } catch (docError) {
          console.error('Error fetching documents:', docError);
          setCandidateDocuments([]);
        }
      }
    } catch (err) {
      console.error('Error fetching candidate details:', err);
      setError('Erro ao carregar detalhes do candidato');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEnrollmentAction = async (enrollmentId: number, action: 'approved' | 'rejected' | 'canceled') => {
    setProcessingAction(action);
    
    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: action }),
      });

      if (response.ok) {
        // Refresh candidates list
        const updatedCandidates = await fetchCandidates();
        setCandidates(updatedCandidates);
        setTotalPages(Math.ceil(updatedCandidates.length / ITEMS_PER_PAGE));
        
        // Update selected candidate if modal is open
        if (selectedCandidate) {
          const updatedCandidate = updatedCandidates.find(c => c.id === selectedCandidate.id);
          if (updatedCandidate) {
            setSelectedCandidate(updatedCandidate);
          }
        }
        
        const actionMessage = action === 'approved' ? 'aprovada' : action === 'rejected' ? 'rejeitada' : 'cancelada';
        alert(`Matrícula ${actionMessage} com sucesso!`);
      } else {
        throw new Error('Erro ao processar ação');
      }
    } catch (err) {
      console.error('Error processing enrollment action:', err);
      alert('Erro ao processar ação. Tente novamente.');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm('Tem certeza que deseja deletar este aluno? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${studentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh candidates list
        const updatedCandidates = await fetchCandidates();
        setCandidates(updatedCandidates);
        setTotalPages(Math.ceil(updatedCandidates.length / ITEMS_PER_PAGE));
        
        // Adjust current page if necessary
        if (currentPage > Math.ceil(updatedCandidates.length / ITEMS_PER_PAGE)) {
          setCurrentPage(Math.max(1, Math.ceil(updatedCandidates.length / ITEMS_PER_PAGE)));
        }
        
        alert('Aluno deletado com sucesso!');
        setIsModalOpen(false);
      } else {
        throw new Error('Erro ao deletar aluno');
      }
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Erro ao deletar aluno. Tente novamente.');
    }
  };

  const getStatusIcon = (status: string) => {
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

  const getStatusColor = (status: string) => {
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
          {candidates.filter(c => c.latest_enrollment_status === 'pending').length} candidatos pendentes
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
              {currentPageData.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {candidate.first_name} {candidate.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {candidate.phone || 'Telefone não informado'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{candidate.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {candidate.courses_applied?.length > 0
                        ? candidate.courses_applied.join(', ')
                        : 'Nenhum curso'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(candidate.latest_enrollment_status || '')}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(candidate.latest_enrollment_status || '')}`}>
                        {translateStatus(candidate.latest_enrollment_status || '')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {candidate.latest_enrollment_date ? formatDate(candidate.latest_enrollment_date) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(candidate)}
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

        {/* Paginação */}
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
                  <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, candidates.length)}</span> de{' '}
                  <span className="font-medium">{candidates.length}</span> resultados
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

      {/* Modal for candidate details */}
      {isModalOpen && selectedCandidate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalhes do Candidato
                </h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleDeleteStudent(selectedCandidate.id)}
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
                  {/* Personal Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Informações Pessoais
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Nome Completo</label>
                        <p className="text-gray-900">{selectedCandidate.first_name} {selectedCandidate.last_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{selectedCandidate.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Telefone</label>
                        <p className="text-gray-900">{selectedCandidate.phone || 'Não informado'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Data de Cadastro</label>
                        <p className="text-gray-900">{formatDate(selectedCandidate.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Enrollments */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <GraduationCap className="h-5 w-5 mr-2" />
                      Matrículas
                    </h4>
                    {selectedCandidate.enrollments?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedCandidate.enrollments.map((enrollment) => (
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

                  {/* Documents */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Documentos ({candidateDocuments.length})
                    </h4>
                    {candidateDocuments.length > 0 ? (
                      <div className="space-y-3">
                        {candidateDocuments.map((doc) => (
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