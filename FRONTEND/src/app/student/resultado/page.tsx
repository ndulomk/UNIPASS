'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { fetchEnrollmentsByUser } from '@/lib/api'; // Assuming this is your API utility
import StudentLayout from '@/components/StudentLayout';
import ExamResult from '@/components/ExamResult';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const StudentExamResultPage = () => {
  // useParams can return string | string[]. Ensure it's a single string.
  const params = useParams();
  const examId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { enrollment: authEnrollment, isAuthenticated, isLoading: authLoading } = useSelector((state: RootState) => state.auth);

  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Exit early if auth is still loading
    if (authLoading) {
      return;
    }

    // Redirect or show error if not authenticated
    if (!isAuthenticated) {
      setError('You must be logged in to view this page.');
      setIsLoading(false);
      return;
    }

    const getEnrollmentId = async () => {
      // Prioritize enrollment info from the Redux store
      if (authEnrollment?.id) {
        setEnrollmentId(authEnrollment.id.toString());
        return;
      }

      // If not in the store, fetch it from the API
      try {
        const userEnrollments = await fetchEnrollmentsByUser();
        // Simple logic: find the first approved enrollment, adjust if needed
        const approvedEnrollment = userEnrollments.find(e => e.status === 'approved'); // Or whatever logic you need

        if (approvedEnrollment) {
          setEnrollmentId(approvedEnrollment.id.toString());
        } else {
          throw new Error('No approved enrollment was found for your account.');
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to fetch enrollment data.';
        console.error('Error fetching enrollment:', err);
        setError(errorMessage);
        toast.error(errorMessage);
      }
    };

    getEnrollmentId();

  }, [authLoading, isAuthenticated, authEnrollment]);


  // Update loading state based on data availability
  useEffect(() => {
    if (!authLoading && (enrollmentId || error)) {
      setIsLoading(false);
    }
  }, [authLoading, enrollmentId, error]);


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      );
    }

    if (error) {
        return (
            <div className="text-center p-8 text-red-500">
                {error}
            </div>
        );
    }

    if (!examId || !enrollmentId) {
        return (
            <div className="text-center p-8 text-red-500">
                Missing required information to display results.
            </div>
        );
    }

    return <ExamResult examId={examId} enrollmentId={enrollmentId} />;
  };

  return (
    <StudentLayout>
      {renderContent()}
    </StudentLayout>
  );
};

export default StudentExamResultPage;