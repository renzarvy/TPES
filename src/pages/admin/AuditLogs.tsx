import React from 'react';
import { ActivityLog } from '../../components/ActivityLog';
import { History, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">Institutional Activity & Audit Log</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              Admin Accountability Trail
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Immutable audit record tracking critical administrative operations including student/teacher verification approvals, report generations, and system configuration updates.
          </p>
        </div>
      </div>

      {/* Activity Log Full View */}
      <ActivityLog maxItems={500} />
    </div>
  );
};
export default AuditLogs;
