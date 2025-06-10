'use client';

import TakeExam from '@/components/TakeExam';
import StudentLayout from '@/components/StudentLayout';

const StudentTakeExamPage = () => {
  return (
    <StudentLayout children={undefined} enrollmentId={''}  >
      <TakeExam />
    </StudentLayout>
  );
};

export default StudentTakeExamPage;