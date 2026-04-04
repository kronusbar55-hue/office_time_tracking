"use client";

import { useEffect, useState } from "react";
import { Plus, Globe, Trash2, Search, Filter, ExternalLink } from "lucide-react";
import { toast } from "react-toastify";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
     name: "",
     slug: "",
     ownerEmail: "",
     ownerPassword: "",
     ownerFirstName: "",
     ownerLastName: "",
     plan: "FREE"
  });

  const fetchOrgs = async () => {
    try {
      const res = await fetch("/api/super-admin/organizations");
      const data = await res.json();
      if (data.success) setOrgs(data.data);
    } catch (e) {
      toast.error("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Organization & Admin user created");
      setIsModalOpen(false);
      fetchOrgs();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
     try {
        const res = await fetch(`/api/super-admin/organizations/${id}`, {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ status })
        });
        if (res.ok) {
           toast.success(`Organization ${status.toLowerCase()}`);
           fetchOrgs();
        }
     } catch (e) {
        toast.error("Status update failed");
     }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this organization? Users will be deactivated and subscriptions cancelled.")) return;
    try {
      const res = await fetch(`/api/super-admin/organizations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      toast.success("Organization deleted");
      fetchOrgs();
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    }
  };

  const filteredOrgs = orgs.filter((org) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [org.name, org.slug, org.owner?.email, org.owner?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });

  if (loading) return <div className="p-20 text-center text-accent animate-pulse font-black uppercase tracking-[0.3em] italic">Accessing Ledger...</div>;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Global <span className="text-accent underline decoration-accent/30">Entities</span></h1>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Managed SaaS Subscriptions</p>
         </div>
         <button 
           onClick={() => setIsModalOpen(true)}
           className="flex items-center gap-2 rounded-xl bg-accent px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-950 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
         >
           <Plus size={16} />
           Initialize Entity
         </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
         <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
               type="text" 
               placeholder="Search Organizations by ID or Slug..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full bg-black/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-accent/40"
            />
         </div>
         <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                <Filter size={14} />
                Filters
             </button>
         </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-black uppercase tracking-[2px] text-slate-500">
              <th className="px-6 py-4">Identity</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Subscription</th>
              <th className="px-6 py-4">Lifecycle</th>
              <th className="px-6 py-4 text-right">Operations</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrgs.map((org) => (
              <tr key={org.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-5">
                   <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-accent outline outline-1 outline-accent/20">
                         <Globe className="h-5 w-5" />
                      </div>
                      <div>
                         <p className="text-sm font-black text-white">{org.name}</p>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{org.slug}.ott.com</p>
                         <p className="text-[10px] font-bold text-slate-600">{org.owner?.email || "No owner linked"}</p>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-5">
                   <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${org.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {org.status}
                   </span>
                </td>
                <td className="px-6 py-5">
                   <p className="text-[10px] font-black uppercase tracking-widest text-white">{org.plan}</p>
                   <p className="text-[10px] font-bold text-slate-500">${org.activeSubscription?.priceMonthly ?? 0}.00 / mo</p>
                </td>
                <td className="px-6 py-5">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Created: {new Date(org.createdAt).toLocaleDateString()}</p>
                   <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{org.activeUsers}/{org.totalUsers} active users</p>
                </td>
                <td className="px-6 py-5 text-right">
                   <div className="flex items-center justify-end gap-3">
                      <select 
                         value={org.status}
                         onChange={(e) => handleStatusUpdate(org.id, e.target.value)}
                         className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:border-accent/40"
                      >
                         <option value="ACTIVE">Activate</option>
                         <option value="INACTIVE">Deactivate</option>
                         <option value="SUSPENDED">Suspend</option>
                      </select>
                      <button className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-500 hover:text-white transition-colors">
                         <ExternalLink size={16} />
                      </button>
                      <button onClick={() => handleDelete(org.id)} className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors">
                         <Trash2 size={16} />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Mockup */}
      {isModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
            <div className="w-full max-w-2xl rounded-[2.5rem] border border-slate-800 bg-slate-900/90 p-10 shadow-2xl">
               <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Initialize <span className="text-accent">Global Entity</span></h2>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 border-b border-slate-800 pb-4">Standard Multi-Tenant Deployment Flow</p>
               
               <form onSubmit={handleCreate} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organization Name</label>
                        <input className="w-full bg-black/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-accent" placeholder="Acme Corp" onChange={e => setFormData({...formData, name: e.target.value})} required />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entity Slug (Unique)</label>
                        <input className="w-full bg-black/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-accent" placeholder="acme" onChange={e => setFormData({...formData, slug: e.target.value})} required />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin First Name</label>
                        <input className="w-full bg-black/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-accent" placeholder="John" onChange={e => setFormData({...formData, ownerFirstName: e.target.value})} required />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Last Name</label>
                        <input className="w-full bg-black/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-accent" placeholder="Doe" onChange={e => setFormData({...formData, ownerLastName: e.target.value})} required />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Email</label>
                        <input className="w-full bg-black/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-accent" type="email" placeholder="admin@acme.com" onChange={e => setFormData({...formData, ownerEmail: e.target.value})} required />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Generated Password</label>
                        <input className="w-full bg-black/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-accent" type="password" placeholder="••••••••" onChange={e => setFormData({...formData, ownerPassword: e.target.value})} required />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Subscription Plan</label>
                     <select className="w-full bg-black/50 border border-slate-800 rounded-xl py-4 px-4 text-sm text-white focus:outline-none focus:border-accent appearance-none font-bold" onChange={e => setFormData({...formData, plan: e.target.value})}>
                        <option value="FREE">Standard Free (Limited Features)</option>
                        <option value="PRO">Enterprise Pro ($49/mo)</option>
                        <option value="ENTERPRISE">Global Tier ($199/mo)</option>
                     </select>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button type="submit" className="flex-1 bg-accent text-slate-950 py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">Engage Deployment</button>
                     <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Abnormal Terminate</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
