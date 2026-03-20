import React from 'react';

export default function LeaveHeader({ name, avatarUrl, leaveTypeName, leaveId, appliedAt }: { name: string; avatarUrl?: string; leaveTypeName?: string; leaveId?: string; appliedAt?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <img src={avatarUrl || '/avatar-placeholder.png'} alt={`${name} avatar`} className="h-10 w-10 rounded-full object-cover" />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{name}</div>
          <div className="text-xs text-text-secondary truncate">{leaveTypeName || 'Leave'}</div>
        </div>
      </div>

      <div className="text-right text-xs text-text-secondary">
        {leaveId && <div className="truncate">Leave ID: <span className="text-text-secondary">{leaveId}</span></div>}
        {appliedAt && <div className="truncate">Applied on: <span className="text-text-secondary">{appliedAt}</span></div>}
      </div>
    </div>
  );
}
