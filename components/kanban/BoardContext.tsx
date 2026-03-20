"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ITask } from "@/models/Task";

interface BoardContextType {
    tasks: ITask[];
    loading: boolean;
    refreshTasks: () => Promise<void>;
    moveTask: (taskId: string, toStatus: string, order: number) => Promise<void>;
    createTask: (taskData: any) => Promise<void>;
    assigneeFilter: string;
    setAssigneeFilter: (id: string) => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ projectId: string; children: React.ReactNode }> = ({ projectId, children }) => {
    const [tasks, setTasks] = useState<ITask[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

    const refreshTasks = useCallback(async () => {
        try {
            setLoading(true);
            let url = `/api/tasks?project=${projectId}`;
            if (assigneeFilter !== "all") {
                url += `&assignee=${assigneeFilter}`;
            }
            const res = await fetch(url);
            const result = await res.json();
            if (result.data) {
                setTasks(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        } finally {
            setLoading(false);
        }
    }, [projectId, assigneeFilter]);

    useEffect(() => {
        refreshTasks();
    }, [refreshTasks, assigneeFilter]);

    const moveTask = async (taskId: string, toStatus: string, order: number) => {
        // Optimistic update
        const updatedTasks = [...tasks];
        const taskIndex = updatedTasks.findIndex((t) => t._id.toString() === taskId);
        if (taskIndex > -1) {
            const task = { ...updatedTasks[taskIndex], status: toStatus as any, order };
            updatedTasks[taskIndex] = task;
            // Re-sort
            updatedTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
            setTasks(updatedTasks);
        }

        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: toStatus, order }),
            });
        } catch (error) {
            console.error("Failed to move task", error);
            refreshTasks(); // Revert on failure
        }
    };
    const createTask = async (taskData: any) => {
        await refreshTasks();
    };

    return (
        <BoardContext.Provider value={{ tasks, loading, refreshTasks, moveTask, createTask, assigneeFilter, setAssigneeFilter }}>
            {children}
        </BoardContext.Provider>
    );
};

export const useBoard = () => {
    const context = useContext(BoardContext);
    if (!context) throw new Error("useBoard must be used within a BoardProvider");
    return context;
};
