"use client";

import { useEffect, useState } from "react";
import { 
  Globe, 
  Users, 
  BarChart3, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  Loader2
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/super-admin/dashboard");
        const data = await res.json();
        if (data.success) setStats(data.data.stats);
      } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-accent gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Initializing Control Matrix...</span>
    </div>
  );

  const cards = [
    { label: "Total Organizations", value: stats?.totalOrganizations || 0, icon: Globe, color: "text-sky-400", bg: "bg-sky-500/10" },
    { label: "Platform Users", value: stats?.totalUsers || 0, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Active Subscriptions", value: stats?.activeSubscriptions || 0, icon: BarChart3, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Monthly Revenue", value: `$${stats?.totalRevenue || 0}`, icon: TrendingUp, color: "text-rose-400", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="space-y-10">
      <div>
         <h1 className="text-3xl font-black uppercase tracking-tighter text-white">System <span className="text-accent underline decoration-accent/30">Intelligence</span></h1>
         <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Global Overview Metrics</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 p-6 transition-all hover:bg-slate-800/60 shadow-xl">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="h-4 w-4" />
             </div>
             <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}>
                <card.icon className="h-6 w-6" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.label}</p>
             <h3 className="mt-1 text-2xl font-black text-white">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
         <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/30 p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-accent" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Platform Growth</h3>
               </div>
               <div className="text-[10px] font-bold uppercase text-slate-500">Live Feedback / 24h</div>
            </div>
            <div className="flex h-64 items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800 italic">Advanced Analytics Graph Engine Coming Soon...</p>
            </div>
         </div>

         <div className="rounded-3xl border border-slate-800 bg-slate-900/30 p-8 backdrop-blur-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-white mb-6">Security Logs</h3>
            <div className="space-y-4">
               {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800 pb-3 last:border-0 opacity-60 hover:opacity-100 transition-all cursor-default">
                     <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(var(--accent-rgb),1)]" />
                     <span className="text-slate-500">2 min ago</span>
                     <span className="text-white truncate flex-1">IP 192.168.1.1 Authenticated</span>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
