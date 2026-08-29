import React, { useState } from 'react';
import { 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  Info, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface GuidanceOfficeCardProps {
  variant?: 'card' | 'compact' | 'banner';
  id?: string;
  defaultExpanded?: boolean;
}

export const GuidanceOfficeCard: React.FC<GuidanceOfficeCardProps> = ({
  variant = 'card',
  id = 'guidance-office-info',
  defaultExpanded = true
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  return (
    <div 
      id={id} 
      className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
    >
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-blue-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30 flex-shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-400/30">
                Official Advisory
              </span>
              <span className="text-[11px] text-blue-200 font-medium hidden sm:inline">
                Student & Faculty Support Services
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5 tracking-tight flex items-center">
              The Guidance Office &bull; St. Alexius College
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center text-xs font-semibold"
          title={isExpanded ? 'Collapse info' : 'Expand info'}
        >
          {isExpanded ? (
            <>
              <span className="hidden sm:inline mr-1 text-[11px]">Hide</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span className="hidden sm:inline mr-1 text-[11px]">View Hours & Contacts</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Content Area */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-gradient-to-b from-blue-50/40 to-white divide-y divide-gray-100 sm:divide-y-0 sm:grid sm:grid-cols-3 sm:gap-4 space-y-4 sm:space-y-0">
          
          {/* Column 1: Office Hours */}
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-[#1e3a8a] font-bold text-xs uppercase tracking-wide">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>Office Hours</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-100/80">
                <div className="font-extrabold text-gray-900 flex items-center justify-between">
                  <span>Mondays to Friday</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">Regular Days</span>
                </div>
                <div className="text-gray-700 mt-1 space-y-0.5 font-medium">
                  <div className="flex items-center justify-between">
                    <span>Morning Session:</span>
                    <span className="font-bold text-gray-900">8:00 AM - 12:00 NN</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Afternoon Session:</span>
                    <span className="font-bold text-gray-900">1:30 PM - 5:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-100/80">
                <div className="font-extrabold text-gray-900 flex items-center justify-between">
                  <span>Saturdays</span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Half Day</span>
                </div>
                <div className="text-gray-700 mt-1 flex items-center justify-between font-medium">
                  <span>Morning Session:</span>
                  <span className="font-bold text-gray-900">8:00 AM - 12:00 NN</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Contact Channels & Email */}
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs space-y-2.5 pt-4 sm:pt-4">
            <div className="flex items-center space-x-2 text-[#1e3a8a] font-bold text-xs uppercase tracking-wide">
              <Phone className="w-4 h-4 text-blue-700" />
              <span>Contact Channels</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Email */}
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-[11px] text-gray-500 font-semibold flex items-center justify-between">
                  <span className="flex items-center">
                    <Mail className="w-3 h-3 mr-1 text-blue-600" /> Official Email
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('admin@stalexiuscollege.edu.ph', 'email')}
                    className="text-[10px] text-blue-700 hover:text-blue-900 flex items-center font-bold"
                  >
                    {copiedText === 'email' ? (
                      <span className="text-emerald-600 flex items-center"><Check className="w-3 h-3 mr-0.5" /> Copied</span>
                    ) : (
                      <span className="flex items-center"><Copy className="w-3 h-3 mr-0.5" /> Copy</span>
                    )}
                  </button>
                </div>
                <a 
                  href="mailto:admin@stalexiuscollege.edu.ph"
                  className="font-bold text-[#1e3a8a] hover:underline block mt-0.5 break-all text-xs"
                >
                  admin@stalexiuscollege.edu.ph
                </a>
              </div>

              {/* Landline */}
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 font-semibold block">Landline</span>
                  <a href="tel:0832282019" className="font-bold font-mono text-gray-900 hover:text-blue-700 text-xs">
                    (083) 228 2019
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('(083) 228 2019', 'landline')}
                  className="text-[10px] text-blue-700 hover:text-blue-900 font-bold"
                >
                  {copiedText === 'landline' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* Mobile Hotline */}
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 font-semibold block">Mobile Hotlines</span>
                  <div className="font-mono font-bold text-gray-900 text-xs space-x-1.5">
                    <a href="tel:09209748650" className="hover:text-blue-700">0920 974 8650</a>
                    <span className="text-gray-300">/</span>
                    <a href="tel:09088127461" className="hover:text-blue-700">0908 812 7461</a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('0920 974 8650 / 0908 812 7461', 'mobile')}
                  className="text-[10px] text-blue-700 hover:text-blue-900 font-bold"
                >
                  {copiedText === 'mobile' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Campus Location & Assistance Note */}
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs space-y-2.5 pt-4 sm:pt-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-[#1e3a8a] font-bold text-xs uppercase tracking-wide">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Institutional Address</span>
              </div>

              <div className="mt-2 bg-rose-50/60 p-3 rounded-lg border border-rose-100">
                <p className="text-xs font-bold text-gray-900 leading-relaxed">
                  Gensan Drive, Brgy. Zone IV, City of Koronadal, 9506, South Cotabato, Philippines
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  St. Alexius College, Inc. Campus
                </p>
              </div>

              <div className="mt-2.5 p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px] text-blue-900 leading-normal">
                <span className="font-bold">Walk-in consultations & inquiries:</span> Students and faculty are welcome during office hours for evaluation assistance, academic counseling, and student welfare support.
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>St. Alexius College Student Affairs</span>
              <span className="font-bold text-[#1e3a8a]">Guidance Services</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
