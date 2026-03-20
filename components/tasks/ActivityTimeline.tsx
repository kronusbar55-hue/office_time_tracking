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
  Settings,
  ArrowRight
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
    avatarUrl?: string;
  };
  eventType: string;
  fieldChanges?: FieldChange[];
  description?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
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
  FIELD_CHANGED: Settings,
  DUEDATE_CHANGED: Clock,
};

const EVENT_COLORS: Record<string, string> = {
  TASK_CREATED: "text-emerald-400",
  STATUS_CHANGED: "text-blue-400",
  ASSIGNEE_CHANGED: "text-purple-400",
  PRIORITY_CHANGED: "text-amber-400",
  DESCRIPTION_EDITED: "text-text-secondary",
  IMAGES_ADDED: "text-cyan-400",
  COMMENT_ADDED: "text-indigo-400",
};

function formatDisplayValue(value: any, fieldName?: string): React.ReactNode {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  
  if (fieldName === "attachments" && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {value.map((img: any, i: number) => (
          <div key={i} className="relative group">
            <img 
              src={img.url} 
              alt={img.fileName} 
              className="h-10 w-10 rounded border border-border-color object-cover shadow-sm transition hover:scale-110" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
               <span className="text-[6px] text-text-primary font-black uppercase text-center px-0.5 leading-tight">{img.fileName}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    if (value.firstName) return `${value.firstName} ${value.lastName}`;
    if (value.name) return value.name;
    return Array.isArray(value) ? `[${value.length} item(s)]` : "Object";
  }
  return String(value);
}

function FieldChangeRow({ change }: { change: FieldChange }) {
  const isAttachments = change.fieldName === "attachments";
  const fieldLabel = change.fieldName.charAt(0).toUpperCase() + change.fieldName.slice(1);

  return (
    <div className={`flex ${isAttachments ? "flex-col items-start" : "flex-wrap items-center"} gap-x-2 text-xs py-1.5 border-b border-white/[0.03] last:border-0`}>
      <span className="text-text-secondary font-bold uppercase tracking-tighter min-w-[70px]">{fieldLabel}</span>
      
      <div className={`flex ${isAttachments ? "flex-col gap-2" : "items-center gap-1.5"}`}>
        <div className="flex items-center gap-1.5 opacity-60">
          <div className="text-text-secondary line-through decoration-slate-600 max-w-[200px] truncate">
            {change.displayOldValue || formatDisplayValue(change.oldValue, change.fieldName)}
          </div>
        </div>

        {!isAttachments && <ArrowRight size={10} className="text-slate-600 shrink-0" />}
        {isAttachments && <div className="h-px w-8 bg-card-bg" />}

        <div className="text-accent font-bold">
          {change.displayNewValue || formatDisplayValue(change.newValue, change.fieldName)}
        </div>
      </div>
    </div>
  );
}

export default function ActivityTimeline({ taskId }: { taskId: string }) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tasks/${taskId}/activity?limit=50&sort=-createdAt`);
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
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-card-bg" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-1/4 rounded bg-card-bg" />
              <div className="h-3 w-1/2 rounded bg-card-bg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-10 rounded-xl border border-dashed border-border-color bg-bg-secondary/20">
        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest text-center">No activity history yet</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0 pb-4">
      {/* Vertical Line */}
      <div className="absolute left-4 top-2 bottom-0 w-px bg-hover-bg" />

      {activities.map((activity, idx) => {
        const Icon = EVENT_ICONS[activity.eventType] || Settings;
        const color = EVENT_COLORS[activity.eventType] || "text-text-secondary";
        
        return (
          <div key={activity._id} className="relative flex gap-4 pb-8 group last:pb-0">
            {/* User Avatar / Role Icon */}
            <div className="relative z-10 flex-shrink-0">
              <div className="h-8 w-8 rounded-full border border-border-color bg-bg-secondary flex items-center justify-center overflow-hidden shadow-lg group-hover:border-accent/40 transition-colors">
                {activity.user?.avatarUrl ? (
                  <img src={activity.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-text-secondary uppercase">
                    {activity.user?.firstName?.[0] || "S"}
                  </span>
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-bg-primary flex items-center justify-center border border-border-color ${color}`}>
                <Icon size={10} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-1 text-xs">
                <span className="font-black text-text-primary uppercase tracking-tighter">
                  {activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : "System"}
                </span>
                <span className="text-text-secondary font-medium">
                  {activity.eventType === "TASK_CREATED" ? "created this task" : "updated this task"}
                </span>
                <div className="h-1 w-1 rounded-full bg-slate-700 mx-0.5" />
                <time className="text-text-secondary font-bold tabular-nums">
                   {new Date(activity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                   {" • "}
                   {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>

              {/* Descriptions / Changes */}
              <div className="space-y-1">
                {activity.fieldChanges && activity.fieldChanges.length > 0 && (
                  <div className="space-y-0.5 mt-2 bg-bg-secondary/40 rounded-lg p-2 border border-border-color">
                    {activity.fieldChanges.map((change, cIdx) => (
                      <FieldChangeRow key={cIdx} change={change} />
                    ))}
                  </div>
                )}
                
                {activity.description && !activity.fieldChanges?.length && (
                  <p className="text-sm text-text-secondary leading-relaxed max-w-2xl italic">
                    {activity.description}
                  </p>
                )}

                {/* Special Metadata Display: Task Creation Details */}
                {activity.eventType === "TASK_CREATED" && activity.metadata?.taskData && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 shadow-inner">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Initial Project</span>
                            <span className="text-[11px] font-bold text-text-secondary">
                                {activity.metadata.taskData.project?.name || "Global"}
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Initial Assignee</span>
                            <span className="text-[11px] font-bold text-text-secondary">
                                {activity.metadata.taskData.assignee?.firstName 
                                    ? `${activity.metadata.taskData.assignee.firstName} ${activity.metadata.taskData.assignee.lastName}`
                                    : "Unassigned"}
                            </span>
                        </div>
                    </div>
                )}

                {/* Special Metadata Display: Comment Content */}
                {activity.eventType === "COMMENT_ADDED" && activity.metadata?.commentContent && (
                    <div className="mt-2 bg-bg-secondary/60 rounded-xl p-3 border border-indigo-500/20 shadow-lg animate-in fade-in slide-in-from-left-2 duration-500">
                         <p className="text-[13px] text-text-secondary leading-relaxed italic border-l-2 border-indigo-500/40 pl-3">
                            &quot;{activity.metadata.commentContent}&quot;
                         </p>
                    </div>
                )}

                {/* Special Metadata Display: Image Uploads */}
                {(activity.eventType === "IMAGES_ADDED" || activity.eventType === "IMAGES_REMOVED") && activity.metadata?.files && (
                   <div className="mt-2 flex flex-wrap gap-2">
                      {activity.metadata.files.map((file: any, fIdx: number) => (
                         typeof file === 'object' && file.url ? (
                           <div key={fIdx} className="relative group">
                              <img 
                                src={file.url} 
                                alt={file.fileName} 
                                className="h-10 w-10 rounded-lg border border-border-color object-cover shadow-lg" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                <span className="text-[6px] text-text-primary font-black uppercase text-center px-1 truncate">{file.fileName}</span>
                              </div>
                           </div>
                         ) : (
                           <div key={fIdx} className="px-2 py-1 rounded bg-card-bg border border-border-color text-[10px] text-text-secondary font-medium truncate max-w-[150px]">
                              {typeof file === 'string' ? file : file.fileName || "File"}
                           </div>
                         )
                      ))}
                   </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
