import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAuthToken } from "@/lib/auth";
import AdminAnalyticsDashboard from "@/components/dashboard/AdminAnalyticsDashboard";

export default function AdminAnalyticsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    redirect("/login");
  }

  if (payload.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <AdminAnalyticsDashboard />
    </div>
  );
}
