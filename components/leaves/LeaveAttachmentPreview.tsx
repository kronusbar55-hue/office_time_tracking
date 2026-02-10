import React from 'react';

export default function LeaveAttachmentPreview({ attachments }: { attachments?: any[] }) {
  if (!attachments || attachments.length === 0) {
    return <div className="text-sm text-slate-400">No attachment provided</div>;
  }

  const a = attachments[0];

  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 flex-none rounded bg-slate-800/40 flex items-center justify-center text-slate-300">📎</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{a.filename || a.url}</div>
        <div className="text-xs text-slate-400">{a.mimeType || ''}</div>
      </div>
      <div className="flex-none">
        <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-accent underline">View</a>
      </div>
    </div>
  );
}
