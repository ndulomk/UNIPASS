'use client';

import React, { useState, useEffect, useMemo } from 'react';
import StudentLayout from '@/components/StudentLayout';
import { api, fetchExams, fetchStudentPerformance, PerformanceData } from '@/lib/api'; 
import { ExamDetail as ApiExamTypeFromApi } from '@/types';
import { CalendarDays, CheckSquare, AlertTriangle, Loader2,  } from 'lucide-react';
import ExamDetailsModal from '@/components/ExamDetailsModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useRouter } from 'next/navigation';

interface Exam extends ApiExamTypeFromApi { 
    result?: PerformanceData;
    discipline_name?: string; 
}

const StudentExamsPage = () => {
    const router = useRouter();
    const { user, enrollment, isAuthenticated, isLoading: authLoading } = useSelector((state: RootState) => state.auth);
    
    const [allExams, setAllExams] = useState<ApiExamTypeFromApi[]>([]);
    const [performanceResults, setPerformanceResults] = useState<PerformanceData[]>([]);
    const [loadingPageData, setLoadingPageData] = useState(true);
    const [selectedExamForModal, setSelectedExamForModal] = useState<Exam | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push('/login');
        } else if (!enrollment || !enrollment.id || !enrollment.course_id) {
             console.warn("Detalhes da matrícula (ID ou Course ID) não encontrados para o estudante.");
             setLoadingPageData(false);
        }
    }, [isAuthenticated, authLoading, router, enrollment]);

    useEffect(() => {
        if (isAuthenticated && enrollment && enrollment.id && enrollment.course_id) {
            const fetchData = async () => {
                setLoadingPageData(true);
                try {
                    const [examsRes, performanceRes] = await Promise.all([
                        fetchExams(enrollment.course_id), 
                        fetchStudentPerformance(enrollment.id)
                    ]);
                    setAllExams(examsRes || []);
                    setPerformanceResults(performanceRes || []);
                } catch (error) {
                    console.error("Erro ao carregar dados da página de exames:", error);
                } finally {
                    setLoadingPageData(false);
                }
            };
            fetchData();
        } else if (!authLoading && isAuthenticated && (!enrollment || !enrollment.id || !enrollment.course_id)) {
            setLoadingPageData(false); 
        }
    }, [isAuthenticated, enrollment, authLoading]);

    const { upcomingExams, pastExams } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const categorizedExams: { upcomingExams: Exam[], pastExams: Exam[] } = {
            upcomingExams: [],
            pastExams: [],
        };

        allExams.forEach(examFromApi => {
            const examDate = new Date(examFromApi.exam_date);
            const disciplineName = examFromApi.discipline?.name || 'Disciplina Indefinida';

            const result = performanceResults.find(
                r => r.exam_name === examFromApi.exam_name && 
                     r.discipline_name === disciplineName &&
                     new Date(r.exam_date).toISOString().split('T')[0] === examDate.toISOString().split('T')[0]
            );

            const examWithDetails: Exam = { 
                ...examFromApi, 
                result,
                discipline_name: disciplineName
            };

            if (examDate >= today && !result) { 
                categorizedExams.upcomingExams.push(examWithDetails);
            } else {
                categorizedExams.pastExams.push(examWithDetails);
            }
        });
        
        categorizedExams.upcomingExams.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
        categorizedExams.pastExams.sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

        return categorizedExams;
    }, [allExams, performanceResults]);

    const openExamDetailsModal = async (exam: Exam) => {
        setSelectedExamForModal(exam); // O exam já tem discipline_name populado pelo useMemo
        setIsModalOpen(true);
    };

    const handleStartExam = (examId: number) => {
        router.push(`/student/exams/${examId}/take`);
    };
    
    if (authLoading || loadingPageData) {
        return (
            <StudentLayout enrollmentId={enrollment?.id?.toString()}>
                <div className="flex justify-center items-center h-screen">
                    <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
                </div>
            </StudentLayout>
        );
    }

    if (!enrollment && isAuthenticated && user?.role === 'student') {
         return (
            <StudentLayout>
                <div className="container mx-auto p-4 md:p-8 text-center">
                     <h1 className="text-2xl font-bold text-red-500 dark:text-red-400 mb-4">Matrícula não encontrada</h1>
                    <p className="text-slate-600 dark:text-slate-300">
                        Não foi possível encontrar os detalhes da sua matrícula ativa para carregar os exames.
                        Por favor, entre em contato com a secretaria.
                    </p>
                </div>
            </StudentLayout>
        );
    }


    return (
        <StudentLayout enrollmentId={enrollment?.id.toString()}>
            <div className="container mx-auto p-4 md:p-8 space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Meus Exames</h1>
                    <p className="text-slate-600 dark:text-slate-400">Consulte seus exames agendados e resultados anteriores.</p>
                </div>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-700 dark:text-slate-200 flex items-center">
                        <CalendarDays className="mr-3 h-7 w-7 text-sky-500" /> Próximos Exames
                    </h2>
                    {upcomingExams.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingExams.map(exam => (
                                <div key={exam.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg text-sky-600 dark:text-sky-400">{exam.exam_name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{exam.discipline_name}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                            Data: {new Date(exam.exam_date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">Duração: {exam.duration} min</p>
                                        <p className="text-xs mt-2 px-2 py-1 inline-block bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-200 rounded-full">{exam.exam_type}</p>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <button
                                            onClick={() => handleStartExam(exam.id)}
                                            disabled={new Date(exam.exam_date) > new Date() && !exam.exam_date.startsWith(new Date().toISOString().split('T')[0])} 
                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                                        >
                                            Iniciar Prova
                                        </button>
                                        <button 
                                            onClick={() => openExamDetailsModal(exam)}
                                            className="w-full text-sm text-sky-500 hover:underline"
                                        >
                                            Ver Detalhes
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-6 rounded-lg shadow text-center">
                            <AlertTriangle className="inline-block mr-2 h-5 w-5 text-yellow-500" />
                            Nenhum exame agendado para os próximos dias.
                        </p>
                    )}
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-700 dark:text-slate-200 flex items-center">
                        <CheckSquare className="mr-3 h-7 w-7 text-green-500" /> Exames Realizados
                    </h2>
                    {pastExams.length > 0 ? (
                        <div className="overflow-x-auto bg-white dark:bg-slate-800 p-1 rounded-xl shadow-lg">
                            <table className="min-w-full">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Exame</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Disciplina</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Pontuação</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Nota / Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {pastExams.map(exam => (
                                        <tr key={exam.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{exam.exam_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{exam.discipline_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{new Date(exam.exam_date).toLocaleDateString('pt-AO')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                {exam.result ? `${exam.result.score} / ${exam.result.max_score}` : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {exam.result ? (
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        parseFloat(exam.result.grade) >= 9.5 ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' :
                                                        parseFloat(exam.result.grade) >= 0 ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100' :
                                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100'
                                                    }`}>
                                                        {exam.result.grade}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-200">
                                                        Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button 
                                                    onClick={() => openExamDetailsModal(exam)}
                                                    className="text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
                                                >
                                                    Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                         <p className="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-6 rounded-lg shadow text-center">
                            <AlertTriangle className="inline-block mr-2 h-5 w-5 text-yellow-500" />
                            Nenhum exame realizado encontrado.
                        </p>
                    )}
                </section>
            </div>

            {isModalOpen && selectedExamForModal && (
                <ExamDetailsModal
                    exam={selectedExamForModal} 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </StudentLayout>
    );
};

export default StudentExamsPage;