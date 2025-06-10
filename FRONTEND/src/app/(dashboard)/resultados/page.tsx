 'use client';

import React, { useEffect, useState } from 'react';
import { AdminExamResultItem, EnrollmentDetail } from '@/types';
import { fetchAdminAllExamResults, fetchEnrollmentDetails } from '@/lib/api';
import Modal from '@/components/Modal'; 

const formatDate = (dateString?: string | null, includeTime = false) => {
    if (!dateString) return "N/A";
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(includeTime && { hour: '2-digit', minute: '2-digit' }),
    };
    try {
        return new Date(dateString).toLocaleDateString('pt-AO', options);
    } catch (e) {
        return "Data inválida";
    }
};

export default function AllStudentResultsPage() {
    const [results, setResults] = useState<AdminExamResultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdminExamResultItem | null; direction: 'ascending' | 'descending' }>({ key: null, direction: 'ascending' });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEnrollmentDetails, setSelectedEnrollmentDetails] = useState<EnrollmentDetail | null>(null);
    const [loadingModal, setLoadingModal] = useState(false);


    useEffect(() => {
        setLoading(true);
        fetchAdminAllExamResults()
            .then(data => {
                setResults(data);
                setError(null);
            })
            .catch(err => {
                setError(err.message || "Falha ao carregar todos os resultados.");
                console.error(err);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleStudentInfoClick = async (enrollmentId: number) => {
        setLoadingModal(true);
        setIsModalOpen(true);
        try {
            const details = await fetchEnrollmentDetails(enrollmentId);
            setSelectedEnrollmentDetails(details);
        } catch (err) {
            console.error("Failed to fetch enrollment details for modal:", err);
            setSelectedEnrollmentDetails(null); // Or show error in modal
        } finally {
            setLoadingModal(false);
        }
    };

    const filteredResults = results.filter(result =>
        `${result.candidate_first_name} ${result.candidate_last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.candidate_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.exam_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.discipline_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedResults = React.useMemo(() => {
        const sortableItems = [...filteredResults];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key!];
                const valB = b[sortConfig.key!];

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
                }
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                // Fallback for other types or nulls
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredResults, sortConfig]);
    
    const requestSort = (key: keyof AdminExamResultItem) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof AdminExamResultItem) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
        }
        return '';
    };
    
    const getStatusClass = (grade?: string | null) => {
        if (!grade) return 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300';
        if (grade.toLowerCase() === 'aprovado') {
            return 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100';
        }
        return 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100';
    };


    if (loading && results.length === 0) { // Show initial full page loading only if no results yet
        return <div className="flex justify-center items-center min-h-[calc(100vh-150px)]"><p className="text-xl text-gray-600 dark:text-gray-300">Carregando resultados de todos os estudantes...</p></div>;
    }
    if (error) {
        return <div className="text-center py-10"><p className="text-red-500 dark:text-red-400 text-xl">{error}</p></div>;
    }


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Resultados de Todos os Estudantes</h1>
            
            <input
                type="text"
                placeholder="Pesquisar por nome, email, prova, curso..."
                className="w-full p-3 mb-6 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 dark:text-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loading && results.length > 0 && <p className="text-blue-500 dark:text-blue-400 text-center">Atualizando dados...</p>}

            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-700 dark:text-gray-400">
                        <tr>
                            {([
                                { key: 'candidate_last_name', label: 'Estudante' },
                                { key: 'exam_name', label: 'Prova' },
                                { key: 'course_name', label: 'Curso' },
                                { key: 'discipline_name', label: 'Disciplina' },
                                { key: 'exam_date', label: 'Data Prova' },
                                { key: 'total_score_obtained', label: 'Nota (0-20)' },
                                { key: 'grade', label: 'Status' },
                            ] as {key: keyof AdminExamResultItem, label: string}[]).map(header => (
                                 <th key={header.key} scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort(header.key)}>
                                    {header.label}{getSortIndicator(header.key)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedResults.map((result) => (
                            <tr key={result.result_id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => handleStudentInfoClick(result.enrollment_id)}
                                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                                    >
                                        {result.candidate_first_name} {result.candidate_last_name}
                                    </button>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{result.candidate_email}</div>
                                </td>
                                <td className="px-6 py-4">{result.exam_name}</td>
                                <td className="px-6 py-4">{result.course_name}</td>
                                <td className="px-6 py-4">{result.discipline_name}</td>
                                <td className="px-6 py-4">{formatDate(result.exam_date)}</td>
                                <td className="px-6 py-4 font-semibold">{result.total_score_obtained.toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusClass(result.grade)}`}>
                                        {result.grade || 'N/A'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {sortedResults.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                    Nenhum resultado encontrado com os critérios de pesquisa.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalhes do Estudante">
                {loadingModal && <p>Carregando detalhes...</p>}
                {selectedEnrollmentDetails && !loadingModal && (
                    <div className="space-y-4 text-sm">
                        <p><strong>Nome:</strong> {selectedEnrollmentDetails.candidate.first_name} {selectedEnrollmentDetails.candidate.last_name}</p>
                        <p><strong>Email:</strong> {selectedEnrollmentDetails.candidate.email}</p>
                        <p><strong>Telefone:</strong> {selectedEnrollmentDetails.candidate.phone || 'N/A'}</p>
                        <hr className="border-gray-700 my-3" />
                        <p><strong>Curso:</strong> {selectedEnrollmentDetails.course.name}</p>
                        <p><strong>Matrícula ID:</strong> {selectedEnrollmentDetails.id}</p>
                        <p><strong>Data de Matrícula:</strong> {formatDate(selectedEnrollmentDetails.enrolled_at)}</p>
                        <p><strong>Status Matrícula:</strong> <span className={`font-medium ${selectedEnrollmentDetails.status === 'ativo' ? 'text-green-400' : 'text-yellow-400'}`}>{selectedEnrollmentDetails.status || 'N/A'}</span></p>
                        <p><strong>COD:</strong> {selectedEnrollmentDetails.cod || 'N/A'}</p>
                    </div>
                )}
                {!selectedEnrollmentDetails && !loadingModal && <p>Não foi possível carregar os detalhes.</p>}
            </Modal>
        </div>
    );
}