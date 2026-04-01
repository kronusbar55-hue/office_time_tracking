"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ArrowRight, PencilLine, Plus, Search, Trash2, Users } from "lucide-react";

type TeamUser = {
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

const PAGE_SIZE = 8;

function formatRole(role: TeamUser["role"]) {
  return role === "hr" ? "HR" : role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export default function EmployeesPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  async function loadUsers(page = 1, search = searchQuery) {
    setLoading(true);
    setCurrentPage(page);
    setError(null);

    try {
      const res = await fetch(
        `/api/users?paginate=true&page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(search)}`
      );

      if (!res.ok) {
        throw new Error("Failed to load users");
      }

      const data = (await res.json()) as {
        users: TeamUser[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };

      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
      setTotalUsers(data.pagination.total);
    } catch (e) {
      console.error(e);
      setError("Could not load team members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers(1, searchQuery);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  async function handleDelete(user: TeamUser) {
    if (!window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete user");
      }

      toast.success("Employee deleted successfully.");
      if (users.length === 1 && currentPage > 1) {
        await loadUsers(currentPage - 1);
      } else {
        await loadUsers(currentPage);
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not delete user.");
    }
  }

  async function toggleActive(user: TeamUser) {
    const nextStatus = user.isActive ? "inactive" : "active";

    if (!window.confirm(`Are you sure you want to mark ${user.firstName} ${user.lastName} as ${nextStatus}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, isActive: !item.isActive } : item
        )
      );
      toast.success(`${user.firstName} is now ${user.isActive ? "inactive" : "active"}.`);
    } catch (e) {
      console.error(e);
      toast.error("Could not update employee status.");
    }
  }

  const activeUsers = useMemo(() => users.filter((user) => user.isActive).length, [users]);

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-6 pb-4">
      <section className="overflow-hidden rounded-[28px] border border-border-color bg-[linear-gradient(135deg,rgba(var(--card-bg),0.98),rgba(var(--bg-secondary),0.92))] shadow-card">
        <div className="flex flex-col gap-5 border-b border-border-color px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">

            <div>
              <h1 className="text-2xl font-semibold text-text-primary md:text-3xl">
                Team Directory
              </h1>

            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            <Link
              href="/employees/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Add member
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {totalUsers} total records across the directory.
              </p>
            </div>

            <label className="relative block w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search by name or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-2xl border border-border-color bg-bg-primary/80 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[24px] border border-border-color bg-bg-primary/60">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-bg-secondary/80 text-xs uppercase tracking-[0.18em] text-text-secondary">
                  <tr>
                    <th className="px-5 py-4 font-medium">Employee</th>
                    <th className="px-5 py-4 font-medium">Role</th>
                    <th className="px-5 py-4 font-medium">Technology</th>
                    <th className="px-5 py-4 font-medium">Joined</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: PAGE_SIZE }).map((_, index) => (
                      <tr key={index} className="animate-pulse border-t border-border-color/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-2xl bg-bg-secondary" />
                            <div className="space-y-2">
                              <div className="h-3 w-32 rounded bg-bg-secondary" />
                              <div className="h-3 w-40 rounded bg-bg-secondary/70" />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4"><div className="h-3 w-20 rounded bg-bg-secondary" /></td>
                        <td className="px-5 py-4"><div className="h-3 w-24 rounded bg-bg-secondary" /></td>
                        <td className="px-5 py-4"><div className="h-3 w-20 rounded bg-bg-secondary" /></td>
                        <td className="px-5 py-4"><div className="h-8 w-20 rounded-full bg-bg-secondary" /></td>
                        <td className="px-5 py-4">
                          <div className="ml-auto h-9 w-28 rounded-2xl bg-bg-secondary" />
                        </td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                          <div className="rounded-2xl border border-dashed border-border-color p-4 text-text-secondary">
                            <Users className="h-8 w-8" />
                          </div>
                          <div>
                            <p className="text-base font-medium text-text-primary">No employees found</p>
                            <p className="mt-1 text-sm text-text-secondary">
                              Try a different search or add a new member to start building the directory.
                            </p>
                          </div>
                          <Link
                            href="/employees/new"
                            className="inline-flex items-center gap-2 rounded-2xl border border-border-color bg-bg-primary px-4 py-2 text-sm font-medium text-text-primary transition hover:border-accent hover:text-accent"
                          >
                            <Plus className="h-4 w-4" />
                            Add member
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-t border-border-color/70 text-text-primary transition hover:bg-bg-secondary/35">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-bg-secondary text-sm font-semibold text-text-primary">
                              {user.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} className="h-full w-full object-cover" />
                              ) : (
                                `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-text-primary">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-text-secondary">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-text-secondary">{formatRole(user.role)}</td>
                        <td className="px-5 py-4 text-text-secondary">{user.technology?.name || "-"}</td>
                        <td className="px-5 py-4 text-text-secondary">{formatDate(user.joinDate)}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => void toggleActive(user)}
                            className={`inline-flex min-w-24 items-center justify-center rounded-full px-3 py-2 text-xs font-medium transition ${user.isActive
                                ? "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30"
                                : "bg-slate-500/10 text-text-secondary ring-1 ring-border-color"
                              }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/employees/${user.id}/edit`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-color text-text-secondary transition hover:border-accent hover:text-accent"
                              title="Edit Employee"
                            >
                              <PencilLine className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDelete(user)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 text-rose-300 transition hover:border-rose-400 hover:text-rose-200"
                              title="Delete Employee"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 border-t border-border-color pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-secondary">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalUsers)} of {totalUsers}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadUsers(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-border-color px-3 py-2 text-sm text-text-primary transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => void loadUsers(index + 1)}
                    className={`h-10 min-w-10 rounded-xl px-3 text-sm font-medium transition ${currentPage === index + 1
                        ? "bg-accent text-slate-950"
                        : "border border-border-color text-text-primary hover:border-accent"
                      }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void loadUsers(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-color px-3 py-2 text-sm text-text-primary transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
