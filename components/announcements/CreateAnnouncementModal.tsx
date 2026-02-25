import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    announcement?: any;
}

export function CreateAnnouncementModal({ isOpen, onClose, onSuccess, announcement }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: announcement?.title || '',
        description: announcement?.description || '',
        category: announcement?.category || 'General',
        isPinned: announcement?.isPinned || false,
        expiresAt: announcement?.expiresAt ? new Date(announcement.expiresAt).toISOString().split('T')[0] : '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.title.length < 5) return toast.error('Title must be at least 5 characters');
        if (formData.description.length < 20) return toast.error('Description must be at least 20 characters');

        setLoading(true);
        try {
            const url = announcement ? `/api/announcements/${announcement._id}` : '/api/announcements';
            const method = announcement ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save announcement');
            }

            toast.success(announcement ? 'Announcement updated' : 'Announcement published');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">
                        {announcement ? 'Edit Announcement' : 'Publish New Update'}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter announcement title"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
                        <textarea
                            required
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="What's the update? (Min 20 characters)"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-white focus:outline-none"
                            >
                                <option value="General">General</option>
                                <option value="HR">HR</option>
                                <option value="Policy">Policy</option>
                                <option value="Event">Event</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Expiry Date (Optional)</label>
                            <input
                                type="date"
                                value={formData.expiresAt}
                                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-white focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 py-2">
                        <input
                            type="checkbox"
                            id="isPinned"
                            checked={formData.isPinned}
                            onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isPinned" className="text-sm font-medium text-slate-300">Pin to top (Max 3)</label>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {announcement ? 'Update' : 'Publish'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
