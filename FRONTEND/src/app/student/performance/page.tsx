'use client';

import React, { useState, useEffect } from 'react';
import StudentLayout from '@/components/StudentLayout'; 
import { fetchStudentPerformance, PerformanceData } from '@/lib/api';
import { Loader2, List } from 'lucide-react';
import PerformanceBarChart from '@/components/PerfomanceBarChart';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { hydrateAuth } from '@/store/authSlice';
const StudentPerformancePage = () => {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { user, enrollment, isAuthenticated, isLoading: authLoading } = useSelector((state: RootState) => state.auth);
    
    const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
    const [loadingPageData, setLoadingPageData] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            router.push('/login');
        } else if (!enrollment || !enrollment.id) {
            console.warn("Detalhes da matrícula não encontrados para o estudante.");
            setLoadingPageData(false);
        }
    }, [isAuthenticated, authLoading, router, enrollment]);

    useEffect(() => {
        if (isAuthenticated && enrollment && enrollment.id) {
            const loadPerformance = async () => {
                setLoadingPageData(true);
                try {
                    const data = await fetchStudentPerformance(enrollment.id);
                    setPerformanceData(data || []);
                } catch (error) {
                    console.error("Erro ao buscar desempenho do estudante:", error);
                    setPerformanceData([]);
                } finally {
                    setLoadingPageData(false);
                }
            };
            loadPerformance();
        } else if (!authLoading && isAuthenticated && !enrollment) {
             console.warn("Estudante autenticado mas sem dados de matrícula no estado Redux.");
             setLoadingPageData(false); 
        }
    }, [isAuthenticated, enrollment, authLoading]);

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
                        Não foi possível encontrar os detalhes da sua matrícula ativa. 
                        Por favor, entre em contato com a secretaria.
                    </p>
                </div>
            </StudentLayout>
        );
    }


    const averageScore = performanceData.length > 0
        ? performanceData.reduce((acc, curr) => acc + (curr.score / curr.max_score) * 100, 0) / performanceData.length
        : 0;
    
    const getScoreColor = (score: number, maxScore: number) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 75) return 'text-green-600 dark:text-green-400';
        if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <StudentLayout enrollmentId={enrollment?.id.toString()}>
            <div className="container mx-auto p-4 md:p-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Meu Desempenho</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-8">Acompanhe suas notas e progresso nas disciplinas.</p>

                {performanceData.length === 0 ? (
                         <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow">
                            <List size={48} className="mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Nenhum resultado de prova encontrado.</h2>
                            <p className="text-slate-500 dark:text-slate-400">Assim que realizar provas, seus resultados aparecerão aqui.</p>
                        </div>
                ) : (
                    <>
                        <div className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-1">Resumo Geral</h2>
                               <p className={`text-4xl font-bold ${averageScore >= 75 ? 'text-green-500' : averageScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                Média: {averageScore.toFixed(1)}%
                            </p>
                        </div>
                        
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Desempenho por Prova (Gráfico)</h2>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                                <PerformanceBarChart data={performanceData} />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Detalhes das Provas</h2>
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-x-auto">
                                <table className="w-full min-w-max text-left">
                                    <thead className="border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="p-4 text-slate-600 dark:text-slate-300">Disciplina</th>
                                            <th className="p-4 text-slate-600 dark:text-slate-300">Prova</th>
                                            <th className="p-4 text-slate-600 dark:text-slate-300">Data</th>
                                            <th className="p-4 text-slate-600 dark:text-slate-300 text-right">Pontuação</th>
                                            <th className="p-4 text-slate-600 dark:text-slate-300 text-right">Nota Final</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performanceData.map((perf, index) => (
                                            <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="p-4 text-slate-700 dark:text-slate-200">{perf.discipline_name}</td>
                                                <td className="p-4 text-slate-700 dark:text-slate-200">{perf.exam_name}</td>
                                                <td className="p-4 text-slate-500 dark:text-slate-400">{new Date(perf.exam_date).toLocaleDateString()}</td>
                                                <td className={`p-4 text-right font-medium ${getScoreColor(perf.score, perf.max_score)}`}>
                                                    {perf.score} / {perf.max_score}
                                                </td>
                                                <td className={`p-4 text-right font-bold ${parseFloat(perf.grade) >= 9.5 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {perf.grade}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentPerformancePage;