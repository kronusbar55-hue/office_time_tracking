import React from 'react';

export default function LeaveDateBlock({ startDate, endDate, duration }: { startDate: string; endDate: string; duration: string }) {
  // compute days count
  const s = new Date(startDate + 'T00:00:00');
  const e = new Date(endDate + 'T00:00:00');
  const days = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="text-xl">📅</div>
        <div>
          <div className="text-sm font-medium">{startDate} → {endDate}</div>
          <div className="text-xs text-text-secondary">Duration: {duration} ({days} {days === 1 ? 'day' : 'days'})</div>
        </div>
      </div>
    </div>
  );
}
