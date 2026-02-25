import React from 'react';
import { Search, Filter } from 'lucide-react';

const categories = ['All', 'General', 'HR', 'Policy', 'Event', 'Urgent'];

interface FiltersProps {
    activeCategory: string;
    onCategoryChange: (category: string) => void;
    search: string;
    onSearchChange: (search: string) => void;
    onSortChange: (sort: string) => void;
}

export function AnnouncementFilters({
    activeCategory,
    onCategoryChange,
    search,
    onSearchChange,
    onSortChange
}: FiltersProps) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => onCategoryChange(category)}
                        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-all ${activeCategory === category
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search announcements..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 ring-blue-500/20 transition-all focus:border-blue-500 focus:outline-none focus:ring-4"
                    />
                </div>

                <select
                    onChange={(e) => onSortChange(e.target.value)}
                    className="rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2 text-sm text-slate-400 focus:outline-none"
                >
                    <option value="latest">Latest</option>
                    <option value="oldest">Oldest</option>
                </select>
            </div>
        </div>
    );
}
