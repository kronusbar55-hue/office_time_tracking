"use client";

import React, { useEffect, useState } from "react";

interface StatsData {
  totalRecords: number;
  checkedIn: number;
  checkedOut: number;
  totalWorkHours: number;
  totalBreakHours: number;
  averageWorkHours: number;
  overtimeCount: number;
  lateCheckInCount: number;
  earlyCheckOutCount: number;
  averageAttendance: number;
}

interface CheckInOutStatCardsProps {
  period?: "today" | "week" | "month";
  role?: string;
}

export default function CheckInOutStatCards({ period = "today", role }: CheckInOutStatCardsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ period, ...(role && { role }) });
        const response = await fetch(`/api/checkin-checkout/stats?${params}`);
        const data = await response.json();

        if (data.success) {
          setStats(data.data.stats);
        } else {
          setError(data.message || "Failed to fetch statistics");
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError("Failed to fetch statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period, role]);

  const cards = [
    {
      title: "Checked In",
      value: stats?.checkedIn || 0,
      icon: "✓",
      color: "green",
      subtext: `of ${stats?.totalRecords || 0}:`
    },
    {
      title: "Total Work Hours",
      value: `${(stats?.totalWorkHours || 0).toFixed(1)}h`,
      icon: "⏱",
      color: "blue",
      subtext: `avg: ${(stats?.averageWorkHours || 0).toFixed(1)}h`
    },
    {
      title: "Late Check-ins",
      value: stats?.lateCheckInCount || 0,
      icon: "⏰",
      color: stats?.lateCheckInCount ? "yellow" : "slate",
      subtext: "issues detected"
    },
    {
      title: "Overtime",
      value: stats?.overtimeCount || 0,
      icon: "⚡",
      color: "blue",
      subtext: "hours over 8h"
    },
    {
      title: "Average Attendance",
      value: `${(stats?.averageAttendance ?? 0).toFixed(1)}%`,
      icon: "📊",
      color: (stats?.averageAttendance ?? 0) >= 80 ? "green" : "red",
      subtext: "of expected hours"
    },
    {
      title: "Early Check-outs",
      value: stats?.earlyCheckOutCount || 0,
      icon: "🚪",
      color: stats?.earlyCheckOutCount ? "orange" : "slate",
      subtext: "before 5 PM"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 rounded-lg border border-slate-700 bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-700/50 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
    red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
    slate: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, idx) => {
        const colors = colorMap[card.color];
        return (
          <div
            key={idx}
            className={`rounded-lg border ${colors.border} ${colors.bg} p-4 backdrop-blur-sm`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-400">{card.title}</p>
                <p className={`mt-2 text-2xl font-bold ${colors.text}`}>{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.subtext}</p>
              </div>
              <div className="text-3xl opacity-50">{card.icon}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
