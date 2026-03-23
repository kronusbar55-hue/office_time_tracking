"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Loader2, Mail, ShieldCheck, User2, UserSquare2 } from "lucide-react";

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

interface EmployeeFormProps {
  initialData?: TeamUser;
  isNew?: boolean;
}

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  role: "employee" as TeamUser["role"],
  technology: "",
  joinDate: "",
  password: ""
};

function roleLabel(role: TeamUser["role"]) {
  switch (role) {
    case "admin":
      return "Administrator";
    case "manager":
      return "Manager";
    case "hr":
      return "HR";
    default:
      return "Employee";
  }
}

export default function EmployeeForm({ initialData, isNew = false }: EmployeeFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(
    initialData
      ? {
          firstName: initialData.firstName,
          lastName: initialData.lastName,
          email: initialData.email,
          role: initialData.role,
          technology: initialData.technology?.id || "",
          joinDate: initialData.joinDate ? initialData.joinDate.slice(0, 10) : "",
          password: ""
        }
      : emptyForm
  );
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [saving, setSaving] = useState(false);
  const [techsLoading, setTechsLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatarUrl || null);

  useEffect(() => {
    async function loadTechnologies() {
      try {
        const res = await fetch("/api/technologies");
        if (!res.ok) throw new Error("Failed to load technologies");
        const data = (await res.json()) as Technology[];
        setTechnologies(data);
      } catch (e) {
        console.error(e);
        toast.error("Could not load technologies.");
      } finally {
        setTechsLoading(false);
      }
    }

    void loadTechnologies();
  }, []);

  const selectedTechnology = useMemo(
    () => technologies.find((tech) => tech.id === form.technology)?.name || "Not assigned",
    [form.technology, technologies]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.set("firstName", form.firstName);
      formData.set("lastName", form.lastName);
      formData.set("email", form.email);
      formData.set("role", form.role);
      if (form.technology) formData.set("technology", form.technology);
      if (form.joinDate) formData.set("joinDate", form.joinDate);
      if (avatarFile) formData.set("avatar", avatarFile);

      if (isNew) {
        if (!form.password) {
          throw new Error("Password is required for new accounts.");
        }
        formData.set("password", form.password);
      } else if (form.password) {
        formData.set("password", form.password);
      }

      const url = isNew ? "/api/users" : `/api/users/${initialData?.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, { method, body: formData });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Failed to save employee.");
      }

      toast.success(isNew ? "Employee created successfully." : "Employee updated successfully.");
      router.push("/employees");
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to save employee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
      <div className="flex flex-col gap-4 rounded-[28px] border border-border-color bg-[linear-gradient(135deg,rgba(var(--card-bg),0.98),rgba(var(--bg-secondary),0.92))] px-6 py-6 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push("/employees")}
            className="inline-flex items-center gap-2 rounded-full border border-border-color bg-bg-primary/70 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-accent hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to employees
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">
              {isNew ? "Add Employee" : "Edit Employee"}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {isNew
                ? "Create a new employee profile with role, technology, and access details."
                : "Update profile details, role access, and avatar from a dedicated full-page editor."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border-color bg-bg-primary/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Role</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{roleLabel(form.role)}</p>
          </div>
          <div className="rounded-2xl border border-border-color bg-bg-primary/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Technology</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{techsLoading ? "Loading..." : selectedTechnology}</p>
          </div>
          <div className="rounded-2xl border border-border-color bg-bg-primary/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Status</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {isNew ? "New profile" : initialData?.isActive ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <section className="grid gap-6">
          <div className="rounded-[28px] border border-border-color bg-card/80 p-6 shadow-card">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-accent/10 p-3 text-accent">
                <User2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Employee Information</h2>
                <p className="text-sm text-text-secondary">Basic identity and account credentials.</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-text-secondary">First name</span>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="h-12 rounded-2xl border border-border-color bg-bg-primary/70 px-4 text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="John"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-text-secondary">Last name</span>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="h-12 rounded-2xl border border-border-color bg-bg-primary/70 px-4 text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="Doe"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium text-text-secondary">Work email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="h-12 w-full rounded-2xl border border-border-color bg-bg-primary/70 pl-11 pr-4 text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                    placeholder="john@company.com"
                    required
                  />
                </div>
              </label>

              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium text-text-secondary">{isNew ? "Password" : "New password"}</span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="h-12 rounded-2xl border border-border-color bg-bg-primary/70 px-4 text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder={isNew ? "Set an initial password" : "Leave blank to keep the current password"}
                  required={isNew}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[28px] border border-border-color bg-card/80 p-6 shadow-card">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-accent/10 p-3 text-accent">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Work Details</h2>
                <p className="text-sm text-text-secondary">Assign role, technology, and joining information.</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-text-secondary">Role</span>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="h-12 rounded-2xl border border-border-color bg-bg-primary/70 px-4 text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  <option value="admin">Administrator</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-text-secondary">Technology</span>
                <select
                  name="technology"
                  value={form.technology}
                  onChange={handleChange}
                  disabled={techsLoading}
                  className="h-12 rounded-2xl border border-border-color bg-bg-primary/70 px-4 text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">No technology assigned</option>
                  {technologies.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium text-text-secondary">Join date</span>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="date"
                    name="joinDate"
                    value={form.joinDate}
                    onChange={handleChange}
                    className="h-12 w-full rounded-2xl border border-border-color bg-bg-primary/70 pl-11 pr-4 text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </label>
            </div>
          </div>
        </section>

        <aside className="grid gap-6 self-start">
          <div className="rounded-[28px] border border-border-color bg-card/80 p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-accent/10 p-3 text-accent">
                <UserSquare2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Profile Photo</h2>
                <p className="text-sm text-text-secondary">Upload a square image for the employee avatar.</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-[32px] border border-dashed border-border-color bg-bg-primary/60">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Employee avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-text-secondary">
                    <User2 className="h-12 w-12" />
                    <span className="text-sm">No image selected</span>
                  </div>
                )}
              </div>

              <label className="w-full cursor-pointer rounded-2xl border border-border-color bg-bg-primary/70 px-4 py-3 text-center text-sm font-medium text-text-primary transition hover:border-accent hover:text-accent">
                Choose image
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
          </div>

          {!isNew ? (
            <div className="rounded-[28px] border border-border-color bg-card/80 p-6 shadow-card">
              <h2 className="text-lg font-semibold text-text-primary">Current Status</h2>
              <p className="mt-2 text-sm text-text-secondary">
                This employee is currently <span className="font-medium text-text-primary">{initialData?.isActive ? "active" : "inactive"}</span>.
              </p>
            </div>
          ) : null}

          <div className="rounded-[28px] border border-border-color bg-card/80 p-6 shadow-card">
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving..." : isNew ? "Create employee" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/employees")}
                className="rounded-2xl border border-border-color px-5 py-3.5 text-sm font-medium text-text-primary transition hover:border-accent hover:text-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
