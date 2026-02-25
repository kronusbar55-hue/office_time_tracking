"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Megaphone, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AnnouncementStats } from "@/components/announcements/AnnouncementStats";
import { AnnouncementFilters } from "@/components/announcements/AnnouncementFilters";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { CreateAnnouncementModal } from "@/components/announcements/CreateAnnouncementModal";
import { toast } from "react-toastify";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, pinned: 0 });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        category: activeCategory,
        search,
        sort
      }).toString();

      const res = await fetch(`/api/announcements?${query}`);
      if (!res.ok) throw new Error("Failed to fetch announcements");

      const data = await res.json();
      setAnnouncements(data);

      // Update stats based on results (simplified for demo)
      setStats({
        total: data.length,
        unread: 0, // Future feature: track per-user unread status
        pinned: data.filter((a: any) => a.isPinned).length
      });

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search, sort]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const canCreate = user?.role === "admin" || user?.role === "hr";

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-500">
              <Megaphone size={18} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Announcements
            </h1>
          </div>
          <p className="text-slate-400">
            Company-wide updates, news, and pinned notices.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            New Announcement
          </button>
        )}
      </div>

      <AnnouncementStats
        total={stats.total}
        unread={stats.unread}
        pinned={stats.pinned}
      />

      <div className="space-y-6">
        <AnnouncementFilters
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          search={search}
          onSearchChange={setSearch}
          onSortChange={setSort}
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse" />
            ))}
          </div>
        ) : announcements.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement._id}
                announcement={announcement}
                currentUserRole={user?.role}
                onPinChange={async (id, isPinned) => {
                  // Simplified pin toggle logic
                  try {
                    const res = await fetch(`/api/announcements/${id}/pin`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ isPinned })
                    });
                    if (!res.ok) throw await res.json();
                    fetchAnnouncements();
                  } catch (err: any) {
                    toast.error(err.error || "Failed to update pin");
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-500">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-300">No announcements found</h3>
            <p className="mt-1 text-slate-500">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}
      </div>

      <CreateAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAnnouncements}
      />
    </div>
  );
}
