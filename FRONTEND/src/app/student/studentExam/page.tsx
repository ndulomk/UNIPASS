"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { fetchExamDetails, submitExamAnswers } from '@/lib/api';
import { ExamDetail } from '@/types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { hydrateAuth, logout } from '@/store/authSlice';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/All';
import { RadioGroup, RadioGroupItem } from '@/components/ui/All';
import { Label } from '@/components/ui/All';
import { Textarea } from '@/components/ui/All';
import { toast } from 'sonner';

type FormData = {
  answers: Record<string, string>;
};

export default function TakeExamPage() {
  const { user, enrollment, isLoading: authLoadingState, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const { examId } = useParams();
  const router = useRouter();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get enrollmentId from enrollment or localStorage
  const enrollmentId = enrollment?.id || JSON.parse(localStorage.getItem('enrollmentData') || '{}')?.id || null;

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { answers: {} }
  });

  // Hydrate auth state on mount
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      // Check localStorage for token and dispatch hydrateAuth
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

    const getExam = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const examData = await fetchExamDetails(Number(examId));
        if (!examData) {
          throw new Error('No exam data received');
        }
        setExam(examData);
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

    getExam();
  }, [examId, enrollmentId, dispatch, router]);

  const onSubmit = async (data: FormData) => {
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
      await submitExamAnswers(payload);
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
  };

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
        <Card className="max-w-3xl mx-auto border-0 shadow-lg">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading exam...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <Card className="max-w-3xl mx-auto border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">
            {exam.name || exam.exam_name || 'Exam'}
          </CardTitle>
          <CardDescription>
            {exam.discipline_name && `Discipline: ${exam.discipline_name} | `}
            Duration: {exam.duration_minutes} minutes
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {exam.questions && exam.questions.length > 0 ? (
              exam.questions.map((q, index) => (
                <Card key={q.id} className="p-4 bg-white">
                  <Label className="font-semibold text-md mb-3 block">
                    Question {index + 1}: {q.text} ({q.score} points)
                  </Label>

                  <Controller
                    name={`answers.${q.id}`}
                    control={control}
                    rules={{ required: 'This question is required.' }}
                    render={({ field, fieldState }) => (
                      <>
                        {q.type === 'true_false' && (
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id={`q${q.id}-true`} />
                              <Label htmlFor={`q${q.id}-true`}>True</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id={`q${q.id}-false`} />
                              <Label htmlFor={`q${q.id}-false`}>False</Label>
                            </div>
                          </RadioGroup>
                        )}

                        {q.type === 'multiple_choice' && q.options && (
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-1"
                          >
                            {(() => {
                              try {
                                const options =
                                  typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                                return Array.isArray(options)
                                  ? options.map((option, optionIndex) => (
                                      <div key={optionIndex} className="flex items-center space-x-2">
                                        <RadioGroupItem
                                          value={option}
                                          id={`q${q.id}-option${optionIndex}`}
                                        />
                                        <Label htmlFor={`q${q.id}-option${optionIndex}`}>
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

                        {q.type === 'essay' && (
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
              ))
            ) : (
              <Card className="p-4 bg-white">
                <p className="text-gray-500">No questions available for this exam.</p>
              </Card>
            )}
          </CardContent>
          <div className="p-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !exam.questions?.length}
            >
              {isSubmitting ? 'Submitting...' : 'Finish & Submit Exam'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}