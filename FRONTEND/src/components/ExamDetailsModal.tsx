 'use client';

import React from 'react';
import { X, HelpCircle, CheckCircle, FileText, Clock, Calendar } from 'lucide-react';
import Modal from '@/components/Modal'; // Supondo um componente Modal genérico

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  score: number;
  // Se o aluno puder ver as respostas após a correção:
  // correct_answer?: string;
  // student_answer?: string; // Precisaria de um endpoint para buscar respostas do aluno
}

interface Exam {
  id: number;
  exam_name: string;
  exam_date: string;
  duration: number;
  exam_type: string;
  discipline_name?: string;
  questions?: Question[];
  second_call_eligible?: boolean;
  second_call_date?: string | null;
  publication_date?: string | null;
}

interface PerformanceResult {
  score: number;
  max_score: number;
  grade: string;
}

interface ExamDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  studentPerformance?: PerformanceResult; // Resultado do aluno para este exame
}

const ExamDetailsModal = ({ isOpen, onClose, exam, studentPerformance }: ExamDetailsModalProps) => {
  if (!isOpen) return null;

  const canViewQuestions = exam.questions && exam.questions.length > 0 && new Date(exam.publication_date || 0) <= new Date() && studentPerformance;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes do Exame: ${exam.exam_name}`}>
        <div className="space-y-4 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoItem icon={<FileText />} label="Disciplina" value={exam.discipline_name || 'N/A'} />
                <InfoItem icon={<Calendar />} label="Data" value={new Date(exam.exam_date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                <InfoItem icon={<Clock />} label="Duração" value={`${exam.duration} minutos`} />
                <InfoItem icon={<HelpCircle />} label="Tipo" value={exam.exam_type} />
                {exam.second_call_eligible && exam.second_call_date && (
                    <InfoItem icon={<Calendar />} label="2ª Chamada" value={new Date(exam.second_call_date).toLocaleDateString('pt-BR')} />
                )}
                {exam.publication_date && (
                     <InfoItem icon={<Calendar />} label="Publicação Resultados" value={new Date(exam.publication_date).toLocaleDateString('pt-BR')} />
                )}
            </div>

            {studentPerformance && (
                <div className="mt-4 p-4 bg-sky-50 dark:bg-sky-900/30 rounded-lg">
                    <h4 className="font-semibold text-md text-sky-700 dark:text-sky-300 mb-2">Seu Resultado:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <InfoItem label="Pontuação" value={`${studentPerformance.score} / ${studentPerformance.max_score}`} />
                        <InfoItem label="Nota/Status" value={studentPerformance.grade} 
                            valueClassName={parseFloat(studentPerformance.grade) >= 9.5 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}/>
                    </div>
                </div>
            )}
            
            {canViewQuestions ? (
                <div className="mt-6">
                    <h4 className="font-semibold text-md text-slate-700 dark:text-slate-200 mb-3">Questões:</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {exam.questions?.map((q, index) => (
                            <div key={q.id} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-md">
                                <p className="font-medium text-sm text-slate-800 dark:text-slate-100">
                                    {index + 1}. {q.question_text} ({q.score} pts)
                                </p>
                                {/* Aqui você adicionaria a resposta do aluno e a correta se disponível e permitido */}
                                {/* <p className="text-xs text-green-600 dark:text-green-400">Correta: {q.correct_answer}</p> */}
                            </div>
                        ))}
                    </div>
                </div>
            ) : exam.questions && exam.questions.length > 0 && !studentPerformance ? (
                 <p className="mt-4 text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-md">
                    Os resultados deste exame ainda não foram publicados. As questões não estão disponíveis para visualização.
                 </p>
            ) : null}


            {!exam.questions || exam.questions.length === 0 && (
                 <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    As questões para este exame não estão disponíveis para visualização no momento.
                 </p>
            )}
        </div>
    </Modal>
  );
};

const InfoItem = ({icon, label, value, valueClassName}: {icon?: React.ReactNode, label:string, value:string, valueClassName?: string}) => (
    <div className="flex items-start space-x-2">
        {icon && React.cloneElement(icon as React.ReactElement, { className: `h-5 w-5 text-sky-500 mt-0.5`})}
        <div>
            <span className="font-medium text-slate-600 dark:text-slate-400">{label}: </span>
            <span className={`text-slate-800 dark:text-slate-200 ${valueClassName || ''}`}>{value}</span>
        </div>
    </div>
)

export default ExamDetailsModal;