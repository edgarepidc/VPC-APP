"use client";

import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "tiptap-markdown";

type MinuteMarkdownEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
};

type MarkdownStorage = {
  markdown: {
    getMarkdown: () => string;
  };
};

function getMarkdownFromEditor(editor: NonNullable<ReturnType<typeof useEditor>>) {
  return (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown();
}

function ToolbarButton({
  label,
  onClick,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm ${
        active
          ? "bg-slate-800 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

export function MinuteMarkdownEditor({
  value,
  onChange,
  readOnly = false,
  className = "",
}: MinuteMarkdownEditorProps) {
  const skipUpdate = useRef(false);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          "minute-editor-content min-h-[420px] px-4 py-4 text-sm leading-relaxed text-slate-800 focus:outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (skipUpdate.current) return;
      onChange?.(getMarkdownFromEditor(currentEditor));
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const current = getMarkdownFromEditor(editor);
    if (value.trim() === current.trim()) return;
    skipUpdate.current = true;
    editor.commands.setContent(value);
    skipUpdate.current = false;
  }, [editor, value]);

  async function copyMarkdown() {
    const text = editor ? getMarkdownFromEditor(editor) : value;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("ok");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  function insertAgreementTable() {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2">
        {!readOnly && editor ? (
          <div className="flex flex-wrap gap-1.5">
            <ToolbarButton
              label="Título"
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarButton
              label="Sección"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
              label="Apartado"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            />
            <ToolbarButton
              label="Lista"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton label="Tabla" onClick={insertAgreementTable} />
          </div>
        ) : (
          <span className="text-xs text-slate-500 sm:text-sm">Vista de lectura</span>
        )}
        <button
          type="button"
          onClick={() => void copyMarkdown()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {copyState === "ok"
            ? "Copiado"
            : copyState === "error"
              ? "Error al copiar"
              : "Copiar markdown"}
        </button>
      </div>

      <div className="minute-wysiwyg-editor">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="min-h-[420px] animate-pulse bg-slate-50" aria-hidden />
        )}
      </div>

      <style jsx global>{`
        .minute-wysiwyg-editor .minute-editor-content h1 {
          margin: 0.5rem 0 1rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }
        .minute-wysiwyg-editor .minute-editor-content h2 {
          margin: 1.5rem 0 0.75rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #e0e7ff;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e1b4b;
        }
        .minute-wysiwyg-editor .minute-editor-content h3 {
          margin: 1rem 0 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #4c1d95;
        }
        .minute-wysiwyg-editor .minute-editor-content p {
          margin: 0 0 0.75rem;
          white-space: pre-wrap;
        }
        .minute-wysiwyg-editor .minute-editor-content ul,
        .minute-wysiwyg-editor .minute-editor-content ol {
          margin: 0 0 0.75rem;
          padding-left: 1.25rem;
        }
        .minute-wysiwyg-editor .minute-editor-content ul {
          list-style: disc;
        }
        .minute-wysiwyg-editor .minute-editor-content ol {
          list-style: decimal;
        }
        .minute-wysiwyg-editor .minute-editor-content li {
          margin: 0.25rem 0;
        }
        .minute-wysiwyg-editor .minute-editor-content hr {
          margin: 1.5rem 0;
          border: 0;
          border-top: 1px solid #e2e8f0;
        }
        .minute-wysiwyg-editor .minute-editor-content table {
          width: 100%;
          margin: 1rem 0;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .minute-wysiwyg-editor .minute-editor-content th {
          background: #ecfdf5;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          color: #064e3b;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1fae5;
        }
        .minute-wysiwyg-editor .minute-editor-content td {
          padding: 0.5rem 0.75rem;
          vertical-align: top;
          border: 1px solid #ecfdf5;
        }
        .minute-wysiwyg-editor .minute-editor-content .selectedCell {
          background: #eef2ff;
        }
        .minute-wysiwyg-editor .minute-editor-content:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
