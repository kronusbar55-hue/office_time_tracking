"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  CheckCircle,
  Users,
  Zap,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Clock,
  Tag,
  Settings
} from "lucide-react";

interface FieldChange {
  fieldName: string;
  oldValue?: any;
  newValue?: any;
  displayOldValue?: string;
  displayNewValue?: string;
}

interface ActivityLogEntry {
  _id: string;
  task: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
  };
  eventType: string;
  fieldChanges?: FieldChange[];
  description?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface ActivityTimelineProps {
  taskId: string;
}

const EVENT_ICONS: Record<string, any> = {
  TASK_CREATED: Sparkles,
  STATUS_CHANGED: CheckCircle,
  ASSIGNEE_CHANGED: Users,
  PRIORITY_CHANGED: Zap,
  DESCRIPTION_EDITED: FileText,
  IMAGES_ADDED: ImageIcon,
  IMAGES_REMOVED: ImageIcon,
  COMMENT_ADDED: MessageSquare,
  TIME_LOGGED: Clock,
  FIELD_CHANGED: Settings,
  DUEDATE_CHANGED: Clock,
  LABELS_CHANGED: Tag,
  TYPE_CHANGED: Settings
};

const EVENT_COLORS: Record<string, string> = {
  TASK_CREATED: "bg-green-500/20 text-green-300",
  STATUS_CHANGED: "bg-blue-500/20 text-blue-300",
  ASSIGNEE_CHANGED: "bg-purple-500/20 text-purple-300",
  PRIORITY_CHANGED: "bg-orange-500/20 text-orange-300",
  DESCRIPTION_EDITED: "bg-slate-500/20 text-slate-300",
  IMAGES_ADDED: "bg-cyan-500/20 text-cyan-300",
  IMAGES_REMOVED: "bg-red-500/20 text-red-300",
  COMMENT_ADDED: "bg-indigo-500/20 text-indigo-300",
  TIME_LOGGED: "bg-yellow-500/20 text-yellow-300",
  FIELD_CHANGED: "bg-slate-500/20 text-slate-300",
  DUEDATE_CHANGED: "bg-pink-500/20 text-pink-300",
  LABELS_CHANGED: "bg-violet-500/20 text-violet-300",
  TYPE_CHANGED: "bg-slate-500/20 text-slate-300"
};

const EVENT_LABELS: Record<string, string> = {
  TASK_CREATED: "Task Created",
  STATUS_CHANGED: "Status Changed",
  ASSIGNEE_CHANGED: "Assignee Updated",
  PRIORITY_CHANGED: "Priority Changed",
  DESCRIPTION_EDITED: "Description Edited",
  IMAGES_ADDED: "Images Added",
  IMAGES_REMOVED: "Images Removed",
  COMMENT_ADDED: "Comment Added",
  TIME_LOGGED: "Time Logged",
  FIELD_CHANGED: "Field Updated",
  DUEDATE_CHANGED: "Due Date Changed",
  LABELS_CHANGED: "Labels Changed",
  TYPE_CHANGED: "Type Changed"
};

function formatDisplayValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    if (value.firstName) return `${value.firstName} ${value.lastName}`;
    if (value.name) return value.name;
    return JSON.stringify(value);
  }
  return String(value);
}

