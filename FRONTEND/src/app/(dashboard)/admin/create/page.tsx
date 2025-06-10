'use client';

import CreateExamForm from '@/components/CreateExamForm';
import AdminLayout from '@/app/(dashboard)/admin/layout';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const AdminCreateExamPage = () => {
  const { isAuthenticated, isLoading: authLoading, user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, user, router]);

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create New Exam</h1>
        <CreateExamForm courseId={''} />
      </div>
    </AdminLayout>
  );
};

export default AdminCreateExamPage;