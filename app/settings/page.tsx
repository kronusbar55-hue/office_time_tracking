export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-sm font-semibold text-text-primary">Settings</h1>
      <p className="text-xs text-text-secondary">
        Configure shifts, attendance rules, auto clock-out, weekends, and
        holidays.
      </p>
      <div className="mt-4 h-40 rounded-xl border border-dashed border-border-color/80 bg-bg-secondary/40 text-center text-xs text-text-secondary">
        <div className="flex h-full items-center justify-center">
          Settings forms will appear here.
        </div>
      </div>
    </div>
  );
}

