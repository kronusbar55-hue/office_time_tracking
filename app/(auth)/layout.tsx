import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  // This layout prevents the global DashboardShell (sidebar/topbar)
  // from wrapping auth routes. Keep styling minimal; root html/body
  // classes are provided by `app/layout.tsx`.
  return <div className="min-h-screen bg-background">{children}</div>;
}
