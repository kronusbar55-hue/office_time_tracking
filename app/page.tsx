import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAuthToken } from '@/lib/auth';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import HRDashboard from '@/components/dashboard/HRDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import type { DashboardFilterInput } from '@/lib/dashboardDateRange';

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyAuthToken(token) : null;
  if (!payload) return (
    <div className="p-6">Please sign in to view the dashboard</div>
  );

  const resolvedSearchParams = (await searchParams) || {};
  const filters: DashboardFilterInput = {
    range: typeof resolvedSearchParams.range === 'string' ? resolvedSearchParams.range : undefined,
    start: typeof resolvedSearchParams.start === 'string' ? resolvedSearchParams.start : undefined,
    end: typeof resolvedSearchParams.end === 'string' ? resolvedSearchParams.end : undefined,
  };

  const role = payload.role;
  const userId = payload.sub;

  if (role === 'super-admin') {
    redirect('/auth/super-admin/admins');
  }
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'hr') return <HRDashboard userId={userId} filters={filters} />;
  if (role === 'manager') return <ManagerDashboard userId={userId} filters={filters} />;
  return <EmployeeDashboard userId={userId} filters={filters} />;
}

