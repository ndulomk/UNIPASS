'use client'; 

import Link from "next/link"; 
import React, { useState, useEffect } from "react";
import { RecentCandidateInfo, SystemStats, UpcomingExamInfo } from '@/types';
import { fetchSystemStats, fetchRecentCandidates, fetchUpcomingExams } from '@/lib/api';

const formatDate = (dateString?: string | null, includeTime = false) => {
    if (!dateString) return "N/A";
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        ...(includeTime && { hour: '2-digit', minute: '2-digit' }),
    };
    try {
       
        return new Date(dateString).toLocaleDateString('pt-AO', options); 
    } catch (e) {
        return "Data inválida";
    }
};

const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const CalendarDaysIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5M12 15L12 18" /></svg>; // Simplified calendar
const CheckBadgeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


export default function DashboardPage() { // Renamed from PainelAdmin for clarity within routing
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [recentCandidates, setRecentCandidates] = useState<RecentCandidateInfo[]>([]);
    const [upcomingExams, setUpcomingExams] = useState<UpcomingExamInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!localStorage.getItem('token')) {
                setError('Not authenticated');
                return;
            }

            setLoading(true);
            setError(null);
            
            try {
                const [stats, candidates, exams] = await Promise.all([
                    fetchSystemStats(),
                    fetchRecentCandidates(),
                    fetchUpcomingExams()
                ]);
                
                setSystemStats(stats);
                setRecentCandidates(candidates);
                setUpcomingExams(exams);
            } catch (err: any) {
                setError(err.message || "Failed to load dashboard data");
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);
    
    const renderStatusBadge = (status?: string | null) => {
        if (!status) return <span className="px-2 py-0.5 text-xs font-medium text-gray-100 rounded-full bg-gray-500">N/A</span>;
        
        let bgColor = "bg-gray-500 dark:bg-gray-600";
        let textColor = "text-gray-100 dark:text-gray-100";

        const lowerStatus = status.toLowerCase();

        if (lowerStatus.includes("aprovado")) {
             bgColor = "bg-green-100 dark:bg-green-700"; textColor = "text-green-700 dark:text-green-100";
        } else if (lowerStatus.includes("reprovado")) {
             bgColor = "bg-red-100 dark:bg-red-700"; textColor = "text-red-700 dark:text-red-100";
        } else if (lowerStatus.includes("inscrito") || lowerStatus.includes("em análise") || lowerStatus.includes("ativo")) {
             bgColor = "bg-blue-100 dark:bg-blue-700"; textColor = "text-blue-700 dark:text-blue-100";
        } else if (lowerStatus.includes("pendente")) {
            bgColor = "bg-yellow-100 dark:bg-yellow-700"; textColor = "text-yellow-700 dark:text-yellow-100";
        }
        return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor}`}>{status}</span>;
    };


    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[...Array(4)].map((_, i) => ( <div key={i} className="bg-white dark:bg-gray-800 h-36 p-6 rounded-xl shadow-lg"></div>))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg h-96"></div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg h-96"></div>
                </div>
            </div>
        );
    }
    
    if (error) {
        return <div className="flex justify-center items-center min-h-[calc(100vh-200px)] text-red-500 dark:text-red-400 text-center p-4">
            <p className="text-xl">Erro ao carregar dados do painel:</p>
            <p className="mt-2">{error}</p>
        </div>;
    }

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">Visão geral e estatísticas do sistema.</p>
            </div>
            
            {systemStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { title: "Inscrições", value: systemStats.registrations, icon: <UsersIcon />, color: "text-blue-500 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-500/20" },
                        { title: "Provas Agendadas", value: systemStats.exams_scheduled, icon: <CalendarDaysIcon />, color: "text-indigo-500 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-500/20" },
                        { title: "Provas Corrigidas", value: systemStats.exams_corrected, icon: <CheckBadgeIcon />, color: "text-green-500 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-500/20" },
                        { title: "Revisões Pendentes", value: systemStats.pending_reviews, icon: <ClockIcon />, color: "text-yellow-500 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-500/20" },
                    ].map(stat => (
                        <div key={stat.title} className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex items-center space-x-4 border-l-4 border-current ${stat.color}`}>
                            <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                {React.cloneElement(stat.icon, { className: `w-7 h-7 ${stat.color}` })}
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-800 dark:text-white">{stat.value}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Candidatos Recentes</h3>
                        {/* <Link href="/admin/candidates" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Ver todos</Link> */}
                    </div>
                    {recentCandidates.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-left text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="p-3 font-semibold">Nome</th>
                                        <th className="p-3 font-semibold">Curso</th>
                                        <th className="p-3 font-semibold">Status</th>
                                        <th className="p-3 font-semibold text-right">Data Inscrição</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {recentCandidates.map(candidate => (
                                        <tr key={candidate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-3">
                                                <div className="font-medium text-gray-800 dark:text-gray-100">{candidate.first_name} {candidate.last_name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{candidate.email}</div>
                                            </td>
                                            <td className="p-3 text-gray-600 dark:text-gray-300">{candidate.course_name || "N/A"}</td>
                                            <td className="p-3">{renderStatusBadge(candidate.enrollment_status)}</td>
                                            <td className="p-3 text-gray-600 dark:text-gray-300 text-right">{formatDate(candidate.enrolled_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum candidato recente.</p>}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Próximas Provas</h3>
                        <Link href="/admin/scheduling" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Ver todas</Link>
                    </div>
                    {upcomingExams.length > 0 ? (
                        <ul className="space-y-4">
                            {upcomingExams.map(exam => (
                                <li key={exam.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                        <p className="font-semibold text-blue-600 dark:text-blue-400">{exam.exam_name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{exam.course_name} - {exam.discipline_name}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 font-medium rounded-full ${
                                            exam.exam_type.toLowerCase() === 'objective' ? 'bg-purple-100 text-purple-700 dark:bg-purple-700 dark:text-purple-100' :
                                            exam.exam_type.toLowerCase() === 'discursive' ? 'bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-100' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                                        }`}>{exam.exam_type}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{formatDate(exam.exam_date, true)}</p>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma prova agendada.</p>}
                </div>
            </div>
        </div>
    );
}