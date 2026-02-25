import React from 'react';
import { Pin, Clock, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AnnouncementCardProps {
    announcement: any;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onPinChange?: (id: string, isPinned: boolean) => void;
    currentUserRole?: string;
}

export function AnnouncementCard({ announcement, onEdit, onDelete, onPinChange, currentUserRole }: AnnouncementCardProps) {
    const isPinned = announcement.isPinned;
    const categoryColor = {
        General: 'bg-blue-500/20 text-blue-400',
        HR: 'bg-pink-500/20 text-pink-400',
        Policy: 'bg-indigo-500/20 text-indigo-400',
        Event: 'bg-emerald-500/20 text-emerald-400',
        Urgent: 'bg-rose-500/20 text-rose-400',
    }[announcement.category as string] || 'bg-slate-500/20 text-slate-400';

    const canEdit = currentUserRole === 'admin' || currentUserRole === 'hr';
    const canDelete = currentUserRole === 'admin';

    return (
        <div className={`group relative flex flex-col gap-4 rounded-2xl border ${isPinned ? 'border-blue-500/30 bg-blue-500/[0.02]' : 'border-slate-800/60 bg-slate-900/40'} p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-800/50 hover:shadow-2xl hover:shadow-black/20`}>
            {isPinned && (
                <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 ring-1 ring-inset ring-blue-500/30">
                    <Pin size={10} className="rotate-45" />
                    Pinned
                </div>
            )}

            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${categoryColor} ring-1 ring-inset ring-current/20`}>
                        {announcement.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                    </span>
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-50 transition-colors group-hover:text-white">
                    {announcement.title}
                </h3>
                <p className="line-clamp-3 text-sm leading-relaxed text-slate-400">
                    {announcement.description}
                </p>
            </div>

            <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700 overflow-hidden">
                        {announcement.createdBy?.avatarUrl ? (
                            <img src={announcement.createdBy.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                        ) : (
                            <UserIcon size={14} className="text-slate-500" />
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-300">
                            {announcement.createdBy?.firstName} {announcement.createdBy?.lastName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                            {announcement.createdBy?.technology?.name || 'Support Team'}
                        </p>

                    </div>
                </div>

                <button className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1 group/btn">
                    Read More
                    <span className="transition-transform group-hover/btn:translate-x-1">→</span>
                </button>
            </div>

            {(canEdit || canDelete) && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Action buttons could go here */}
                </div>
            )}
        </div>
    );
}
