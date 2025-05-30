'use client';
import React from 'react';
import { QuestionFormData } from '@/types';

interface QuestionInputProps {
    question: QuestionFormData;
    index: number;
    onChange: (index: number, field: keyof QuestionFormData, value: string | number) => void;
    onRemove: (index: number) => void;
}

export default function QuestionInput({ question, index, onChange, onRemove }: QuestionInputProps) {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onChange(index, name as keyof QuestionFormData, name === 'score' ? Math.max(0, parseInt(value) || 0) : value);
    };



    return (
        <div className="p-4 border border-gray-700 rounded-lg mb-4 space-y-3 bg-white/5">
            <div className="flex justify-between items-center">
                <h4 className="text-md font-semibold text-blue-100">Questão {index + 1}</h4>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md"
                >
                    Remover
                </button>
            </div>
            <div>
                <label htmlFor={`question_text_${index}`} className="block text-xs text-blue-200 mb-1">
                    Texto da Questão
                </label>
                <input
                    type="text"
                    id={`question_text_${index}`}
                    name="question_text"
                    value={question.question_text}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-md bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 border border-white/10"
                    required
                />
            </div>
            <div>
                <label htmlFor={`correct_answer_${index}`} className="block text-xs text-blue-200 mb-1">
                    Resposta Correta
                </label>
                <input
                    type="text"
                    id={`correct_answer_${index}`}
                    name="correct_answer"
                    value={question.correct_answer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-md bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 border border-white/10"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor={`question_type_${index}`} className="block text-xs text-blue-200 mb-1">
                        Tipo da Questão
                    </label>
                    <select
                        id={`question_type_${index}`}
                        name="question_type"
                        value={question.question_type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-md bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-400 border border-white/10 appearance-none"
                        required
                    >
                        <option className="text-gray-700" value="">Selecione o tipo</option>
                        <option className="text-gray-700" value="multiple_choice">Múltipla Escolha</option>
                        <option className="text-gray-700" value="essay">Dissertativa</option>
                        <option className="text-gray-700" value="true_false">Verdadeiro/Falso</option>
                        <option className="text-gray-700" value="short_answer">Resposta Curta</option>
                    </select>
                </div>
                <div>
                    <label htmlFor={`score_${index}`} className="block text-xs text-blue-200 mb-1">
                        Pontuação
                    </label>
                      <input
                        type="number"
                        value={question.score || ''}
                        onChange={handleInputChange}
                        min="0"
                        className="w-20 px-2 py-1 rounded bg-white/10 text-white border border-white/20"
                      />
                </div>
            </div>
        </div>
    );
}