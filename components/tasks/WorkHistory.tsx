"use client";

import { useEffect, useState } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";

interface Change {
  _id: string;
  taskId: string;
  actionType: string;
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  changedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  changedByRole?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkHistory({ taskId }: { taskId: string }) {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadChanges() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tasks/${taskId}/audit-logs`);
        if (res.ok) {
          const data = await res.json();
          setChanges(data.data || []);
        }
      } catch (error) {
        console.error("Failed to load changes:", error);
      } finally {
        setLoading(false);
      }
    }

    loadChanges();
  }, [taskId]);

  const formatFieldName = (field: string) => {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if (value._id) return value.firstName ? `${value.firstName} ${value.lastName}` : value.name;
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getActionIcon = (actionType: string) => {
    const icons: Record<string, string> = {
      TASK_CREATED: "✨",
      STATUS_CHANGED: "🔄",
      ASSIGNEE_CHANGED: "👤",
      PRIORITY_CHANGED: "⚡",
      DESCRIPTION_EDITED: "📝",
      ATTACHMENT_CHANGED: "📎",
      FIELD_UPDATED: "⚙️",
    };
    return icons[actionType] || "📌";
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      TASK_CREATED: "Task Created",
      STATUS_CHANGED: "Status Changed",
      ASSIGNEE_CHANGED: "Assignee Changed",
      PRIORITY_CHANGED: "Priority Changed",
      DESCRIPTION_EDITED: "Description Edited",
      ATTACHMENT_CHANGED: "Attachment Changed",
      FIELD_UPDATED: "Field Updated",
    };
    return labels[actionType] || actionType;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-1/3 animate-pulse rounded bg-slate-800/40" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800/40" />
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-slate-800/40 bg-slate-900/20 p-6">
        <p className="text-sm text-slate-400">No change history</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {changes.map((change, index) => (
        <div key={change._id} className="rounded-md border border-slate-800/40 bg-slate-900/30">
          <button
            onClick={() => setExpanded({ ...expanded, [change._id]: !expanded[change._id] })}
            className="w-full px-4 py-3 text-left hover:bg-slate-800/20 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-lg">{getActionIcon(change.actionType)}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-100">
                  {getActionLabel(change.actionType)}
                  {change.fieldName && <span className="text-slate-400 ml-2">({formatFieldName(change.fieldName)})</span>}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  By <span className="font-medium text-slate-300">{change.changedBy?.firstName} {change.changedBy?.lastName}</span>
                  {" "}
                  <span className="inline-block bg-slate-800/40 rounded px-1.5 py-0.5 ml-2 text-xs">
                    {change.changedBy?.role?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <time className="text-xs text-slate-400">
                {new Date(change.createdAt).toLocaleDateString()} {new Date(change.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </time>
              {expanded[change._id] ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </div>
          </button>

          {expanded[change._id] && (
            <div className="border-t border-slate-800/40 px-4 py-3 bg-slate-950/40 space-y-2">
              {change.actionType === "TASK_CREATED" ? (
                <div className="text-sm text-slate-300">
                  <p className="font-medium text-slate-200 mb-2">Initial task data:</p>
                  <div className="bg-slate-900/60 rounded p-2 text-xs space-y-1 max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(change.newValue, null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">From</p>
                    <div className="text-sm text-slate-300 bg-slate-900/60 rounded px-3 py-2 break-words">
                      {formatValue(change.oldValue)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">To</p>
                    <div className="text-sm text-slate-300 bg-slate-900/60 rounded px-3 py-2 break-words">
                      {formatValue(change.newValue)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
