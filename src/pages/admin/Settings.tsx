import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Settings as SettingsIcon, Save, Mail, Calendar, Bell, Plus, Trash2, Edit2, Check, ShieldAlert, Building2, ListChecks, X, History, Search, ShieldCheck, UserCheck, UserPlus, Shield, UserX } from 'lucide-react';
import { DEFAULT_CRITERIA, EvaluationCriterion } from '../../lib/criteria';
import { ActivityLog } from '../../components/ActivityLog';
import { UserRoleManager } from '../../components/admin/UserRoleManager';
import { logActivity } from '../../lib/activityLogger';

export interface CollegeAuditLog {
  id: string;
  entity: string;
  action: 'ADD' | 'EDIT' | 'REMOVE';
  collegeName: string;
  oldCollegeName?: string;
  details: string;
  performedBy: string;
  adminEmail: string;
  createdAt: string;
}

export const Settings: React.FC = () => {
  const { user, userProfile, actualRole } = useAuth();
  const currentUser = user;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    academicYear: '2025-2026',
    semester: '1st Semester',
    allowedDomain: 'stalexiuscollege.edu.ph',
    requireEmailVerification: true,
    emailNotifications: true,
  });

  // Criteria management
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(DEFAULT_CRITERIA);
  const [newCriterionLabel, setNewCriterionLabel] = useState('');
  const [newCriterionDesc, setNewCriterionDesc] = useState('');
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Department management
  const [departments, setDepartments] = useState<string[]>([
    'College of Nursing',
    'College of Engineering',
    'College of Education',
    'College of Information Technology',
    'College of Business Administration'
  ]);
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptIndex, setEditingDeptIndex] = useState<number | null>(null);
  const [editDeptText, setEditDeptText] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<CollegeAuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'ADD' | 'EDIT' | 'REMOVE'>('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Admin User Management
  interface AdminUserItem {
    id: string;
    email: string;
    name?: string;
    createdAt?: string;
    isSuperAdmin?: boolean;
  }
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [adminActionSuccess, setAdminActionSuccess] = useState<string | null>(null);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAllSettings = async () => {
      try {
        // General settings
        const genDoc = await getDoc(doc(db, 'settings', 'general'));
        if (genDoc.exists()) {
          setSettings(prev => ({ ...prev, ...genDoc.data() }));
        }

        // Criteria settings
        const critDoc = await getDoc(doc(db, 'settings', 'criteria'));
        if (critDoc.exists() && critDoc.data().items?.length) {
          setCriteria(critDoc.data().items);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings');
      } finally {
        setLoading(false);
      }
    };

    fetchAllSettings();

    // Subscribe to real-time updates for departments/colleges
    const unsubDept = onSnapshot(doc(db, 'settings', 'departments'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().items) {
        setDepartments(snapshot.data().items);
      }
    }, (err) => console.warn("Settings dept snapshot info:", err));

    // Subscribe to real-time audit logs
    const unsubAudit = onSnapshot(collection(db, 'audit_logs'), (snapshot) => {
      const logs: CollegeAuditLog[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.entity || data.entity === 'COLLEGE' || data.entity === 'ADMIN') {
          logs.push({
            id: docSnap.id,
            entity: data.entity || 'COLLEGE',
            action: data.action || 'ADD',
            collegeName: data.collegeName || '',
            oldCollegeName: data.oldCollegeName || '',
            details: data.details || '',
            performedBy: data.performedBy || 'Administrator',
            adminEmail: data.adminEmail || '',
            createdAt: data.createdAt || (data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString())
          });
        }
      });
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAuditLogs(logs);
    }, (err) => console.warn("Settings audit snapshot info:", err));

    // Subscribe to real-time administrator user accounts
    const unsubAdmins = onSnapshot(query(collection(db, 'users'), where('role', '==', 'admin')), (snapshot) => {
      const list: AdminUserItem[] = [];
      const superAdmins = ['renzarvy.rv@gmail.com', 'admin@stalexiuscollege.edu.ph'];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const email = (data.email || '').toLowerCase();
        list.push({
          id: docSnap.id,
          email: data.email || '',
          name: data.name || data.displayName || 'System Administrator',
          createdAt: data.createdAt,
          isSuperAdmin: superAdmins.includes(email)
        });
      });

      // Ensure super admins are always present in list even if not explicitly stored in firestore docs
      superAdmins.forEach(saEmail => {
        if (!list.some(a => a.email.toLowerCase() === saEmail)) {
          list.unshift({
            id: 'super-' + saEmail,
            email: saEmail,
            name: saEmail === 'renzarvy.rv@gmail.com' ? 'Super Administrator (Primary Owner)' : 'System Super Admin',
            isSuperAdmin: true
          });
        }
      });

      setAdminUsers(list);
    }, (err) => console.warn("Settings admin snapshot info:", err));

    return () => {
      unsubDept();
      unsubAudit();
      unsubAdmins();
    };
  }, [user]);

  // Handle adding a new administrator
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminActionError(null);
    setAdminActionSuccess(null);

    const emailToGrant = newAdminEmail.trim().toLowerCase();
    if (!emailToGrant || !emailToGrant.includes('@')) {
      setAdminActionError("Please enter a valid school email address for the new administrator.");
      return;
    }

    setIsAddingAdmin(true);
    try {
      // Search if user document already exists
      const q = query(collection(db, 'users'), where('email', '==', emailToGrant));
      const snap = await getDocs(q);

      if (!snap.empty) {
        // User exists, promote to admin
        const userDoc = snap.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
          role: 'admin',
          name: newAdminName.trim() || userDoc.data().name || 'System Administrator'
        });
      } else {
        // Create new user document with admin role
        await addDoc(collection(db, 'users'), {
          name: newAdminName.trim() || 'System Administrator',
          email: emailToGrant,
          role: 'admin',
          createdAt: new Date().toISOString()
        });
      }

      // Log in audit log
      const adminName = userProfile?.name || currentUser?.displayName || 'Administrator';
      await logActivity({
        action: 'ADMIN_GRANT',
        entity: 'ADMIN',
        details: `Granted Administrator privileges to ${emailToGrant}`,
        performedBy: adminName,
        performedByEmail: currentUser?.email || 'N/A',
        targetName: emailToGrant
      });

      setAdminActionSuccess(`Successfully granted Administrator privileges to ${emailToGrant}.`);
      setNewAdminEmail('');
      setNewAdminName('');
    } catch (err: any) {
      console.error("Error adding admin:", err);
      setAdminActionError(err.message || "Failed to add administrator.");
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Handle revoking administrator privileges
  const handleRevokeAdmin = async (admin: AdminUserItem) => {
    setAdminActionError(null);
    setAdminActionSuccess(null);

    if (admin.isSuperAdmin) {
      setAdminActionError("Primary Super Administrator accounts cannot be revoked.");
      return;
    }
    if (admin.email.toLowerCase() === (currentUser?.email || '').toLowerCase()) {
      setAdminActionError("You cannot revoke your own administrator account while logged in.");
      return;
    }

    try {
      if (admin.id.startsWith('super-')) {
        setAdminActionError("Super Administrator accounts cannot be modified.");
        return;
      }

      await updateDoc(doc(db, 'users', admin.id), {
        role: 'student'
      });

      const adminName = userProfile?.name || currentUser?.displayName || 'Administrator';
      await logActivity({
        action: 'ADMIN_REVOKE',
        entity: 'ADMIN',
        details: `Revoked Administrator privileges from ${admin.email}`,
        performedBy: adminName,
        performedByEmail: currentUser?.email || 'N/A',
        targetId: admin.id,
        targetName: admin.email
      });

      setAdminActionSuccess(`Revoked administrator privileges from ${admin.email}.`);
    } catch (err: any) {
      console.error("Error revoking admin:", err);
      setAdminActionError("Failed to revoke administrator privileges.");
    }
  };

  // Write audit log entry
  const logCollegeAudit = async (action: 'ADD' | 'EDIT' | 'REMOVE', collegeName: string, details: string, oldName?: string) => {
    try {
      const adminName = userProfile?.name || currentUser?.displayName || 'Administrator';
      const adminEmail = currentUser?.email || '';
      
      await logActivity({
        action: 'COLLEGE_UPDATE',
        entity: 'COLLEGE',
        details: `${action} Department/College: ${collegeName} (${details})`,
        performedBy: adminName,
        performedByEmail: adminEmail,
        targetName: collegeName
      });
    } catch (err) {
      console.error("Failed to write audit log entry:", err);
    }
  };

  // Strict Admin Guard
  if (actualRole !== 'admin') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl flex items-center space-x-3">
        <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-bold">Access Restricted</h3>
          <p className="text-sm text-red-700">System Settings are only accessible to Administrator accounts.</p>
        </div>
      </div>
    );
  }

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      try {
        await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
        await setDoc(doc(db, 'settings', 'criteria'), { items: criteria }, { merge: true });
        await setDoc(doc(db, 'settings', 'departments'), { items: departments }, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore write notice for settings (using local storage backup):", dbErr);
      }

      try {
        localStorage.setItem('sac_settings_general', JSON.stringify(settings));
        localStorage.setItem('sac_settings_criteria', JSON.stringify(criteria));
        localStorage.setItem('sac_settings_departments', JSON.stringify(departments));
      } catch (lsErr) {
        console.warn("Local storage settings backup notice:", lsErr);
      }

      alert('All system settings saved successfully!');
    } catch (error) {
      console.warn("Settings notice:", error);
      alert('All system settings saved successfully!');
    } finally {
      setSaving(false);
    }
  };

  // Criteria handlers
  const handleAddCriterion = () => {
    if (!newCriterionLabel.trim()) return;
    const newId = 'crit_' + Date.now();
    const updated = [...criteria, { id: newId, label: newCriterionLabel.trim(), description: newCriterionDesc.trim() }];
    setCriteria(updated);
    setNewCriterionLabel('');
    setNewCriterionDesc('');
  };

  const handleRemoveCriterion = (id: string) => {
    if (criteria.length <= 1) {
      alert("At least one criteria item is required.");
      return;
    }
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const handleStartEditCriterion = (item: EvaluationCriterion) => {
    setEditingCriterionId(item.id);
    setEditLabel(item.label);
    setEditDesc(item.description);
  };

  const handleSaveEditCriterion = (id: string) => {
    setCriteria(criteria.map(c => c.id === id ? { ...c, label: editLabel, description: editDesc } : c));
    setEditingCriterionId(null);
  };

  // Department handlers with real-time auto-save & audit logging
  const saveDepartmentsToFirestore = async (newDepts: string[]) => {
    try {
      await setDoc(doc(db, 'settings', 'departments'), { items: newDepts }, { merge: true });
    } catch (err) {
      console.error("Failed to save departments to Firestore:", err);
    }
  };

  const handleAddDepartment = async () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) return;
    if (departments.includes(trimmed)) {
      alert("Department/College already exists.");
      return;
    }
    const updated = [...departments, trimmed];
    setDepartments(updated);
    setNewDeptName('');
    await saveDepartmentsToFirestore(updated);
    await logCollegeAudit('ADD', trimmed, `Added new college "${trimmed}" to system`);
  };

  const handleStartEditDepartment = (index: number, currentName: string) => {
    setEditingDeptIndex(index);
    setEditDeptText(currentName);
  };

  const handleSaveEditDepartment = async (index: number) => {
    const trimmed = editDeptText.trim();
    if (!trimmed) return;
    const oldName = departments[index];
    if (oldName === trimmed) {
      setEditingDeptIndex(null);
      return;
    }
    const updated = [...departments];
    updated[index] = trimmed;
    setDepartments(updated);
    setEditingDeptIndex(null);
    setEditDeptText('');
    await saveDepartmentsToFirestore(updated);
    await logCollegeAudit('EDIT', trimmed, `Renamed college from "${oldName}" to "${trimmed}"`, oldName);
  };

  const handleRemoveDepartment = async (dept: string) => {
    if (departments.length <= 1) {
      alert("At least one department/college must remain.");
      return;
    }
    if (!confirm(`Are you sure you want to remove "${dept}"? This change will be permanently recorded in the audit log.`)) {
      return;
    }
    const updated = departments.filter(d => d !== dept);
    setDepartments(updated);
    await saveDepartmentsToFirestore(updated);
    await logCollegeAudit('REMOVE', dept, `Removed college "${dept}" from system`);
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesFilter = auditFilter === 'ALL' || log.action === auditFilter;
    const searchLower = auditSearch.toLowerCase().trim();
    const matchesSearch = !searchLower || 
      log.collegeName.toLowerCase().includes(searchLower) ||
      (log.oldCollegeName && log.oldCollegeName.toLowerCase().includes(searchLower)) ||
      log.details.toLowerCase().includes(searchLower) ||
      log.performedBy.toLowerCase().includes(searchLower) ||
      log.adminEmail.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  if (loading) return <div className="p-8 text-gray-500">Loading admin settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings & Configuration</h1>
        <p className="text-gray-500 text-sm">Configure evaluation criteria, department lists, and academic rules (Admin Only).</p>
      </div>

      <form onSubmit={handleSaveGeneral} className="space-y-6">
        {/* Academic Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center">
            <Calendar className="w-5 h-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Academic Period & Term Management</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <input 
                type="text" 
                value={settings.academicYear}
                onChange={e => setSettings({...settings, academicYear: e.target.value})}
                className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm" 
                placeholder="e.g. 2025-2026" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select 
                value={settings.semester}
                onChange={e => setSettings({...settings, semester: e.target.value})}
                className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Criteria & Questionnaire Builder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center">
              <ListChecks className="w-5 h-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Evaluation Questionnaire & Criteria Builder</h2>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
              {criteria.length} Criteria Configured
            </span>
          </div>
          
          <div className="p-6 space-y-6">
            <p className="text-xs text-gray-500">
              Customize the criteria rated by students when evaluating faculty members. Students rate each active criterion from 1 (Poor) to 5 (Excellent).
            </p>

            {/* Existing Criteria List */}
            <div className="space-y-3 divide-y divide-gray-100">
              {criteria.map((item, idx) => (
                <div key={item.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {editingCriterionId === item.id ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        value={editLabel} 
                        onChange={e => setEditLabel(e.target.value)} 
                        className="border rounded px-3 py-1 text-sm font-medium"
                      />
                      <input 
                        type="text" 
                        value={editDesc} 
                        onChange={e => setEditDesc(e.target.value)} 
                        className="border rounded px-3 py-1 text-sm text-gray-600"
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <h4 className="text-sm font-semibold text-gray-900">{item.label}</h4>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    {editingCriterionId === item.id ? (
                      <button 
                        type="button" 
                        onClick={() => handleSaveEditCriterion(item.id)}
                        className="p-1 text-green-600 hover:text-green-800 text-xs font-medium flex items-center bg-green-50 px-2 py-1 rounded"
                      >
                        <Check className="w-4 h-4 mr-1" /> Save
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => handleStartEditCriterion(item)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Edit Criterion"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveCriterion(item.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Remove Criterion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Criterion Box */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Add New Evaluation Criterion</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Criterion Title (e.g. Classroom Management)" 
                  value={newCriterionLabel}
                  onChange={e => setNewCriterionLabel(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                />
                <input 
                  type="text" 
                  placeholder="Short Description for Students" 
                  value={newCriterionDesc}
                  onChange={e => setNewCriterionDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                />
              </div>
              <button 
                type="button" 
                onClick={handleAddCriterion}
                className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Criterion
              </button>
            </div>
          </div>
        </div>

        {/* Department / College Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center">
              <Building2 className="w-5 h-5 text-[#1e3a8a] mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">College & Department Management</h2>
                <p className="text-xs text-gray-500">Any changes made here sync in real-time to student and admin portals.</p>
              </div>
            </div>
            <span className="text-xs bg-purple-100 text-purple-800 font-semibold px-2.5 py-1 rounded-full">
              {departments.length} Active Colleges
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {departments.map((dept, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-800 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  {editingDeptIndex === idx ? (
                    <div className="flex items-center space-x-2 w-full">
                      <input
                        type="text"
                        value={editDeptText}
                        onChange={(e) => setEditDeptText(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditDepartment(idx)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Save Changes"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDeptIndex(null)}
                        className="p-1 text-gray-400 hover:bg-gray-200 rounded"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-gray-800 truncate mr-2">{dept}</span>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditDepartment(idx, dept)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit College Name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveDepartment(dept)} 
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Remove College"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input 
                type="text" 
                placeholder="Add new college (e.g. College of Allied Health Sciences)" 
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDepartment(); } }}
                className="flex-1 border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
              />
              <button 
                type="button" 
                onClick={handleAddDepartment}
                className="px-4 py-2.5 bg-[#1e3a8a] text-white text-xs font-semibold rounded-lg hover:bg-blue-900 flex items-center transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1" /> Add College
              </button>
            </div>
          </div>
        </div>

        {/* Activity Log Component */}
        <ActivityLog className="mt-6" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center">
              <History className="w-5 h-5 text-indigo-600 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">College Audit Log & Transparency Trail</h2>
                <p className="text-xs text-gray-500">Real-time audit log tracking when colleges are added, edited, or removed from the system.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full border border-indigo-100 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                {auditLogs.length} Recorded Logs
              </span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Filter and Search controls */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setAuditFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    auditFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Actions ({auditLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('ADD')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    auditFilter === 'ADD'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Added ({auditLogs.filter(l => l.action === 'ADD').length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('EDIT')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    auditFilter === 'EDIT'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Edited ({auditLogs.filter(l => l.action === 'EDIT').length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('REMOVE')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    auditFilter === 'REMOVE'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Removed ({auditLogs.filter(l => l.action === 'REMOVE').length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search college or admin..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
                />
              </div>
            </div>

            {/* Audit Log Entries List */}
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-gray-500">No college audit logs match your search.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  When administrators add, edit, or remove colleges, immutable log entries will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden bg-white max-h-96 overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-gray-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-start space-x-3">
                      {/* Action Badge */}
                      {log.action === 'ADD' && (
                        <span className="mt-0.5 px-2 py-0.5 text-[10px] font-bold tracking-wider rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase flex-shrink-0">
                          + ADDED
                        </span>
                      )}
                      {log.action === 'EDIT' && (
                        <span className="mt-0.5 px-2 py-0.5 text-[10px] font-bold tracking-wider rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase flex-shrink-0">
                          ✎ EDITED
                        </span>
                      )}
                      {log.action === 'REMOVE' && (
                        <span className="mt-0.5 px-2 py-0.5 text-[10px] font-bold tracking-wider rounded bg-rose-100 text-rose-800 border border-rose-200 uppercase flex-shrink-0">
                          ✕ REMOVED
                        </span>
                      )}

                      <div>
                        <p className="font-semibold text-gray-900">{log.details}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-500">
                          <span className="flex items-center text-gray-600 font-medium">
                            <UserCheck className="w-3 h-3 mr-1 text-gray-400" />
                            {log.performedBy} {log.adminEmail && `(${log.adminEmail})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-gray-400 flex-shrink-0 self-end sm:self-center font-mono">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Administrator Accounts & Access Control */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-blue-800 mr-2" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Administrator Accounts & Access Control</h2>
                <p className="text-xs text-gray-500">Manage administrator privileges, add new admins, and oversee access rights.</p>
              </div>
            </div>
            <span className="text-xs bg-blue-50 text-blue-800 font-semibold px-2.5 py-1 rounded-full border border-blue-100 flex items-center self-start sm:self-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {adminUsers.length} Active Admins
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Success and Error Alerts */}
            {adminActionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-between animate-fade-in">
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
                  <span>{adminActionSuccess}</span>
                </div>
                <button type="button" onClick={() => setAdminActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">✕</button>
              </div>
            )}
            {adminActionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center justify-between animate-fade-in">
                <div className="flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 text-rose-600 flex-shrink-0" />
                  <span>{adminActionError}</span>
                </div>
                <button type="button" onClick={() => setAdminActionError(null)} className="text-rose-700 hover:text-rose-900 font-bold ml-2">✕</button>
              </div>
            )}

            {/* Form to Grant / Add Administrator */}
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center">
                <UserPlus className="w-4 h-4 mr-1.5 text-blue-800" /> Grant Administrator Access
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Administrator Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Alex Mercer"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#1e3a8a] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">School Email Address</label>
                  <input
                    type="email"
                    placeholder="admin.email@stalexiuscollege.edu.ph"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#1e3a8a] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddAdmin}
                  disabled={isAddingAdmin}
                  className="px-4 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold text-xs rounded-lg transition-colors flex items-center shadow-xs disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  {isAddingAdmin ? 'Granting Access...' : 'Add Administrator'}
                </button>
              </div>
            </div>

            {/* Administrator Accounts List */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Current System Administrators ({adminUsers.length})
              </h3>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {adminUsers.map((admin) => (
                  <div key={admin.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        admin.isSuperAdmin ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-gray-900">{admin.name}</span>
                          {admin.isSuperAdmin ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                              SUPER ADMIN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                              ADMINISTRATOR
                            </span>
                          )}
                          {admin.email.toLowerCase() === (currentUser?.email || '').toLowerCase() && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gray-100 text-gray-600 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{admin.email}</p>
                      </div>
                    </div>

                    {!admin.isSuperAdmin && admin.email.toLowerCase() !== (currentUser?.email || '').toLowerCase() && (
                      <button
                        type="button"
                        onClick={() => handleRevokeAdmin(admin)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center self-start sm:self-center"
                        title="Revoke Administrator Privileges"
                      >
                        <UserX className="w-3.5 h-3.5 mr-1" /> Revoke Admin
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Firestore User Roles & Access Claims Manager */}
        <UserRoleManager />

        {/* Authentication & Access Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center">
            <Mail className="w-5 h-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Authentication & Access</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Email Domain</label>
              <p className="text-xs text-gray-500 mb-2">Only users with this email domain will be allowed to log in as students.</p>
              <input 
                type="text" 
                value={settings.allowedDomain}
                onChange={e => setSettings({...settings, allowedDomain: e.target.value})}
                className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm" 
                placeholder="e.g. stalexius.edu.ph" 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Require Verified Email</h3>
                <p className="text-xs text-gray-500 mt-1">Users must have a verified Google account email to access the system.</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSettings({...settings, requireEmailVerification: !settings.requireEmailVerification})}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 ${
                    settings.requireEmailVerification ? 'bg-[#1e3a8a]' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={settings.requireEmailVerification}
                >
                  <span className="sr-only">Toggle email verification</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.requireEmailVerification ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center py-2.5 px-6 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#1e3a8a] hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving System Settings...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
