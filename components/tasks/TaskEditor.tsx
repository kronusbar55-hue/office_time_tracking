"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect } from "react";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Quote,
    Undo,
    Redo,
    Strikethrough,
    Code,
    Minus,
    ImageIcon
} from "lucide-react";

interface TaskEditorProps {
    content: any;
    onChange: (content: any) => void;
    editable?: boolean;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    const btnClass = (active: boolean) =>
        `p-2 rounded-lg hover:bg-hover-bg transition-all ${active ? "text-accent bg-accent/15 border border-accent/20" : "text-text-secondary border border-transparent"}`;

    const addImage = () => {
        const url = window.prompt("URL");
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-1.5 bg-bg-secondary/60 border-b border-border-color rounded-t-xl">
            <div className="flex items-center space-x-0.5 mr-2">
                <button
                    type="button"
                    title="Undo"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="p-2 rounded-lg hover:bg-hover-bg text-text-secondary disabled:opacity-30"
                >
                    <Undo size={15} />
                </button>
                <button
                    type="button"
                    title="Redo"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="p-2 rounded-lg hover:bg-hover-bg text-text-secondary disabled:opacity-30"
                >
                    <Redo size={15} />
                </button>
            </div>

            <div className="w-px h-5 bg-hover-bg mx-1" />

            <div className="flex items-center space-x-0.5">
                <button
                    type="button"
                    title="Heading 1"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={btnClass(editor.isActive("heading", { level: 1 }))}
                >
                    <Heading1 size={15} />
                </button>
                <button
                    type="button"
                    title="Heading 2"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={btnClass(editor.isActive("heading", { level: 2 }))}
                >
                    <Heading2 size={15} />
                </button>
            </div>

            <div className="w-px h-5 bg-hover-bg mx-1" />

            <div className="flex items-center space-x-0.5">
                <button
                    type="button"
                    title="Bold"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={btnClass(editor.isActive("bold"))}
                >
                    <Bold size={15} />
                </button>
                <button
                    type="button"
                    title="Italic"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={btnClass(editor.isActive("italic"))}
                >
                    <Italic size={15} />
                </button>
                <button
                    type="button"
                    title="Strike"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={btnClass(editor.isActive("strike"))}
                >
                    <Strikethrough size={15} />
                </button>
                <button
                    type="button"
                    title="Code"
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    className={btnClass(editor.isActive("code"))}
                >
                    <Code size={15} />
                </button>
            </div>

            <div className="w-px h-5 bg-hover-bg mx-1" />

            <div className="flex items-center space-x-0.5">
                <button
                    type="button"
                    title="Bullet List"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={btnClass(editor.isActive("bulletList"))}
                >
                    <List size={15} />
                </button>
                <button
                    type="button"
                    title="Ordered List"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={btnClass(editor.isActive("orderedList"))}
                >
                    <ListOrdered size={15} />
                </button>
            </div>

            <div className="w-px h-5 bg-hover-bg mx-1" />

            <div className="flex items-center space-x-0.5">
                <button
                    type="button"
                    title="Blockquote"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={btnClass(editor.isActive("blockquote"))}
                >
                    <Quote size={15} />
                </button>
                <button
                    type="button"
                    title="Add Image"
                    onClick={addImage}
                    className="p-2 rounded-lg hover:bg-hover-bg text-text-secondary"
                >
                    <ImageIcon size={15} />
                </button>
                <button
                    type="button"
                    title="Divider"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    className="p-2 rounded-lg hover:bg-hover-bg text-text-secondary"
                >
                    <Minus size={15} />
                </button>
            </div>
        </div>
    );
};

export default function TaskEditor({ content, onChange, editable = true }: TaskEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Heading.configure({ levels: [1, 2, 3] }),
            Link.configure({ openOnClick: false }),
            Image.configure({ inline: true, allowBase64: true }),
        ],
        content: content || "",
        editable,
        immediatelyRender: false,
        editorProps: {
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;

                let hasImage = false;
                Array.from(items).forEach((item) => {
                    if (item.type.startsWith("image")) {
                        hasImage = true;
                        const file = item.getAsFile();
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const result = e.target?.result as string;
                                if (result) {
                                    const node = view.state.schema.nodes.image.create({ src: result });
                                    const tr = view.state.tr.replaceSelectionWith(node);
                                    view.dispatch(tr);
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                    }
                });

                return hasImage;
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            if (html !== content) {
                onChange(html);
            }
        },
    });

    useEffect(() => {
        if (editor && content !== undefined && content !== editor.getHTML()) {
            // only set content if it's actually different to avoid cursor reset
            editor.commands.setContent(content || "");
        }
    }, [editor, content]);

    return (
        <div className="w-full border border-border-color rounded-xl bg-bg-primary/40 focus-within:border-accent/40 transition-all">
            {editable && <MenuBar editor={editor} />}
            <EditorContent
                editor={editor}
                className="tiptap-editor-content p-4 min-h-[160px] focus:outline-none"
            />
            <style jsx global>{`
                .tiptap-editor-content .tiptap {
                    outline: none;
                    min-height: 140px;
                    color: rgb(var(--text-primary));
                }
                .tiptap-editor-content .tiptap p {
                    margin-bottom: 0.75rem;
                }
                .tiptap-editor-content .tiptap h1 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                    color: rgb(var(--text-primary));
                }
                .tiptap-editor-content .tiptap h2 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                    color: rgb(var(--text-primary));
                }
                .tiptap-editor-content .tiptap ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin-bottom: 1rem;
                }
                .tiptap-editor-content .tiptap ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin-bottom: 1rem;
                }
                .tiptap-editor-content .tiptap blockquote {
                    border-left: 3px solid rgb(var(--accent));
                    padding-left: 1rem;
                    font-style: italic;
                    color: rgb(var(--text-secondary));
                    margin-bottom: 1rem;
                }
                .tiptap-editor-content .tiptap hr {
                    border: none;
                    border-top: 1px solid rgb(var(--border-color));
                    margin: 1.5rem 0;
                }
                .tiptap-editor-content .tiptap code {
                    background: rgb(var(--hover-bg));
                    padding: 0.1rem 0.3rem;
                    border-radius: 0.25rem;
                    font-size: 0.9em;
                }
                .tiptap-editor-content .tiptap img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                }
            `}</style>
        </div>
    );
}
