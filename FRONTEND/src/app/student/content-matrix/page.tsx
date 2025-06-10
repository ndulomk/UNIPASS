'use client';

import React, { useState, useEffect } from 'react';
import StudentLayout from '@/components/StudentLayout';
import { api } from '@/lib/api';
import { Network, BookOpen, Brain, Target, Loader2, AlertTriangle } from 'lucide-react';

interface Enrollment {
  id: number;
  course_id: number;
  user_id: number;
  academic_period_id: number;
  code: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'canceled';
  enrolled_at: string;
  updated_at: string;
  course?: { name: string };
}

interface Discipline {
  id: number;
  name: string;
  course_id: number | null;
}

interface ContentMatrix {
  id: number;
  discipline_id: number;
  discipline_name: string;
  theme: string;
  competencies: string[];
  skills: string[];
  syllabus: string | null;
}

const ContentMatrixPage = () => {
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [matrices, setMatrices] = useState<ContentMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentCourseId, setStudentCourseId] = useState<number | null>(null);
  const [allDisciplines, setAllDisciplines] = useState<Map<number, Discipline>>(new Map());

  // Fetch enrollmentId from localStorage on mount
  useEffect(() => {
    const storedEnrollmentId = localStorage.getItem('enrollmentId');
    if (storedEnrollmentId) {
      setEnrollmentId(parseInt(storedEnrollmentId, 10));
    } else {
      setLoading(false);
      console.warn('No enrollmentId found in localStorage');
    }
  }, []);

  // Fetch initial data: enrollment details and disciplines
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!enrollmentId) return;
      setLoading(true);
      try {
        const [enrollmentRes, disciplinesRes] = await Promise.all([
          api.get<Enrollment>(`/enrollments/${enrollmentId}/details`),
          api.get<Discipline[]>('/disciplines'),
        ]);

        setStudentCourseId(enrollmentRes.data.course_id);

        // Filter disciplines for the student's course or general disciplines
        const disciplinesForCourse = disciplinesRes.data.filter(
          (d: Discipline) => d.course_id === enrollmentRes.data.course_id || !d.course_id
        );
        const dMap = new Map(disciplinesForCourse.map((d: Discipline) => [d.id, d]));
        setAllDisciplines(dMap);
      } catch (error) {
        console.error('Error fetching initial data for matrices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [enrollmentId]);

  // Fetch content matrices for the student's disciplines
  useEffect(() => {
    if (!studentCourseId || allDisciplines.size === 0 || !enrollmentId) {
      setLoading(false);
      return;
    }

    const fetchMatrices = async () => {
      setLoading(true);
      try {
        // Fetch matrices for each discipline in parallel
        const studentDisciplineIds = Array.from(allDisciplines.keys());
        const matrixPromises = studentDisciplineIds.map((disciplineId) =>
          api.get<ContentMatrix[]>(`/content-matrices/by-discipline/${disciplineId}`)
        );
        const matrixResponses = await Promise.all(matrixPromises);

        // Flatten and process the responses
        const allMatrices = matrixResponses
          .flatMap((response) => response.data)
          .map((m: ContentMatrix) => ({
            ...m,
            competencies: Array.isArray(m.competencies) ? m.competencies : JSON.parse(m.competencies || '[]'),
            skills: Array.isArray(m.skills) ? m.skills : JSON.parse(m.skills || '[]'),
          }));

        setMatrices(allMatrices);
      } catch (error) {
        console.error('Error loading content matrices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMatrices();
  }, [studentCourseId, allDisciplines, enrollmentId]);

  if (loading) {
    return (
      <StudentLayout enrollmentId={enrollmentId}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout enrollmentId={enrollmentId}>
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Matrizes Curriculares</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Consulte os temas, competências e habilidades das disciplinas do seu curso.</p>

        {matrices.length > 0 ? (
          <div className="space-y-6">
            {matrices.map((matrix) => (
              <div key={matrix.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-sky-600 dark:text-sky-400 flex items-center">
                    <BookOpen className="mr-3 h-6 w-6" /> {matrix.discipline_name}
                  </h2>
                  <p className="text-md font-medium text-slate-700 dark:text-slate-200 mt-1">Tema: {matrix.theme}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center">
                      <Brain className="mr-2 h-5 w-5 text-purple-500" />Competências:
                    </h4>
                    {matrix.competencies && matrix.competencies.length > 0 ? (
                      <ul className="list-disc list-inside pl-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        {matrix.competencies.map((comp, i) => (
                          <li key={i}>{comp}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">Nenhuma competência listada.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center">
                      <Target className="mr-2 h-5 w-5 text-green-500" />Habilidades:
                    </h4>
                    {matrix.skills && matrix.skills.length > 0 ? (
                      <ul className="list-disc list-inside pl-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        {matrix.skills.map((skill, i) => (
                          <li key={i}>{skill}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">Nenhuma habilidade listada.</p>
                    )}
                  </div>
                </div>

                {matrix.syllabus && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Ementa / Conteúdo Programático:</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-md whitespace-pre-wrap">
                      {matrix.syllabus}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center bg-white dark:bg-slate-800 p-10 rounded-lg shadow">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">Nenhuma Matriz Encontrada</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Não há matrizes curriculares disponíveis para as disciplinas do seu curso no momento.
            </p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default ContentMatrixPage;