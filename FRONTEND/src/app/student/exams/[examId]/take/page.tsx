'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StudentLayout from '@/components/StudentLayout';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { fetchExamDetails, submitExamAnswers } from '@/lib/api';
import { Loader2, AlertTriangle, CheckCircle, Clock, Send } from 'lucide-react';

interface Option {
    id: number | string; 
    text: string;
    is_correct?: boolean;
    is_multiple?: boolean; 
}

interface Question {
    id: number;
    exam_id: number;
    question_text: string;
    correct_answer?: string | string[] | null;
    question_type: 'multiple_choice' | 'true_false' | 'essay';
    score: number;
    options?: Option[];
    created_at?: string;
    updated_at?: string;
}

interface ExamDetail {
    id: number;
    course_id: number;
    discipline_id: number;
    exam_name: string;
    exam_date: string;
    duration: number; 
    exam_type: string;
    second_call_eligible?: boolean;
    second_call_date?: string | null;
    publication_date?: string | null;
    created_at?: string;
    updated_at?: string;
    questions: Question[];
    discipline?: { name?: string }; 
}

interface AnswerPayloadItem {
    question_id: number;
    answer: AnswerType | null;
}

interface SubmitExamApiPayload {
    enrollment_id: number;
    exam_id: number;
    answers: AnswerPayloadItem[];
}

type AnswerType = string | string[];

interface StudentAnswersState {
    [questionId: number]: AnswerType;
}

