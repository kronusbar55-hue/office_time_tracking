"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  startOfMonth,
  parseISO
} from "date-fns";

interface DateNavigatorProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  viewType: "daily" | "weekly" | "monthly";
}

export function DateNavigator({
  currentDate,
  onDateChange,
  viewType
}: DateNavigatorProps) {
  const date = parseISO(currentDate);

  const isNextDisabled = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let nextDate;

    if (viewType === "daily") {
      nextDate = addDays(date, 1);
    } else if (viewType === "weekly") {
      nextDate = addWeeks(date, 1);
    } else {
      nextDate = addMonths(date, 1);
    }

    return nextDate > today;
  };

  const handlePrevious = () => {
    let newDate;
    if (viewType === "daily") {
      newDate = addDays(date, -1);
    } else if (viewType === "weekly") {
      newDate = addWeeks(date, -1);
    } else {
      newDate = addMonths(date, -1);
    }
    onDateChange(newDate.toISOString().split("T")[0]);
  };

  const handleNext = () => {
    let newDate;
    if (viewType === "daily") {
      newDate = addDays(date, 1);
    } else if (viewType === "weekly") {
      newDate = addWeeks(date, 1);
    } else {
      newDate = addMonths(date, 1);
    }

    // Disable future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate > today) {
      return;
    }

    onDateChange(newDate.toISOString().split("T")[0]);
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = parseISO(e.target.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      alert("Cannot select future dates");
      return;
    }

    onDateChange(e.target.value);
  };

  const getDisplayText = () => {
    if (viewType === "daily") {
      return format(date, "MMM d, yyyy");
    } else if (viewType === "weekly") {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;
    } else {
      return format(date, "MMMM yyyy");
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handlePrevious}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={currentDate}
          onChange={handleDatePick}
          max={format(new Date(), "yyyy-MM-dd")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          id="dateInput"
        />
        <span className="text-sm font-medium text-slate-700 min-w-[140px]">
          {getDisplayText()}
        </span>
      </div>

      <button
        onClick={handleNext}
        disabled={isNextDisabled()}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
