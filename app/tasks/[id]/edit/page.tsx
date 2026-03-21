"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/AuthProvider";
import TaskForm from "@/components/tasks/TaskForm";

export default function TaskEditPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const { user } = useAuth();
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        if (!user || (user.role !== "admin" && user.role !== "manager")) {
          toast.error("You don't have permission to edit tasks");
          router.push(`/tasks/${taskId}`);
          return;
        }

        const taskRes = await fetch(`/api/tasks/${taskId}`);
        if (!taskRes.ok) throw new Error("Failed to load task");
        const taskData = await taskRes.json();
        setTask(taskData.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load task");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [taskId, router, user]);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!task) return <div className="p-12 text-center text-text-secondary">Task not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-12">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-8"
      >
        <ChevronLeft size={18} />
        <span className="text-sm font-bold uppercase tracking-widest">Back</span>
      </button>

      <div className="bg-bg-secondary/40 border border-border-color rounded-3xl p-8 md:p-12 backdrop-blur-md shadow-2xl">
        <TaskForm 
          initial={task} 
          onSaved={() => router.push(`/tasks/${taskId}`)} 
          onCancel={() => router.back()} 
        />
      </div>
    </div>
  );
}
