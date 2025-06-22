import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { fetchCourses, uploadExam } from '../lib/api';
import { Trash2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import Label from '../components/ui/Label';
import Input from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import Button from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';

// Schema da Questão
const questionSchema = z.object({
  text: z.string().min(1, 'O texto da questão é obrigatório.'),
  type: z.enum(['true_false', 'multiple_choice', 'essay']),
  options: z.array(z.object({ value: z.string().min(1, 'A opção não pode estar vazia.') })).optional(),
  correct_answers: z.array(z.string()).min(1, 'Pelo menos uma resposta correta é obrigatória.'),
  score: z.coerce.number().min(1, 'A pontuação deve ser pelo menos 1.'),
}).superRefine((data, ctx) => {
  if (data.type === 'multiple_choice') {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Múltipla escolha deve ter pelo menos 2 opções.',
      });
    }
    if (data.options) {
      const optionValues = data.options.map(opt => opt.value);
      const allAnswersAreValidOptions = data.correct_answers.every(ans => optionValues.includes(ans));
      if (!allAnswersAreValidOptions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correct_answers'],
          message: 'As respostas corretas devem corresponder às opções fornecidas.',
        });
      }
    }
  }
  if (data.type === 'true_false') {
    if (data.correct_answers.length !== 1 || !['true', 'false'].includes(data.correct_answers[0])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correct_answers'],
        message: 'Verdadeiro/Falso deve ter "true" ou "false" como resposta única.',
      });
    }
  }
});

// Schema do Formulário: Removidos discipline_id e academic_period_id
const examFormSchema = z.object({
  name: z.string().min(3, 'O nome da prova é obrigatório.'),
  course_id: z.coerce.number().min(1, 'O curso é obrigatório.'),
  exam_date: z.string().min(1, 'A data da prova é obrigatória.'),
  duration_minutes: z.coerce.number().min(1, 'A duração deve ser um número positivo.'),
  type: z.enum(['objective', 'discursive', 'mixed']),
  questions: z.array(questionSchema).min(1, 'Pelo menos uma questão é obrigatória.'),
});

