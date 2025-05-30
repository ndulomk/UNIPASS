'use client';

import React, { useEffect, useState } from 'react';
import { Candidate } from '@/types';
import { fetchCandidates } from '@/lib/api';
import CandidateDetailModal from "@/components/CandidateModalDetail"
import { formatDate } from '@/lib/utils';
export default function CandidatesPage() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);

    useEffect(() => {
        fetchCandidates()
            .then(data => setCandidates(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const handleViewDetails = (id: number) => {
        setSelectedCandidateId(id);
        setIsModalOpen(true);
    };

    if (loading) return <div>Carregando candidatos...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Gestão de Candidatos</h1>
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                    {/* Thead ... */}
                    <tbody>
                        {candidates.map(candidate => (
                            <tr key={candidate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4">{candidate.first_name} {candidate.last_name}</td>
                                <td className="px-6 py-4">{candidate.email}</td>
                                <td className="px-6 py-4">{candidate.courses_applied.join(', ')}</td>
                                <td className="px-6 py-4">{candidate.latest_enrollment_status || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleViewDetails(candidate.id)}
                                        className="font-medium text-blue-600 hover:underline"
                                    >
                                        Ver Detalhes
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && selectedCandidateId && (
                <CandidateDetailModal
                    candidateId={selectedCandidateId}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
}