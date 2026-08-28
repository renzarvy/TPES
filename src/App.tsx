import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useRoleAuth } from './hooks/useRoleAuth';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { EvaluationForm } from './pages/student/EvaluationForm';
import { Reports } from './pages/admin/Reports';
import { Teachers } from './pages/admin/Teachers';
import { TeacherProfile } from './pages/admin/TeacherProfile';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { Settings } from './pages/admin/Settings';
import { AuditLogs } from './pages/admin/AuditLogs';
import { VerifiedRoute } from './components/VerifiedRoute';
import { RoleGuard } from './components/RoleGuard';
import { AccessDenied } from './components/AccessDenied';
import { StatusNotice } from './pages/student/StatusNotice';
import { StudentRegistrationPortal } from './components/student/StudentRegistrationPortal';
import { StudentVerificationManager } from './components/admin/StudentVerificationManager';

// Router for dashboard content based on authenticated role
export const DashboardRoleRouter = () => {
  const { user, role, loading, isSuperAdmin } = useRoleAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-semibold text-gray-600">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-blue-900 font-semibold tracking-wider uppercase">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  // Not signed in -> Send to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin and Super Admin
  if (isSuperAdmin || role === 'admin') {
    return <AdminDashboard />;
  }

  // Faculty / Teacher
  if (role === 'teacher') {
    return <TeacherDashboard />;
  }

  // Student
  if (role === 'student') {
    return <StudentDashboard />;
  }

  // Unauthorized or unassigned role -> Dedicated Access Denied state (no fallback to StudentDashboard)
  return (
    <AccessDenied 
      customTitle="Unassigned Account Role"
      customMessage="Your account has been authenticated, but has not yet been assigned a valid student, teacher, or administrative role in the system."
      allowedRoles={['student', 'teacher', 'admin']}
    />
  );
};

// Root index entry component: Shows Homepage if not logged in, or Dashboard in Layout if logged in
const MainEntryRouter = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1a36] text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-widest">Loading St. Alexius College Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <HomePage />;
  }

  return (
    <Layout>
      <DashboardRoleRouter />
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainEntryRouter />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          
          <Route element={<Layout />}>
            <Route path="dashboard" element={<DashboardRoleRouter />} />
            <Route 
              path="evaluate/:teacherId" 
              element={
                <RoleGuard allowedRoles={['student', 'admin']} requireVerification={true}>
                  <EvaluationForm />
                </RoleGuard>
              } 
            />
            <Route path="verification-status" element={<StatusNotice />} />
            <Route path="portal" element={<div className="max-w-4xl mx-auto py-6 px-4"><StudentRegistrationPortal /></div>} />
            <Route 
              path="verifications" 
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <div className="max-w-7xl mx-auto py-6 px-4"><StudentVerificationManager /></div>
                </RoleGuard>
              } 
            />
            <Route 
              path="reports" 
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <Reports />
                </RoleGuard>
              } 
            />
            <Route 
              path="activity-log" 
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AuditLogs />
                </RoleGuard>
              } 
            />
            <Route 
              path="audit-logs" 
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AuditLogs />
                </RoleGuard>
              } 
            />
            <Route 
              path="teachers" 
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <Teachers />
                </RoleGuard>
              } 
            />
            <Route 
              path="teacher/:teacherId" 
              element={
                <RoleGuard allowedRoles={['admin', 'teacher']}>
                  <TeacherProfile />
                </RoleGuard>
              } 
            />
            <Route 
              path="settings" 
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <Settings />
                </RoleGuard>
              } 
            />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

