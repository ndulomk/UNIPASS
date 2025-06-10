'use client';

import React, { useEffect, useState } from 'react';
import { UserDetail } from '@/types';
import { fetchCandidateDetails } from '@/lib/api';
import Modal from '@/components/Modal';
import { formatDate } from '@/lib/utils';
import { User, Mail, Phone, GraduationCap, Calendar, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface Props {
  candidateId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateDetailModal({ candidateId, isOpen, onClose }: Props) {
  const [details, setDetails] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && candidateId) {
      setLoading(true);
      setError(null);
      fetchCandidateDetails(candidateId)
        .then((data) => {
          setDetails({ ...data, enrollments: data.enrollments ?? [] }); // Default to empty array
          setError(null);
        })
        .catch((err) => {
          console.error('Erro ao buscar detalhes do candidato:', err);
          setError('Erro ao carregar detalhes do candidato');
        })
        .finally(() => setLoading(false));
    }
  }, [candidateId, isOpen]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativo':
      case 'concluído':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelado':
      case 'reprovado':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativo':
      case 'concluído':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200';
      case 'cancelado':
      case 'reprovado':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Candidato" ariaLabel="Detalhes do Candidato">
      <div className="min-h-[400px] space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            <span className="ml-3 text-slate-600 dark:text-slate-300">Carregando informações...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        {details && !loading && !error && (
          <>
            {/* Personal Information Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-full">
                  <User className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Informações Pessoais
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-2" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Nome Completo</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {details.first_name} {details.last_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-2" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 break-all">
                      {details.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-2" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Telefone</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {details.phone || 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrollment History */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <GraduationCap className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Histórico de Matrículas
                  </h3>
                </div>
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                  {details.enrollments.length} matrícula{details.enrollments.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="p-6">
                {details.enrollments.length > 0 ? (
                  <div className="space-y-4">
                    {details.enrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                                {enrollment.course_name}
                              </h4>
                              {enrollment.COD && (
                                <span className="ml-2 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 px-2 py-1 rounded text-sm font-medium">
                                  COD: {enrollment.COD}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Matrícula: {formatDate(enrollment.enrolled_at)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center ml-4">
                            {getStatusIcon(enrollment.status)}
                            <span
                              className={`ml-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                                enrollment.status
                              )}`}
                            >
                              {enrollment.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      Nenhuma matrícula encontrada
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                      Este candidato ainda não possui matrículas registradas
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}