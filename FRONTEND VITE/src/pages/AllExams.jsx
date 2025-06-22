import  { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Eye, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

export default function AllExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gradingExams, setGradingExams] = useState({}); // Track grading state per exam

  useEffect(() => {
    const fetchExams = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/exams');
        setExams(response.data);
        console.debug('Fetched exams:', response.data);
      } catch (error) {
        toast.error(error.message || 'Falha ao buscar provas.');
        console.error('Error fetching exams:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, []);

  // Check if exam has ended
  const isExamEnded = (exam) => {
    const examEndTime = new Date(exam.exam_date);
    examEndTime.setMinutes(examEndTime.getMinutes() + exam.duration_minutes);
    return new Date() > examEndTime;
  };

  // Handle auto-grading for an exam
  const handleAutoGrade = async (examId) => {
    setGradingExams((prev) => ({ ...prev, [examId]: true }));
    toast.message('Iniciando correção automática...');
    try {
      const response = await api.post(`/exam_results/${examId}/grade-auto`);
      toast.success(response.data.message || 'Prova corrigida com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Falha ao corrigir prova automaticamente.');
      console.error('Error auto-grading exam:', error);
    } finally {
      setGradingExams((prev) => ({ ...prev, [examId]: false }));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <Card className="max-w-6xl mx-auto border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Todas as Provas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Data da Prova</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nota Máxima</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.length > 0 ? (
                  exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>{exam.exam_name}</TableCell>
                      <TableCell>{exam.course_name || `ID: ${exam.course_id}`}</TableCell>

                      <TableCell>
                        {new Date(exam.exam_date).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell>
                        {exam.type === 'objective'
                          ? 'Objetiva'
                          : exam.type === 'discursive'
                          ? 'Discursiva'
                          : 'Mista'}
                      </TableCell>
                      <TableCell>{exam.max_score}</TableCell>
                      <TableCell>
                        <Badge variant={isExamEnded(exam) ? 'default' : 'secondary'}>
                          {isExamEnded(exam) ? 'Finalizada' : 'Em Andamento'}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/exams/${exam.id}/results`)}
                          title="Ver resultados"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isExamEnded(exam) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAutoGrade(exam.id)}
                            disabled={gradingExams[exam.id]}
                            title="Corrigir automaticamente"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {gradingExams[exam.id] ? 'Corrigindo...' : ''}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Nenhuma prova encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}