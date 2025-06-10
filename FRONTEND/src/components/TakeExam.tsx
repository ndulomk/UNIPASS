"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { hydrateAuth, logout } from '@/store/authSlice';
import { fetchExamDetails, submitExamAnswers } from '@/lib/api';
import { ExamDetail } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/All';
import { RadioGroup, RadioGroupItem } from  '@/components/ui/All';
import { Label } from '@/components/ui/All';
import { Textarea } from '@/components/ui/All';
import { ArrowLeft, ArrowRight, Check, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type FormData = {
  answers: Record<string, string>;
};

const TakeExam = () => {
  const { examId } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, enrollment, isAuthenticated, isLoading: authLoading } = useSelector((state: RootState) => state.auth);
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrollmentId = enrollment?.id || JSON.parse(localStorage.getItem('enrollmentData') || '{}')?.id || null;

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { answers: {} },
  });

  // Hydrate auth state
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      const token = localStorage.getItem('access_token');
      if (token) {
        dispatch(hydrateAuth());
      } else {
        toast.error('Please log in to access the exam.');
        router.push('/login');
      }
    }
  }, [isAuthenticated, authLoading, dispatch, router]);

  // Fetch exam details
  useEffect(() => {
    if (!examId || !enrollmentId) {
      setError(!examId ? 'No exam ID provided' : 'No enrollment ID found');
      setIsLoading(false);
      toast.error('Invalid exam or user data');
      return;
    }

    const fetchExam = async () => {
      setIsLoading(true);
      try {
        const response = await fetchExamDetails(Number(examId));
        setExam(response);
        setTimeLeft(response.duration_minutes * 60);
      } catch (error: any) {
        console.error('Error fetching exam:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load exam.';
        setError(errorMessage);
        if (error.response?.status === 401) {
          dispatch(logout());
          router.push('/login');
        }
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExam();
  }, [examId, enrollmentId, dispatch, router]);

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!exam || !enrollmentId) {
        toast.error('No exam or enrollment data available');
        return;
      }
      setIsSubmitting(true);
      toast.info('Submitting your answers...');

      const payload = {
        enrollment_id: Number(enrollmentId),
        exam_id: Number(examId),
        answers: Object.entries(data.answers).map(([question_id, answer]) => ({
          question_id: Number(question_id),
          answer,
        })),
      };

      try {
        await submitExamAnswers([payload]);
        toast.success('Exam submitted successfully!');
        router.push('/student/dashboard');
      } catch (error: any) {
        console.error('Error submitting exam:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to submit answers.';
        toast.error(errorMessage);
        if (error.response?.status === 401) {
          dispatch(logout());
          router.push('/login');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [exam, enrollmentId, examId, router, dispatch]
  );

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit(onSubmit)();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, handleSubmit, onSubmit]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (isLoading || authLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen flex justify-center items-center">
        <Card className="max-w-3xl mx-auto border-0 shadow-lg">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
        <Card className="max-w-3xl mx-auto border-0 shadow-lg">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || 'Failed to load exam'}</p>
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <Card className="max-w-3xl mx-auto border-0 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">{exam.name}</CardTitle>
              <p className="text-gray-500">
                Question {currentQuestionIndex + 1} of {exam.questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-red-500 bg-red-100 px-4 py-2 rounded-lg">
              <Clock className="h-5 w-5" />
              <span>{timeLeft !== null ? formatTime(timeLeft) : '...'}</span>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <Card className="p-4 bg-white">
              <Label className="font-semibold text-md mb-3 block">
                Question {currentQuestionIndex + 1}: {currentQuestion.text} ({currentQuestion.score} points)
              </Label>
              <Controller
                name={`answers.${currentQuestion.id}`}
                control={control}
                rules={{ required: 'This question is required.' }}
                render={({ field, fieldState }) => (
                  <>
                    {currentQuestion.type === 'true_false' && (
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id={`q${currentQuestion.id}-true`} />
                          <Label htmlFor={`q${currentQuestion.id}-true`}>True</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id={`q${currentQuestion.id}-false`} />
                          <Label htmlFor={`q${currentQuestion.id}-false`}>False</Label>
                        </div>
                      </RadioGroup>
                    )}

                    {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-1"
                      >
                        {(() => {
                          try {
                            const options =
                              typeof currentQuestion.options === 'string'
                                ? JSON.parse(currentQuestion.options)
                                : currentQuestion.options;
                            return Array.isArray(options)
                              ? options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value={option}
                                      id={`q${currentQuestion.id}-option${optionIndex}`}
                                    />
                                    <Label htmlFor={`q${currentQuestion.id}-option${optionIndex}`}>
                                      {option}
                                    </Label>
                                  </div>
                                ))
                              : null;
                          } catch (e) {
                            console.error('Error parsing options:', e);
                            return <p className="text-red-500">Error loading options</p>;
                          }
                        })()}
                      </RadioGroup>
                    )}

                    {currentQuestion.type === 'essay' && (
                      <Textarea
                        {...field}
                        placeholder="Your answer..."
                        className="min-h-[100px]"
                      />
                    )}

                    {fieldState.error && (
                      <p className="text-red-500 text-sm mt-1">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </Card>
          </CardContent>
          <div className="p-6 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex((i) => i - 1)}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            {currentQuestionIndex === exam.questions.length - 1 ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Finish Exam
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex((i) => i + 1)}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TakeExam;