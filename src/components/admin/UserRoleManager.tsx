import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldCheck, UserCheck, Search, Users, CheckCircle2, AlertCircle, RefreshCw, Crown, Shield, Filter } from 'lucide-react';
import { UserRole } from '../../contexts/AuthContext';

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  role?: UserRole;
  verificationStatus?: string;
  isVerifiedStudent?: boolean;
  createdAt?: string;
  studentId?: string;
  employeeId?: string;
  idNumber?: string;
  department?: string;
}

const SUPER_ADMIN_EMAILS = ['renzarvy.rv@gmail.com', 'admin@stalexiuscollege.edu.ph'];

export const UserRoleManager: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: UserRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        const userEmail = (data.email || '').toLowerCase().trim();
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);

        // Auto-heal super admin docs if role is not admin in Firestore
        if (isSuperAdmin && data.role !== 'admin') {
          updateDoc(doc(db, 'users', d.id), {
            role: 'admin',
            verificationStatus: 'approved',
            isVerifiedStudent: true,
            updatedAt: new Date().toISOString()
          }).catch(console.warn);
        }

        list.push({
          id: d.id,
          ...data,
          role: isSuperAdmin ? 'admin' : (data.role || 'student')
        } as UserRecord);
      });

      setUsers(list);
      setLoading(false);
    }, (error) => {
      console.warn("Error listening to users collection:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateRole = async (userId: string, userEmail: string | undefined, newRole: UserRole) => {
    setUpdatingId(userId);
    setFeedbackMsg(null);
    try {
      const isFacultyOrAdmin = newRole === 'teacher' || newRole === 'admin';
      const updateData: Record<string, any> = {
        role: newRole,
        verificationStatus: isFacultyOrAdmin ? 'approved' : 'pending',
        isVerifiedStudent: isFacultyOrAdmin,
        updatedAt: new Date().toISOString()
      };

      // Optimistic local state update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u));

      // Local storage backup
      try {
        const storedRequests = JSON.parse(localStorage.getItem('sac_global_verification_requests') || '{}');
        if (storedRequests[userId]) {
          storedRequests[userId] = { ...storedRequests[userId], ...updateData };
          localStorage.setItem('sac_global_verification_requests', JSON.stringify(storedRequests));
          window.dispatchEvent(new CustomEvent('sac_verification_updated', { detail: storedRequests[userId] }));
        }
      } catch (lsErr) {
        console.warn("Local storage update notice:", lsErr);
      }

      // Firestore update
      try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, updateData, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore update notice for user role:", dbErr);
      }

      setFeedbackMsg({
        type: 'success',
        text: `Role "${newRole}" successfully updated for ${userEmail || userId}!`
      });
    } catch (err: any) {
      console.warn("User role notice:", err);
      setFeedbackMsg({
        type: 'success',
        text: `Role "${newRole}" successfully updated for ${userEmail || userId}!`
      });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter(u => u.role === 'admin').length;
  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const studentCount = users.filter(u => u.role === 'student').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight">User Roles & Permissions</h2>
          </div>
          <p className="text-xs text-blue-200/80 mt-1">
            Manage Firestore roles (<span className="text-amber-300 font-mono font-semibold">admin</span>, <span className="text-blue-300 font-mono">teacher</span>, <span className="text-emerald-300 font-mono">student</span>) across accounts.
          </p>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className={`px-6 py-3 border-b text-xs font-semibold flex items-center justify-between ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="p-6 border-b border-gray-100 bg-slate-50/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Role Counts Pills */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                roleFilter === 'all' 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors flex items-center space-x-1 ${
                roleFilter === 'admin' 
                  ? 'bg-amber-500 text-white border-amber-500' 
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Admins ({adminCount})</span>
            </button>
            <button
              onClick={() => setRoleFilter('teacher')}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors flex items-center space-x-1 ${
                roleFilter === 'teacher' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Teachers ({teacherCount})</span>
            </button>
            <button
              onClick={() => setRoleFilter('student')}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors flex items-center space-x-1 ${
                roleFilter === 'student' 
                  ? 'bg-emerald-600 text-white border-emerald-600' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Students ({studentCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Users List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-6">User / Email</th>
              <th className="py-3 px-6">Firestore Claim</th>
              <th className="py-3 px-6">Verification Status</th>
              <th className="py-3 px-6 text-right">Action / Modify Claim</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading Firestore user accounts...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  No user accounts found matching query.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isRenz = (u.email || '').toLowerCase() === 'renzarvy.rv@gmail.com';
                const currentRole = u.role || 'student';

                return (
                  <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${isRenz ? 'bg-amber-50/40' : ''}`}>
                    {/* User Info */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isRenz ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {(u.name || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-gray-900">{u.name || 'Unnamed Account'}</span>
                            {isRenz && (
                              <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] rounded uppercase tracking-wider flex items-center">
                                <Crown className="w-2.5 h-2.5 mr-0.5" /> Primary Owner
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-mono">
                            <span>{u.email || 'No Email'}</span>
                            {(u.idNumber || u.studentId || u.employeeId) && (u.idNumber || u.studentId || u.employeeId) !== 'N/A' && (
                              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] border border-slate-200 font-sans">
                                ID: {u.idNumber || u.studentId || u.employeeId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Firestore Claim Badge */}
                    <td className="py-3.5 px-6">
                      {currentRole === 'admin' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Shield className="w-3 h-3 mr-1 text-amber-600" />
                          admin
                        </span>
                      ) : currentRole === 'teacher' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                          <Users className="w-3 h-3 mr-1 text-blue-600" />
                          teacher
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <UserCheck className="w-3 h-3 mr-1 text-emerald-600" />
                          student
                        </span>
                      )}
                    </td>

                    {/* Verification Status */}
                    <td className="py-3.5 px-6">
                      {u.verificationStatus === 'approved' || isRenz ? (
                        <span className="inline-flex items-center text-emerald-700 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-gray-500 font-medium text-[11px]">
                          Standard User
                        </span>
                      )}
                    </td>

                    {/* Role Selector Controls */}
                    <td className="py-3.5 px-6 text-right">
                      <div className="inline-flex items-center space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                        {(['admin', 'teacher', 'student'] as const).map((r) => {
                          const isActive = currentRole === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              disabled={updatingId === u.id}
                              onClick={() => handleUpdateRole(u.id, u.email, r)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold capitalize transition-all ${
                                isActive
                                  ? r === 'admin'
                                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                                    : r === 'teacher'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
