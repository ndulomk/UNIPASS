// src/components/exams/CreateExamForm.tsx

import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api'; // Sua instância do Axios
import { Button } from '@/components/ui/button'; // Supondo que você use ShadCN/UI ou similar
import { Input } from '@/components/ui/All';
import { Label } from '@/components/ui/All';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/All';
import { Textarea } from '@/components/ui/All';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Tipos baseados no seu backend
const questionSchema = z.object({
  text: z.string().min(1, 'O texto da questão é obrigatório.'),
  type: z.enum(['multiple_choice', 'true_false', 'essay']),
  score: z.coerce.number().positive('A pontuação deve ser positiva.'),
  correct_answer: z.string().min(1, 'A resposta correta é obrigatória.'),
  options: z.array(z.object({ text: z.string() })).optional(),
});

const examSchema = z.object({
  name: z.string().min(3, 'O nome do exame é obrigatório.'),
  course_id: z.string().min(1),
  exam_date: z.string().min(1, 'A data do exame é obrigatória.'),
  duration_minutes: z.coerce.number().int().positive('A duração deve ser um número positivo.'),
  type: z.enum(['objective', 'discursive', 'mixed']),
  questions: z.array(questionSchema).min(1, 'O exame deve ter pelo menos uma questão.'),
});

type ExamFormData = z.infer<typeof examSchema>;

const CreateExamForm = ({ courseId }: { courseId: string }) => {
  const { register, handleSubmit, control, formState: { errors, isSubmitting }, watch, getValues } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      course_id: courseId,
      type: 'mixed',
      questions: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "questions",
  });

  const questionTypes = watch('questions');

  const onSubmit = async (data: ExamFormData) => {
    const max_score = data.questions.reduce((acc, q) => acc + q.score, 0);

    const payload = {
      ...data,
      max_score,
      questions: data.questions.map(q => ({
        ...q,
        options: q.type === 'multiple_choice' ? q.options?.map(opt => opt.text) : undefined,
      })),
    };

    try {
      await api.post('/exams', payload);
      toast.success('Exame criado com sucesso!');
      // Resetar form ou redirecionar
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar o exame. Verifique o console.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-4 md:p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold border-b pb-4">Criar Novo Exame</h2>

      {/* Detalhes do Exame */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name">Nome do Exame</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="exam_date">Data e Hora do Exame</Label>
          <Input id="exam_date" type="datetime-local" {...register('exam_date')} />
          {errors.exam_date && <p className="text-red-500 text-sm mt-1">{errors.exam_date.message}</p>}
        </div>
        <div>
          <Label htmlFor="duration_minutes">Duração (minutos)</Label>
          <Input id="duration_minutes" type="number" {...register('duration_minutes')} />
          {errors.duration_minutes && <p className="text-red-500 text-sm mt-1">{errors.duration_minutes.message}</p>}
        </div>
        <div>
          <Label>Tipo de Exame</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="objective">Objetivo</SelectItem>
                  <SelectItem value="discursive">Discursivo</SelectItem>
                  <SelectItem value="mixed">Misto</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Seção de Questões */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold border-b pb-2">Questões</h3>
        {fields.map((field, index) => (
          <div key={field.id} className="p-4 border rounded-md space-y-4 bg-slate-50 dark:bg-slate-700/50">
            <div className="flex justify-between items-center">
              <h4 className="font-bold">Questão {index + 1}</h4>
              <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div>
              <Label>Tipo da Questão</Label>
              <Controller
                name={`questions.${index}.type`}
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                      <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
                      <SelectItem value="essay">Dissertativa</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>Texto da Questão</Label>
              <Textarea {...register(`questions.${index}.text`)} />
              {errors.questions?.[index]?.text && <p className="text-red-500 text-sm mt-1">{errors.questions[index].text.message}</p>}
            </div>

            {/* Campos Condicionais */}
            {questionTypes[index]?.type === 'true_false' && (
               <div>
                <Label>Resposta Correta</Label>
                <Controller
                  name={`questions.${index}.correct_answer`}
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger><SelectValue placeholder="Selecione a resposta" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Verdadeiro</SelectItem>
                        <SelectItem value="false">Falso</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
            
            {questionTypes[index]?.type === 'multiple_choice' && (
              <div className='space-y-2'>
                <Label>Opções e Resposta Correta</Label>
                 {/* Lógica para adicionar/remover opções e selecionar a correta aqui */}
                 <Input placeholder="Adicione as opções aqui (lógica a implementar)" />
                 <Input placeholder="Índice da resposta correta" {...register(`questions.${index}.correct_answer`)} />
              </div>
            )}
            
            {questionTypes[index]?.type === 'essay' && (
               <div>
                 <Label>Resposta Correta (Referência)</Label>
                 <Textarea {...register(`questions.${index}.correct_answer`)} />
               </div>
            )}

            <div>
              <Label>Pontuação</Label>
              <Input type="number" step="0.5" {...register(`questions.${index}.score`)} />
              {errors.questions?.[index]?.score && <p className="text-red-500 text-sm mt-1">{errors.questions[index].score.message}</p>}
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => append({ text: '', type: 'multiple_choice', score: 1, correct_answer: '' })}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" /> Adicionar Questão
        </Button>
      </div>
      
      {errors.questions && <p className="text-red-500 text-sm mt-1">{errors.questions.message}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? 'Salvando...' : 'Salvar Exame'}
        </Button>
      </div>
    </form>
  );
};

export default CreateExamForm;