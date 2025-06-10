"use client";

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { uploadExam } from '@/lib/api';

import { Button } from '@/components/ui/All';
import { Input } from '@/components/ui/All';
import { Label } from '@/components/ui/All';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/All';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/All';
import { Trash2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

const questionSchema = z.object({
  text: z.string().min(1, 'O texto da questão é obrigatório.'),
  type: z.enum(['true_false', 'multiple_choice', 'essay']),
  options: z.array(z.string()).optional(),
  correct_answer: z.string().min(1, 'A resposta correta é obrigatória.'),
  score: z.coerce.number().min(1, 'A pontuação deve ser pelo menos 1.'),
});

const examFormSchema = z.object({
  name: z.string().min(3, 'O nome da prova é obrigatório.'),
  course_id: z.coerce.number().min(1, "O curso é obrigatório."),
  discipline_id: z.coerce.number().min(1, "A disciplina é obrigatória."),
  academic_period_id: z.coerce.number().min(1, "O período acadêmico é obrigatório."),
  exam_date: z.string().min(1, 'A data da prova é obrigatória.'),
  duration_minutes: z.coerce.number().min(1, 'A duração deve ser um número positivo.'),
  type: z.enum(['objective', 'discursive', 'mixed']),
  questions: z.array(questionSchema).min(1, 'Pelo menos uma questão é obrigatória.'),
});

type ExamFormData = z.infer<typeof examFormSchema>;

export default function CreateExamPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, control, handleSubmit, formState: { errors }, watch } = useForm<ExamFormData>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      name: '',
      type: 'mixed',
      duration_minutes: 60,
      questions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });

  const questionType = watch('questions');

  const onSubmit = async (data: ExamFormData) => {
    console.log(data)
    setIsLoading(true);
    toast.info("Enviando prova...");
    try {
      const apiData = {
          ...data,
          max_score: data.questions.reduce((sum, q) => sum + q.score, 0),
      };
      await uploadExam(apiData as any);
      toast.success("Prova criada com sucesso!");
      router.push('/admin/exams');
    } catch (error) {
      toast.error(error.message || 'Falha ao criar prova.');
      setIsLoading(false);
    }
  };

  return( 
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <Card className="max-w-4xl mx-auto border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Criar Nova Prova</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nome da Prova</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="type">Tipo de Prova</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="objective">Objetiva</SelectItem>
                        <SelectItem value="discursive">Discursiva</SelectItem>
                        <SelectItem value="mixed">Mista</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div>
                    <Label htmlFor="course_id">Curso</Label>
                    <Input id="course_id" type="number" {...register('course_id')} placeholder="Digite o ID do Curso"/>
                    {errors.course_id && <p className="text-red-500 text-sm mt-1">{errors.course_id.message}</p>}
                 </div>
                 <div>
                    <Label htmlFor="discipline_id">Disciplina</Label>
                    <Input id="discipline_id" type="number" {...register('discipline_id')} placeholder="Digite o ID da Disciplina"/>
                    {errors.discipline_id && <p className="text-red-500 text-sm mt-1">{errors.discipline_id.message}</p>}
                 </div>
                 <div>
                    <Label htmlFor="academic_period_id">Período Acadêmico</Label>
                    <Input id="academic_period_id" type="number" {...register('academic_period_id')} placeholder="Digite o ID do Período"/>
                    {errors.academic_period_id && <p className="text-red-500 text-sm mt-1">{errors.academic_period_id.message}</p>}
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="exam_date">Data da Prova</Label>
                    <Input id="exam_date" type="datetime-local" {...register('exam_date')} />
                    {errors.exam_date && <p className="text-red-500 text-sm mt-1">{errors.exam_date.message}</p>}
                </div>
                <div>
                    <Label htmlFor="duration_minutes">Duração (Minutos)</Label>
                    <Input id="duration_minutes" type="number" {...register('duration_minutes')} />
                    {errors.duration_minutes && <p className="text-red-500 text-sm mt-1">{errors.duration_minutes.message}</p>}
                </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-700">Questões</h3>
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-gray-50">
                  <div className="space-y-3">
                    <Label>Questão {index + 1}</Label>
                    <Input {...register(`questions.${index}.text`)} placeholder="Texto da questão"/>
                    {errors.questions?.[index]?.text && <p className="text-red-500 text-sm">{errors.questions[index].text.message}</p>}

                    <Controller
                        name={`questions.${index}.type`}
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Selecione o tipo de questão" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
                                    <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                                    <SelectItem value="essay">Dissertativa</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />

                    {questionType[index]?.type === 'true_false' && (
                        <Controller
                            name={`questions.${index}.correct_answer`}
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Resposta Correta" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Verdadeiro</SelectItem>
                                        <SelectItem value="false">Falso</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    )}

                    {questionType[index]?.type !== 'true_false' && (
                        <Input {...register(`questions.${index}.correct_answer`)} placeholder="Resposta correta"/>
                    )}

                    <Input type="number" {...register(`questions.${index}.score`)} placeholder="Pontuação desta questão" />

                  </div>
                  <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} className="mt-2">
                    <Trash2 className="h-4 w-4 mr-1"/> Remover Questão
                  </Button>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ text: '', type: 'true_false', correct_answer: '', score: 1 })}
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Questão
              </Button>
               {errors.questions && <p className="text-red-500 text-sm mt-1">{errors.questions.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Prova'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}