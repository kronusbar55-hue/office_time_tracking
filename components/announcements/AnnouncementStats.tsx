import React from 'react';
import { Megaphone, Bookmark, Pin } from 'lucide-react';

interface StatsProps {
    total: number;
    unread: number;
    pinned: number;
}

export function AnnouncementStats({ total, unread, pinned }: StatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-2xl border border-border-color/50 bg-bg-secondary/50 p-6 backdrop-blur-xl transition-all hover:bg-bg-secondary/80">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                        <Megaphone size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-text-secondary">Total this month</p>
                        <h3 className="text-2xl font-bold text-text-primary">{total}</h3>
                    </div>
                </div>
                <div className="absolute -bottom-2 -right-2 h-16 w-16 opacity-10">
                    <Megaphone size={64} className="text-blue-500" />
                </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border-color/50 bg-bg-secondary/50 p-6 backdrop-blur-xl transition-all hover:bg-bg-secondary/80">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                        <Bookmark size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-text-secondary">Unread</p>
                        <h3 className="text-2xl font-bold text-text-primary">{unread}</h3>
                    </div>
                </div>
                <div className="absolute -bottom-2 -right-2 h-16 w-16 opacity-10">
                    <Bookmark size={64} className="text-amber-500" />
                </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border-color/50 bg-bg-secondary/50 p-6 backdrop-blur-xl transition-all hover:bg-bg-secondary/80">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                        <Pin size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-text-secondary">Pinned</p>
                        <h3 className="text-2xl font-bold text-text-primary">{pinned}</h3>
                    </div>
                </div>
                <div className="absolute -bottom-2 -right-2 h-16 w-16 opacity-10">
                    <Pin size={64} className="text-rose-500" />
                </div>
            </div>
        </div>
    );
}
