"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import EmployeeForm from "@/components/employees/EmployeeForm";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "manager" | "employee" | "hr";
  technology?: { id: string; name: string } | null;
  joinDate?: string;
  avatarUrl?: string;
  isActive: boolean;
};

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEmployee() {
      if (!id) return;

      try {
        const res = await fetch(`/api/users/${id}`);
        if (!res.ok) throw new Error("Failed to load employee profile.");
        const json = (await res.json()) as { success: boolean; data: Employee };
        setEmployee(json.data);
      } catch (e) {
        console.error(e);
        setError("Could not load this employee.");
      } finally {
        setLoading(false);
      }
    }

    void loadEmployee();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center py-10">
        <div className="flex items-center gap-3 rounded-2xl border border-border-color bg-card px-5 py-4 text-text-secondary shadow-card">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading employee details...
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center py-10">
        <div className="max-w-md rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-text-primary">Employee not available</h1>
          <p className="mt-2 text-sm text-text-secondary">{error || "This employee record could not be found."}</p>
          <button
            type="button"
            onClick={() => router.push("/employees")}
            className="mt-6 rounded-2xl border border-border-color px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-accent hover:text-accent"
          >
            Back to employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-background py-4">
      <EmployeeForm initialData={employee} isNew={false} />
    </div>
  );
}
