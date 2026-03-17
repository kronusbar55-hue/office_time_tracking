"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";
import { Calendar, User as UserIcon, Clock, Coffee, Search, Download, ChevronRight, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type DailyRecord = {
  date: string;
  workMs: number;
  breakMs: number;
  checkInTime?: string;
  checkOutTime?: string;
  overtimeMs: number;
  isRestDay: boolean;
};

type EmployeeData = {
  userId: string;
  name: string;
  department: string;
  totalWorkMs: number;
  totalBreakMs: number;
  dailyRecords: DailyRecord[];
};

export default function EmployeeReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [reportData, setReportData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom Dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = employees
    .filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 10); // Default to 10 users only in the list

  // Fetch users for dropdown
  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        let userList = [];
        if (Array.isArray(data)) {
          userList = data;
        } else if (data && Array.isArray(data.users)) {
          userList = data.users;
        } else if (data && data.success && Array.isArray(data.data)) {
          userList = data.data;
        }
        
        setEmployees(userList);
        if (userList.length > 0) {
          setSelectedUserId(userList[0]._id || userList[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const fetchReport = useCallback(async () => {
    if (!selectedUserId || selectedUserId === "all") return;
    setLoading(true);
    try {
      // parse start/end of the selected month
      const monthDate = parseISO(`${selectedMonth}-01`);
      if (!isValid(monthDate)) return;

      const startDate = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const endDate = format(endOfMonth(monthDate), "yyyy-MM-dd");

      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}&userId=${selectedUserId}`);
      const json = await res.json();
      if (json.success && json.data?.members?.length > 0) {
        setReportData(json.data.members[0]);
      } else {
        setReportData(null);
      }
    } catch (error) {
      console.error("Failed to fetch employee report:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedUserId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const formatDuration = (ms: number) => {
    if (!ms || isNaN(ms)) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m`;
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "---";
    const d = new Date(timeStr);
    if (!isValid(d)) return "---";
    return format(d, "hh:mm a");
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Individual Employee Report
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="w-full md:flex-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
              Select Employee
            </label>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-blue-500 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <span>
                    {selectedUserId !== "all" 
                      ? employees.find(e => (e.id || e._id) === selectedUserId)
                        ? `${employees.find(e => (e.id || e._id) === selectedUserId).firstName} ${employees.find(e => (e.id || e._id) === selectedUserId).lastName}`
                        : "Select an employee"
                      : "Select an employee"}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                    onMouseLeave={() => setIsDropdownOpen(false)}
                  >
                    <div className="p-3 border-b border-slate-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search employee..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {filteredEmployees.length === 0 ? (
                        <div className="py-4 text-center text-slate-600 text-xs font-bold">No employees found</div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp.id || emp._id}
                            onClick={() => {
                              setSelectedUserId(emp.id || emp._id);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left ${selectedUserId === (emp.id || emp._id) ? "bg-blue-500/20 text-blue-400" : "hover:bg-slate-800 text-slate-300"}`}
                          >
                            <span className="text-xs font-bold">{emp.firstName} {emp.lastName}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
              Select Month
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
          </div>
        ) : reportData ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Employee</p>
                  <p className="text-lg font-bold text-white">{reportData.name}</p>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Work</p>
                  <p className="text-lg font-bold text-white">{formatDuration(reportData.totalWorkMs)}</p>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
                  <Coffee className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Break</p>
                  <p className="text-lg font-bold text-white">{formatDuration(reportData.totalBreakMs)}</p>
                </div>
              </div>
            </div>

            {/* Daily Table */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400">Date</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400">Check In</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400">Check Out</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Work Duration</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Break Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {reportData.dailyRecords.map((record) => {
                      const isWeekend = record.isRestDay;
                      const d = parseISO(record.date);
                      return (
                        <tr 
                          key={record.date} 
                          className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/monitor?userId=${selectedUserId}&date=${record.date}`)}
                        >
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-200">
                                {format(d, "MMM dd, yyyy")}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${isWeekend ? "text-orange-400" : "text-slate-500"}`}>
                                {format(d, "eeee")}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-medium text-slate-300">
                              {record.workMs > 0 || record.checkInTime ? formatTime(record.checkInTime) : "---"}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-medium text-slate-300">
                              {record.workMs > 0 || record.checkOutTime ? formatTime(record.checkOutTime) : "---"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className={`text-sm font-bold ${record.workMs > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                                {formatDuration(record.workMs)}
                              </span>
                              {record.overtimeMs > 0 && (
                                <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">
                                  + {formatDuration(record.overtimeMs)} OT
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`text-sm font-bold ${record.breakMs > 0 ? "text-orange-400" : "text-slate-600"}`}>
                              {formatDuration(record.breakMs)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No report data found.</p>
            <p className="text-sm">Please select a different month or employee.</p>
          </div>
        )}
      </main>
    </div>
  );
}
