import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, User, BookOpen, Building2, Sparkles, ChevronRight, Check } from 'lucide-react';

export interface PredictiveSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  teachers: any[];
  onSelectTeacher?: (teacher: any) => void;
  onSelectSubject?: (subject: string) => void;
  onSelectDepartment?: (dept: string) => void;
  placeholder?: string;
  id?: string;
}

export const PredictiveSearchBar: React.FC<PredictiveSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  teachers,
  onSelectTeacher,
  onSelectSubject,
  onSelectDepartment,
  placeholder = "Search faculty name, subject area (e.g., 'Anatomy', 'IT 101'), or department...",
  id = "tour-predictive-search"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute suggestions based on teacher names, subjects, and departments
  const suggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      // Return popular / sample subjects & departments when empty
      const subjectSet = new Set<string>();
      const deptSet = new Set<string>();

      teachers.forEach(t => {
        if (t.department) deptSet.add(t.department);
        if (t.majorSubjects) {
          t.majorSubjects.split(/[,;\n]+/).forEach((s: string) => {
            const trimmed = s.trim();
            if (trimmed.length > 2) subjectSet.add(trimmed);
          });
        }
        if (t.otherSubjects) {
          t.otherSubjects.split(/[,;\n]+/).forEach((s: string) => {
            const trimmed = s.trim();
            if (trimmed.length > 2) subjectSet.add(trimmed);
          });
        }
      });

      return {
        matchedTeachers: teachers.slice(0, 4),
        matchedSubjects: Array.from(subjectSet).slice(0, 5),
        matchedDepartments: Array.from(deptSet).slice(0, 4),
        totalMatches: teachers.length
      };
    }

    // Filter teachers matching name or position
    const matchedTeachers = teachers.filter(t => {
      const name = (t.name || '').toLowerCase();
      const pos = (t.position || '').toLowerCase();
      return name.includes(query) || pos.includes(query);
    }).slice(0, 5);

    // Extract subjects matching query
    const subjectMatches = new Set<string>();
    teachers.forEach(t => {
      const allSubs = `${t.majorSubjects || ''} ${t.otherSubjects || ''} ${t.subjects || ''}`;
      allSubs.split(/[,;\n]+/).forEach((subStr: string) => {
        const s = subStr.trim();
        if (s.toLowerCase().includes(query) && s.length > 1) {
          subjectMatches.add(s);
        }
      });
    });

    // Extract departments matching query
    const deptMatches = new Set<string>();
    teachers.forEach(t => {
      if (t.department && t.department.toLowerCase().includes(query)) {
        deptMatches.add(t.department);
      }
    });

    // Also count all teachers that match ANY of the criteria
    const totalMatchingTeachers = teachers.filter(t => {
      const name = (t.name || '').toLowerCase();
      const dept = (t.department || '').toLowerCase();
      const pos = (t.position || '').toLowerCase();
      const major = (t.majorSubjects || '').toLowerCase();
      const other = (t.otherSubjects || '').toLowerCase();
      return name.includes(query) || dept.includes(query) || pos.includes(query) || major.includes(query) || other.includes(query);
    }).length;

    return {
      matchedTeachers,
      matchedSubjects: Array.from(subjectMatches).slice(0, 6),
      matchedDepartments: Array.from(deptMatches).slice(0, 3),
      totalMatches: totalMatchingTeachers
    };
  }, [searchQuery, teachers]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-amber-200 text-amber-900 font-bold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleSelectSubjectPill = (sub: string) => {
    onSearchChange(sub);
    setIsOpen(false);
    if (onSelectSubject) onSelectSubject(sub);
  };

  const handleSelectDeptPill = (dept: string) => {
    onSearchChange(dept);
    setIsOpen(false);
    if (onSelectDepartment) onSelectDepartment(dept);
  };

  const handleSelectTeacherItem = (teacher: any) => {
    onSearchChange(teacher.name || '');
    setIsOpen(false);
    if (onSelectTeacher) onSelectTeacher(teacher);
  };

  return (
    <div id={id} ref={containerRef} className="relative w-full">
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-blue-800 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-20 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] shadow-xs placeholder-gray-400 transition-all"
        />

        {/* Right side indicators */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="hidden sm:flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-extrabold">
            <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
            {searchQuery ? `${suggestions.totalMatches} Found` : 'Live Filter'}
          </div>
        </div>
      </div>

      {/* Predictive Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden divide-y divide-gray-100 animate-fade-in max-h-96 overflow-y-auto">
          
          {/* Header Bar */}
          <div className="p-3 bg-gray-50/90 flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span className="flex items-center text-gray-700 font-bold">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              {searchQuery ? 'Live Predictive Matches' : 'Search by Faculty Name or Teaching Subject'}
            </span>
            <span className="text-[11px] text-gray-500">
              {suggestions.totalMatches} total faculty matches
            </span>
          </div>

          {/* Matched Teachers Section */}
          {suggestions.matchedTeachers.length > 0 && (
            <div className="p-3 space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#1e3a8a] flex items-center px-1">
                <User className="w-3 h-3 mr-1 text-blue-700" /> Faculty Members
              </div>
              <div className="space-y-1">
                {suggestions.matchedTeachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => handleSelectTeacherItem(teacher)}
                    className="w-full text-left p-2 rounded-xl hover:bg-blue-50/80 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#1e3a8a]/10 text-[#1e3a8a] font-black text-xs flex items-center justify-center flex-shrink-0">
                        {teacher.name ? teacher.name[0]?.toUpperCase() : 'T'}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-900 group-hover:text-[#1e3a8a] truncate">
                          {highlightMatch(teacher.name || 'Unnamed Faculty', searchQuery)}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {teacher.department || 'Faculty'} &bull; {teacher.position || 'Instructor'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1e3a8a] group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Subject Areas Section */}
          {suggestions.matchedSubjects.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center px-1">
                <BookOpen className="w-3 h-3 mr-1 text-emerald-700" /> Subject Areas & Course Codes
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.matchedSubjects.map((sub, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSubjectPill(sub)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-medium transition-colors flex items-center shadow-2xs"
                  >
                    <span className="truncate max-w-[200px]">
                      {highlightMatch(sub, searchQuery)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Departments Section */}
          {suggestions.matchedDepartments.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 flex items-center px-1">
                <Building2 className="w-3 h-3 mr-1 text-purple-700" /> Academic Colleges & Departments
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.matchedDepartments.map((dept, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDeptPill(dept)}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-medium transition-colors"
                  >
                    {highlightMatch(dept, searchQuery)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results message */}
          {suggestions.totalMatches === 0 && (
            <div className="p-6 text-center text-gray-500">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-700">No matching faculty or subject areas</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Try searching with a broader keyword or department name</p>
            </div>
          )}

          {/* Footer Note */}
          <div className="p-2.5 bg-gray-50 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Filter results instantly as you type</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#1e3a8a] hover:underline font-bold"
            >
              Close
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
