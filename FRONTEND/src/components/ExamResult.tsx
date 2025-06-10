"use client";

import { useState, useEffect } from 'react';
import { fetchExamDetails, fetchStudentAnswers } from '@/lib/api';
import { ExamDetail, StudentAnswer } from '@/types';
import { CheckCircle2, XCircle, Loader2, Award, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ExamResultData {
  exam_id: number;
  total_score_obtained: number;
  max_score_possible: number;
  grade: string;
  exam_name: string;
  answers: StudentAnswer[];
}

const ExamResult = ({ examId, enrollmentId }: { examId: string; enrollmentId: string }) => {
  const [result, setResult] = useState<ExamResultData | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [answersResponse, examDetailsResponse] = await Promise.all([
          fetchStudentAnswers(Number(enrollmentId), Number(examId)),
          fetchExamDetails(Number(examId)),
        ]);

        if (!answersResponse.length) {
          throw new Error('No results found for this exam');
        }

        const totalScoreObtained = answersResponse.reduce((sum, a) => sum + (a.score_awarded || 0), 0);
        const maxScorePossible = examDetailsResponse.questions.reduce((sum, q) => sum + (q.score || 0), 0);

        const resultData: ExamResultData = {
          exam_id: Number(examId),
          total_score_obtained: totalScoreObtained,
          max_score_possible: maxScorePossible,
          grade: totalScoreObtained >= maxScorePossible * 0.6 ? 'Aprovado' : 'Reprovado',
          exam_name: examDetailsResponse.name,
          answers: answersResponse,
        };

        setResult(resultData);
        setExamDetails(examDetailsResponse);
      } catch (error: any) {
        toast.error(error.message || 'Erro ao carregar os resultados.');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [examId, enrollmentId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!result || !examDetails) {
    return <div className="text-center p-8">Resultados não encontrados para este exame.</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 text-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{result.exam_name}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Resultado Final</p>
        <div className="mt-4 flex justify-center items-center gap-4">
          <div
            className={`flex items-center gap-2 text-xl font-bold p-3 rounded-lg ${
              result.grade === 'Aprovado'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
            }`}
          >
            <Award className="h-6 w-6" />
            <span>{result.grade}</span>
          </div>
          <div className="flex items-center gap-2 text-xl font-bold p-3 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
            <BookOpen className="h-6 w-6" />
            <span>
              Nota: {result.total_score_obtained.toFixed(2)} / {result.max_score_possible}
            </span>
          </div>
        </div>
      </header>

      <main className="space-y-4">
        <h2 className="text-2xl font-semibold">Revisão das Questões</h2>
        {examDetails.questions.map((question, index) => {
          const studentAnswer = result.answers.find((a) => a.question_id === question.id);
          const isCorrect = studentAnswer?.is_correct ?? false;

          return (
            <div
              key={question.id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4"
              style={{ borderColor: isCorrect ? '#22c55e' : '#ef4444' }}
            >
              <div className="flex justify-between items-start">
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  Questão {index + 1}
                </p>
                {isCorrect ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{question.text}</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
                  <h4 className="font-bold text-red-600 dark:text-red-400">Sua Resposta</h4>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">
                    {studentAnswer?.answer || 'Não respondida'}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-md">
                  <h4 className="font-bold text-green-600 dark:text-green-400">Resposta Correta</h4>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">
                    {studentAnswer?.correct_answer || 'Não disponível'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default ExamResult;