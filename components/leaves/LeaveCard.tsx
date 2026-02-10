import React from 'react';
import LeaveHeader from './LeaveHeader';
import LeaveDateBlock from './LeaveDateBlock';
import LeaveReasonBox from './LeaveReasonBox';
import LeaveAttachmentPreview from './LeaveAttachmentPreview';
import LeaveStatusBadge from './LeaveStatusBadge';
import LeaveActionPanel from './LeaveActionPanel';

export default function LeaveCard({ leave, role, onDone }: { leave: any; role?: string | null; onDone?: () => void }) {
  const name = typeof leave.user === 'object' ? `${leave.user.firstName || ''} ${leave.user.lastName || ''}`.trim() : 'User';
  const avatar = typeof leave.user === 'object' ? leave.user.avatarUrl : undefined;
  const leaveTypeName = typeof leave.leaveType === 'object' ? leave.leaveType.name : (leave.leaveType || 'Leave');

  return (
    <article className="rounded-lg border border-slate-800 p-4 bg-slate-900/50 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <LeaveHeader name={name || 'User'} avatarUrl={avatar} leaveTypeName={leaveTypeName} leaveId={leave._id} appliedAt={new Date(leave.appliedAt || leave.createdAt || Date.now()).toISOString().slice(0,10)} />
          <div className="mt-3">
            <LeaveDateBlock startDate={leave.startDate} endDate={leave.endDate} duration={leave.duration} />
          </div>
          <div className="mt-3">
            <LeaveReasonBox reason={leave.reason} />
          </div>
          <div className="mt-3">
            <LeaveAttachmentPreview attachments={leave.attachments} />
          </div>
        </div>

        <div className="flex-none w-40 flex flex-col items-end justify-between">
          <div className="self-end">
            <LeaveStatusBadge status={leave.status} />
          </div>
          <div className="mt-4">
            <LeaveActionPanel leave={leave} role={role} onDone={onDone} />
          </div>
        </div>
      </div>
    </article>
  );
}
