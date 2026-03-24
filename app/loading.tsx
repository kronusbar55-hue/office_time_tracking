function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-3xl border border-border-color bg-card-bg/80 p-6">
          <SkeletonBlock className="mb-4 h-4 w-28" />
          <SkeletonBlock className="mb-3 h-10 w-72 max-w-full" />
          <SkeletonBlock className="h-4 w-96 max-w-full" />
        </div>
        <div className="rounded-3xl border border-border-color bg-card-bg/80 p-6">
          <SkeletonBlock className="mb-3 h-4 w-24" />
          <SkeletonBlock className="h-10 w-40" />
        </div>
      </div>

      <div className="rounded-3xl border border-border-color bg-card-bg/80 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[220px_1fr_auto]">
          <SkeletonBlock className="h-11" />
          <SkeletonBlock className="h-11" />
          <SkeletonBlock className="h-11" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-border-color bg-card-bg/80 p-5">
            <SkeletonBlock className="mb-5 h-12 w-12 rounded-2xl" />
            <SkeletonBlock className="mb-2 h-3 w-20" />
            <SkeletonBlock className="h-8 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-border-color bg-card-bg/80 p-6 xl:col-span-2">
          <SkeletonBlock className="mb-5 h-6 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-20" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-20" />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border-color bg-card-bg/80 p-6">
          <SkeletonBlock className="mb-5 h-6 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-20" />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border-color bg-card-bg/80 p-6">
        <SkeletonBlock className="mb-4 h-6 w-40" />
        <SkeletonBlock className="mb-2 h-4 w-72 max-w-full" />
        <SkeletonBlock className="h-72 w-full" />
      </div>
    </div>
  );
}