function FieldChangeDisplay({ change }: { change: FieldChange }) {
  return (
    <div className="bg-slate-800/40 rounded p-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-300 font-medium min-w-fit">{change.fieldName}:</span>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">Before</div>
            <div className="text-slate-200 break-words">
              {change.displayOldValue || formatDisplayValue(change.oldValue)}
            </div>
          </div>
          <span className="text-slate-500">→</span>
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">After</div>
            <div className="text-slate-200 break-words">
              {change.displayNewValue || formatDisplayValue(change.newValue)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivityTimeline({ taskId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivities() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/tasks/${taskId}/activity?limit=50&sort=-createdAt`
        );
        if (res.ok) {
          const data = await res.json();
          setActivities(data.data || []);
        }
      } catch (error) {
        console.error("Failed to load activities:", error);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, [taskId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-slate-800/40"
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-slate-800/40 bg-slate-900/20 p-8">
        <p className="text-sm text-slate-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, idx) => {
        const IconComponent = EVENT_ICONS[activity.eventType] || Settings;
        const colorClass = EVENT_COLORS[activity.eventType] || EVENT_COLORS.FIELD_CHANGED;
        const label = EVENT_LABELS[activity.eventType] || activity.eventType;
        const isExpanded = expandedId === activity._id;

        return (
          <div
            key={activity._id}
            className="rounded-lg border border-slate-800/40 bg-slate-900/30 overflow-hidden hover:border-slate-700 transition-colors"
          >
            {/* Timeline Header */}
            <button
              onClick={() =>
                setExpandedId(isExpanded ? null : activity._id)
              }
              className="w-full px-4 py-3 flex items-start justify-between gap-4 hover:bg-slate-800/20 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Icon */}
                <div className={`rounded-lg p-2 mt-0.5 flex-shrink-0 ${colorClass}`}>
                  <IconComponent className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-100">{label}</div>

                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span>By</span>
                    <span className="font-medium text-slate-300">
                      {activity.user
                        ? `${activity.user.firstName} ${activity.user.lastName}`
                        : "System"}
                    </span>
                    {activity.user?.role && (
                      <span className="inline-block bg-slate-800/60 rounded px-1.5 py-0.5 text-slate-400">
                        {activity.user.role.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {activity.description && (
                    <p className="mt-1 text-sm text-slate-300">
                      {activity.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0 text-xs text-slate-500">
                <time>
                  {new Date(activity.createdAt).toLocaleDateString()} -{" "}
                  {new Date(activity.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </time>
                {isExpanded && (
                  <span className="text-slate-600">↑ Hide details</span>
                )}
                {!isExpanded && activity.fieldChanges && activity.fieldChanges.length > 0 && (
                  <span className="text-slate-600">↓ Show {activity.fieldChanges.length} change(s)</span>
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="border-t border-slate-800/40 bg-slate-950/40 px-4 py-3 space-y-3">
                {/* Special handling for TASK_CREATED - show key task info */}
                {activity.eventType === "TASK_CREATED" && activity.metadata?.taskData && (
                  <>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Initial Task Details
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-800/40 rounded p-3">
                        <div className="text-xs text-slate-500 mb-1">Type</div>
                        <div className="text-slate-200">{activity.metadata.taskData?.type || "—"}</div>
                      </div>
                      <div className="bg-slate-800/40 rounded p-3">
                        <div className="text-xs text-slate-500 mb-1">Priority</div>
                        <div className="text-slate-200">{activity.metadata.taskData?.priority || "—"}</div>
                      </div>
                      <div className="bg-slate-800/40 rounded p-3">
                        <div className="text-xs text-slate-500 mb-1">Status</div>
                        <div className="text-slate-200">{activity.metadata.taskData?.status || "—"}</div>
                      </div>
                      <div className="bg-slate-800/40 rounded p-3">
                        <div className="text-xs text-slate-500 mb-1">Assignee</div>
                        <div className="text-slate-200">
                          {activity.metadata.taskData?.assignee
                            ? `${activity.metadata.taskData.assignee.firstName} ${activity.metadata.taskData.assignee.lastName}`
                            : "Unassigned"}
                        </div>
                      </div>
                      {activity.metadata.taskData?.description && (
                        <div className="bg-slate-800/40 rounded p-3 col-span-2">
                          <div className="text-xs text-slate-500 mb-1">Description</div>
                          <div className="text-slate-200 text-xs">{activity.metadata.taskData.description}</div>
                        </div>
                      )}
                      {activity.metadata.taskData?.attachments?.length > 0 && (
                        <div className="bg-slate-800/40 rounded p-3 col-span-2">
                          <div className="text-xs text-slate-500 mb-1">Attachments</div>
                          <div className="text-slate-200 text-xs">
                            {activity.metadata.taskData.attachments.length} image(s) uploaded
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Field Changes */}
                {activity.eventType !== "TASK_CREATED" && activity.fieldChanges && activity.fieldChanges.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Field Changes ({activity.fieldChanges.length})
                    </div>
                    <div className="space-y-2">
                      {activity.fieldChanges.map((change, idx) => (
                        <FieldChangeDisplay key={idx} change={change} />
                      ))}
                    </div>
                  </>
                )}

                {/* Metadata (for non-TASK_CREATED events) */}
                {activity.eventType !== "TASK_CREATED" && activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-4">
                      Details
                    </div>
                    <div className="space-y-2">
                      {activity.eventType === "IMAGES_ADDED" && activity.metadata.files && (
                        <div className="bg-slate-800/40 rounded p-3 text-xs text-slate-300">
                          <p className="font-medium mb-2">Files uploaded:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {activity.metadata.files.map((file: string, idx: number) => (
                              <li key={idx}>{file}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {activity.eventType === "IMAGES_REMOVED" && (
                        <div className="bg-slate-800/40 rounded p-3 text-xs text-slate-300">
                          <p><span className="text-slate-500">File:</span> {activity.metadata.fileName}</p>
                        </div>
                      )}
                      {!["IMAGES_ADDED", "IMAGES_REMOVED"].includes(activity.eventType) && (
                        <div className="bg-slate-800/40 rounded p-3 text-xs text-slate-300 font-mono max-h-48 overflow-y-auto">
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(activity.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!activity.fieldChanges?.length &&
                  (!activity.metadata ||
                    Object.keys(activity.metadata).length === 0) && (
                    activity.eventType !== "TASK_CREATED" && (
                      <div className="text-sm text-slate-400 italic">
                        No additional details for this event
                      </div>
                    )
                  )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
