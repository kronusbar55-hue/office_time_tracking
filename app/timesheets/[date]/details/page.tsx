"use client";

import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { DayDetailsView } from "@/components/timesheets/DayDetailsView";

export default function TimesheetDayDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const dateParam = params.date as string;

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Invalid date</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/timesheets")}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            Back to Timesheets
          </button>
        </div>
        <DayDetailsView date={dateParam} />
      </div>
    </div>
  );
}
