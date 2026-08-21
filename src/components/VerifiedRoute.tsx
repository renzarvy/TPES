import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StatusNotice } from '../pages/student/StatusNotice';

interface VerifiedRouteProps {
  children: React.ReactNode;
}

export const VerifiedRoute: React.FC<VerifiedRouteProps> = ({ children }) => {
  const { user, role, loading, isVerified, verificationStatus } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-500">Checking account verification status...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admins and teachers bypass student verification checks
  if (role === 'admin' || role === 'teacher') {
    return <>{children}</>;
  }

  // Check if student is verified
  if (!isVerified) {
    // If accessing evaluation route or restricted page, render StatusNotice explaining why evaluations are blocked
    return <StatusNotice />;
  }

  return <>{children}</>;
};
