import  { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAdminAllExamResults } from '../lib/api';
import { toast } from 'sonner';
import { Eye, Table } from 'lucide-react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';

export default function ExamResultsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGrading, setIsGrading] = useState(false);

  useEffect(() => {
    if (!examId) return;

    const getResults = async () => {
      setIsLoading(true);
      try {
        const allGrades = await fetchAdminAllExamResults();
        const examResults = allGrades.filter(grade => grade.exam_id === Number(examId));
        setResults(examResults);
      } catch (error) {
        toast.error(error.message || "Failed to fetch exam results.");
      } finally {
        setIsLoading(false);
      }
    };

    getResults();
  }, [examId]);

  const handleAutoGrade = async () => {
    setIsGrading(true);
    toast.message("Auto-grading process started...");
    try {
      const response = await api.post(`/exam_results/${examId}/grade-auto`);
      toast.success(response.data.message);
      const allGrades = await fetchAdminAllExamResults();
      const examResults = allGrades.filter(grade => grade.exam_id === Number(examId));
      setResults(examResults);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to auto-grade exam.");
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <Card className="max-w-6xl mx-auto border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold text-gray-800">Resultados da Prova</CardTitle>
          <Button onClick={handleAutoGrade} disabled={isGrading}>
            {isGrading ? 'Corrigindo...' : 'Corrigir Verdadeiro/Falso Automático'}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudante</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length > 0 ? (
                results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{`${result.first_name} ${result.last_name}`}</TableCell>
                    <TableCell>{result.email}</TableCell>
                    <TableCell>{result.score} / {result.max_score}</TableCell>
                    <TableCell>
                      <Badge  variant={result.score >= 10 ? 'default' : 'destructive'}>
                        {result.score >= 10 ? 'Aprovado' : 'Reprovado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/teacher/exams/${examId}/results/${result.enrollment_id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Nenhum resultado encontrado para esta prova.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}