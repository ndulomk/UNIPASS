'use client';

import React, { useState, useEffect } from 'react';
import StudentLayout from '@/components/StudentLayout';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { api, fetchDocumentsByEnrollment } from '@/lib/api';
import { FileText, Download, Eye, Loader2, AlertTriangle } from 'lucide-react';

interface EnrollmentDoc {
    id: number;
    enrollment_id: number;
    type: string;
    file_path: string;
    file_url: string;
    uploaded_at: string;
}

const StudentDocumentsPage = () => {
    const { enrollment } = useSelector((state: RootState) => state.auth);
    const enrollmentId = enrollment?.id?.toString();
    console.log(enrollmentId)
    const [documents, setDocuments] = useState<EnrollmentDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enrollmentId) {
            setError('ID da matrícula não encontrado.');
            setLoading(false);
            return;
        }

        const fetchDocuments = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetchDocumentsByEnrollment(enrollmentId);
                setDocuments(response);
            } catch (error: any) {
                console.error('Erro ao carregar documentos:', error);
                setError(error.message || 'Erro ao carregar documentos.');
            } finally {
                setLoading(false);
            }
        };
        fetchDocuments();
    }, [enrollmentId]);

    const getDocumentName = (type: string) => {
        const names: { [key: string]: string } = {
            comprovativo: 'Comprovativo de Pagamento',
            bilhete: 'Bilhete de Identidade',
            vacine_card: 'Cartão de Vacina',
            foto: 'Fotografia',
        };
        return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const backendStaticUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    if (loading) {
        return (
            <StudentLayout enrollmentId={enrollmentId}>
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
                </div>
            </StudentLayout>
        );
    }

    if (error) {
        return (
            <StudentLayout enrollmentId={enrollmentId}>
                <div className="text-center bg-white dark:bg-slate-800 p-10 rounded-lg shadow">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                    <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">Erro</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout enrollmentId={enrollmentId}>
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Meus Documentos</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-8">Visualize os documentos que você submeteu durante a inscrição.</p>

                {documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documents.map(doc => (
                            <div key={doc.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                                <div className="flex items-center mb-3">
                                    <FileText className="h-8 w-8 text-sky-500 mr-3" />
                                    <div>
                                        <h3 className="font-semibold text-md text-slate-700 dark:text-slate-100">{getDocumentName(doc.type)}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Enviado em: {new Date(doc.uploaded_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-3 mt-4">
                                    <a
                                        href={`${backendStaticUrl}${doc.file_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-sky-700 bg-sky-100 hover:bg-sky-200 dark:text-sky-200 dark:bg-sky-700 dark:hover:bg-sky-600 transition-colors"
                                    >
                                        <Eye className="h-4 w-4 mr-2" /> Visualizar
                                    </a>
                                    <a
                                        href={`${backendStaticUrl}${doc.file_url}`}
                                        download
                                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-600 dark:hover:bg-slate-500 transition-colors"
                                    >
                                        <Download className="h-4 w-4 mr-2" /> Baixar
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center bg-white dark:bg-slate-800 p-10 rounded-lg shadow">
                        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
                        <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">Nenhum Documento Encontrado</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Parece que não há documentos associados à sua inscrição no momento.
                        </p>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentDocumentsPage;