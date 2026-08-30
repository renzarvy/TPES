import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActivityLogItem } from '../lib/activityLogger';
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  UserPlus, 
  UserX, 
  Sliders, 
  Building2, 
  Shield, 
  ShieldAlert, 
  FileText, 
  Clock, 
  Download, 
  RefreshCw,
  User,
  Activity
} from 'lucide-react';

interface ActivityLogProps {
  maxItems?: number;
  className?: string;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ maxItems = 200, className = '' }) => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  useEffect(() => {
    // Subscribe to real-time activity_logs from Firestore
    const q = query(collection(db, 'activity_logs'), limit(maxItems));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs: ActivityLogItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedLogs.push({
          id: docSnap.id,
          action: data.action || 'SETTINGS_UPDATE',
          entity: data.entity || 'SETTINGS',
          details: data.details || 'System activity recorded',
          performedBy: data.performedBy || data.adminEmail || 'System User',
          performedByEmail: data.performedByEmail || data.adminEmail || '',
          targetId: data.targetId || null,
          targetName: data.targetName || null,
          createdAt: data.createdAt || new Date().toISOString(),
          timestamp: data.timestamp
        });
      });

      // Merge local demo audit logs
      try {
        const localAuditLogs: any[] = JSON.parse(localStorage.getItem('sac_local_audit_logs') || '[]');
        localAuditLogs.forEach((item: any) => {
          if (!fetchedLogs.some(l => l.id === item.id)) {
            fetchedLogs.push(item);
          }
        });
      } catch {}

      // Sort descending by timestamp / createdAt
      fetchedLogs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      setLogs(fetchedLogs);
      setLoading(false);
    }, (error) => {
      console.warn("ActivityLog snapshot fallback query:", error);
      
      // Fallback subscription to audit_logs if activity_logs fails
      const fallbackUnsub = onSnapshot(collection(db, 'audit_logs'), (snap) => {
        const fallbackLogs: ActivityLogItem[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          fallbackLogs.push({
            id: docSnap.id,
            action: (data.action as any) || 'SETTINGS_UPDATE',
            entity: (data.entity as any) || 'COLLEGE',
            details: data.details || 'System audit recorded',
            performedBy: data.performedBy || data.adminEmail || 'Administrator',
            performedByEmail: data.adminEmail || '',
            createdAt: data.createdAt || new Date().toISOString()
          });
        });
        fallbackLogs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setLogs(fallbackLogs);
        setLoading(false);
      }, (err) => {
        console.warn("ActivityLog audit_logs fallback snapshot warning:", err);
        setLoading(false);
      });

      return () => fallbackUnsub();
    });

    return () => unsubscribe();
  }, [maxItems]);

  // Filter logs based on search and selected entity / action
  const filteredLogs = logs.filter((item) => {
    const matchesEntity = entityFilter === 'ALL' || item.entity === entityFilter;
    const matchesAction = actionFilter === 'ALL' || item.action === actionFilter;
    
    const searchLower = searchTerm.trim().toLowerCase();
    const matchesSearch = !searchLower || 
      item.details.toLowerCase().includes(searchLower) ||
      item.performedBy.toLowerCase().includes(searchLower) ||
      item.performedByEmail.toLowerCase().includes(searchLower) ||
      (item.targetName && item.targetName.toLowerCase().includes(searchLower)) ||
      item.action.toLowerCase().includes(searchLower);

    return matchesEntity && matchesAction && matchesSearch;
  });

  // Action badge renderer
  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'APPROVAL':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Account Approval
          </span>
        );
      case 'REJECTION':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Account Rejection
          </span>
        );
      case 'TEACHER_UPDATE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <UserCheck className="w-3.5 h-3.5 mr-1 text-blue-600" /> Teacher Profile Update
          </span>
        );
      case 'TEACHER_CREATE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <UserPlus className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Teacher Added
          </span>
        );
      case 'TEACHER_DELETE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <UserX className="w-3.5 h-3.5 mr-1 text-red-600" /> Teacher Removed
          </span>
        );
      case 'SETTINGS_UPDATE':
      case 'CRITERIA_UPDATE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Sliders className="w-3.5 h-3.5 mr-1 text-purple-600" /> System Settings
          </span>
        );
      case 'COLLEGE_UPDATE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Building2 className="w-3.5 h-3.5 mr-1 text-sky-600" /> Department Update
          </span>
        );
      case 'ADMIN_GRANT':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Shield className="w-3.5 h-3.5 mr-1 text-amber-600" /> Admin Access Granted
          </span>
        );
      case 'ADMIN_REVOKE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-orange-600" /> Admin Access Revoked
          </span>
        );
      case 'EVALUATION_SUBMISSION':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <FileText className="w-3.5 h-3.5 mr-1 text-teal-600" /> Evaluation Submitted
          </span>
        );
      case 'REPORT_GENERATION':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
            <FileText className="w-3.5 h-3.5 mr-1 text-amber-700" /> Report Generated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <Activity className="w-3.5 h-3.5 mr-1 text-gray-500" /> {action}
          </span>
        );
    }
  };

  // Export logs to CSV file
  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    
    const headers = ["Timestamp", "Action", "Entity", "Details", "Performed By", "Email", "Target"];
    const csvRows = [headers.join(",")];

    filteredLogs.forEach(log => {
      const row = [
        `"${new Date(log.createdAt || '').toLocaleString()}"`,
        `"${log.action}"`,
        `"${log.entity}"`,
        `"${log.details.replace(/"/g, '""')}"`,
        `"${log.performedBy}"`,
        `"${log.performedByEmail}"`,
        `"${log.targetName || ''}"`
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAC_Activity_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Stats summary counts
  const totalApprovals = logs.filter(l => l.action === 'APPROVAL').length;
  const totalRejections = logs.filter(l => l.action === 'REJECTION').length;
  const totalTeacherUpdates = logs.filter(l => l.action.startsWith('TEACHER_')).length;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header Section */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#1e3a8a] to-blue-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
            <History className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">System Accountability Activity Log</h2>
            <p className="text-xs text-blue-200 mt-0.5">
              Real-time audit trail of user actions, teacher profile updates, and account verification approvals.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            disabled={!filteredLogs.length}
            className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Log CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-gray-200">
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
          <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Total Recorded Logs</p>
          <p className="text-lg font-black text-gray-900 mt-0.5">{logs.length}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-emerald-200/60 shadow-xs">
          <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Account Approvals</p>
          <p className="text-lg font-black text-emerald-700 mt-0.5">{totalApprovals}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-rose-200/60 shadow-xs">
          <p className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">Account Denials</p>
          <p className="text-lg font-black text-rose-700 mt-0.5">{totalRejections}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-blue-200/60 shadow-xs">
          <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Teacher Updates</p>
          <p className="text-lg font-black text-blue-700 mt-0.5">{totalTeacherUpdates}</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 bg-white border-b border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search details, admin email, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1e3a8a] focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#1e3a8a]"
          >
            <option value="ALL">All Categories</option>
            <option value="STUDENT">Student Verifications</option>
            <option value="TEACHER">Teacher Profiles</option>
            <option value="REPORT">Report Generation</option>
            <option value="SETTINGS">System Settings</option>
            <option value="ADMIN">Admin Grants</option>
            <option value="EVALUATION">Evaluations</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#1e3a8a]"
          >
            <option value="ALL">All Action Types</option>
            <option value="APPROVAL">Approvals</option>
            <option value="REJECTION">Rejections</option>
            <option value="REPORT_GENERATION">Report Downloads</option>
            <option value="TEACHER_UPDATE">Teacher Updates</option>
            <option value="SETTINGS_UPDATE">Settings Changes</option>
            <option value="ADMIN_GRANT">Admin Grants</option>
          </select>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center space-y-2">
            <RefreshCw className="w-6 h-6 text-[#1e3a8a] animate-spin" />
            <p className="text-xs font-semibold">Loading accountability activity records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <History className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-bold text-sm text-gray-700">No activity log entries found</p>
            <p className="text-xs text-gray-500">
              {searchTerm || entityFilter !== 'ALL' || actionFilter !== 'ALL' 
                ? 'Try adjusting your search query or category filters.'
                : 'Recorded actions will appear here automatically in real-time as users perform updates.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Activity Description</th>
                <th className="py-3 px-4">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap text-gray-500">
                    <div className="flex items-center space-x-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{new Date(log.createdAt || '').toLocaleDateString()}</span>
                      <span className="text-gray-400 font-mono text-[11px]">{new Date(log.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderActionBadge(log.action)}
                  </td>

                  <td className="py-3 px-4 text-gray-800">
                    <p className="font-semibold text-gray-900">{log.details}</p>
                    {log.targetName && (
                      <p className="text-[11px] text-gray-500 mt-0.5">Target Entity: <strong className="text-gray-700">{log.targetName}</strong></p>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-[#1e3a8a] font-bold flex items-center justify-center text-[10px]">
                        {log.performedBy.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-none">{log.performedBy}</p>
                        {log.performedByEmail && (
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{log.performedByEmail}</p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
        <span>Showing {filteredLogs.length} activity records</span>
        <span>St. Alexius College Institutional Audit Engine</span>
      </div>
    </div>
  );
};
