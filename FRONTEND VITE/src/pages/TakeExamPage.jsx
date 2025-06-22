import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { fetchExamDetails, submitExamAnswers } from '../lib/api.js';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import Label from '../components/ui/Label.jsx';
import { RadioGroup, RadioGroupItem } from '../components/ui/RadioGroup.jsx';
import Button from '../components/ui/Button.jsx';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/Alert.jsx';

// Função para obter cookie
const getCookie = (name) => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

// Função para debounce
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const TakeExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [cameraPermission, setCameraPermission] = useState('pending');
  const videoRef = useRef(null);
  const isExamStarted = useRef(false);
  const isMounted = useRef(false);
  const isDismissing = useRef(false);

  // Obter dados de autenticação dos cookies
  let userData = null;
  let enrollmentData = null;
  try {
    const userDataString = getCookie('userData');
    if (userDataString) userData = JSON.parse(userDataString);
    const enrollmentDataString = getCookie('enrollmentData');
    if (enrollmentDataString) enrollmentData = JSON.parse(enrollmentDataString);
  } catch (err) {
    console.error('Erro ao analisar cookies:', err);
    toast.error('Falha ao carregar dados do utilizador. Por favor, inicie sessão novamente.');
    navigate('/login');
  }

  const enrollmentId = enrollmentData?.id || userData?.enrollment_id;
  const accessToken = getCookie('access_token');

  // Verificar autenticação
  useEffect(() => {
    if (!accessToken || !enrollmentId) {
      toast.error('Autenticação necessária. Por favor, inicie sessão.');
      navigate('/login');
    }
  }, [accessToken, enrollmentId, navigate]);

  const { control, handleSubmit, trigger, getValues } = useForm({
    defaultValues: { answers: {} },
  });

  // Função para iniciar tentativa de prova (opcional)
  const startExamAttempt = useCallback(async () => {
    try {
      // Assumindo endpoint para registrar início da prova
      await fetch('/api/exam_attempts/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          enrollment_id: Number(enrollmentId),
          exam_id: Number(examId),
        }),
      });
      console.log('Tentativa de prova iniciada:', { examId, enrollmentId });
    } catch (error) {
      console.error('Erro ao registrar início da prova:', error);
    }
  }, [examId, enrollmentId, accessToken]);

  // Função para submeter a prova (normal ou timeout)
  const submitExam = useCallback(
    async (data, submissionType) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      toast.message(
        submissionType === 'timeout'
          ? 'O tempo acabou! Submetendo suas respostas...'
          : 'A submeter as suas respostas...'
      );

      const payload = {
        enrollment_id: Number(enrollmentId),
        exam_id: Number(examId),
        submission_type: submissionType, // 'normal' or 'timeout'
        answers: Object.entries(data.answers).map(([question_id, answer]) => {
          let formattedAnswer;
          if (Array.isArray(answer)) {
            formattedAnswer = answer.length > 0 ? answer.map(String) : ['Não respondida'];
          } else if (typeof answer === 'string' && answer) {
            formattedAnswer = [answer];
          } else if (typeof answer === 'object' && answer !== null) {
            formattedAnswer = [JSON.stringify(answer)];
          } else {
            formattedAnswer = ['Não respondida'];
          }

          return {
            question_id: Number(question_id),
            answer: formattedAnswer,
          };
        }),
      };

      try {
        await submitExamAnswers(payload);
        toast.success('Prova submetida com sucesso!');
        isExamStarted.current = false;
        isDismissing.current = true; // Prevent dismissal after successful submission
        navigate('/student/dashboard');
      } catch (error) {
        console.error(`Erro ao submeter a prova (${submissionType}):`, error);
        toast.error(error.response?.data?.message || 'Falha ao submeter as respostas. Tente novamente.');
        setIsSubmitting(false);
      }
    },
    [examId, enrollmentId, navigate]
  );

  // Função para descartar a prova
  const dismissExam = useCallback(
    debounce(async () => {
      if (!isExamStarted.current || isSubmitting || !isMounted.current || isDismissing.current) {
        console.log('dismissExam skipped:', {
          isExamStarted: isExamStarted.current,
          isSubmitting,
          isMounted: isMounted.current,
          isDismissing: isDismissing.current,
        });
        return;
      }

      console.log('dismissExam triggered for exam_id:', examId);
      isDismissing.current = true;
      setIsSubmitting(true);
      const payload = {
        enrollment_id: Number(enrollmentId),
        exam_id: Number(examId),
        submission_type: 'dismissed',
        answers: exam?.questions?.map((q) => ({
          question_id: Number(q.id),
          answer: ['Não respondida'],
        })) || [],
      };

      try {
        await submitExamAnswers(payload);
        console.log('Prova descartada com sucesso para o estudante.');
        toast.info('Prova foi descartada devido à saída da página.');
      } catch (error) {
        console.error('Erro ao descartar prova:', error);
        toast.error('Erro ao descartar prova. Tente novamente.');
      } finally {
        setIsSubmitting(false);
        isExamStarted.current = false;
      }
    }, 500),
    [examId, enrollmentId, exam, isSubmitting]
  );

  // Efeito para carregar detalhes da prova e registrar entrada
  useEffect(() => {
    if (!examId || !accessToken) return;

    const getExam = async () => {
      setIsLoading(true);
      try {
        const examData = await fetchExamDetails(Number(examId), accessToken);
        if (examData.completed) {
          toast.error('Esta prova já foi realizada.');
          navigate('/student/dashboard');
          return;
        }
        const parsedQuestions = examData.questions.map((q) => ({
          ...q,
          options: parseJSONSafely(q.options, []),
          correct_answer: parseJSONSafely(q.correct_answer, []),
        }));
        setExam({ ...examData, questions: parsedQuestions });
        setTimeLeft(examData.duration_minutes * 60);
        isExamStarted.current = true;
        console.log('User entered exam page:', { examId, enrollmentId });
        // Registrar tentativa (opcional)
        await startExamAttempt();
        setTimeout(() => {
          isMounted.current = true;
          console.log('Component mounted, isMounted set to true');
        }, 0);
      } catch (error) {
        console.error('Erro ao carregar a prova:', error);
        toast.error(error.message || 'Falha ao carregar a prova.');
        if (error.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    getExam();
  }, [examId, accessToken, navigate, startExamAttempt]);

  // Efeito para acesso à câmera
  useEffect(() => {
    const requestCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraPermission('granted');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Erro ao aceder à câmera:', err);
        setCameraPermission('denied');
        toast.error('Acesso à câmera negado. É necessário para continuar.');
      }
    };

    requestCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Efeito para detectar saída da página
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isExamStarted.current && !isSubmitting && isMounted.current && !isDismissing.current) {
        console.log('beforeunload triggered, calling dismissExam');
        e.preventDefault();
        e.returnValue = 'Tem certeza de que deseja sair? Sua prova será descartada.';
        dismissExam();
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'hidden' &&
        isExamStarted.current &&
        !isSubmitting &&
        isMounted.current &&
        !isDismissing.current
      ) {
        console.log('Tab hidden, calling dismissExam');
        dismissExam();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('Cleaning up exit effect, checking for dismissExam');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (isExamStarted.current && !isSubmitting && isMounted.current && !isDismissing.current) {
        console.log('Unmount triggered, calling dismissExam');
        dismissExam();
      }
    };
  }, [dismissExam]);

  // Efeito para o cronômetro
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || cameraPermission !== 'granted') return;

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    if (timeLeft <= 1) {
      clearInterval(timerId);
      toast.warning('O tempo acabou! A sua prova será submetida automaticamente.');
      trigger().then(() => {
        const currentAnswers = getValues();
        submitExam(currentAnswers, 'timeout');
      });
    }

    return () => clearInterval(timerId);
  }, [timeLeft, cameraPermission, trigger, getValues, submitExam]);

  const parseJSONSafely = (jsonString, fallback = []) => {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (error) {
      console.warn('JSON parsing failed:', error);
      return fallback;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">A carregar a prova...</div>;
  }

  if (cameraPermission !== 'granted') {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 p-4">
        <Card className="max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-red-600">Acesso à Câmera Necessário</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              O acesso à câmera é obrigatório para garantir a integridade da prova. Por favor, autorize o acesso.
            </p>
            {cameraPermission === 'denied' && (
              <Alert variant="destructive">
                <AlertTitle>Acesso Negado!</AlertTitle>
                <AlertDescription>
                  Por favor, ative o acesso à câmera nas configurações do seu navegador e recarregue a página.
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={() => window.location.reload()} className="mt-4">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="fixed top-4 right-4 z-10 border-4 border-white rounded-lg shadow-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-48 h-36 object-cover transform -scale-x-100"
        />
      </div>
      <Card className="max-w-3xl mx-auto border-0 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">{exam?.exam_name}</CardTitle>
              <CardDescription>Curso: {exam?.course_name}</CardDescription>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-red-500 bg-red-100 px-3 py-1 rounded">
                {timeLeft !== null ? formatTime(timeLeft) : '...'}
              </span>
              <p className="text-sm text-gray-500">Tempo Restante</p>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit((data) => submitExam(data, 'normal'))}>
          <CardContent className="space-y-6">
            {exam?.questions?.map((q, index) => (
              <Card key={q.id} className="p-4 bg-white">
                <Label className="font-semibold text-md mb-3 block">
                  Questão {index + 1}: {q.text} ({q.score} pontos)
                </Label>
                <Controller
                  name={`answers.${q.id}`}
                  control={control}
                  rules={{ required: 'Esta questão é obrigatória.' }}
                  render={({ field, fieldState }) => (
                    <>
                      {q.type === 'true_false' && (
                        <RadioGroup
                          onValueChange={(value) => field.onChange([value])}
                          value={field.value?.[0] || ''}
                          className="space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id={`q${q.id}-true`} />
                            <Label htmlFor={`q${q.id}-true`}>Verdadeiro</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id={`q${q.id}-false`} />
                            <Label htmlFor={`q${q.id}-false`}>Falso</Label>
                          </div>
                        </RadioGroup>
                      )}
                      {q.type === 'multiple_choice' && (
                        <RadioGroup
                          onValueChange={(value) => field.onChange([value])}
                          value={field.value?.[0] || ''}
                          className="space-y-1"
                        >
                          {Array.isArray(q.options) && q.options.length > 0 ? (
                            q.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value={String(option)}
                                  id={`q${q.id}-opt${optIndex}`}
                                />
                                <Label htmlFor={`q${q.id}-opt${optIndex}`} className="cursor-pointer">
                                  {String(option)}
                                </Label>
                              </div>
                            ))
                          ) : (
                            <div className="text-red-500 text-sm">
                              Erro: Opções não disponíveis para esta questão
                            </div>
                          )}
                        </RadioGroup>
                      )}
                      {q.type === 'essay' && (
                        <textarea
                          onChange={(e) => field.onChange([e.target.value])}
                          value={field.value?.[0] || ''}
                          placeholder="A sua resposta..."
                          className="w-full p-2 border rounded-md"
                          rows="4"
                        />
                      )}
                      {fieldState.error && (
                        <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                      )}
                    </>
                  )}
                />
              </Card>
            ))}
          </CardContent>
          <div className="p-6">
            <Button type="submit" className="w-full text-lg" disabled={isSubmitting}>
              {isSubmitting ? 'A submeter...' : 'Finalizar e Entregar Prova'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TakeExamPage;