import React from 'react';

interface DashboardSkeletonProps {
  cardCount?: number;
  tableRows?: number;
}

/**
 * Reusable Dashboard Skeleton component using Tailwind pulse animations
 * to mimic summary metric cards, charts, and data tables while data is loading.
 */
export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  cardCount = 4,
  tableRows = 5,
}) => {
  return (
    <div className="space-y-6 w-full animate-pulse">
      {/* Top Header Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-80 bg-slate-100 rounded-md"></div>
        </div>
        <div className="h-9 w-44 bg-slate-200 rounded-lg"></div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div
            key={`skeleton-card-${idx}`}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center"
          >
            <div className="w-13 h-13 rounded-xl bg-slate-100 mr-4 shrink-0 flex items-center justify-center p-3.5">
              <div className="w-6 h-6 bg-slate-200 rounded-md"></div>
            </div>
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-slate-200 rounded"></div>
              <div className="h-6 w-12 bg-slate-300 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics / Highlights Bar Placeholder */}
      <div className="bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-48 bg-slate-700 rounded-md"></div>
          <div className="h-3.5 w-72 bg-slate-800 rounded"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-28 bg-slate-800 rounded-lg"></div>
          <div className="h-9 w-32 bg-amber-500/20 rounded-lg"></div>
        </div>
      </div>

      {/* Main Content Grid: Table and Sidebar Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Data Table Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="h-5 w-40 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-20 bg-slate-100 rounded"></div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {Array.from({ length: tableRows }).map((_, rIdx) => (
              <div key={`skeleton-row-${rIdx}`} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                  <div className="space-y-1.5 flex-1 max-w-xs">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-3.5 w-24 bg-slate-100 rounded hidden sm:block"></div>
                <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Widget Placeholder */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded-md border-b border-gray-100 pb-3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
              <div className="h-3.5 bg-slate-200 rounded w-2/3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
            <div className="h-16 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
              <div className="h-3.5 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            </div>
            <div className="h-16 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
              <div className="h-3.5 bg-slate-200 rounded w-1/2"></div>
              <div className="h-3 bg-slate-100 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
