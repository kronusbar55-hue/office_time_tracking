"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Shield, 
  Globe, 
  Users, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  Menu,
  X
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.replace("/auth/super-admin/login");
    return null;
  }

  // If user data is loaded and not super admin, redirect
  if (user && user.role !== "SUPER_ADMIN") {
    router.replace("/auth/super-admin/login");
    return null;
  }

  const handleLogout = async () => {
     try {
        await fetch('/api/auth/logout', { method: 'POST' });
        toast.success("Logged out successfully");
        router.push('/auth/super-admin/login');
     } catch (e) {
        window.location.href = '/auth/super-admin/login';
     }
  };

  const menuItems = [
    { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
    { label: "Organizations", href: "/super-admin/organizations", icon: Globe },
    { label: "Users", href: "/super-admin/users", icon: Users },
    { label: "Settings", href: "/super-admin/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col p-6">
          <div className="mb-10 flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-slate-950">
                <Shield className="h-6 w-6" />
             </div>
             <div>
                <h1 className="text-sm font-black uppercase tracking-tighter text-white">Technotoil <span className="text-accent underline decoration-accent/30">SAAS</span></h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Platform Owner</p>
             </div>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.label} 
                  href={item.href} 
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest transition-all ${active ? "bg-accent/10 text-accent" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800">
             <button 
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest text-rose-400 transition-all hover:bg-rose-500/10 hover:text-rose-300"
             >
                <LogOut className="h-4 w-4" />
                Disconnect
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/30 px-6 backdrop-blur-md sticky top-0 z-40">
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 text-slate-400 hover:text-white">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
           </button>
           <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-3 rounded-full bg-slate-800/50 border border-slate-700/50 px-4 py-1.5 cursor-pointer hover:bg-slate-800 transition-colors">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-black text-accent">
                    {(user?.firstName?.[0] || "P").toUpperCase()}
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest">{user?.email || "Master Admin"}</span>
              </div>
           </div>
        </header>
        <div className="p-8">
           {children}
        </div>
      </main>
    </div>
  );
}
