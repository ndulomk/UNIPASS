import { Routes, Route, Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import RegisterPage from './pages/RegisterPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentExamsPage from './pages/StudentExamsPage';
import StudentPerformancePage from './pages/StudentPerfomancePage';
import StudentResultsPage from './pages/StudentResultsPage';
import StudentDocumentsPage from './pages/StudentDocumentsPage';
import TakeExamPage from './pages/TakeExamPage';
import AdminLayout from './components/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreateExamPage from './pages/CreateExamPage';
import AllStudentResultsPage from './pages/AllStudentResultsPage';
import ExamResultsPage from './pages/ExamsResults';
import StudentApprovalPage from './pages/StudentApprovalPage';
import AllExamsPage from './pages/AllExams';
import ContentMatrixPage from './pages/ContentMatrixPage';
import CreateContentMatrixPage from './pages/CreateContentMatrixPage';

function App() {
  return (
    <div className="light">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student routes */}
        <Route path="/student/dashboard" element={<StudentDashboardPage />} />
        <Route path="/student/exams" element={<StudentExamsPage />} />
        <Route path="/student/performance" element={<StudentPerformancePage />} />
        <Route path="/student/results" element={<StudentResultsPage />} />
        <Route path="/student/documents" element={<StudentDocumentsPage />} />
        <Route path="/student/exams/:examId/take" element={<TakeExamPage />} />
        <Route path="/student/matrix" element={<ContentMatrixPage />} />

        {/* Admin routes with layout */}
        <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="exams/create" element={<CreateExamPage />} />
          <Route path="resultados" element={<AllStudentResultsPage />} />
          <Route path="exams/:examId/results" element={<ExamResultsPage />} />
          <Route path="candidatos" element={<StudentApprovalPage />} />
          <Route path="content-matrices/create" element={<CreateContentMatrixPage />} />
          <Route path="exams" element={<AllExamsPage />} />
          {/* Redirect /admin to /admin/dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;