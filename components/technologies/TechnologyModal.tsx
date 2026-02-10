"use client";

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { toast } from "react-toastify";

type Tech = {
  id?: string;
  name: string;
  status?: "active" | "inactive";
};

export default function TechnologyModal({
  open,
  onClose,
  onSaved,
  initial
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (tech?: any) => void;
  initial?: Tech | null;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setName(initial.name || "");
      setStatus(initial.status || "active");
    } else {
      setName("");
      setStatus("active");
    }
    setError(null);
  }, [initial, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = { name: name.trim(), status };

      let res: Response;
      if (initial && initial.id) {
        res = await fetch(`/api/technologies/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/technologies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save technology");
      }

      const json = await res.json();
      toast.success(initial ? "Technology updated successfully!" : "Technology added successfully!");
      onSaved(json);
      onClose();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="z-10 w-[680px] rounded-lg bg-card/90 p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-50">{initial ? "Edit Technology" : "Add Technology"}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="text-[11px] text-slate-300">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none"
            placeholder="e.g. React"
            required
          />

          <div>
            <label className="text-[11px] text-slate-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="ml-2 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-100"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && <p className="mt-3 text-[11px] text-rose-300">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-slate-900 ${submitting ? "opacity-60 cursor-not-allowed" : "hover:brightness-95"}`}
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>{initial ? "Save changes" : "Add Technology"}</span>
          </button>

          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-slate-300 hover:text-slate-100">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
