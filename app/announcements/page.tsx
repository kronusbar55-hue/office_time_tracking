export default function AnnouncementsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-sm font-semibold text-slate-50">Announcements</h1>
      <p className="text-xs text-slate-400">
        Company-wide announcements and pinned updates.
      </p>
      <div className="mt-4 h-40 rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40 text-center text-xs text-slate-500">
        <div className="flex h-full items-center justify-center">
          Announcement list will appear here.
        </div>
      </div>
    </div>
  );
}

