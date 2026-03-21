"use client";

import { useState } from "react";
import { X, Layout, Activity, MessageSquare } from "lucide-react";
import ActivityTimeline from "./ActivityTimeline";
import TaskComments from "./TaskComments";
import TaskForm from "./TaskForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (task?: any) => void;
  initial?: any | null;
};

export default function TaskModal({ open, onClose, onSaved, initial }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "comments">("overview");

  if (!open) return null;

  const isEdit = !!(initial?._id || initial?.id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-bg-primary border border-border-color shadow-2xl rounded-3xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header with Tabs */}
        <div className="px-8 pt-8 pb-4 border-b border-border-color bg-bg-secondary/10 flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-bg-secondary/40 border border-border-color rounded-xl">
            <button
               onClick={() => setActiveTab("overview")}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "overview" ? "bg-accent text-slate-950 shadow-lg" : "text-text-secondary hover:text-text-primary"}`}
            >
               <Layout size={14} />
               <span>Overview</span>
            </button>
            {isEdit && (
              <>
                <button
                   onClick={() => setActiveTab("activity")}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "activity" ? "bg-accent text-slate-950 shadow-lg" : "text-text-secondary hover:text-text-primary"}`}
                >
                   <Activity size={14} />
                   <span>Activity</span>
                </button>
                <button
                   onClick={() => setActiveTab("comments")}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "comments" ? "bg-accent text-slate-950 shadow-lg" : "text-text-secondary hover:text-text-primary"}`}
                >
                   <MessageSquare size={14} />
                   <span>Comments</span>
                </button>
              </>
            )}
          </div>
          
          <button onClick={onClose} className="p-2 transition-colors hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {activeTab === "overview" ? (
            <TaskForm 
              initial={initial} 
              onSaved={onSaved} 
              onCancel={onClose} 
              showHeader={false}
            />
          ) : activeTab === "activity" ? (
            <ActivityTimeline taskId={initial?._id || initial?.id} />
          ) : (
            <TaskComments taskId={initial?._id || initial?.id} />
          )}
        </div>
      </div>
    </div>
  );
}
