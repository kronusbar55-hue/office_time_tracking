import CloudinarySettings from "@/components/settings/CloudinarySettings";

export default function SettingsPage() {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-6 pb-6">
      <section>
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-2xl font-semibold text-text-primary md:text-3xl">Settings</h1>
          <p className="text-sm text-text-secondary max-w-2xl">
            Manage your organization&apos;s configurations, including storage, shifts, and system policies. 
            All changes are applied to all members within your organization.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
            <CloudinarySettings />
            {/* Future settings sections can go here */}
        </div>
      </section>
    </div>
  );
}

