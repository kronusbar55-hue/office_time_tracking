"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ITask } from "@/models/Task";

interface BoardContextType {
    tasks: ITask[];
    loading: boolean;
    hasMore: boolean;
    refreshTasks: (search?: string) => Promise<void>;
    loadMore: () => Promise<void>;
    moveTask: (taskId: string, toStatus: string, order: number) => Promise<void>;
    createTask: (taskData: any) => Promise<void>;
    assigneeFilter: string;
    setAssigneeFilter: (id: string) => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ projectId: string; children: React.ReactNode }> = ({ projectId, children }) => {
    const [tasks, setTasks] = useState<ITask[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
    const [currentSearch, setCurrentSearch] = useState("");

    const fetchTasks = useCallback(async (p: number, search: string = "", filter: string = "all") => {
        try {
            let url = `/api/tasks?project=${projectId}&page=${p}&limit=50`;
            if (filter !== "all") url += `&assignee=${filter}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            
            const res = await fetch(url);
            const result = await res.json();
            return result;
        } catch (error) {
            console.error("Failed to fetch tasks", error);
            return { data: [], total: 0 };
        }
    }, [projectId]);

    const refreshTasks = useCallback(async (search: string = "") => {
        setLoading(true);
        setCurrentSearch(search);
        const result = await fetchTasks(1, search, assigneeFilter);
        setTasks(result.data || []);
        setPage(1);
        setHasMore((result.data?.length || 0) < result.total);
        setLoading(false);
    }, [fetchTasks, assigneeFilter]);

    const loadMore = useCallback(async () => {
        if (!hasMore || loading) return;
        const nextPage = page + 1;
        const result = await fetchTasks(nextPage, currentSearch, assigneeFilter);
        if (result.data) {
            setTasks(prev => [...prev, ...result.data]);
            setPage(nextPage);
            setHasMore(tasks.length + result.data.length < result.total);
        }
    }, [hasMore, loading, page, fetchTasks, currentSearch, assigneeFilter, tasks.length]);

    useEffect(() => {
        refreshTasks(currentSearch);
    }, [projectId, assigneeFilter]);

    const moveTask = async (taskId: string, toStatus: string, order: number) => {
        const updatedTasks = [...tasks];
        const taskIndex = updatedTasks.findIndex((t) => t._id.toString() === taskId);
        if (taskIndex > -1) {
            const task = { ...updatedTasks[taskIndex], status: toStatus as any, order };
            updatedTasks[taskIndex] = task;
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
            refreshTasks(currentSearch);
        }
    };

    const createTask = async (taskData: any) => {
        await refreshTasks(currentSearch);
    };

    return (
        <BoardContext.Provider value={{ 
            tasks, 
            loading, 
            hasMore, 
            refreshTasks, 
            loadMore,
            moveTask, 
            createTask, 
            assigneeFilter, 
            setAssigneeFilter 
        }}>
            {children}
        </BoardContext.Provider>
    );
};

export const useBoard = () => {
    const context = useContext(BoardContext);
    if (!context) throw new Error("useBoard must be used within a BoardProvider");
    return context;
};
