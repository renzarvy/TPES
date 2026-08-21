import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ArrowLeft, Briefcase, BadgeCheck, Star, FileText, Calendar, PenTool, Mail } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DEFAULT_CRITERIA, EvaluationCriterion } from '../../lib/criteria';

export const TeacherProfile: React.FC = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [criteriaList, setCriteriaList] = useState<EvaluationCriterion[]>(DEFAULT_CRITERIA);
  const [reflection, setReflection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!teacherId) return;
      try {
        // Fetch active criteria
        const critDoc = await getDoc(doc(db, 'settings', 'criteria'));
        if (critDoc.exists() && critDoc.data().items?.length) {
          setCriteriaList(critDoc.data().items);
        }

        // Fetch teacher details
        const teacherDoc = await getDoc(doc(db, 'users', teacherId));
        if (teacherDoc.exists()) {
          setTeacher({ id: teacherDoc.id, ...teacherDoc.data() });
        }

        // Fetch evaluations
        const evalsQuery = query(collection(db, 'evaluations'), where('teacherId', '==', teacherId));
        const evalsSnap = await getDocs(evalsQuery);
        setEvaluations(evalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch faculty self-reflection
        const refDoc = await getDoc(doc(db, 'reflections', teacherId));
        if (refDoc.exists() && refDoc.data().content) {
          setReflection(refDoc.data().content);
        }
      } catch (error) {
        console.error("Error fetching teacher profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [teacherId]);

  if (loading) return <div className="p-8 text-gray-500">Loading teacher profile...</div>;
  if (!teacher) return <div className="p-8 text-gray-500">Teacher profile not found.</div>;

  // Calculate stats
  const totalEvals = evaluations.length;
  const avgScore = totalEvals > 0 
    ? evaluations.reduce((acc, curr) => acc + (curr.computedScore || 0), 0) / totalEvals 
    : 0;

  // Dynamic chart data
  const chartData = criteriaList.map(crit => {
    const scores = evaluations.map(e => e.answers?.[crit.id] || 0).filter(s => s > 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      name: crit.label,
      score: Number(avg.toFixed(2))
    };
  });

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-sm font-semibold text-gray-500 hover:text-[#1e3a8a] transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Directory
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-[#1e3a8a] to-blue-900"></div>
            <div className="px-6 pb-6">
              <div className="relative -mt-14 mb-4">
                <img 
                  src={teacher.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&size=128&background=random`} 
                  alt={teacher.name}
                  className="w-28 h-28 rounded-xl border-4 border-white object-cover shadow-md bg-gray-100"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-gray-900">{teacher.name}</h1>
                <p className="text-[#1e3a8a] text-sm font-semibold">{teacher.position || 'Faculty Member'}</p>
              </div>

              <div className="mt-6 space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center text-gray-600 text-xs">
                  <BadgeCheck className="w-4 h-4 mr-2.5 text-gray-400" />
                  <span>Employee ID: <strong className="text-gray-900">{teacher.employeeId || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center text-gray-600 text-xs">
                  <Mail className="w-4 h-4 mr-2.5 text-gray-400" />
                  <span>Email: <strong className="text-gray-900">{teacher.email || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center text-gray-600 text-xs">
                  <Briefcase className="w-4 h-4 mr-2.5 text-gray-400" />
                  <span>{teacher.department}</span>
                </div>
                <div className="flex items-center text-gray-600 text-xs">
                  <Calendar className="w-4 h-4 mr-2.5 text-gray-400" />
                  <span>Joined: {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Summary Box */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-4">Evaluation Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50/60 rounded-xl text-center border border-blue-100">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Overall Score</p>
                <div className="flex items-center justify-center text-2xl font-extrabold text-[#1e3a8a]">
                  <Star className="w-5 h-5 mr-1 text-amber-400 fill-current" />
                  {avgScore > 0 ? avgScore.toFixed(2) : 'N/A'}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Total Evals</p>
                <div className="flex items-center justify-center text-2xl font-extrabold text-gray-900">
                  <FileText className="w-5 h-5 mr-1 text-gray-400" />
                  {totalEvals}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics, Reflection & Feedback */}
        <div className="lg:col-span-2 space-y-6">
          {/* Criteria Breakdown Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-6">Criteria Rating Breakdown</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 5]} hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={130} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#4b5563' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 4.5 ? '#059669' : entry.score >= 3.5 ? '#1e3a8a' : '#d97706'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Teacher Self-Reflection Box */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center">
              <PenTool className="w-4 h-4 text-[#1e3a8a] mr-2" />
              <h3 className="text-base font-bold text-gray-900">Faculty Self-Reflection & Action Plan</h3>
            </div>
            <div className="p-6">
              {reflection ? (
                <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium">{reflection}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">This teacher has not submitted a self-reflection for the current term yet.</p>
              )}
            </div>
          </div>

          {/* Recent Student Feedback */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-gray-900">Student Constructive Comments</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {evaluations.slice(0, 5).map((evalItem) => (
                <div key={evalItem.id} className="p-5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-3.5 h-3.5 ${star <= Math.round(evalItem.computedScore || 0) ? 'text-amber-400 fill-current' : 'text-gray-200'}`} 
                        />
                      ))}
                      <span className="ml-2 text-xs font-bold text-gray-700">
                        {evalItem.computedScore?.toFixed(1)} / 5.0
                      </span>
                    </div>
                    {evalItem.isAnonymous ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">Anonymous</span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">Verified Student</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 italic">"{evalItem.comments || 'No written comment.'}"</p>
                </div>
              ))}
              {evaluations.length === 0 && (
                <div className="p-8 text-center text-xs text-gray-400">
                  No evaluations recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