// Componente auxiliar para renderizar cada questão
function QuestionCard({ index, control, register, errors, remove, watch }) {
  const { fields: optionsFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${index}.options`,
  });

  const questionType = watch(`questions.${index}.type`);

  return (
    <Card className="p-4 bg-gray-50 border-gray-200">
      <CardContent className="space-y-4 pt-4">
        <div className="flex justify-between items-center">
          <Label className="font-bold text-lg">Questão {index + 1}</Label>
          <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <Input {...register(`questions.${index}.text`)} placeholder="Texto da questão" />
        {errors.questions?.[index]?.text && <p className="text-red-500 text-sm">{errors.questions[index].text.message}</p>}

        <Controller
          name={`questions.${index}.type`}
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo de questão" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
                <SelectItem value="essay">Dissertativa</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.questions?.[index]?.type && <p className="text-red-500 text-sm">{errors.questions[index].type.message}</p>}

        {questionType === 'multiple_choice' && (
          <div className="space-y-3 p-3 border rounded-md bg-white">
            <Label className="font-semibold">Opções de Resposta</Label>
            {optionsFields.map((optionField, optIndex) => (
              <div key={optionField.id} className="flex items-center gap-2">
                <Input {...register(`questions.${index}.options.${optIndex}.value`)} placeholder={`Opção ${optIndex + 1}`} />
                <Controller
                  name={`questions.${index}.correct_answers`}
                  control={control}
                  render={({ field }) => {
                    const optionValue = watch(`questions.${index}.options.${optIndex}.value`);
                    return (
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id={`q${index}-opt${optIndex}`}
                          checked={field.value?.includes(optionValue)}
                          onCheckedChange={(checked) => {
                            if (!optionValue) return;
                            const currentAnswers = field.value || [];
                            const newAnswers = checked
                              ? [...currentAnswers, optionValue]
                              : currentAnswers.filter((ans) => ans !== optionValue);
                            field.onChange(newAnswers);
                          }}
                          disabled={!optionValue}
                        />
                        <Label htmlFor={`q${index}-opt${optIndex}`} className="text-sm cursor-pointer">Correta</Label>
                      </div>
                    );
                  }}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optIndex)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendOption({ value: '' })}>
              <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Opção
            </Button>
            {errors.questions?.[index]?.options && <p className="text-red-500 text-sm">{errors.questions[index].options.message}</p>}
            {errors.questions?.[index]?.correct_answers && <p className="text-red-500 text-sm">{errors.questions[index].correct_answers.message}</p>}
          </div>
        )}

        {questionType === 'true_false' && (
          <Controller
            name={`questions.${index}.correct_answers`}
            control={control}
            render={({ field }) => (
              <Select onValueChange={(value) => field.onChange([value])} value={field.value?.[0] || ''}>
                <SelectTrigger><SelectValue placeholder="Selecione a resposta correta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Verdadeiro</SelectItem>
                  <SelectItem value="false">Falso</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        )}
        
        {questionType === 'essay' && (
          <Input {...register(`questions.${index}.correct_answers.0`)} placeholder="Resposta correta (para referência)" />
        )}
        {errors.questions?.[index]?.correct_answers && questionType !== 'multiple_choice' && <p className="text-red-500 text-sm">{errors.questions[index].correct_answers.message}</p>}
        
        <div className="w-1/3">
          <Label>Pontuação</Label>
          <Input type="number" {...register(`questions.${index}.score`)} placeholder="Pontos" />
          {errors.questions?.[index]?.score && <p className="text-red-500 text-sm">{errors.questions[index].score.message}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CreateExamPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [courses, setCourses] = useState([]);

  const { register, control, handleSubmit, formState: { errors }, watch, setError } = useForm({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      name: '',
      type: 'objective',
      duration_minutes: 60,
      course_id: '',
      exam_date: '',
      questions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  useEffect(() => {
    async function loadCourses() {
      try {
        setIsLoadingCourses(true);
        const fetchedCourses = await fetchCourses();
        setCourses(fetchedCourses ?? []);
      } catch (error) {
        toast.error('Falha ao carregar cursos.');
      } finally {
        setIsLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

  const onSubmit = async (data) => {
    console.log('Form Data:', data); // Debug: Verificar dados do formulário
    setIsLoading(true);
    toast.message('A processar a prova...');

    try {
      const apiData = {
        ...data,
        max_score: data.questions.reduce((sum, q) => sum + q.score, 0),
        questions: data.questions.map(q => {
          let correctAnswer;
          if (q.type === 'multiple_choice') {
            correctAnswer = JSON.stringify(q.correct_answers || []);
          } else {
            correctAnswer = q.correct_answers[0];
          }

          return {
            text: q.text,
            type: q.type,
            score: q.score,
            options: q.options ? q.options.map(opt => opt.value) : [],
            correct_answer: correctAnswer,
          };
        }),
      };

      console.log('API Data:', apiData); // Debug: Verificar dados enviados para a API
      await uploadExam(apiData);
      toast.success('Prova criada com sucesso!');
      navigate('/admin/exams');
    } catch (error) {
      console.error('Erro ao criar prova:', error); // Debug: Log do erro
      toast.error(error.message || 'Falha ao criar prova.');
      setIsLoading(false);
    }
  };

  // Debug: Exibir erros de validação
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form Errors:', errors);
      toast.error('Por favor, corrija os erros no formulário.');
    }
  }, [errors]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      <Card className="max-w-4xl mx-auto shadow-xl border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Criar Nova Prova</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nome da Prova</Label>
                <Input id="name" {...register('name')} placeholder="Ex: Prova Final de Algoritmos" />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="type">Tipo de Prova</Label>
                <Controller name="type" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="objective">Objetiva</SelectItem>
                      <SelectItem value="discursive">Discursiva</SelectItem>
                      <SelectItem value="mixed">Mista</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <div>
                <Label htmlFor="course_id">Curso</Label>
                <Controller name="course_id" control={control} render={({ field }) => (
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value ? field.value.toString() : ''}
                    disabled={isLoadingCourses}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCourses ? 'Carregando...' : 'Selecione um curso'} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.name} value={course.id.toString()}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.course_id && <p className="text-red-500 text-sm mt-1">{errors.course_id.message}</p>}
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
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-700">Questões</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ text: '', type: 'multiple_choice', options: [{ value: '' }, { value: '' }], correct_answers: [], score: 1 })}
                >
                  <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Questão
                </Button>
              </div>
              {fields.map((field, index) => (
                <QuestionCard key={field.id} {...{ control, index, register, errors, remove, watch }} />
              ))}
              {errors.questions && !errors.questions.root && <p className="text-red-500 text-sm mt-1">{errors.questions.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} size="lg">
              {isLoading ? 'A Criar...' : 'Criar Prova'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}