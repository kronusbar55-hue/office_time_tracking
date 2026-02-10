import { cookies } from 'next/headers';
import { verifyAuthToken } from '@/lib/auth';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import HRDashboard from '@/components/dashboard/HRDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';

export default async function DashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyAuthToken(token) : null;
  if (!payload) return (
    <div className="p-6">Please sign in to view the dashboard</div>
  );

  const role = payload.role;
  const userId = payload.sub;

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'hr') return <HRDashboard />;
  if (role === 'manager') return <ManagerDashboard userId={userId} />;
  return <EmployeeDashboard userId={userId} />;
}

