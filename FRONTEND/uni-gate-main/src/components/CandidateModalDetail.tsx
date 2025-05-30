"use client";

import React, { useEffect, useState } from "react";
import { CandidateDetail } from "@/types";
import { fetchCandidateDetails } from "@/lib/api";
import Modal from "@/components/Modal";
import { formatDate } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface Props {
  candidateId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateDetailModal({
  candidateId,
  isOpen,
  onClose,
}: Props) {
  const [details, setDetails] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && candidateId) {
      setLoading(true);
      setError(null);
      fetchCandidateDetails(candidateId)
        .then((data) => {
          setDetails(data);
          setError(null);
        })
        .catch((err) => {
          console.error("Error fetching candidate details:", err);
          setError("Erro ao carregar detalhes do candidato");
        })
        .finally(() => setLoading(false));
    }
  }, [candidateId, isOpen]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "ativo":
      case "concluído":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "cancelado":
      case "reprovado":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "ativo":
      case "concluído":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelado":
      case "reprovado":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Candidato">
      <div className="min-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">
              Carregando informações...
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {details && !loading && !error && (
          <div className="space-y-6">
            {/* Personal Information Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">
                  Informações Pessoais
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Nome Completo</p>
                    <p className="font-medium text-gray-900">
                      {details.first_name} {details.last_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900 break-all">
                      {details.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Telefone</p>
                    <p className="font-medium text-gray-900">
                      {details.phone || "Não informado"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrollment History */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-full">
                    <GraduationCap className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-gray-900">
                    Histórico de Matrículas
                  </h3>
                </div>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  {details.enrollments.length} matrícula
                  {details.enrollments.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="p-6">
                {details.enrollments.length > 0 ? (
                  <div className="space-y-4">
                    {details.enrollments.map((enrollment, index) => (
                      <div
                        key={enrollment.id}
                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {enrollment.course_name}
                              </h4>
                              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                                COD: {enrollment.COD}
                              </span>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                    <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      Nenhuma matrícula encontrada
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Este candidato ainda não possui matrículas registradas
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
