"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { motion } from "framer-motion";

interface TaskDonutChartProps {
    data: {
        backlog: number;
        todo: number;
        inProgress: number;
        inReview: number;
        done: number;
    };
}

export default function TaskDonutChart({ data }: TaskDonutChartProps) {
    const chartData = [
        { name: "Backlog", value: data.backlog, color: "#60A5FA" }, // blue-400
        { name: "Todo", value: data.todo, color: "#94A3B8" }, // slate-400
        { name: "In Progress", value: data.inProgress, color: "#FACC15" }, // yellow-400
        { name: "In Review", value: data.inReview, color: "#FB923C" }, // orange-400
        { name: "Done", value: data.done, color: "#4ADE80" }, // green-400
    ].filter(item => item.value > 0);

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1500}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#f8fafc"
                        }}
                        itemStyle={{ color: "#f8fafc" }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
