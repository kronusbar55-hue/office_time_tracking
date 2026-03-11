"use client";

import React, { useState } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useBoard } from "./BoardContext";
import Column from "./Column";
import TaskCard from "./TaskCard";
import { TaskStatus } from "@/models/Task";

const COLUMNS: { id: TaskStatus; title: string }[] = [
    { id: "backlog", title: "Backlog" },
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "in_review", title: "Review" },
    { id: "done", title: "Done" },
];

export default function Board({ onTaskClick, searchQuery = "" }: { onTaskClick?: (task: any) => void; searchQuery?: string }) {
    const { tasks: allTasks, moveTask } = useBoard();
    const [activeTask, setActiveTask] = useState<any>(null);

    const tasks = allTasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find((t) => t._id.toString() === active.id);
        setActiveTask(task);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeTaskId = active.id.toString();
        const overId = over.id.toString();

        const activeTask = tasks.find((t) => t._id.toString() === activeTaskId);
        if (!activeTask) return;

        // Check if dropped over a column or another task
        let targetStatus: TaskStatus = activeTask.status;
        let targetOrder = activeTask.order || 0;

        if (COLUMNS.some((col) => col.id === overId)) {
            targetStatus = overId as TaskStatus;
            // Drop at end of column
            const columnTasks = tasks.filter((t) => t.status === targetStatus);
            targetOrder = columnTasks.length > 0 ? Math.max(...columnTasks.map((t) => t.order || 0)) + 1 : 0;
        } else {
            const overTask = tasks.find((t) => t._id.toString() === overId);
            if (overTask) {
                targetStatus = overTask.status;
                targetOrder = overTask.order || 0;
            }
        }

        if (targetStatus !== activeTask.status || targetOrder !== activeTask.order) {
            moveTask(activeTaskId, targetStatus, targetOrder);
        }

        setActiveTask(null);
    };

    return (
        <div className="flex h-full w-full gap-6 overflow-x-auto p-6 scrollbar-hide">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {COLUMNS.map((column) => (
                    <Column
                        key={column.id}
                        id={column.id}
                        title={column.title}
                        tasks={tasks.filter((t) => t.status === column.id)}
                        onTaskClick={onTaskClick}
                    />
                ))}

                <DragOverlay>
                    {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
