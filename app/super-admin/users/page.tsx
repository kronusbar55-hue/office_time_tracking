"use client";

import { useEffect, useState } from "react";
import { Users, Search, Globe, Shield, Loader2, Mail, Building2 } from "lucide-react";
import { toast } from "react-toastify";

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/super-admin/users?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setUsers(data.data);
    } catch (e) {
      toast.error("Failed to fetch platform users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center text-accent gap-2">
       <Loader2 className="animate-spin h-5 w-5" />
       <span className="text-[10px] font-black uppercase tracking-widest italic">Scanning Platform Identities...</span>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
         <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Platform <span className="text-accent underline decoration-accent/30">Identities</span></h1>
         <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Cross-Tenant User Registry</p>
      </div>

      <div className="relative max-w-lg">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
         <input 
            type="text" 
            placeholder="Search users by name, email, or domain..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-accent/40"
         />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <th className="px-6 py-4">Individual</th>
              <th className="px-6 py-4">Association</th>
              <th className="px-6 py-4">Authorization</th>
              <th className="px-6 py-4">Lifecycle</th>
              <th className="px-6 py-4 text-right">Integrity</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/10 hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-5">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-800 bg-slate-800/50 p-0.5">
                         {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                         ) : (
                            <div className="h-full w-full rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-xs">
                               {u.firstName[0]}{u.lastName[0]}
                            </div>
                         )}
                      </div>
                      <div>
                         <p className="text-xs font-black text-white capitalize">{u.firstName} {u.lastName}</p>
                         <p className="text-[10px] font-bold text-slate-500 lowercase tracking-tight">{u.email}</p>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2">
                       <Building2 className="h-3 w-3 text-slate-600" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{u.organizationName || 'Master Platform'}</span>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <span className={`inline-flex rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-[1px] ${u.role === 'SUPER_ADMIN' ? 'bg-accent/20 text-accent outline outline-1 outline-accent/40' : 'bg-slate-800 text-slate-400'}`}>
                      {u.role}
                   </span>
                </td>
                <td className="px-6 py-5">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Registered: {u.joinDate ? new Date(u.joinDate).toLocaleDateString() : 'N/A'}</p>
                </td>
                <td className="px-6 py-5 text-right">
                   <div className={`inline-flex h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(var(--accent-rgb),1)]' : 'bg-rose-500'}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
