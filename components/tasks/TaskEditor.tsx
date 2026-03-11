"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Quote,
    Link as LinkIcon
} from "lucide-react";

interface TaskEditorProps {
    content: any;
    onChange: (content: any) => void;
    editable?: boolean;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap gap-1 p-2 bg-slate-900/50 border-b border-white/10 rounded-t-xl mb-2">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${editor.isActive("bold") ? "text-accent bg-accent/20" : "text-slate-400"}`}
            >
                <Bold size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${editor.isActive("italic") ? "text-accent bg-accent/20" : "text-slate-400"}`}
            >
                <Italic size={16} />
            </button>
            <div className="w-px h-6 bg-white/5 mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${editor.isActive("heading", { level: 1 }) ? "text-accent bg-accent/20" : "text-slate-400"}`}
            >
                <Heading1 size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${editor.isActive("heading", { level: 2 }) ? "text-accent bg-accent/20" : "text-slate-400"}`}
            >
                <Heading2 size={16} />
            </button>
            <div className="w-px h-6 bg-white/5 mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${editor.isActive("bulletList") ? "text-accent bg-accent/20" : "text-slate-400"}`}
            >
                <List size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${editor.isActive("orderedList") ? "text-accent bg-accent/20" : "text-slate-400"}`}
            >
                <ListOrdered size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${editor.isActive("blockquote") ? "text-accent bg-accent/20" : "text-slate-400"}`}
            >
                <Quote size={16} />
            </button>
        </div>
    );
};

export default function TaskEditor({ content, onChange, editable = true }: TaskEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Heading.configure({ levels: [1, 2, 3] }),
            Link.configure({ openOnClick: false }),
        ],
        content: content || "",
        editable,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && content && editor.isEmpty) {
            editor.commands.setContent(content);
        }
    }, [editor, content]);

    return (
        <div className="w-full border border-white/10 rounded-xl bg-slate-900/30">
            {editable && <MenuBar editor={editor} />}
            <EditorContent
                editor={editor}
                className="prose prose-invert prose-sm max-w-none p-4 min-h-[150px] focus:outline-none focus:ring-1 focus:ring-accent/40 rounded-b-xl"
            />
        </div>
    );
}
