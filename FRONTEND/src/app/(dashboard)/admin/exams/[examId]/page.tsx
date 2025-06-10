"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api'; // Using the base api instance
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/All';
import { CheckCircle, XCircle } from 'lucide-react';

// You will need to define these types based on your API response
interface StudentSubmission {
    exam_name: string;
    student_name: string;
    total_score: number;
    max_score: number;
    answers: Array<{
        question_text: string;
        student_answer: string;
        correct_answer: string;
        is_correct: boolean;
        score_awarded: number;
        question_score: number;
    }>;
}

export default function StudentResultDetailPage() {
    const { examId, enrollmentId } = useParams();
    const [submission, setSubmission] = useState<StudentSubmission | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!examId || !enrollmentId) return;

        const fetchSubmissionDetails = async () => {
            setIsLoading(true);
            try {
                // NOTE: This endpoint is an example. You need to implement it on your backend.
                // It should join questions, student_answers, users, and exams tables.
                const response = await api.get(`/exams/${examId}/submissions/${enrollmentId}`);
                setSubmission(response.data);
            } catch (error) {
                console.error("Failed to fetch submission details.", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSubmissionDetails();
    }, [examId, enrollmentId]);

    if (isLoading) {
        return <div className="p-8">Loading student's submission...</div>;
    }

    if (!submission) {
        return <div className="p-8">Could not load submission details for this student.</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <Card className="max-w-4xl mx-auto border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                        Viewing Results for: {submission.student_name}
                    </CardTitle>
                    <p className="text-lg text-gray-600">
                        Exam: {submission.exam_name}
                    </p>
                    <p className="text-xl font-semibold">
                        Final Score: {submission.total_score} / {submission.max_score}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {submission.answers.map((answer, index) => (
                        <Card key={index} className="p-4">
                            <h4 className="font-semibold text-md mb-2">Q{index + 1}: {answer.question_text}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className={`p-3 rounded-md ${answer.is_correct ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <p className="font-bold">Student's Answer:</p>
                                    <p>{answer.student_answer}</p>
                                </div>
                                <div className="p-3 rounded-md bg-gray-100">
                                    <p className="font-bold">Correct Answer:</p>
                                    <p>{answer.correct_answer}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-end mt-2 text-sm font-semibold">
                                {answer.is_correct ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                                )}
                                Score: {answer.score_awarded} / {answer.question_score}
                            </div>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}