/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type Technology = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

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

const emptyForm: Omit<TeamUser, "id" | "avatarUrl" | "isActive" | "technology"> & {
  password?: string;
  technology?: string;
} = {
  firstName: "",
  lastName: "",
  email: "",
  role: "employee",
  technology: "",
  joinDate: "",
  password: ""
};

export default function EmployeesPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(false);
  const [techsLoading, setTechsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");



  async function loadUsers(page = 1, search = searchQuery) {
    setLoading(true);
    setCurrentPage(page);
    try {
      const res = await fetch(`/api/users?paginate=true&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);

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

  async function loadTechnologies() {
    setTechsLoading(true);
    try {
      const res = await fetch("/api/technologies");
      if (!res.ok) throw new Error("Failed to load technologies");
      const data = (await res.json()) as Technology[];
      setTechnologies(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTechsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers(1, searchQuery);
    void loadTechnologies();
  }, [searchQuery]);


  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("firstName", form.firstName);
      formData.set("lastName", form.lastName);
      formData.set("email", form.email);
      formData.set("role", form.role);
      if (form.technology) formData.set("technology", form.technology);
      if (form.joinDate) formData.set("joinDate", form.joinDate);
      if (avatarFile) formData.set("avatar", avatarFile);

      let url = "/api/users";
      let method: "POST" | "PUT" = "POST";

      if (editingId) {
        url = `/api/users/${editingId}`;
        method = "PUT";
      } else {
        if (!form.password) {
          const msg = "Password is required when creating a new user.";
          setError(msg);
          toast.error(msg);
          setSaving(false);
          return;
        }
        formData.set("password", form.password);
      }

      const res = await fetch(url, {
        method,
        body: formData
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to save user");
      }

      toast.success(editingId ? "Employee updated successfully!" : "Employee created successfully!");
      await loadUsers(editingId ? currentPage : 1);
      setForm(emptyForm);
      setAvatarFile(null);
      setEditingId(null);

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to save user.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this user? They will be marked as removed.")) {
      return;
    }
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        throw new Error("Failed to delete user");
      }
      toast.success("Employee deleted successfully!");
      if (users.length === 1 && currentPage > 1) {
        await loadUsers(currentPage - 1);
      } else {
        await loadUsers(currentPage);
      }
    } catch (e) {
      console.error(e);
      const errorMessage = "Could not delete user.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }

  async function toggleActive(user: TeamUser) {
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
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        )
      );
    } catch (e) {
      console.error(e);
      setError("Could not update user status.");
    }
  }

  function startEdit(user: TeamUser) {
    setEditingId(user.id);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      technology: user.technology?.id || "",
      joinDate: user.joinDate ? user.joinDate.slice(0, 10) : "",
      password: ""
    });
    setAvatarFile(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setAvatarFile(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold text-text-primary">
            Team Management
          </h1>
          <p className="text-xs text-text-secondary">
            Manage employees, roles, and technology assignments.
          </p>
        </div>
        {/* <button
          type="button"
          onClick={resetForm}
          className="rounded-md border border-border-color bg-bg-secondary px-3 py-1.5 text-[11px] font-medium text-text-primary hover:border-accent hover:text-accent"
        >
          New member
        </button> */}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
        <section className="rounded-xl border border-border-color bg-card/70 p-3 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Team members
            </p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 w-48 rounded-md border border-border-color bg-bg-primary/50 pl-7 pr-2 text-[10px] text-text-secondary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                />
                <svg
                  className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {loading && (
                <p className="text-[11px] text-text-secondary">Loading...</p>
              )}
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-border-color/80 bg-bg-primary/40">
            <table className="min-w-full border-separate border-spacing-0 text-[11px]">
              <thead>
                <tr className="bg-bg-secondary/60 text-text-secondary">
                  <th className="px-3 py-2 text-left font-medium">Employee</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Technology
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Joined</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse border-t border-border-color/60 hover:bg-bg-secondary/40 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-card-bg" />
                            <div className="space-y-1.5">
                              <div className="h-3 w-20 rounded bg-card-bg" />
                              <div className="h-2 w-32 rounded bg-card-bg/40" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3"><div className="h-4 w-16 rounded bg-card-bg/60" /></td>
                        <td className="px-3 py-3"><div className="h-4 w-20 rounded bg-card-bg/40" /></td>
                        <td className="px-3 py-3"><div className="h-4 w-20 rounded bg-card-bg/40" /></td>
                        <td className="px-3 py-3"><div className="h-6 w-16 rounded-full bg-card-bg/60" /></td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                             <div className="h-6 w-10 rounded-md bg-card-bg" />
                             <div className="h-6 w-12 rounded-md bg-card-bg" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-[11px] text-text-secondary"
                    >
                      No team members yet. Use the form on the right to add
                      your first employee.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-border-color/70 text-text-primary"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 overflow-hidden rounded-full bg-card-bg">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={`${user.firstName} ${user.lastName}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-text-secondary">
                                {user.firstName.charAt(0)}
                                {user.lastName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="text-[10px] text-text-secondary">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 capitalize text-text-secondary">
                        {user.role}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">
                        {user.technology?.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">
                        {user.joinDate
                          ? new Date(user.joinDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void toggleActive(user)}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${user.isActive
                            ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40"
                            : "bg-card-bg text-text-secondary ring-1 ring-slate-600"
                            }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(user)}
                            className="rounded-md border border-border-color px-2 py-0.5 text-[10px] text-text-primary hover:border-accent hover:text-accent"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(user.id)}
                            className="rounded-md border border-rose-700/70 px-2 py-0.5 text-[10px] text-rose-300 hover:border-rose-400 hover:text-rose-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between px-1">
              <p className="text-[10px] text-text-secondary">
                Showing <span className="text-text-secondary">{(currentPage - 1) * limit + 1}</span> to{" "}
                <span className="text-text-secondary">
                  {Math.min(currentPage * limit, totalUsers)}
                </span>{" "}
                of <span className="text-text-secondary">{totalUsers}</span> results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void loadUsers(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded border border-border-color bg-bg-secondary/50 px-2 py-1 text-[10px] text-text-secondary hover:text-text-primary disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => void loadUsers(i + 1)}
                      className={`h-6 w-6 rounded text-[10px] ${currentPage === i + 1
                        ? "bg-accent text-slate-950 font-semibold"
                        : "text-text-secondary hover:bg-card-bg"
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => void loadUsers(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded border border-border-color bg-bg-secondary/50 px-2 py-1 text-[10px] text-text-secondary hover:text-text-primary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>


        <section className="rounded-xl border border-border-color bg-card/70 p-3 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {editingId ? "Edit member" : "Add member"}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">
            {editingId
              ? "Update details, role, and technology. Leave password blank to keep current."
              : "Create a new employee account. Password is required."}
          </p>

          {error && (
            <p className="mt-2 rounded-md border border-rose-700 bg-rose-950/40 px-2 py-1 text-[11px] text-rose-200">
              {error}
            </p>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 space-y-2.5 text-[11px]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-text-secondary">First name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="h-8 w-full cursor-pointer rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none transition-all hover:border-border-color focus:border-accent focus:ring-1 focus:ring-accent/40"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-text-secondary">Last name</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-text-secondary">Work email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="h-8 w-full rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-text-secondary">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-text-secondary">Technology</label>
                {techsLoading ? (
                  <div className="h-8 w-full rounded-md border border-border-color bg-bg-primary/60 animate-pulse" />
                ) : (
                  <select
                    name="technology"
                    value={form.technology}
                    onChange={handleChange}
                    disabled={technologies.length === 0}
                    className={`h-8 w-full rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 ${technologies.length === 0 ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                  >
                    <option value="">Select technology</option>
                    {technologies.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-text-secondary">Join date</label>
                <input
                  type="date"
                  name="joinDate"
                  value={form.joinDate}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-text-secondary">
                  {editingId ? "New password" : "Password"}
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                  placeholder={editingId ? "Leave blank to keep current" : ""}
                  required={!editingId}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-text-secondary">Profile image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setAvatarFile(file ?? null);
                }}
                className="block w-full text-[11px] text-text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-card-bg file:px-3 file:py-1 file:text-[11px] file:font-medium file:text-text-primary hover:file:bg-slate-700"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-border-color px-3 py-1 text-[11px] text-text-primary hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-md bg-accent px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-md shadow-cyan-500/40 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving
                  ? editingId
                    ? "Saving..."
                    : "Creating..."
                  : editingId
                    ? "Save changes"
                    : "Add member"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

