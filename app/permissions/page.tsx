"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Shield, Save, Eye, Plus, Edit, Trash, UserCheck } from "lucide-react";

type Module = "dashboard" | "kanban" | "projects" | "tasks" | "users" | "reports" | "settings";
type Action = "view" | "create" | "edit" | "delete" | "assign";
type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

interface Permission {
  _id: string;
  role: Role;
  module: Module;
  actions: Action[];
}

const MODULES: Module[] = ["dashboard", "kanban", "projects", "tasks", "users", "reports", "settings"];
const ACTIONS: Action[] = ["view", "create", "edit", "delete", "assign"];
const ROLES: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE"];

const MODULE_LABELS: Record<Module, string> = {
  dashboard: "Dashboard",
  kanban: "Kanban",
  projects: "Projects",
  tasks: "Tasks",
  users: "Users",
  reports: "Reports",
  settings: "Settings"
};

const ACTION_LABELS: Record<Action, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  assign: "Assign"
};

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  async function loadPermissions() {
    try {
      const res = await fetch("/api/permissions");
      const data = await res.json();
      if (data.success) {
        setPermissions(data.data);
      } else {
        toast.error("Failed to load permissions");
      }
    } catch (error) {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }

  function getPermission(role: Role, module: Module): Permission | undefined {
    return permissions.find(p => p.role === role && p.module === module);
  }

  function hasAction(role: Role, module: Module, action: Action): boolean {
    const perm = getPermission(role, module);
    return perm?.actions.includes(action) || false;
  }

  async function togglePermission(role: Role, module: Module, action: Action) {
    const currentPerm = getPermission(role, module);
    const hasActionCurrently = hasAction(role, module, action);

    let newActions: Action[];
    if (hasActionCurrently) {
      newActions = currentPerm!.actions.filter(a => a !== action);
    } else {
      newActions = [...(currentPerm?.actions || []), action];
    }

    setSaving(true);
    try {
      const method = currentPerm ? "PUT" : "POST";
      const url = currentPerm ? `/api/permissions/${currentPerm._id}` : "/api/permissions";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          module,
          actions: newActions
        })
      });

      const data = await res.json();
      if (data.success) {
        await loadPermissions();
        toast.success("Permission updated");
      } else {
        toast.error("Failed to update permission");
      }
    } catch (error) {
      toast.error("Failed to update permission");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        <span className="ml-2">Loading permissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-accent" />
        <h1 className="text-2xl font-bold">Permissions Management</h1>
      </div>

      <div className="bg-card-bg rounded-lg border border-border-color overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-secondary/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Module
                </th>
                {ROLES.map(role => (
                  <th key={role} className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {MODULES.map(module => (
                <tr key={module} className="hover:bg-bg-secondary/20">
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">
                    {MODULE_LABELS[module]}
                  </td>
                  {ROLES.map(role => (
                    <td key={`${role}-${module}`} className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {ACTIONS.map(action => (
                          <button
                            key={action}
                            onClick={() => togglePermission(role, module, action)}
                            disabled={saving}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              hasAction(role, module, action)
                                ? "bg-accent text-white border-accent"
                                : "bg-bg-secondary border-border-color text-text-secondary hover:border-accent"
                            } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {ACTION_LABELS[action]}
                          </button>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Permission Notes</h3>
            <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• ADMIN role has full access by default</li>
              <li>• Permissions are enforced at the API level</li>
              <li>• UI elements are hidden based on permissions</li>
              <li>• Changes take effect immediately</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}