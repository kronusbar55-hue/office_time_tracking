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
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, pinned: 0 });
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [previousAnnouncementCount, setPreviousAnnouncementCount] = useState(0);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        category: activeCategory,
        search,
        sort,
        expiryFilter
      }).toString();

      const res = await fetch(`/api/announcements?${query}`);
      if (!res.ok) throw new Error("Failed to fetch announcements");

      const data = await res.json();
      setAnnouncements(data);

      // Check if new announcements arrived and play sound
      if (hasUserInteracted && data.length > previousAnnouncementCount && previousAnnouncementCount > 0) {
        playNotificationSound();
      }
      setPreviousAnnouncementCount(data.length);

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
  }, [activeCategory, search, sort, expiryFilter, hasUserInteracted, previousAnnouncementCount]);

  // Track user interaction for sound autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
    };

    // Listen for user interactions
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Try to play audio file first
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => {
        console.log('Audio file not found, using fallback beep:', err);
        // Fallback: Create a simple beep sound using Web Audio API
        playFallbackBeep();
      });
    } catch (error) {
      console.log('Audio creation failed, using fallback:', error);
      playFallbackBeep();
    }
  };

  // Fallback beep sound using Web Audio API
  const playFallbackBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz beep
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Fade out

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3); // 300ms beep
    } catch (error) {
      console.log('Fallback beep failed:', error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Set initial announcement count after first load
  useEffect(() => {
    if (!loading && announcements.length > 0 && previousAnnouncementCount === 0) {
      setPreviousAnnouncementCount(announcements.length);
    }
  }, [loading, announcements.length, previousAnnouncementCount]);

  const canCreate = user?.role === "admin" || user?.role === "hr";

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-500">
              <Megaphone size={18} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
              Announcements
            </h1>
          </div>
          <p className="text-text-secondary">
            Company-wide updates, news, and pinned notices.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-text-primary shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
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
          expiryFilter={expiryFilter}
          onExpiryFilterChange={setExpiryFilter}
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl border border-border-color bg-bg-secondary/40 animate-pulse" />
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
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border-color bg-bg-secondary/20 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-card-bg/50 text-text-secondary">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-text-secondary">No announcements found</h3>
            <p className="mt-1 text-text-secondary">
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
