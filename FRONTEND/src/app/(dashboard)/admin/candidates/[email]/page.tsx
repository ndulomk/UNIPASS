'use client';

import React, { useEffect, useState } from 'react';
import { User as Candidate } from '@/types';
import { fetchCandidates } from '@/lib/api';
import { formatDate } from '@/lib/utils';
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
  AlertTriangle
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

interface UserDetail extends Candidate {
  enrollments: Array<{
    id: number;
    course_name: string;
    status: string;
    enrolled_at: string;
    code?: string;
  }>;
}

export default function StudentApprovalPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<UserDetail | null>(null);
  const [candidateDocuments, setCandidateDocuments] = useState<EnrollmentDocument[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates()
      .then(data => setCandidates(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleViewDetails = async (candidate: Candidate) => {
    setLoadingDetails(true);
    setIsModalOpen(true);
    
    try {
      // Fetch detailed candidate information
      const detailsResponse = await fetch(`/api/users/${candidate.email}`);
      const candidateDetails = await detailsResponse.json();
      
      setSelectedCandidate(candidateDetails[0]);
      
      // Fetch documents for the candidate's enrollments
      if (candidateDetails[0]?.enrollments?.length > 0) {
        const enrollmentId = candidateDetails[0].enrollments[0].id;
        const docsResponse = await fetch(`/api/enrollments/${enrollmentId}/documents`);
        const documents = await docsResponse.json();
        setCandidateDocuments(documents);
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
        
        // Update selected candidate if modal is open
        if (selectedCandidate) {
          const updatedDetails = await fetch(`/api/users/${selectedCandidate.email}`);
          const updatedData = await updatedDetails.json();
          setSelectedCandidate(updatedData[0]);
        }
        
        alert(`Matrícula ${action === 'approved' ? 'aprovada' : action === 'rejected' ? 'rejeitada' : 'cancelada'} com sucesso!`);
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
              {candidates.map((candidate) => (
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
                      {Array.isArray(candidate.courses_applied) 
                        ? candidate.courses_applied.join(', ')
                        : candidate.courses_applied || 'Nenhum curso'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(candidate.latest_enrollment_status || '')}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(candidate.latest_enrollment_status || '')}`}>
                        {candidate.latest_enrollment_status || 'N/A'}
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
      </div>

      {/* Modal for candidate details */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalhes do Candidato
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Carregando detalhes...</span>
                </div>
              ) : selectedCandidate ? (
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
                                  {enrollment.status}
                                </span>
                              </div>
                            </div>
                            
                            {enrollment.status === 'pending' && (
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
                            )}
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
                                {doc.validation_status}
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
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Erro ao carregar detalhes do candidato</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}