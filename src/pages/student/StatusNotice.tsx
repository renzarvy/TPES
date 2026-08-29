import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StudentRegistrationPortal } from '../../components/student/StudentRegistrationPortal';
import { 
  ShieldAlert, Clock, AlertTriangle, ArrowLeft, LogOut, CheckCircle2, IdCard, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StatusNotice: React.FC = () => {
  const { user, userProfile, verificationStatus, logOut, isVerified } = useAuth();
  const navigate = useNavigate();

  const currentStatus = verificationStatus || (userProfile?.isVerifiedStudent ? 'approved' : 'pending');
  const rejectionReason = userProfile?.rejectionReason || '';

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Main Status Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-start space-x-4">
              <div className={`p-3.5 rounded-2xl text-white shadow-xs ${
                currentStatus === 'denied' || currentStatus === 'rejected'
                  ? 'bg-rose-600'
                  : currentStatus === 'pending' || currentStatus === 'pending_verification'
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}>
                {currentStatus === 'denied' || currentStatus === 'rejected' ? (
                  <ShieldAlert className="w-8 h-8 text-white" />
                ) : currentStatus === 'pending' || currentStatus === 'pending_verification' ? (
                  <Clock className="w-8 h-8 text-white animate-pulse" />
                ) : (
                  <IdCard className="w-8 h-8 text-white" />
                )}
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                  Account Verification Status Notice
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                  {currentStatus === 'denied' || currentStatus === 'rejected'
                    ? 'Registration Verification Denied'
                    : currentStatus === 'pending' || currentStatus === 'pending_verification'
                    ? 'Student ID Verification Pending'
                    : 'Identification Proof Required'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Evaluation permissions are restricted until your account credentials are verified.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard
              </button>
              <button
                type="button"
                onClick={logOut}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-colors flex items-center"
              >
                <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
              </button>
            </div>
          </div>

          {/* Explanation Alert Box */}
          <div className={`p-4 rounded-xl border text-xs sm:text-sm space-y-2 ${
            currentStatus === 'denied' || currentStatus === 'rejected'
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center space-x-2 font-extrabold text-sm uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Access Restricted to Faculty Evaluation Portal</span>
            </div>
            <p className="text-xs leading-relaxed">
              In accordance with St. Alexius College Academic Policy, students must have a verified registration status before submitting official faculty performance evaluations. You cannot perform teacher evaluations at this time.
            </p>
            {rejectionReason && (
              <div className="mt-2 p-3 bg-white/90 rounded-lg border border-rose-200 font-mono text-xs text-rose-900">
                <strong>Administrator Rejection Reason:</strong> "{rejectionReason}"
              </div>
            )}
          </div>
        </div>

        {/* Embedded Student Registration Portal for Uploading/Managing Proof */}
        <StudentRegistrationPortal />
      </div>
    </div>
  );
};

export default StatusNotice;
