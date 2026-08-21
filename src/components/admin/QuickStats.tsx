import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Calendar, Star, TrendingUp, Users, CheckCircle2, Award, Clock, Sparkles, BarChart2, ShieldCheck } from 'lucide-react';

interface QuickStatsProps {
  className?: string;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ className = '' }) => {
  const [statsToday, setStatsToday] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [totalEvals, setTotalEvals] = useState<number>(0);
  const [activeTeachersCount, setActiveTeachersCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listener for active teachers count
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let teacherCount = 0;
      snapshot.forEach(docSnap => {
        const u = docSnap.data();
        if (u.role === 'teacher') {
          teacherCount++;
        }
      });
      setActiveTeachersCount(teacherCount);
    }, (err) => console.warn("QuickStats users error:", err));

    // Listener for evaluations
    const unsubscribeEvals = onSnapshot(collection(db, 'evaluations'), (snapshot) => {
      let todayCount = 0;
      let totalScoreSum = 0;
      let scoredEvalCount = 0;

      // Calculate start of today in local time
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      snapshot.forEach(docSnap => {
        const data = docSnap.data();

        // 1. Check if submitted today
        let evalTimestamp: number | null = null;
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            evalTimestamp = data.createdAt.toDate().getTime();
          } else if (typeof data.createdAt === 'string') {
            evalTimestamp = new Date(data.createdAt).getTime();
          } else if (typeof data.createdAt === 'number') {
            evalTimestamp = data.createdAt;
          }
        } else if (data.updatedAt) {
          if (typeof data.updatedAt.toDate === 'function') {
            evalTimestamp = data.updatedAt.toDate().getTime();
          } else if (typeof data.updatedAt === 'string') {
            evalTimestamp = new Date(data.updatedAt).getTime();
          }
        }

        if (evalTimestamp && evalTimestamp >= startOfToday) {
          todayCount++;
        }

        // 2. Accumulate rating for active teachers average
        const score = typeof data.computedScore === 'number' ? data.computedScore : null;
        if (score !== null && score > 0) {
          totalScoreSum += score;
          scoredEvalCount++;
        }
      });

      setTotalEvals(snapshot.size);
      setStatsToday(todayCount);
      setAvgRating(scoredEvalCount > 0 ? totalScoreSum / scoredEvalCount : 0);
      setLoading(false);
    }, (err) => {
      console.warn("QuickStats evals error:", err);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeEvals();
    };
  }, []);

  const getRatingLabel = (score: number) => {
    if (score >= 4.5) return { label: 'Outstanding', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 4.0) return { label: 'Very Satisfactory', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (score >= 3.0) return { label: 'Satisfactory', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (score >= 2.0) return { label: 'Fair', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    if (score > 0) return { label: 'Needs Improvement', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    return { label: 'No Evaluations Yet', color: 'text-gray-600 bg-gray-50 border-gray-200' };
  };

  const ratingInfo = getRatingLabel(avgRating);

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
            <BarChart2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Quick Performance Analytics</h2>
            <p className="text-xs text-blue-200/80">Real-time daily collection metrics and institutional faculty rating standard.</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 text-[11px] font-mono">Live Sync</span>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Today's Evaluations Collected */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50/60 via-slate-50 to-indigo-50/40 border border-blue-100 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-24 h-24 bg-blue-200/30 rounded-full blur-xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Evaluations Collected Today</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                <Clock className="w-3 h-3 mr-1" />
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className="mt-4 flex items-baseline space-x-3">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '...' : statsToday}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                submissions today
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-blue-100/80 flex items-center justify-between text-xs">
            <span className="text-slate-600 flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
              Lifetime Submissions: <strong className="ml-1 text-slate-900">{totalEvals}</strong>
            </span>
            <span className="text-blue-700 font-bold bg-blue-100/80 px-2 py-0.5 rounded text-[11px]">
              {totalEvals > 0 ? `${((statsToday / Math.max(totalEvals, 1)) * 100).toFixed(1)}% of total` : '0% of total'}
            </span>
          </div>
        </div>

        {/* Card 2: Average Rating Across Active Teachers */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50/60 via-slate-50 to-orange-50/40 border border-amber-100 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-24 h-24 bg-amber-200/30 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500 text-white rounded-lg shadow-sm">
                  <Star className="w-5 h-5 fill-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Faculty Average Rating</span>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${ratingInfo.color}`}>
                <Award className="w-3 h-3 mr-1" />
                {ratingInfo.label}
              </span>
            </div>

            <div className="mt-4 flex items-baseline space-x-3">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '...' : avgRating > 0 ? avgRating.toFixed(2) : 'N/A'}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                out of 5.00
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-amber-100/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    avgRating >= star
                      ? 'text-amber-500 fill-amber-500'
                      : avgRating >= star - 0.5
                      ? 'text-amber-500 fill-amber-300'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-amber-900 font-bold flex items-center">
              <Users className="w-3.5 h-3.5 text-amber-600 mr-1" />
              {activeTeachersCount} Active Faculty Members
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
