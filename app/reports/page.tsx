"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  Info,
  Search,
  Filter,
  Plus,
  ArrowRight,
  User as UserIcon,
  Clock,
  Coffee,
  Umbrella,
  Moon,
  Palmtree,
  Settings,
  Grid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO, startOfWeek, endOfWeek, addDays, getDaysInMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

// --- Types ---
type MemberRecord = {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  department: string;
  shiftHours: number;
  totalWorkMs: number;
  totalOvertimeMs: number;
  totalBreakMs: number;
  payrollHours: string;
  dailyRecords: DailyRecord[];
};

type DailyRecord = {
  date: string;
  workMs: number;
  breakMs: number;
  overtimeMs: number;
  intensity: number;
  isRestDay: boolean;
  isHoliday: boolean;
  isTimeOff: boolean;
  checkInTime?: string;
  checkOutTime?: string;
};

type ViewType = "day" | "week" | "month" | "custom";

// --- Constants ---
const INTENSITY_COLORS: Record<number, string> = {
  0: "bg-slate-800/40 border-slate-700/50", // 0 hrs
  1: "bg-yellow-500/30 border-yellow-500/50", // 0-2 hrs
  2: "bg-orange-500/40 border-orange-500/60", // 2-4 hrs
  3: "bg-emerald-500/30 border-emerald-500/50", // 4-6 hrs
  4: "bg-emerald-600/60 border-emerald-500/80", // 6-8 hrs
  5: "bg-pink-500/40 border-pink-500/60", // 8-10 hrs
  6: "bg-red-600/50 border-red-500/70", // 10+ hrs
};

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // State
  const [viewType, setViewType] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reportData, setReportData] = useState<{ members: MemberRecord[], summary: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [showLegend, setShowLegend] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<{ memberId: string, date: string } | null>(null);

  // Derive date range based on viewType
  const getRange = useCallback(() => {
    let start, end;
    if (viewType === "month") {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else if (viewType === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = currentDate;
      end = currentDate;
    }
    return { start, end };
  }, [viewType, currentDate]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getRange();
      const params = new URLSearchParams({
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
        department,
        search: searchQuery
      });
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  }, [getRange, department, searchQuery]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Navigate dates
  const navigate = (direction: 'prev' | 'next') => {
    if (viewType === "month") {
      setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    } else if (viewType === "week") {
      setCurrentDate(prev => direction === 'prev' ? addDays(prev, -7) : addDays(prev, 7));
    } else {
      setCurrentDate(prev => direction === 'prev' ? addDays(prev, -1) : addDays(prev, 1));
    }
  };

  const { start, end } = getRange();
  const daysInRange = eachDayOfInterval({ start, end });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Timesheets
            </h1>
            <nav className="flex gap-1">
              <button className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20">
                Timesheets
              </button>
              {/* <button className="px-4 py-1.5 rounded-full hover:bg-slate-800 text-slate-400 text-sm font-medium transition-colors">
                Approvals
              </button> */}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLegend(true)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
              title="Legend"
            >
              <Info className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Controls Row */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['day', 'week', 'month'] as ViewType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewType(v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewType === v ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('prev')}
                className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 font-medium min-w-[160px] justify-center">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-sm">
                  {viewType === "month" ? format(currentDate, "MMMM yyyy") :
                    viewType === "week" ? `${format(start, "MMM dd")} - ${format(end, "MMM dd")}` :
                      format(currentDate, "MMM dd, yyyy")}
                </span>
              </div>
              <button
                onClick={() => navigate('next')}
                className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 min-w-[140px]"
            >
              <option value="all">All Groups</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="HR">HR</option>
              <option value="Management">Management</option>
            </select> */}
          </div>
        </div>

        {/* Timesheet Grid */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-950/80 backdrop-blur-md">
                  <th className="sticky left-0 z-30 p-4 text-left border-r border-slate-800 min-w-[280px] bg-slate-950">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Employee</span>
                  </th>
                  {daysInRange.map((day) => (
                    <th key={day.toISOString()} className="p-2 min-w-[44px] text-center border-r border-slate-800/50">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-black">{format(day, "eee")}</span>
                        <span className="text-sm font-bold text-slate-200">{format(day, "dd")}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-4 text-right min-w-[100px] border-l border-slate-800 bg-slate-950/80">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="sticky left-0 p-4 bg-slate-900/40 border-r border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-800" />
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-slate-800 rounded" />
                            <div className="h-3 w-20 bg-slate-800/50 rounded" />
                          </div>
                        </div>
                      </td>
                      {daysInRange.map((day) => (
                        <td key={day.toISOString()} className="p-2">
                          <div className="h-10 w-10 bg-slate-800/30 rounded-lg mx-auto" />
                        </td>
                      ))}
                      <td className="p-4 bg-slate-900/40 border-l border-slate-800" />
                    </tr>
                  ))
                ) : (
                  reportData?.members.map((member) => (
                    <tr key={member.userId} className="group hover:bg-slate-800/20 transition-colors">
                      <td className="sticky left-0 p-4 border-r border-slate-800 bg-slate-900/90 group-hover:bg-slate-800/90 transition-colors z-10 shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-slate-700 flex items-center justify-center text-blue-400 font-bold overflow-hidden">
                            {member.avatar ? <img src={member.avatar} alt="" /> : member.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-100">{member.name}</h4>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{member.department} • {member.shiftHours}h shift</p>
                          </div>
                        </div>
                      </td>
                      {daysInRange.map((day) => {
                        const dStr = format(day, "yyyy-MM-dd");
                        const record = member.dailyRecords.find(r => r.date === dStr);
                        const isHovered = hoveredDay?.memberId === member.userId && hoveredDay?.date === dStr;

                        return (
                          <td
                            key={dStr}
                            className="p-1.5 border-r border-slate-800/30 relative"
                            onMouseEnter={() => setHoveredDay({ memberId: member.userId, date: dStr })}
                            onMouseLeave={() => setHoveredDay(null)}
                          >
                            <div className={`
                              h-10 w-10 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer
                              ${record ? INTENSITY_COLORS[record.intensity] : "bg-slate-950/20 border-slate-800/40 text-slate-600"}
                              ${isHovered ? "scale-110 shadow-lg z-10" : ""}
                            `}>
                              {record?.isTimeOff && <Umbrella className="h-3.5 w-3.5 text-blue-400" />}
                              {record?.isRestDay && <Moon className="h-3.5 w-3.5 text-slate-500" />}
                              {record?.isHoliday && <Palmtree className="h-3.5 w-3.5 text-orange-400" />}
                              {!record?.isTimeOff && !record?.isRestDay && !record?.isHoliday && record?.intensity! > 0 && (
                                <span className="text-[10px] font-bold">{((record?.workMs || 0) / 3600000).toFixed(0)}</span>
                              )}
                            </div>

                            {/* Hover Tooltip */}
                            <AnimatePresence>
                              {isHovered && record && record.intensity > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl pointer-events-none"
                                >
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">{format(parseISO(record.date), "MMMM dd, yyyy")}</p>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400">First In:</span>
                                      <span className="text-white font-bold">{record.checkInTime ? format(new Date(record.checkInTime), "hh:mm a") : "---"}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400">Last Out:</span>
                                      <span className="text-white font-bold">{record.checkOutTime ? format(new Date(record.checkOutTime), "hh:mm a") : "---"}</span>
                                    </div>
                                    <div className="h-px bg-slate-800 my-1" />
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400">Work:</span>
                                      <span className="text-emerald-400 font-bold">{(record.workMs / 3600000).toFixed(1)}h</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400">Break:</span>
                                      <span className="text-slate-500 font-bold">{(record.breakMs / 60000).toFixed(0)}m</span>
                                    </div>
                                    {record.overtimeMs > 0 && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">OT:</span>
                                        <span className="text-pink-400 font-bold">{(record.overtimeMs / 3600000).toFixed(1)}h</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </td>
                        );
                      })}
                      <td className="p-4 bg-slate-900/90 border-l border-slate-800 text-right group-hover:bg-slate-800/90 transition-colors">
                        <span className="text-sm font-black text-white">{member.payrollHours}h</span>
                        <div className="h-1 w-12 bg-emerald-500/20 rounded-full mt-1 ml-auto overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: '80%' }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Legend Modal */}
      <AnimatePresence>
        {showLegend && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLegend(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Grid className="h-6 w-6 text-blue-400" />
                Color Legend
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Hours Intensity</p>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-slate-800 border border-slate-700" />
                    <span className="text-sm text-slate-300">0 hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-yellow-500/30 border border-yellow-500/50" />
                    <span className="text-sm text-slate-300">0 - 2 hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-orange-500/40 border border-orange-500/60" />
                    <span className="text-sm text-slate-300">2 - 4 hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-emerald-500/30 border border-emerald-500/50" />
                    <span className="text-sm text-slate-300">4 - 6 hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-emerald-600/60 border border-emerald-500/80" />
                    <span className="text-sm text-slate-300">6 - 8 hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-pink-500/40 border-pink-500/60" />
                    <span className="text-sm text-slate-300">8 - 10 hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-red-600/50 border-red-500/70" />
                    <span className="text-sm text-slate-300">10+ hours</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Statuses</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950/20 border-slate-800/40">
                      <Palmtree className="h-4 w-4 text-orange-400" />
                    </div>
                    <span className="text-sm text-slate-300">Public Holiday</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950/20 border-slate-800/40">
                      <Moon className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-sm text-slate-300">Rest Day</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950/20 border-slate-800/40">
                      <Umbrella className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-sm text-slate-300">Time Off</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowLegend(false)}
                className="w-full mt-8 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowExport(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Export Report</h3>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">File Format</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-950 border-2 border-blue-500/50 text-white">
                      <span className="font-bold">XLSX</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400">
                      <span className="font-bold">CSV</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Duration Format</label>
                  <select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                    <option value="hhmm">HH:mm (e.g. 08:30)</option>
                    <option value="decimal">Decimal (e.g. 8.50)</option>
                  </select>
                </div>

                <div className="pt-4">
                  <a
                    href={`/api/reports/export?startDate=${format(start, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}&department=${department}&format=xls`}
                    download
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Download className="h-5 w-5" />
                    Download Report
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
