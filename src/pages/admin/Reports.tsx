import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import { db } from '../../lib/firebase';
import { 
  Printer, Download, FileText, BarChart2, Filter, PieChart as PieIcon, Award, Mail, Send, 
  CheckCircle2, History, X, Sparkles, ShieldCheck, FileSpreadsheet, Eye, Sliders, ChevronDown, 
  Check, FileDown, Layers, Building2, User, HelpCircle, Search, CheckSquare, Square, RotateCcw,
  Users, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DEFAULT_CRITERIA, EvaluationCriterion } from '../../lib/criteria';
import { sendEvaluationNotificationEmail, EmailNotificationRecord, generateEvaluationReportEmailHtml } from '../../lib/emailNotificationService';
import { 
  exportPerformanceSummaryPDF, 
  exportPerformanceSummaryCSV, 
  exportIndividualTeacherPDF, 
  exportIndividualTeacherCSV, 
  getPerformanceDescriptor 
} from '../../lib/performanceReportExporter';
import { logActivity } from '../../lib/activityLogger';
import { useAuth } from '../../contexts/AuthContext';

interface TeacherReport {
  id: string;
  name: string;
  email?: string;
  department: string;
  evaluationCount: number;
  averageScore: number;
  criteriaScores: Record<string, number>;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'];

export const Reports: React.FC = () => {
  const { user, userProfile } = useAuth();
  const currentUser = user;
  const [reports, setReports] = useState<TeacherReport[]>([]);
  const [rawEvaluations, setRawEvaluations] = useState<any[]>([]);
  const [criteriaList, setCriteriaList] = useState<EvaluationCriterion[]>(DEFAULT_CRITERIA);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  
  // Multi-select Department Filter State
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState<string>('2025-2026');
  const [semester, setSemester] = useState<string>('1st Semester');

  // Export Modal & Dossier Preview State
  const [showExportCenter, setShowExportCenter] = useState(false);
  const [exportScope, setExportScope] = useState<string>('all');
  const [exportCustomSignatory, setExportCustomSignatory] = useState<string>('');
  const [exportCustomAdmin, setExportCustomAdmin] = useState<string>('');
  const [previewTeacherDossier, setPreviewTeacherDossier] = useState<TeacherReport | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Email Notification State
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [batchSending, setBatchSending] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);
  const [notificationLogs, setNotificationLogs] = useState<EmailNotificationRecord[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [previewEmailModal, setPreviewEmailModal] = useState<EmailNotificationRecord | null>(null);
  const [customNote, setCustomNote] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target as Node)) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Load general academic settings
    getDoc(doc(db, 'settings', 'general')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.academicYear) setAcademicYear(data.academicYear);
        if (data.semester) setSemester(data.semester);
      }
    }).catch(err => console.warn("Could not load general settings for reports:", err));

    const unsubDept = onSnapshot(doc(db, 'settings', 'departments'), (snap) => {
      if (snap.exists() && snap.data().items?.length) {
        setDepartmentsList(snap.data().items);
      }
    }, (err) => console.warn("Reports dept snapshot info:", err));

    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const logs: EmailNotificationRecord[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          teacherId: data.teacherId || '',
          teacherName: data.teacherName || 'Faculty Member',
          recipientEmail: data.recipientEmail || '',
          department: data.department || '',
          subject: data.subject || '',
          bodyText: data.bodyText || '',
          bodyHtml: data.bodyHtml || '',
          triggerType: data.triggerType || 'REPORT_PUBLISHED',
          status: data.status || 'SENT',
          readByTeacher: !!data.readByTeacher,
          evaluationCount: data.evaluationCount || 0,
          averageScore: data.averageScore || 0,
          sentBy: data.sentBy || 'Administrator',
          createdAt: data.createdAt || (data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString())
        };
      });
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotificationLogs(logs);
    }, (err) => console.warn("Reports notifs snapshot info:", err));

    const generateReports = async () => {
      try {
        // Fetch custom criteria
        const critDoc = await getDoc(doc(db, 'settings', 'criteria'));
        let activeCriteria = DEFAULT_CRITERIA;
        if (critDoc.exists() && critDoc.data().items?.length) {
          activeCriteria = critDoc.data().items;
          setCriteriaList(activeCriteria);
        }

        // Fetch custom departments
        const deptDoc = await getDoc(doc(db, 'settings', 'departments'));
        if (deptDoc.exists() && deptDoc.data().items?.length) {
          setDepartmentsList(deptDoc.data().items);
        }

        // 1. Fetch all teachers
        let teachersList: any[] = [];
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          teachersList = usersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => u.role === 'teacher');
        } catch (uErr) {
          console.warn("Teachers fetch permission notice in Reports:", uErr);
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
          console.warn("Local storage teachers notice in Reports:", lsErr);
        }

        // 2. Fetch all evaluations
        let activeEvaluations: any[] = [];
        try {
          const evalsSnap = await getDocs(collection(db, 'evaluations'));
          activeEvaluations = evalsSnap.docs.map(doc => doc.data());
        } catch (eErr) {
          console.warn("Evaluations fetch permission notice in Reports:", eErr);
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
          console.warn("Local evals merge notice in Reports:", e);
        }

        setRawEvaluations(activeEvaluations);

        // 3. Aggregate data per teacher
        const reportData: TeacherReport[] = teachersList.map((teacher: any) => {
          const teacherEvals = activeEvaluations.filter((e: any) => e.teacherId === teacher.id);
          const count = teacherEvals.length;
          
          let sumScore = 0;
          const tCritSums: Record<string, number> = {};
          const tCritCounts: Record<string, number> = {};

          teacherEvals.forEach((ev: any) => {
            sumScore += (ev.computedScore || 0);

            if (ev.answers) {
              Object.keys(ev.answers).forEach(critId => {
                const val = Number(ev.answers[critId]);
                if (val >= 1 && val <= 5) {
                  tCritSums[critId] = (tCritSums[critId] || 0) + val;
                  tCritCounts[critId] = (tCritCounts[critId] || 0) + 1;
                }
              });
            }
          });

          const average = count > 0 ? Number((sumScore / count).toFixed(2)) : 0;
          
          const tCritAverages: Record<string, number> = {};
          Object.keys(tCritSums).forEach(cid => {
            tCritAverages[cid] = Number((tCritSums[cid] / tCritCounts[cid]).toFixed(2));
          });

          return {
            id: teacher.id,
            name: teacher.name || 'Unnamed Faculty',
            email: teacher.email,
            department: teacher.department || 'Unassigned',
            evaluationCount: count,
            averageScore: average,
            criteriaScores: tCritAverages
          };
        });

        setReports(reportData.sort((a, b) => b.averageScore - a.averageScore));

      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'reports');
      } finally {
        setLoading(false);
      }
    };

    generateReports();
    return () => {
      unsubDept();
      unsubNotifs();
    };
  }, [user]);

  // All distinct available departments from settings & teacher reports
  const allAvailableDepartments = useMemo(() => {
    const deptSet = new Set<string>(departmentsList);
    reports.forEach(r => {
      if (r.department && r.department.trim()) {
        deptSet.add(r.department.trim());
      }
    });
    return Array.from(deptSet).sort();
  }, [departmentsList, reports]);

  // Multi-select Filter Helpers
  const isAllSelected = selectedDepts.length === 0 || selectedDepts.length === allAvailableDepartments.length;

  const toggleDepartment = (dept: string) => {
    if (isAllSelected) {
      // If currently all selected, clicking one selects only that one
      setSelectedDepts([dept]);
    } else {
      if (selectedDepts.includes(dept)) {
        const next = selectedDepts.filter(d => d !== dept);
        // If empty or all, treat as all
        setSelectedDepts(next);
      } else {
        const next = [...selectedDepts, dept];
        if (next.length === allAvailableDepartments.length) {
          setSelectedDepts([]);
        } else {
          setSelectedDepts(next);
        }
      }
    }
  };

  const handleSelectAll = () => {
    setSelectedDepts([]);
  };

  const handleClearAll = () => {
    if (allAvailableDepartments.length > 0) {
      // Pick none or first
      setSelectedDepts(['__NONE__']);
    }
  };

  // Filtered teachers list based on multi-select
  const filteredReports = useMemo(() => {
    if (isAllSelected) return reports;
    if (selectedDepts.includes('__NONE__')) return [];
    return reports.filter(r => selectedDepts.includes(r.department));
  }, [reports, selectedDepts, isAllSelected]);

  // Dynamically computed Department stats based on active filter
  const dynamicDepartmentStats = useMemo(() => {
    const deptMap: Record<string, { sum: number; count: number; teacherCount: number; evalCount: number }> = {};
    
    // Group from filteredReports
    filteredReports.forEach(report => {
      if (!deptMap[report.department]) {
        deptMap[report.department] = { sum: 0, count: 0, teacherCount: 0, evalCount: 0 };
      }
      deptMap[report.department].teacherCount += 1;
      deptMap[report.department].evalCount += report.evaluationCount;
      if (report.evaluationCount > 0 && report.averageScore > 0) {
        deptMap[report.department].sum += report.averageScore;
        deptMap[report.department].count += 1;
      }
    });

    return Object.keys(deptMap).map(dept => ({
      name: dept,
      average: deptMap[dept].count > 0 ? Number((deptMap[dept].sum / deptMap[dept].count).toFixed(2)) : 0,
      teacherCount: deptMap[dept].teacherCount,
      evaluationCount: deptMap[dept].evalCount
    })).sort((a, b) => b.average - a.average);
  }, [filteredReports]);

  // Dynamically computed Criteria stats based on active filter
  const dynamicCriteriaStats = useMemo(() => {
    const critSums: Record<string, number> = {};
    const critCounts: Record<string, number> = {};
    criteriaList.forEach(c => {
      critSums[c.id] = 0;
      critCounts[c.id] = 0;
    });

    filteredReports.forEach(report => {
      if (report.criteriaScores) {
        Object.keys(report.criteriaScores).forEach(critId => {
          const val = report.criteriaScores[critId];
          if (val !== undefined && val > 0) {
            critSums[critId] = (critSums[critId] || 0) + (val * report.evaluationCount);
            critCounts[critId] = (critCounts[critId] || 0) + report.evaluationCount;
          }
        });
      }
    });

    return criteriaList.map(c => ({
      name: c.label,
      average: critCounts[c.id] > 0 ? Number((critSums[c.id] / critCounts[c.id]).toFixed(2)) : 0
    }));
  }, [filteredReports, criteriaList]);

  // Dynamically computed Qualitative Rating Distribution based on active filter
  const dynamicRatingDistribution = useMemo(() => {
    let outstanding = 0, verySat = 0, satisfactory = 0, fair = 0, unsatisfactory = 0;
    filteredReports.forEach(r => {
      if (r.evaluationCount > 0 && r.averageScore > 0) {
        if (r.averageScore >= 4.5) outstanding++;
        else if (r.averageScore >= 3.5) verySat++;
        else if (r.averageScore >= 2.5) satisfactory++;
        else if (r.averageScore >= 1.5) fair++;
        else unsatisfactory++;
      }
    });

    return [
      { name: '5 Stars (Outstanding: 4.5-5.0)', value: outstanding, fill: '#10b981' },
      { name: '4 Stars (Very Satisfactory: 3.5-4.49)', value: verySat, fill: '#3b82f6' },
      { name: '3 Stars (Satisfactory: 2.5-3.49)', value: satisfactory, fill: '#eab308' },
      { name: '2 Stars (Fair: 1.5-2.49)', value: fair, fill: '#f97316' },
      { name: '1 Star (Unsatisfactory: <1.5)', value: unsatisfactory, fill: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [filteredReports]);

  // Dynamic KPI calculations for current selection
  const totalFacultyCount = filteredReports.length;
  const totalEvaluationsCount = filteredReports.reduce((sum, r) => sum + (r.evaluationCount || 0), 0);
  const evaluatedFaculty = filteredReports.filter(r => r.evaluationCount > 0 && r.averageScore > 0);
  const dynamicCompositeAverage = evaluatedFaculty.length > 0
    ? Number((evaluatedFaculty.reduce((sum, r) => sum + r.averageScore, 0) / evaluatedFaculty.length).toFixed(2))
    : 0;
  const activeScopeDescriptor = getPerformanceDescriptor(dynamicCompositeAverage);

  const getAdminName = () => {
    return exportCustomAdmin.trim() || userProfile?.name || currentUser?.displayName || 'Administrator';
  };

  // Human readable label for current selection scope
  const getSelectedScopeLabel = () => {
    if (isAllSelected) return 'All Departments';
    if (selectedDepts.length === 1) return selectedDepts[0];
    return `${selectedDepts.length} Selected Departments (${selectedDepts.join(', ')})`;
  };

  // Export handlers with dynamic multi-department support
  const handleExportQuickPDF = (scope: string = isAllSelected ? 'all' : selectedDepts.join(', ')) => {
    try {
      setIsExporting(true);
      exportPerformanceSummaryPDF({
        institutionName: 'ST. ALEXIUS COLLEGE',
        campusLocation: 'City of Koronadal, South Cotabato, Philippines',
        academicYear,
        semester,
        selectedDepartment: scope,
        generatedBy: getAdminName(),
        reports: filteredReports,
        criteriaList,
        departmentStats: dynamicDepartmentStats,
        criteriaStats: dynamicCriteriaStats
      });

      // Audit log report generation
      logActivity({
        action: 'REPORT_GENERATION',
        entity: 'REPORT',
        details: `Generated PDF Performance Summary Report (${scope}, AY ${academicYear})`,
        performedBy: getAdminName(),
        performedByEmail: user?.email || '',
        targetName: scope === 'all' ? 'All Departments Summary' : `${scope} Summary`
      });

      setExportSuccessMsg(`Successfully exported PDF performance summary for ${scope === 'all' ? 'All Departments' : scope}!`);
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Failed to export PDF file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportQuickCSV = (scope: string = isAllSelected ? 'all' : selectedDepts.join(', ')) => {
    try {
      setIsExporting(true);
      exportPerformanceSummaryCSV({
        institutionName: 'St. Alexius College',
        campusLocation: 'City of Koronadal, South Cotabato, Philippines',
        academicYear,
        semester,
        selectedDepartment: scope,
        generatedBy: getAdminName(),
        reports: filteredReports,
        criteriaList,
        departmentStats: dynamicDepartmentStats,
        criteriaStats: dynamicCriteriaStats
      });

      // Audit log CSV export
      logActivity({
        action: 'REPORT_GENERATION',
        entity: 'REPORT',
        details: `Generated CSV Performance Spreadsheet (${scope}, AY ${academicYear})`,
        performedBy: getAdminName(),
        performedByEmail: user?.email || '',
        targetName: scope === 'all' ? 'All Departments CSV' : `${scope} CSV`
      });

      setExportSuccessMsg(`Successfully exported CSV performance summary for ${scope === 'all' ? 'All Departments' : scope}!`);
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err) {
      console.error("CSV Export error:", err);
      alert("Failed to export CSV file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSingleTeacherPDF = (teacher: TeacherReport) => {
    try {
      exportIndividualTeacherPDF(teacher, criteriaList, {
        academicYear,
        semester,
        generatedBy: getAdminName()
      });

      // Audit log single teacher dossier PDF export
      logActivity({
        action: 'REPORT_GENERATION',
        entity: 'REPORT',
        details: `Generated individual PDF Dossier for faculty ${teacher.name} (${teacher.department})`,
        performedBy: getAdminName(),
        performedByEmail: user?.email || '',
        targetId: teacher.id,
        targetName: teacher.name
      });

      setExportSuccessMsg(`Exported official PDF Dossier for Prof. ${teacher.name}`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Single teacher PDF export error:", err);
      alert("Failed to generate teacher PDF dossier.");
    }
  };

  const handleExportSingleTeacherCSV = (teacher: TeacherReport) => {
    try {
      exportIndividualTeacherCSV(teacher, criteriaList, {
        academicYear,
        semester,
        generatedBy: getAdminName()
      });

      // Audit log single teacher CSV export
      logActivity({
        action: 'REPORT_GENERATION',
        entity: 'REPORT',
        details: `Generated individual CSV record for faculty ${teacher.name} (${teacher.department})`,
        performedBy: getAdminName(),
        performedByEmail: user?.email || '',
        targetId: teacher.id,
        targetName: teacher.name
      });

      setExportSuccessMsg(`Exported CSV record for Prof. ${teacher.name}`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Single teacher CSV export error:", err);
      alert("Failed to generate teacher CSV record.");
    }
  };

  const handleSendSingleNotification = async (report: TeacherReport) => {
    if (!report.email) {
      alert(`No email address recorded for Prof. ${report.name}.`);
      return;
    }
    setSendingEmailId(report.id);
    setDispatchMsg(null);
    try {
      const adminName = userProfile?.name || currentUser?.displayName || 'Administrator';
      await sendEvaluationNotificationEmail({
        teacherId: report.id,
        teacherName: report.name,
        teacherEmail: report.email,
        department: report.department,
        triggerType: 'REPORT_PUBLISHED',
        evaluationCount: report.evaluationCount,
        averageScore: report.averageScore,
        customNote: customNote.trim() || undefined,
        sentBy: adminName
      });

      setDispatchMsg(`Automated report email notification successfully dispatched to Prof. ${report.name} (${report.email})`);
      setTimeout(() => setDispatchMsg(null), 5000);
    } catch (err) {
      console.error("Failed to send report email:", err);
      alert("Failed to send email notification. Please try again.");
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleBatchNotifyAll = async () => {
    const targets = filteredReports.filter(r => r.email);

    if (targets.length === 0) {
      alert("No faculty members with valid email addresses found in current selection.");
      return;
    }

    if (!confirm(`Send automated email report notifications to ${targets.length} faculty member(s) in the selected departments?`)) {
      return;
    }

    setBatchSending(true);
    setDispatchMsg(null);
    let sentCount = 0;
    try {
      const adminName = userProfile?.name || currentUser?.displayName || 'Administrator';
      for (const report of targets) {
        if (report.email) {
          await sendEvaluationNotificationEmail({
            teacherId: report.id,
            teacherName: report.name,
            teacherEmail: report.email,
            department: report.department,
            triggerType: 'REPORT_PUBLISHED',
            evaluationCount: report.evaluationCount,
            averageScore: report.averageScore,
            customNote: customNote.trim() || undefined,
            sentBy: adminName
          });
          sentCount++;
        }
      }

      setDispatchMsg(`Batch dispatch completed! Successfully sent ${sentCount} automated notification email(s).`);
      setTimeout(() => setDispatchMsg(null), 6000);
    } catch (err) {
      console.error("Error batch sending emails:", err);
      alert("Encountered an issue during batch email dispatch.");
    } finally {
      setBatchSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const searchedDepartments = allAvailableDepartments.filter(dept => 
    dept.toLowerCase().includes(deptSearchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-gray-500">Compiling institution evaluation analytics...</div>;

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">Faculty Evaluation Analytics & Reports</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {academicYear} • {semester}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">Comprehensive multi-dimensional performance evaluation breakdown with dynamic multi-department filtering.</p>
        </div>

        {/* Primary Export Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Quick PDF Export */}
          <button 
            onClick={() => handleExportQuickPDF()}
            disabled={isExporting || filteredReports.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-900 to-[#1e3a8a] text-white rounded-lg hover:from-blue-950 hover:to-blue-900 transition-all shadow-sm text-xs font-bold disabled:opacity-50"
            title="Download formatted St. Alexius College PDF Executive Performance Summary for current selection"
          >
            <FileText className="w-4 h-4 mr-1.5 text-amber-400" />
            Export PDF Summary
          </button>

          {/* Quick CSV Export */}
          <button 
            onClick={() => handleExportQuickCSV()}
            disabled={isExporting || filteredReports.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm text-xs font-bold disabled:opacity-50"
            title="Download CSV spreadsheet data with criteria scores for administrative record keeping"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Export CSV
          </button>

          {/* Record Keeping Center Modal Trigger */}
          <button 
            onClick={() => {
              setExportScope(isAllSelected ? 'all' : selectedDepts.join(', '));
              setShowExportCenter(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center px-3.5 py-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors shadow-sm text-xs font-bold"
            title="Configure advanced export parameters and individual teacher record dossiers"
          >
            <Sliders className="w-4 h-4 mr-1.5 text-amber-700" />
            Export Options & Dossiers
          </button>

          {/* Browser Print Action */}
          <button 
            onClick={handlePrint}
            className="flex-none flex items-center justify-center p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-xs font-medium"
            title="Print view or save via browser print dialog"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Printable Header for Browser Print */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">St. Alexius College</h1>
        <h2 className="text-xl text-gray-700">Teachers Performance Evaluation Summary Report</h2>
        <p className="text-gray-500 text-sm">
          Academic Period: {academicYear} - {semester} | Scope: {getSelectedScopeLabel()} | Generated on: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Export Success Toast / Alert */}
      {exportSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-emerald-900 text-xs font-semibold shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
          <button onClick={() => setExportSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Automated Email Dispatch Status Alert */}
      {dispatchMsg && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center justify-between text-indigo-900 text-xs font-semibold shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>{dispatchMsg}</span>
          </div>
          <button onClick={() => setDispatchMsg(null)} className="text-indigo-600 hover:text-indigo-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Automated Email Notification Controls Bar */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Multi-Select Department Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-gray-700">
              <Filter className="w-4 h-4 text-blue-800" />
              <span className="text-xs font-bold uppercase tracking-wider">Department Filter:</span>
            </div>

            {/* Custom Multi-Select Dropdown Button & Popover */}
            <div className="relative" ref={deptDropdownRef}>
              <button
                type="button"
                onClick={() => setDeptDropdownOpen(prev => !prev)}
                className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all shadow-sm ${
                  !isAllSelected 
                    ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-500/20' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-700" />
                  <span className="font-semibold">
                    {isAllSelected ? (
                      `All Departments (${allAvailableDepartments.length})`
                    ) : selectedDepts.length === 1 ? (
                      selectedDepts[0]
                    ) : (
                      `${selectedDepts.length} Departments Selected`
                    )}
                  </span>
                </div>

                {!isAllSelected && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-700 text-white">
                    {selectedDepts.length}
                  </span>
                )}

                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${deptDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Multi-Select Menu Popover */}
              {deptDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  {/* Search Inside Dropdown */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search academic departments..."
                      value={deptSearchTerm}
                      onChange={(e) => setDeptSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-700"
                    />
                  </div>

                  {/* Quick Select Actions */}
                  <div className="flex items-center justify-between pt-1 pb-2 border-b border-gray-100 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 hover:underline"
                    >
                      <CheckSquare className="w-3 h-3" /> Select All ({allAvailableDepartments.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1 hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear Selection
                    </button>
                  </div>

                  {/* Department Checkbox List */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {searchedDepartments.length > 0 ? (
                      searchedDepartments.map((dept) => {
                        const isChecked = isAllSelected || selectedDepts.includes(dept);
                        const teacherCount = reports.filter(r => r.department === dept).length;
                        return (
                          <div
                            key={dept}
                            onClick={() => toggleDepartment(dept)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                              isChecked 
                                ? 'bg-blue-50/80 text-blue-950 font-semibold' 
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                isChecked ? 'bg-blue-800 border-blue-800 text-white' : 'border-gray-300 bg-white'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="truncate">{dept}</span>
                            </div>

                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-gray-100 text-gray-600 flex-shrink-0">
                              {teacherCount} faculty
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-400">
                        No departments found matching "{deptSearchTerm}"
                      </div>
                    )}
                  </div>

                  {/* Dropdown Footer Status */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      {isAllSelected 
                        ? 'All departments active' 
                        : `${selectedDepts.length} of ${allAvailableDepartments.length} departments active`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeptDropdownOpen(false)}
                      className="px-2.5 py-1 bg-blue-800 text-white font-bold rounded-md hover:bg-blue-900 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-xs text-gray-500 font-medium">
              Showing <strong className="text-gray-900">{filteredReports.length}</strong> of {reports.length} faculty
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowLogsModal(true)}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors flex items-center"
            >
              <History className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Email Dispatch Logs ({notificationLogs.length})
            </button>

            <button
              onClick={handleBatchNotifyAll}
              disabled={batchSending || filteredReports.filter(r => r.email).length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {batchSending ? 'Dispatching Batch Emails...' : `Batch Email Report Alerts (${filteredReports.filter(r => r.email).length})`}
            </button>
          </div>
        </div>

        {/* Selected Department Filter Badges/Pills */}
        {!isAllSelected && selectedDepts.length > 0 && !selectedDepts.includes('__NONE__') && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
            <span className="text-[11px] font-bold text-gray-500 mr-1">Active Department Filters:</span>
            {selectedDepts.map(dept => (
              <span 
                key={dept} 
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200 animate-in fade-in"
              >
                <span>{dept}</span>
                <button 
                  onClick={() => toggleDepartment(dept)} 
                  className="hover:bg-blue-200 rounded-full p-0.5 text-blue-800"
                  title={`Remove ${dept}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-700 hover:text-blue-900 font-bold ml-2 underline"
            >
              Reset to All Departments
            </button>
          </div>
        )}

        {/* Custom Message input for email dispatch */}
        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap flex items-center">
            <Mail className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Custom Note in Email:
          </span>
          <input
            type="text"
            placeholder="Optional custom message to include in email notification (e.g. Please log in to review your ratings & complete self-reflection)..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
          />
        </div>
      </div>

      {/* Dynamic Summary KPI Cards for Active Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:break-inside-avoid">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtered Departments</span>
            <div className="text-xl font-black text-blue-950 mt-0.5">
              {isAllSelected ? `${allAvailableDepartments.length} Depts` : `${selectedDepts.length} of ${allAvailableDepartments.length}`}
            </div>
            <div className="text-[11px] text-blue-700 font-medium truncate max-w-[180px]">
              {getSelectedScopeLabel()}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-800">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Faculty in Scope</span>
            <div className="text-xl font-black text-gray-900 mt-0.5">
              {totalFacultyCount} Members
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              {evaluatedFaculty.length} Evaluated ({totalFacultyCount > 0 ? Math.round((evaluatedFaculty.length / totalFacultyCount) * 100) : 0}%)
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Evaluations</span>
            <div className="text-xl font-black text-indigo-950 mt-0.5">
              {totalEvaluationsCount} Reviews
            </div>
            <div className="text-[11px] text-gray-500">
              Across selected departments
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Composite Average</span>
            <div className="text-xl font-black text-blue-900 mt-0.5">
              {dynamicCompositeAverage > 0 ? dynamicCompositeAverage.toFixed(2) : 'N/A'}{' '}
              <span className="text-xs text-gray-400 font-normal">/ 5.00</span>
            </div>
            <div className="mt-0.5">
              <span 
                className="px-2 py-0.5 rounded-md text-[10px] font-extrabold"
                style={{ backgroundColor: `${activeScopeDescriptor.color}15`, color: activeScopeDescriptor.color }}
              >
                {activeScopeDescriptor.label}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid - Dynamically Updated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-inside-avoid">
        {/* Dynamic Department Performance Comparison Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BarChart2 className="w-5 h-5 text-blue-800 mr-2" />
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Department Performance Comparison
                </h2>
                <p className="text-xs text-gray-500">
                  {dynamicDepartmentStats.length} department(s) in active scope
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Avg / 5.00</span>
          </div>

          <div className="h-64">
            {dynamicDepartmentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicDepartmentStats} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    interval={0}
                    tickFormatter={(val) => val.length > 18 ? `${val.substring(0, 16)}...` : val}
                  />
                  <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toFixed(2)} / 5.00`, 'Average Score']}
                    labelFormatter={(label) => `Department: ${label}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="average" fill="#1e3a8a" radius={[6, 6, 0, 0]} name="Avg Score">
                    {dynamicDepartmentStats.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.average >= 4.5 ? '#10b981' : entry.average >= 3.5 ? '#1e3a8a' : '#f59e0b'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No evaluation data available for selected department filter.
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Criteria Dimensions Performance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Award className="w-5 h-5 text-[#d4af37] mr-2" />
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Criteria Dimensions Average
                </h2>
                <p className="text-xs text-gray-500">Filtered composite scores across evaluative dimensions</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Score / 5.0</span>
          </div>

          <div className="h-64">
            {dynamicCriteriaStats.some(c => c.average > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicCriteriaStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={120} />
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toFixed(2)} / 5.00`, 'Average Score']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="average" fill="#0d9488" radius={[0, 6, 6, 0]} name="Score / 5.0" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No dimension criteria evaluation data available for current selection.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Individual Faculty Report Table with Dynamic Filtered Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 print:bg-transparent">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-blue-900 mr-2 print:hidden" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Faculty Individual Performance & Records</h2>
              <p className="text-xs text-gray-500">
                Showing {filteredReports.length} faculty members ({getSelectedScopeLabel()}).
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExportQuickCSV()}
              disabled={filteredReports.length === 0}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center transition-colors print:hidden disabled:opacity-40"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
              Download Table CSV
            </button>
            <button
              onClick={() => handleExportQuickPDF()}
              disabled={filteredReports.length === 0}
              className="text-xs font-bold text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center transition-colors print:hidden disabled:opacity-40"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Download Full PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 print:bg-transparent">
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank & Teacher</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Evaluations</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Overall Average</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Rating Band</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center print:hidden">Administrative Export & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.length > 0 ? (
                filteredReports.map((report, index) => {
                  const descriptor = getPerformanceDescriptor(report.averageScore);
                  return (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            index === 1 ? 'bg-slate-200 text-slate-800' :
                            index === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{report.name}</div>
                            {report.email && (
                              <div className="text-[11px] text-gray-500">{report.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {report.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          {report.evaluationCount} Submitted
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end">
                          <span className={`text-base font-extrabold ${
                            report.averageScore >= 4.5 ? 'text-emerald-600' : 
                            report.averageScore >= 3.5 ? 'text-blue-600' : 
                            report.averageScore > 0 ? 'text-orange-500' : 'text-gray-400'
                          }`}>
                            {report.averageScore > 0 ? report.averageScore.toFixed(2) : 'N/A'}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">/ 5.0</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: `${descriptor.color}15`, color: descriptor.color }}
                        >
                          {descriptor.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center print:hidden">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* View Dossier Modal */}
                          <button
                            onClick={() => setPreviewTeacherDossier(report)}
                            className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                            title={`Preview administrative record dossier for Prof. ${report.name}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 1-Click PDF Dossier Export */}
                          <button
                            onClick={() => handleExportSingleTeacherPDF(report)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 transition-colors"
                            title={`Export official PDF Dossier for ${report.name}`}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1 text-amber-700" />
                            PDF Dossier
                          </button>

                          {/* 1-Click CSV Record Export */}
                          <button
                            onClick={() => handleExportSingleTeacherCSV(report)}
                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title={`Export CSV record for ${report.name}`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>

                          {/* Email Notification Alert */}
                          <button
                            onClick={() => handleSendSingleNotification(report)}
                            disabled={sendingEmailId === report.id || !report.email}
                            className="p-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-40"
                            title={report.email ? `Send report email notification to ${report.email}` : 'No email recorded'}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold">No faculty performance data matching the selected department filter.</p>
                    <button
                      onClick={handleSelectAll}
                      className="mt-2 text-xs text-blue-700 font-bold hover:underline"
                    >
                      Reset filter to show all departments
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Record Keeping & Performance Summary Export Center Modal */}
      {showExportCenter && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white flex items-center justify-between border-b border-blue-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Administrative Export Center & Records</h3>
                  <p className="text-xs text-blue-200">Export official executive performance summaries in PDF or CSV format</p>
                </div>
              </div>
              <button 
                onClick={() => setShowExportCenter(false)}
                className="p-1 hover:bg-blue-800 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5 text-left">
              {/* Scope & Academic Metadata */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center">
                  <Building2 className="w-4 h-4 mr-1.5 text-blue-800" />
                  1. Report Scope & Academic Period
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Target Department Scope:</label>
                    <select
                      value={exportScope}
                      onChange={(e) => setExportScope(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-blue-800 font-medium"
                    >
                      <option value="all">All Academic Departments ({reports.length} faculty)</option>
                      {!isAllSelected && selectedDepts.length > 0 && (
                        <option value={selectedDepts.join(', ')}>
                          Currently Filtered ({selectedDepts.length} Depts, {filteredReports.length} faculty)
                        </option>
                      )}
                      {allAvailableDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Academic Year:</label>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="e.g. 2025-2026"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-blue-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Semester / Term:</label>
                    <input
                      type="text"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      placeholder="e.g. 1st Semester"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-blue-800 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Administrative Signatory Customization */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-700" />
                  2. Signatory Endorsement Names
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Prepared by (Administrator Name):</label>
                    <input
                      type="text"
                      value={exportCustomAdmin}
                      onChange={(e) => setExportCustomAdmin(e.target.value)}
                      placeholder={userProfile?.name || 'Administrator'}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-blue-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Endorsing Office / Authority:</label>
                    <input
                      type="text"
                      value={exportCustomSignatory}
                      onChange={(e) => setExportCustomSignatory(e.target.value)}
                      placeholder="Office of Academic Affairs & Guidance Office"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-blue-800 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Export Format Actions Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  3. Select Export Format & Generate File
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PDF Export Box */}
                  <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-[#1e3a8a] font-bold text-sm mb-1">
                        <FileText className="w-5 h-5 text-red-500" />
                        <span>Official PDF Performance Summary</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-4">
                        High-definition vector document with official St. Alexius College letterhead, executive KPIs, department comparisons, and signatory blocks.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        handleExportQuickPDF(exportScope);
                        setShowExportCenter(false);
                      }}
                      className="w-full py-2.5 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF Summary</span>
                    </button>
                  </div>

                  {/* CSV Export Box */}
                  <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm mb-1">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <span>Administrative CSV Spreadsheet</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-4">
                        Structured tabular dataset with dynamic category scores, ranking metrics, and quantitative rating codes for Excel or accreditation archives.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        handleExportQuickCSV(exportScope);
                        setShowExportCenter(false);
                      }}
                      className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download CSV Spreadsheet</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowExportCenter(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-colors"
              >
                Close Export Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Faculty Dossier Preview Modal */}
      {previewTeacherDossier && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between border-b border-blue-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Faculty Performance Record Dossier</h3>
                  <p className="text-xs text-blue-200">Official individual administrative summary sheet</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewTeacherDossier(null)}
                className="p-1 hover:bg-blue-800 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5 text-left">
              {/* Faculty Info Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-gray-900">{previewTeacherDossier.name}</div>
                  <div className="text-xs text-gray-600 font-medium">{previewTeacherDossier.department}</div>
                  {previewTeacherDossier.email && (
                    <div className="text-xs text-gray-400 mt-0.5">{previewTeacherDossier.email}</div>
                  )}
                </div>

                <div className="sm:text-right">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Composite Rating</div>
                  <div className="flex items-baseline sm:justify-end space-x-1">
                    <span className="text-2xl font-extrabold text-[#1e3a8a]">
                      {previewTeacherDossier.averageScore > 0 ? previewTeacherDossier.averageScore.toFixed(2) : '0.00'}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">/ 5.00</span>
                  </div>
                  <div className="mt-1">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-extrabold"
                      style={{ 
                        backgroundColor: `${getPerformanceDescriptor(previewTeacherDossier.averageScore).color}15`, 
                        color: getPerformanceDescriptor(previewTeacherDossier.averageScore).color 
                      }}
                    >
                      {getPerformanceDescriptor(previewTeacherDossier.averageScore).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evaluation Metrics Stats */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                  <div className="text-xs text-gray-500 font-medium">Completed Evaluations</div>
                  <div className="text-base font-bold text-blue-900">{previewTeacherDossier.evaluationCount} Submissions</div>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100">
                  <div className="text-xs text-gray-500 font-medium">Academic Period</div>
                  <div className="text-base font-bold text-amber-900">{academicYear} • {semester}</div>
                </div>
              </div>

              {/* Criteria Score Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center">
                  <Award className="w-4 h-4 mr-1 text-[#d4af37]" />
                  Criteria Dimensions Performance
                </h4>

                <div className="space-y-2">
                  {criteriaList.map((crit) => {
                    const score = previewTeacherDossier.criteriaScores?.[crit.id];
                    const scoreVal = score !== undefined ? score : 0;
                    const pct = (scoreVal / 5) * 100;
                    return (
                      <div key={crit.id} className="p-3 rounded-lg border border-gray-200 bg-white">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-gray-800">{crit.label}</span>
                          <span className="font-extrabold text-blue-900">
                            {score !== undefined ? score.toFixed(2) : 'N/A'} <span className="text-gray-400 font-normal">/ 5.0</span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${pct}%`,
                              backgroundColor: scoreVal >= 4.5 ? '#10b981' : scoreVal >= 3.5 ? '#3b82f6' : '#f59e0b' 
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportSingleTeacherPDF(previewTeacherDossier)}
                  className="px-3.5 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  Download PDF Dossier
                </button>

                <button
                  onClick={() => handleExportSingleTeacherCSV(previewTeacherDossier)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                  Download CSV Record
                </button>
              </div>

              <button
                onClick={() => setPreviewTeacherDossier(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Dispatch Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between border-b border-blue-800">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-base">Automated Email Dispatch History</h3>
                  <p className="text-xs text-blue-200">Real-time audit log of evaluation notifications sent to teachers</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLogsModal(false)}
                className="p-1 hover:bg-blue-800 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {notificationLogs.length > 0 ? (
                notificationLogs.map(log => (
                  <div key={log.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 text-sm">{log.teacherName}</span>
                        <span className="text-xs text-gray-500">({log.recipientEmail})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          log.triggerType === 'NEW_EVALUATION' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.triggerType === 'NEW_EVALUATION' ? 'New Evaluation' : 'Report Published'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-1">{log.subject}</p>
                      <div className="flex items-center space-x-4 text-[11px] text-gray-400">
                        <span>Dispatched: {new Date(log.createdAt).toLocaleString()}</span>
                        <span>Sent By: {log.sentBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Dispatched
                      </span>
                      <button
                        onClick={() => setPreviewEmailModal(log)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
                      >
                        Preview Email
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No email notification records found in dispatch history.
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewEmailModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Email Payload Preview & Details</h3>
              </div>
              <button 
                onClick={() => setPreviewEmailModal(null)}
                className="p-1 hover:bg-gray-800 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-100 border-b border-gray-200 text-xs space-y-1">
              <div><strong className="text-gray-700">Recipient:</strong> {previewEmailModal.teacherName} &lt;{previewEmailModal.recipientEmail}&gt;</div>
              <div><strong className="text-gray-700">Subject:</strong> {previewEmailModal.subject}</div>
              <div><strong className="text-gray-700">Date Dispatched:</strong> {new Date(previewEmailModal.createdAt).toLocaleString()}</div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-gray-200">
              <div className="bg-white p-2 rounded-xl shadow-inner overflow-hidden border border-gray-300">
                <iframe
                  title="Email Preview"
                  srcDoc={previewEmailModal.bodyHtml}
                  className="w-full h-96 border-0 rounded-lg"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setPreviewEmailModal(null)}
                className="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-gray-900 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


