import React, { useState, useEffect } from "react";
import { MessageSquare, Send, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
            const json = await res.json();
            if (json.success) {
                setComments(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
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
            if (json.success) {
                setComments([json.data, ...comments]);
                setNewComment("");
            }
        } catch (e) {
            console.error(e);
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
                    <div className="text-center py-4 text-slate-500 text-xs">Loading comments...</div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-xs">No comments yet.</div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment._id} className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                                {comment.author.avatarUrl ? (
                                    <img src={comment.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-400 capitalize">{comment.author.firstName[0]}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-100">{comment.author.firstName} {comment.author.lastName}</span>
                                    <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                                </div>
                                <div className="text-sm text-slate-300 bg-slate-800/30 rounded-xl p-3 border border-white/5">
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
