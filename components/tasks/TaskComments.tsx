import React, { useState, useEffect } from "react";
import { MessageSquare, Send, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-toastify";

interface Comment {
    _id: string;
    author: {
        firstName: string;
        lastName: string;
        avatarUrl?: string;
    };
    content: string;
    createdAt: string;
}

export default function TaskComments({ taskId }: { taskId: string }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/tasks/${taskId}/comments`);
            if (!res.ok) throw new Error("Could not load comments.");
            const json = await res.json();
            if (json.success) {
                setComments(json.data || []);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load comments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (taskId) fetchComments();
    }, [taskId]);

    const handlePost = async () => {
        if (!newComment.trim()) return;
        try {
            setSubmitting(true);
            const res = await fetch(`/api/tasks/${taskId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment }),
            });
            const json = await res.json();
            if (json.success && json.data) {
                // Pre-populate author if not included in response (though it should be)
                setComments(prev => [json.data, ...prev]);
                setNewComment("");
                toast.success("Comment added!");
            } else {
                throw new Error(json.error || "Failed to post comment");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error adding comment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <User size={14} className="text-accent" />
                </div>
                <div className="flex-1 relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full rounded-xl bg-slate-900/50 border border-white/10 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40 min-h-[80px]"
                    />
                    <button
                        onClick={handlePost}
                        disabled={submitting || !newComment.trim()}
                        className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-accent text-slate-950 hover:bg-accent-hover transition-colors disabled:opacity-50"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {loading && comments.length === 0 ? (
                    <div className="text-center py-8">
                         <div className="animate-spin h-5 w-5 border-2 border-accent border-t-transparent rounded-full mx-auto" />
                         <p className="mt-2 text-xs text-slate-500 font-black uppercase tracking-widest">Loading Conversation...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-10 rounded-xl border border-dashed border-white/5 bg-slate-900/10">
                        <MessageSquare className="h-8 w-8 text-slate-700 mx-auto mb-2 opacity-30" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No messages yet</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment._id} className="flex gap-4 group">
                            <div className="h-9 w-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-transparent group-hover:ring-accent/40 transition-all">
                                {comment.author?.avatarUrl ? (
                                    <img src={comment.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                        {(comment.author?.firstName || "U")[0]}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[11px] font-black text-slate-100 uppercase tracking-tighter group-hover:text-accent transition-colors">
                                        {comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : "Unknown User"}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-600">
                                        {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : "just now"}
                                    </span>
                                </div>
                                <div className="text-[13px] text-slate-300 bg-slate-900/30 rounded-2xl p-4 border border-white/5 leading-relaxed">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
