"use client";

import { useEffect, useState } from "react";

interface GraphData {
  date?: string;
  day?: string;
  workedHours: number;
  breakHours: number;
  overtimeHours: number;
}

interface TimeGraphsProps {
  period: "day" | "week" | "month";
}

export default function TimeGraphs({ period }: TimeGraphsProps) {
  const [data, setData] = useState<GraphData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `/api/time-tracking/graph/${period}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch graph data");
        const json = await res.json();
        setData(json.data || []);
      } catch (error) {
        console.error("Graph fetch error:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [period]);

  if (loading) return <div className="text-center py-8">Loading graphs...</div>;
  if (!data.length) return <div className="text-center py-8 text-slate-500">No data available</div>;

  const maxWorked = Math.max(...data.map((d) => d.workedHours), 8);
  const labels = data.map((d) => d.date?.split("-")[2] || d.day || "");

  return (
    <div className="space-y-6">
      {/* Worked Hours Bar Chart */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Worked Hours</h3>
        <div className="flex items-end justify-between gap-2 h-64">
          {data.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1 gap-2">
              <div className="w-full bg-slate-100 rounded flex flex-col justify-end" style={{ height: `${(item.workedHours / maxWorked) * 100}%` }}>
                <div className="w-full bg-green-500 rounded-t" style={{ height: "100%" }} />
              </div>
              <span className="text-xs text-slate-600">{labels[idx]}</span>
              <span className="text-xs font-semibold">{item.workedHours.toFixed(1)}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Break Duration Comparison */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Breaks Distribution</h3>
        <div className="flex items-end justify-between gap-2 h-48">
          {data.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1 gap-2">
              <div className="w-full bg-yellow-200 rounded" style={{ height: `${(item.breakHours / 2) * 100}%` }} />
              <span className="text-xs text-slate-600">{labels[idx]}</span>
              <span className="text-xs font-semibold">{item.breakHours.toFixed(2)}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Overtime Trend */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Overtime Hours</h3>
        <div className="flex items-end justify-between gap-2 h-48">
          {data.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1 gap-2">
              <div className="w-full bg-red-200 rounded" style={{ height: `${(item.overtimeHours / Math.max(...data.map((d) => d.overtimeHours), 1)) * 100}%` }} />
              <span className="text-xs text-slate-600">{labels[idx]}</span>
              <span className="text-xs font-semibold">{item.overtimeHours.toFixed(2)}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Work vs Break Pie Chart */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Work vs Break (Today)</h3>
        {data.length > 0 && (
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="60" fill="#f0f0f0" stroke="none" />
                <circle
                  cx="75"
                  cy="75"
                  r="60"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="30"
                  strokeDasharray={`${(data[0].workedHours / (data[0].workedHours + data[0].breakHours)) * 188.4} 188.4`}
                  transform="rotate(-90 75 75)"
                />
                <circle
                  cx="75"
                  cy="75"
                  r="60"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="30"
                  strokeDasharray={`${(data[0].breakHours / (data[0].workedHours + data[0].breakHours)) * 188.4} 188.4`}
                  strokeDashoffset={`-${(data[0].workedHours / (data[0].workedHours + data[0].breakHours)) * 188.4}`}
                  transform="rotate(-90 75 75)"
                />
              </svg>
              <div className="mt-4 space-y-2 text-center">
                <div className="flex items-center gap-2 justify-center">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Worked: {data[0].workedHours.toFixed(1)}h</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Break: {data[0].breakHours.toFixed(2)}h</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