const TakeExamPage = () => {
    const router = useRouter();
    const params = useParams();
    const examIdFromParams = params.examId as string;

    const { enrollment, user, isAuthenticated, isLoading: authLoading } = useSelector((state: RootState) => state.auth);

    const [examDetails, setExamDetails] = useState<ExamDetail | null>(null);
    const [studentAnswers, setStudentAnswers] = useState<StudentAnswersState>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [loadingPageData, setLoadingPageData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!examIdFromParams || authLoading || !enrollment || !enrollment.id) {
             if (!authLoading && isAuthenticated && !enrollment?.id) {
                setError("Matrícula do estudante não encontrada. Não é possível carregar a prova.");
                setLoadingPageData(false);
            }
            return;
        }

        const loadExam = async () => {
            setLoadingPageData(true);
            setError(null);
            try {
                const details = await fetchExamDetails(Number(examIdFromParams));
                setExamDetails(details);
                if (details.duration) {
                    setTimeLeft(details.duration * 60);
                }
                const initialAnswers: StudentAnswersState = {};
                details.questions.forEach(q => {
                    initialAnswers[q.id] = q.question_type === 'multiple_choice' && q.options?.some(opt => opt.is_multiple) ? [] : '';
                });
                setStudentAnswers(initialAnswers);
            } catch (err: any) {
                setError(err.message || "Não foi possível carregar a prova.");
            } finally {
                setLoadingPageData(false);
            }
        };
        loadExam();
    }, [examIdFromParams, authLoading, enrollment, isAuthenticated]);

    const handleSubmitAnswers = useCallback(async (isAutoSubmit = false) => {
        if (!examDetails || !enrollment || !enrollment.id) {
            if (!isAutoSubmit) alert("Informações da prova ou matrícula em falta.");
            return;
        }
        
        if (Object.keys(studentAnswers).length === 0 && !isAutoSubmit && examDetails.questions.length > 0) {
            alert("Por favor, responda pelo menos uma questão ou aguarde o tempo esgotar.");
            return;
        }

        if (!isAutoSubmit && !confirm("Tem certeza que deseja submeter suas respostas? Esta ação não pode ser desfeita.")) return;

        setSubmitting(true);
        setError(null);
        setSubmissionStatus('idle');

        const answersPayload: AnswerPayloadItem[] = examDetails.questions.map(q => ({
            question_id: q.id,
            answer: studentAnswers[q.id] === undefined || (Array.isArray(studentAnswers[q.id]) && (studentAnswers[q.id] as string[]).length === 0)
                ? null 
                : studentAnswers[q.id]
        }));

        const fullApiPayload: SubmitExamApiPayload = {
            enrollment_id: enrollment.id,
            exam_id: examDetails.id,
            answers: answersPayload
        };

        try {
            await submitExamAnswers(fullApiPayload);
            setSubmissionStatus('success');
            setTimeLeft(null); 
            if (!isAutoSubmit) alert("Prova submetida com sucesso!");
            else alert("Tempo esgotado! A prova foi submetida automaticamente.");
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Falha ao submeter a prova. Tente novamente ou contacte o suporte.");
            setSubmissionStatus('error');
        } finally {
            setSubmitting(false);
        }
    }, [examDetails, enrollment, studentAnswers]);

    useEffect(() => {
        if (timeLeft === null || timeLeft < 0) return; 

        if (timeLeft === 0) {
            if (submissionStatus === 'idle' && !submitting && examDetails) {
                handleSubmitAnswers(true);
            }
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prevTime => (prevTime !== null ? Math.max(0, prevTime - 1) : 0));
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft, handleSubmitAnswers, submissionStatus, submitting, examDetails]);


    const handleAnswerChange = (questionId: number, answerValue: string, questionType: Question['question_type'], isOptionMultipleSelect?: boolean) => {
        setStudentAnswers(prevAnswers => {
            const updatedAnswers = { ...prevAnswers };
            if (questionType === 'multiple_choice' && isOptionMultipleSelect) {
                const currentSelectedOptions = (prevAnswers[questionId] as string[] || []);
                if (currentSelectedOptions.includes(answerValue)) {
                    updatedAnswers[questionId] = currentSelectedOptions.filter(a => a !== answerValue);
                } else {
                    updatedAnswers[questionId] = [...currentSelectedOptions, answerValue];
                }
            } else {
                updatedAnswers[questionId] = answerValue;
            }
            return updatedAnswers;
        });
    };
    
    if (loadingPageData || authLoading) {
        return (
            <StudentLayout enrollmentId={enrollment?.id?.toString()}>
                <div className="flex flex-col justify-center items-center h-screen">
                    <Loader2 className="h-16 w-16 animate-spin text-sky-500" />
                    <p className="ml-4 text-xl mt-4 text-slate-600 dark:text-slate-300">A carregar a prova...</p>
                </div>
            </StudentLayout>
        );
    }

    if (error && submissionStatus !== 'success') {
        return (
            <StudentLayout enrollmentId={enrollment?.id?.toString()}>
                <div className="flex flex-col justify-center items-center h-screen p-4 text-center">
                    <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                    <h2 className="text-2xl font-semibold text-red-700 dark:text-red-400 mb-2">Erro ao Carregar Prova</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                    >
                        Voltar
                    </button>
                </div>
            </StudentLayout>
        );
    }
    
    if (submissionStatus === 'success') {
         return (
            <StudentLayout enrollmentId={enrollment?.id?.toString()}>
                <div className="flex flex-col justify-center items-center h-screen p-4 text-center">
                    <CheckCircle className="h-20 w-20 text-green-500 mb-6" />
                    <h2 className="text-3xl font-semibold text-green-700 dark:text-green-400 mb-3">Prova Submetida!</h2>
                    <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">Suas respostas foram enviadas com sucesso. Boa sorte!</p>
                    <Link href="/student/exams" legacyBehavior>
                        <a className="px-8 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-base font-medium">
                            Voltar para Meus Exames
                        </a>
                    </Link>
                </div>
            </StudentLayout>
        );
    }

    if (!examDetails) {
         return (
            <StudentLayout enrollmentId={enrollment?.id?.toString()}>
                <div className="flex flex-col justify-center items-center h-screen text-center p-4">
                     <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
                    <p className="text-xl text-slate-500 dark:text-slate-400">Detalhes da prova não puderam ser carregados.</p>
                     <button
                        onClick={() => router.back()}
                        className="mt-6 px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                    >
                        Tentar Voltar
                    </button>
                </div>
            </StudentLayout>
        );
    }
    
    const formatTime = (totalSeconds: number | null): string => {
        if (totalSeconds === null) return '00:00';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <StudentLayout enrollmentId={enrollment?.id.toString()}>
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-xl shadow-2xl mb-8 sticky top-4 z-20 border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className='flex-grow'>
                            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100">
                                {examDetails.exam_name}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{examDetails.discipline?.name || 'Disciplina não especificada'}</p>
                        </div>
                        {timeLeft !== null && (
                            <div className={`flex items-center text-xl md:text-2xl font-semibold p-3 px-4 rounded-lg ${timeLeft <= 300 && timeLeft > 0 ? 'text-red-600 dark:text-red-400 animate-pulse' : timeLeft === 0 ? 'text-red-700 dark:text-red-500' : 'text-sky-600 dark:text-sky-400'} bg-slate-100 dark:bg-slate-700 shadow-inner`}>
                                <Clock size={28} className="mr-2 shrink-0" />
                                <span className='whitespace-nowrap'>Tempo:</span>
                                <span className='ml-2 min-w-[70px] text-left'>{formatTime(timeLeft)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAnswers(); }}>
                    {examDetails.questions.map((question, index) => (
                        <div key={question.id} className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                                    Questão {index + 1}
                                </h3>
                                <span className="text-sm font-medium text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-700/50 px-3 py-1 rounded-full">({question.score} {question.score === 1 ? "ponto" : "pontos"})</span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-300 mb-5 whitespace-pre-wrap prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: question.question_text }}></div>
                            
                            {question.question_type === 'essay' && (
                                <textarea
                                    rows={6}
                                    value={studentAnswers[question.id] as string || ''}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value, question.question_type)}
                                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-slate-100 transition-colors"
                                    placeholder="Digite sua resposta aqui..."
                                    disabled={submitting || submissionStatus==='success' || timeLeft === 0}
                                />
                            )}

                            {question.question_type === 'multiple_choice' && question.options && (
                                <div className="space-y-3">
                                    {question.options.map(opt => (
                                        <label key={opt.id} className={`flex items-start p-4 rounded-lg transition-all duration-150 border cursor-pointer
                                                                    ${( (question.options?.some(o => o.is_multiple) ? (studentAnswers[question.id] as string[] || []).includes(opt.text) : studentAnswers[question.id] === opt.text) ) 
                                                                        ? 'bg-sky-50 dark:bg-sky-700/30 border-sky-400 dark:border-sky-600 ring-2 ring-sky-300 dark:ring-sky-500' 
                                                                        : 'bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                                    } ${(submitting || submissionStatus==='success' || timeLeft === 0) ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <input
                                                type={question.options?.some(o => o.is_multiple) ? "checkbox" : "radio"}
                                                name={`question_${question.id}`}
                                                value={opt.text}
                                                checked={
                                                    question.options?.some(o => o.is_multiple) 
                                                    ? (studentAnswers[question.id] as string[] || []).includes(opt.text) 
                                                    : studentAnswers[question.id] === opt.text
                                                }
                                                onChange={() => handleAnswerChange(question.id, opt.text, question.question_type, question.options?.some(o => o.is_multiple))}
                                                className={`form-${question.options?.some(o => o.is_multiple) ? 'checkbox' : 'radio'} h-5 w-5 text-sky-600 border-slate-400 focus:ring-sky-500 mr-3 mt-0.5 shrink-0`}
                                                disabled={submitting || submissionStatus==='success' || timeLeft === 0}
                                            />
                                            <span className="text-slate-700 dark:text-slate-200 flex-grow" dangerouslySetInnerHTML={{ __html: opt.text }}></span>
                                        </label>
                                    ))}
                                </div>
                            )}
                             {question.question_type === 'true_false' && (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <label className={`flex items-center p-4 rounded-lg transition-all duration-150 border flex-1
                                                        ${studentAnswers[question.id] === "Verdadeiro" 
                                                            ? 'bg-sky-50 dark:bg-sky-700/30 border-sky-400 dark:border-sky-600 ring-2 ring-sky-300 dark:ring-sky-500' 
                                                            : 'bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                        } ${(submitting || submissionStatus==='success' || timeLeft === 0) ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question_${question.id}`}
                                            value="Verdadeiro"
                                            checked={studentAnswers[question.id] === "Verdadeiro"}
                                            onChange={() => handleAnswerChange(question.id, "Verdadeiro", question.question_type)}
                                            className="form-radio h-5 w-5 text-sky-600 border-slate-400 focus:ring-sky-500 mr-3 shrink-0"
                                            disabled={submitting || submissionStatus === 'success' || timeLeft === 0}
                                        />
                                        <span className="text-slate-700 dark:text-slate-200">Verdadeiro</span>
                                    </label>
                                    <label className={`flex items-center p-4 rounded-lg transition-all duration-150 border flex-1
                                                        ${studentAnswers[question.id] === "Falso" 
                                                            ? 'bg-sky-50 dark:bg-sky-700/30 border-sky-400 dark:border-sky-600 ring-2 ring-sky-300 dark:ring-sky-500' 
                                                            : 'bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                        } ${(submitting || submissionStatus==='success' || timeLeft === 0) ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question_${question.id}`}
                                            value="Falso"
                                            checked={studentAnswers[question.id] === "Falso"}
                                            onChange={() => handleAnswerChange(question.id, "Falso", question.question_type)}
                                            className="form-radio h-5 w-5 text-sky-600 border-slate-400 focus:ring-sky-500 mr-3 shrink-0"
                                            disabled={submitting || submissionStatus === 'success' || timeLeft === 0}
                                        />
                                        <span className="text-slate-700 dark:text-slate-200">Falso</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {submissionStatus !== 'success' && examDetails.questions.length > 0 && (
                         <div className="mt-10 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || timeLeft === 0 || submissionStatus === 'success'}
                                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-base"
                            >
                                {submitting ? (
                                    <Loader2 size={20} className="animate-spin mr-2" />
                                ) : (
                                    <Send size={20} className="mr-2" />
                                )}
                                {submitting ? 'A Submeter...' : 'Submeter Prova'}
                            </button>
                        </div>
                    )}
                     {submissionStatus === 'error' && error && (
                        <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
                            <p className="font-semibold text-lg mb-1">Falha na Submissão:</p>
                            <p>{error}</p>
                        </div>
                    )}
                </form>
            </div>
        </StudentLayout>
    );
};

export default TakeExamPage;