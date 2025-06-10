'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudentExamResult, EnrollmentDetail as ApiEnrollmentDetail } from '@/types'; 
import { fetchStudentResults, fetchEnrollmentDetails } from '@/lib/api';
import Modal from '@/components/Modal';
import StudentLayout from '@/components/StudentLayout'; 
import { Loader2, AlertTriangle, UserCircle, Printer } from 'lucide-react';

const formatDate = (dateString?: string | null, includeTime = false) => {
    if (!dateString) return "N/A";
    const options: Intl.DateTimeFormatOptions = {
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

export default function StudentResultsPage() {
    const params = useParams();
    const router = useRouter();
    const enrollmentIdFromParam = params.enrollmentId ? parseInt(params.enrollmentId as string, 10) : null;

    const [results, setResults] = useState<StudentExamResult[]>([]);
    const [enrollmentDetails, setEnrollmentDetails] = useState<ApiEnrollmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (enrollmentIdFromParam) {
            setLoading(true);
            setError(null);
            Promise.all([
                fetchStudentResults(enrollmentIdFromParam),
                fetchEnrollmentDetails(enrollmentIdFromParam)
            ])
            .then(([resultsData, enrollmentData]) => {
                setResults(resultsData);
                setEnrollmentDetails(enrollmentData);
            })
            .catch(err => {
                setError(err.message || "Falha ao carregar dados. Verifique o ID da matrícula ou tente mais tarde.");
                console.error(err);
            })
            .finally(() => setLoading(false));
        } else {
            setError("ID de matrícula inválido fornecido na URL.");
            setLoading(false);
        }
    }, [enrollmentIdFromParam]);

    const getStatusPillClass = (grade: string | number) => {
        const numericGrade = typeof grade === 'string' ? parseFloat(grade.replace(',', '.')) : grade;
        if (numericGrade >= 9.5) { // Aprovado no sistema angolano (geralmente 10 em 20)
            return 'bg-green-500/20 text-green-300 border border-green-500';
        }
        return 'bg-red-500/20 text-red-300 border border-red-500';
    };
    
    const getScoreColor = (score: number) => {
        if (score >= 9.5) return 'text-green-400';
        if (score >= 7) return 'text-yellow-400';
        return 'text-red-400';
    };

    if (loading) {
        return (
            <StudentLayout enrollmentId={enrollmentIdFromParam?.toString()}>
                <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-400 mb-4" />
                    <p className="text-xl text-blue-300">A carregar os seus resultados...</p>
                </div>
            </StudentLayout>
        );
    }

    if (error) {
        return (
            <StudentLayout enrollmentId={enrollmentIdFromParam?.toString()}>
                <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
                    <AlertTriangle className="h-16 w-16 text-red-400 mb-4" />
                    <p className="text-red-300 text-xl mb-2">Oops! Algo correu mal.</p>
                    <p className="text-gray-400 text-center mb-6">{error}</p>
                    <button 
                        onClick={() => router.push('/student/dashboard')} // Redirecionar para dashboard em vez de router.back()
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                    >
                        Ir para o Painel
                    </button>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout enrollmentId={enrollmentIdFromParam?.toString()}>
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-950 p-4 md:p-8 text-gray-100">
                <div className="max-w-5xl mx-auto">
                    <header className="flex flex-col sm:flex-row justify-between items-center mb-10 pb-6 border-b border-gray-700">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                                Meus Resultados Académicos
                            </h1>
                            {enrollmentDetails && (
                                <p className="text-gray-400 mt-1">
                                    Estudante: {enrollmentDetails.candidate.first_name} {enrollmentDetails.candidate.last_name}
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
                    
                    {results.length === 0 ? (
                        <div className="bg-gray-800/50 backdrop-blur-md p-10 rounded-xl border border-gray-700 text-center shadow-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-7.034 3.775a3.375 3.375 0 00-.569-5.545l-3.009-2.634a3.375 3.375 0 00-5.545.569m3.009 2.634l3.01 2.634m0 0l2.25 2.25m-2.25-2.25l-2.25-2.25" /></svg>
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
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusPillClass(result.grade)}`}>
                                                {result.grade}
                                            </span>
                                        </div>
                                        <div className="text-sm space-y-1 mb-4 text-gray-300">
                                            <p><span className="font-medium text-gray-400">Curso:</span> {result.course_name}</p>
                                            <p><span className="font-medium text-gray-400">Disciplina:</span> {result.discipline_name}</p>
                                            <p><span className="font-medium text-gray-400">Data da Prova:</span> {formatDate(result.exam_date)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-gray-700 flex justify-between items-baseline">
                                          <p className="text-sm text-gray-400">Nota (0-20):</p>
                                          <div className="text-right">
                                            <span className={`text-4xl font-extrabold ${getScoreColor(result.total_score_obtained)}`}>
                                                {result.total_score_obtained.toFixed(2)}
                                            </span>
                                            <span className="text-lg text-gray-500"> / {result.max_score_possible}</span>
                                          </div>
                                    </div>
                                    {result.graded_at && (
                                         <p className="text-xs text-gray-500 mt-2 text-right">Corrigido em: {formatDate(result.graded_at, true)}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {enrollmentDetails && (
                       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Meus Dados de Matrícula">
                         <div className="space-y-3 text-gray-300">
                             <div className="p-4 bg-gray-700/50 rounded-lg">
                                 <p className="text-xs text-gray-400">Nome Completo</p> 
                                 <p className="font-semibold text-lg">{enrollmentDetails.candidate.first_name} {enrollmentDetails.candidate.last_name}</p>
                             </div>
                             <div className="p-4 bg-gray-700/50 rounded-lg">
                                 <p className="text-xs text-gray-400">Email</p> 
                                 <p>{enrollmentDetails.candidate.email}</p>
                             </div>
                             <div className="p-4 bg-gray-700/50 rounded-lg">
                                 <p className="text-xs text-gray-400">Telefone</p> 
                                 <p>{enrollmentDetails.candidate.phone || 'Não fornecido'}</p>
                             </div>
                               <hr className="border-gray-600 my-4" />
                             <div className="p-4 bg-gray-700/50 rounded-lg">
                                 <p className="text-xs text-gray-400">Curso Matriculado</p> 
                                 <p className="font-semibold">{enrollmentDetails.course.name}</p>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                 <div className="p-3 bg-gray-700/50 rounded-lg">
                                     <p className="text-xs text-gray-400">ID Matrícula</p> 
                                     <p>{enrollmentDetails.id}</p>
                                 </div>
                                 <div className="p-3 bg-gray-700/50 rounded-lg">
                                     <p className="text-xs text-gray-400">Data Matrícula</p> 
                                     <p>{formatDate(enrollmentDetails.enrolled_at)}</p>
                                 </div>
                             </div>
                             <div className="p-4 bg-gray-700/50 rounded-lg">
                                 <p className="text-xs text-gray-400">Status da Matrícula</p> 
                                 <p className={`font-medium ${enrollmentDetails.status === 'approved' || enrollmentDetails.status === 'ativo' ? 'text-green-400' : 'text-yellow-400'}`}>{enrollmentDetails.status || 'N/A'}</p>
                             </div>
                             {enrollmentDetails.cod && <div className="p-4 bg-gray-700/50 rounded-lg"><p className="text-xs text-gray-400">Código (COD)</p><p>{enrollmentDetails.cod}</p></div>}
                         </div>
                     </Modal>
                )}
            </div>
        </StudentLayout>
    );
}