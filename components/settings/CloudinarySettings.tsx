"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Cloud, Save, Loader2, Key, ShieldCheck } from "lucide-react";

export default function CloudinarySettings() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    cloudName: "",
    apiKey: "",
    apiSecret: "",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings/cloudinary");
        const json = await res.json();
        if (json.success && json.data?.cloudinary) {
          setFormData({
            cloudName: json.data.cloudinary.cloudName || "",
            apiKey: json.data.cloudinary.apiKey || "",
            apiSecret: json.data.cloudinary.apiSecret || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setFetching(false);
      }
    }
    void fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings/cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Cloudinary settings updated successfully!");
      } else {
        toast.error(json.message || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred while saving settings");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-border-color bg-bg-secondary/20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-border-color bg-[linear-gradient(135deg,rgba(var(--card-bg),0.98),rgba(var(--bg-secondary),0.92))] p-6 shadow-card overflow-hidden">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
          <Cloud className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Cloudinary Configuration</h2>
          <p className="text-sm text-text-secondary">Set up your tenant-specific image storage.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-1">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">Cloud Name</label>
            <div className="relative">
              <Cloud className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={formData.cloudName}
                onChange={(e) => setFormData({ ...formData, cloudName: e.target.value })}
                placeholder="Enter cloud name"
                className="h-11 w-full rounded-xl border border-border-color bg-bg-primary/50 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">API Key</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="Enter API key"
                className="h-11 w-full rounded-xl border border-border-color bg-bg-primary/50 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">API Secret</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                placeholder="••••••••••••••••"
                className="h-11 w-full rounded-xl border border-border-color bg-bg-primary/50 pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
