import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { Users, Star, Edit, Trash2, Plus, X, Search, Filter, Building2 } from 'lucide-react';
import { getStoredDepartments, subscribeToDepartments } from '../../lib/departments';

interface TeacherData {
  id: string;
  name: string;
  email: string;
  department: string;
  averageScore: number;
  employeeId?: string;
  photoURL?: string;
  position?: string;
  majorSubjects?: string;
  otherSubjects?: string;
  isGeneralEducation?: boolean;
  createdAt?: string;
}

export const Teachers: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherData | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '',
    department: '', 
    employeeId: '', 
    photoURL: '', 
    position: '',
    majorSubjects: '',
    otherSubjects: '',
    isGeneralEducation: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>(() => getStoredDepartments());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  useEffect(() => {
    if (!user) return;

    // Real-time departments listener
    const unsubDept = subscribeToDepartments((items) => {
      if (items && items.length > 0) {
        setDepartments(items);
      }
    });

    const fetchTeachersAndScores = async () => {
      try {
        // Fetch teachers
        let teachersList: any[] = [];
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          teachersList = usersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => u.role === 'teacher');
        } catch (usersErr) {
          console.warn("Users query permission notice (using cached/local fallback):", usersErr);
        }

        // Merge local storage teachers
        try {
          const localTeachers = JSON.parse(localStorage.getItem('sac_local_teachers') || '{}');
          Object.entries(localTeachers).forEach(([id, tData]: [string, any]) => {
            const idx = teachersList.findIndex(t => t.id === id || (t.email && tData.email && t.email.toLowerCase() === tData.email.toLowerCase()));
            if (idx >= 0) {
              teachersList[idx] = { ...teachersList[idx], ...tData };
            } else {
              teachersList.push({ id, ...tData });
            }
          });
        } catch (lsErr) {
          console.warn("Local storage teachers notice:", lsErr);
        }

        // Fetch evaluations
        let activeEvaluations: any[] = [];
        try {
          const evalsSnap = await getDocs(collection(db, 'evaluations'));
          activeEvaluations = evalsSnap.docs.map(doc => doc.data());
        } catch (evalsErr) {
          console.warn("Evaluations query permission notice:", evalsErr);
        }

        // Merge local evaluations
        try {
          const localEvals = JSON.parse(localStorage.getItem('sac_local_evaluations') || '{}');
          Object.values(localEvals).forEach((locEval: any) => {
            if (locEval.teacherId) {
              activeEvaluations.push(locEval);
            }
          });
        } catch (e) {
          console.warn("Local evals merge notice:", e);
        }

        const teacherData: TeacherData[] = teachersList.map((teacher: any) => {
          const teacherEvals = activeEvaluations.filter((e: any) => e.teacherId === teacher.id);
          const count = teacherEvals.length;
          const sum = teacherEvals.reduce((acc: number, curr: any) => acc + (curr.computedScore || 0), 0);
          const average = count > 0 ? Number((sum / count).toFixed(2)) : 0;

          return {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email || '',
            department: teacher.department || 'Unassigned',
            averageScore: average,
            employeeId: teacher.employeeId || '',
            photoURL: teacher.photoURL || '',
            position: teacher.position || '',
            majorSubjects: teacher.majorSubjects || teacher.subjects || '',
            otherSubjects: teacher.otherSubjects || teacher.minorSubjects || '',
            isGeneralEducation: !!teacher.isGeneralEducation || teacher.department === 'General Education'
          };
        });

        // Sort alphabetically by name
        setTeachers(teacherData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.warn("Notice in fetchTeachersAndScores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachersAndScores();
    return () => unsubDept();
  }, []);

  const handleOpenModal = (teacher?: TeacherData) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({ 
        name: teacher.name, 
        email: teacher.email || '',
        department: teacher.department,
        employeeId: teacher.employeeId || '',
        photoURL: teacher.photoURL || '',
        position: teacher.position || '',
        majorSubjects: teacher.majorSubjects || '',
        otherSubjects: teacher.otherSubjects || '',
        isGeneralEducation: !!teacher.isGeneralEducation
      });
    } else {
      setEditingTeacher(null);
      setFormData({ 
        name: '', 
        email: '', 
        department: '', 
        employeeId: '', 
        photoURL: '', 
        position: '',
        majorSubjects: '',
        otherSubjects: '',
        isGeneralEducation: false
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
    setFormData({ 
      name: '', 
      email: '', 
      department: '', 
      employeeId: '', 
      photoURL: '', 
      position: '',
      majorSubjects: '',
      otherSubjects: '',
      isGeneralEducation: false
    });
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const teacherPayload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        department: formData.department,
        employeeId: formData.employeeId,
        photoURL: formData.photoURL,
        position: formData.position,
        majorSubjects: formData.majorSubjects.trim(),
        otherSubjects: formData.otherSubjects.trim(),
        isGeneralEducation: formData.isGeneralEducation,
        role: 'teacher',
        verificationStatus: 'approved',
        isVerifiedStudent: true
      };

      const performerName = user?.displayName || 'Administrator';
      const performerEmail = user?.email || 'N/A';
      const targetId = editingTeacher ? editingTeacher.id : `teacher_${Date.now()}`;

      // Save to Firestore with safe fallback
      try {
        if (editingTeacher) {
          await updateDoc(doc(db, 'users', editingTeacher.id), teacherPayload);
        } else {
          const newDoc = await addDoc(collection(db, 'users'), {
            ...teacherPayload,
            createdAt: new Date().toISOString()
          });
        }
      } catch (dbErr) {
        console.warn("Firestore write notice for teacher (using resilient local storage):", dbErr);
      }

      // Always save to localStorage
      try {
        const localTeachers = JSON.parse(localStorage.getItem('sac_local_teachers') || '{}');
        localTeachers[targetId] = {
          id: targetId,
          ...teacherPayload,
          createdAt: editingTeacher?.createdAt || new Date().toISOString()
        };
        localStorage.setItem('sac_local_teachers', JSON.stringify(localTeachers));
        window.dispatchEvent(new CustomEvent('sac_teachers_updated', { detail: localTeachers[targetId] }));
      } catch (lsErr) {
        console.warn("Local storage teacher notice:", lsErr);
      }

      if (editingTeacher) {
        setTeachers(teachers.map(t => t.id === editingTeacher.id ? { ...t, ...teacherPayload } : t));
      } else {
        setTeachers([...teachers, { id: targetId, ...teacherPayload, averageScore: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      }

      // Log activity
      try {
        await logActivity({
          action: editingTeacher ? 'TEACHER_UPDATE' : 'TEACHER_CREATE',
          entity: 'TEACHER',
          details: `${editingTeacher ? 'Updated' : 'Added new'} faculty profile: ${teacherPayload.name} (${teacherPayload.department})`,
          performedBy: performerName,
          performedByEmail: performerEmail,
          targetId: targetId,
          targetName: teacherPayload.name
        });
      } catch (actErr) {
        console.warn("Activity log notice:", actErr);
      }

      handleCloseModal();
    } catch (error) {
      console.warn("Error saving teacher:", error);
      handleCloseModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    const targetTeacher = teachers.find(t => t.id === id);
    try {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (dbErr) {
        console.warn("Firestore delete notice for teacher:", dbErr);
      }

      try {
        const localTeachers = JSON.parse(localStorage.getItem('sac_local_teachers') || '{}');
        delete localTeachers[id];
        localStorage.setItem('sac_local_teachers', JSON.stringify(localTeachers));
        window.dispatchEvent(new CustomEvent('sac_teachers_updated', { detail: { id, deleted: true } }));
      } catch (lsErr) {
        console.warn("Local storage delete notice:", lsErr);
      }

      setTeachers(teachers.filter(t => t.id !== id));
      setDeleteConfirmId(null);

      try {
        await logActivity({
          action: 'TEACHER_DELETE',
          entity: 'TEACHER',
          details: `Removed faculty profile: ${targetTeacher?.name || id}`,
          performedBy: user?.displayName || 'Administrator',
          performedByEmail: user?.email || 'N/A',
          targetId: id,
          targetName: targetTeacher?.name || ''
        });
      } catch (actErr) {
        console.warn("Activity log notice:", actErr);
      }
    } catch (error) {
      console.warn("Error deleting teacher:", error);
      setDeleteConfirmId(null);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesDept = selectedDepartment === 'ALL' || teacher.department === selectedDepartment;
    const searchLower = searchTerm.trim().toLowerCase();
    const matchesSearch = !searchLower || 
      teacher.name.toLowerCase().includes(searchLower) ||
      teacher.email.toLowerCase().includes(searchLower) ||
      (teacher.employeeId && teacher.employeeId.toLowerCase().includes(searchLower)) ||
      (teacher.position && teacher.position.toLowerCase().includes(searchLower)) ||
      teacher.department.toLowerCase().includes(searchLower);

    return matchesDept && matchesSearch;
  });

  if (loading) return <div className="p-8">Loading teachers directory...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers Directory</h1>
          <p className="text-gray-500 text-sm sm:text-base">Manage teachers and view their overall performance scores.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Teacher
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search & College Filter Header Bar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Faculty Members</h2>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-100 ml-1">
              {filteredTeachers.length} {filteredTeachers.length === 1 ? 'Teacher' : 'Teachers'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search teacher, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* College Filter Select */}
            <div className="relative sm:w-56">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] bg-white text-gray-700 font-medium truncate"
              >
                <option value="ALL">All Colleges / Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters button if active */}
            {(searchTerm || selectedDepartment !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartment('ALL');
                }}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center justify-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Average Score</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img 
                          className="h-10 w-10 rounded-full object-cover bg-gray-100" 
                          src={teacher.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=random`} 
                          alt="" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="ml-4">
                        <button 
                          onClick={() => navigate(`/teacher/${teacher.id}`)}
                          className="text-sm font-medium text-[#1e3a8a] hover:underline text-left"
                        >
                          {teacher.name}
                        </button>
                        <div className="text-xs text-gray-500">{teacher.employeeId || 'No ID'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <span>{teacher.department}</span>
                      {teacher.isGeneralEducation && (
                        <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-2 py-0.5 rounded-full border border-amber-300">
                          Gen Ed / Minor
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{teacher.position || 'Teacher'}</div>
                    {teacher.majorSubjects && (
                      <div className="text-[11px] text-blue-800 mt-1 line-clamp-1">
                        <span className="font-semibold">Major:</span> {teacher.majorSubjects}
                      </div>
                    )}
                    {teacher.otherSubjects && (
                      <div className="text-[11px] text-amber-800 mt-0.5 line-clamp-1">
                        <span className="font-semibold">Minor:</span> {teacher.otherSubjects}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end">
                      <Star className={`w-4 h-4 mr-1 ${teacher.averageScore >= 4.0 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      <span className={`text-base font-bold ${
                        teacher.averageScore >= 4.5 ? 'text-green-600' : 
                        teacher.averageScore >= 3.5 ? 'text-blue-600' : 
                        teacher.averageScore > 0 ? 'text-orange-500' : 'text-gray-400'
                      }`}>
                        {teacher.averageScore > 0 ? teacher.averageScore.toFixed(2) : 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {deleteConfirmId === teacher.id ? (
                      <div className="flex items-center justify-end space-x-2">
                        <span className="text-xs text-red-600 font-normal">Delete?</span>
                        <button onClick={() => handleDeleteTeacher(teacher.id)} className="text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors">Yes</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-gray-700 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs transition-colors">No</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end space-x-3">
                        <button onClick={() => handleOpenModal(teacher)} className="text-blue-600 hover:text-blue-900 transition-colors" title="Edit Teacher">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirmId(teacher.id)} className="text-red-600 hover:text-red-900 transition-colors" title="Delete Teacher">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <div className="max-w-xs mx-auto text-gray-500 space-y-2">
                      <Filter className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="text-sm font-medium text-gray-700">No matching faculty members found</p>
                      <p className="text-xs text-gray-400">
                        Try adjusting your search criteria or selecting a different college department.
                      </p>
                      {(searchTerm || selectedDepartment !== 'ALL') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedDepartment('ALL');
                          }}
                          className="mt-2 inline-flex items-center px-3 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCloseModal}></div>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingTeacher ? 'Edit Teacher Details' : 'Add New Teacher'}
                  </h3>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveTeacher} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">School Email</label>
                    <input 
                      type="email" 
                      required 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm" 
                      placeholder="e.g. teacher@stalexius.edu.ph" 
                    />
                    <p className="mt-1 text-xs text-gray-500">The teacher must use this email to log in.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm" 
                        placeholder="e.g. Dr. Juan Dela Cruz" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.employeeId} 
                        onChange={e => setFormData({...formData, employeeId: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm" 
                        placeholder="e.g. EMP-2024-001" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <select 
                        required 
                        value={formData.department} 
                        onChange={e => setFormData({...formData, department: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm bg-white"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Position / Title</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.position} 
                        onChange={e => setFormData({...formData, position: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm" 
                        placeholder="e.g. Associate Professor" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Major Subjects Taught</label>
                      <input 
                        type="text" 
                        value={formData.majorSubjects} 
                        onChange={e => setFormData({...formData, majorSubjects: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm" 
                        placeholder="e.g. IT 101, Data Structures, Web Dev" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minor / Other Subjects Taught</label>
                      <input 
                        type="text" 
                        value={formData.otherSubjects} 
                        onChange={e => setFormData({...formData, otherSubjects: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm" 
                        placeholder="e.g. Ethics, Rizal, Purposive Comm" 
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="modalGenEdCheck"
                      checked={formData.isGeneralEducation} 
                      onChange={e => setFormData({...formData, isGeneralEducation: e.target.checked})} 
                      className="h-4 w-4 text-[#1e3a8a] focus:ring-[#1e3a8a] border-gray-300 rounded" 
                    />
                    <label htmlFor="modalGenEdCheck" className="text-xs text-amber-900 font-semibold cursor-pointer">
                      Tag as General Education / Minor Teacher (Appears in all college student checklists)
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
                    <input 
                      type="url" 
                      value={formData.photoURL} 
                      onChange={e => setFormData({...formData, photoURL: e.target.value})} 
                      className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm" 
                      placeholder="https://example.com/photo.jpg" 
                    />
                    <p className="mt-1 text-xs text-gray-500">Provide a direct link to the teacher's official photo.</p>
                  </div>
                  <div className="mt-8 sm:flex sm:flex-row-reverse">
                    <button 
                      type="submit" 
                      disabled={isSaving} 
                      className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-[#1e3a8a] text-base font-medium text-white hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a8a] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-70 transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Save Teacher'}
                    </button>
                    <button 
                      type="button" 
                      onClick={handleCloseModal} 
                      className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a8a] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
