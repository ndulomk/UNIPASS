"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAdminAllExamResults } from '@/lib/api';
import { Grade } from '@/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/All';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from'@/components/ui/All';
import { Badge } from '@/components/ui/All';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';
import { api } from '@/lib/api';

export default function ExamResultsPage() {
    const { examId } = useParams();
    const router = useRouter();
    const [results, setResults] = useState<Grade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGrading, setIsGrading] = useState(false);

    useEffect(() => {
        if (!examId) return;

        const getResults = async () => {
            setIsLoading(true);
            try {
                // This fetches all grades. You'll need to filter them by examId.
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
        toast.message       ("Auto-grading process started...");
        try {
            const response = await api.post(`/exams/${examId}/grade-auto`);
            toast.success(response.data.message);
            // Re-fetch results after grading
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
                    <CardTitle className="text-2xl font-bold text-gray-800">Exam Results</CardTitle>
                    <Button onClick={handleAutoGrade} disabled={isGrading}>
                        {isGrading ? 'Grading...' : 'Auto-Grade True/False'}
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
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
                                            <Badge variant={result.score >= 10 ? 'default' : 'destructive'}>
                                                {result.score >= 10 ? 'Approved' : 'Failed'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                             <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => router.push(`/teacher/exams/${examId}/results/${result.enrollment_id}`)}
                                             >
                                                <Eye className="h-4 w-4" />
                                             </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">No results found for this exam.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}