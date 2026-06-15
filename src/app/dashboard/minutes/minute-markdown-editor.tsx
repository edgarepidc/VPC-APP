"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { uiInput } from "@/lib/ui-classes";

type SlashCommand = {
  id: string;
  label: string;
  hint: string;
  insert: string;
  keywords: string[];
};

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "h1",
    label: "Título principal",
    hint: "# Encabezado grande",
    insert: "# ",
    keywords: ["titulo", "h1", "encabezado"],
  },
  {
    id: "h2",
    label: "Subtítulo",
    hint: "## Sección",
    insert: "## ",
    keywords: ["subtitulo", "h2", "seccion"],
  },
  {
    id: "h3",
    label: "Apartado",
    hint: "### Punto",
    insert: "### ",
    keywords: ["apartado", "h3", "punto"],
  },
  {
    id: "table",
    label: "Tabla de acuerdos",
    hint: "Acción · Responsable · Fecha",
    insert: "| Acción | Responsable | Fecha |\n| --- | --- | --- |\n|  |  |  |\n",
    keywords: ["tabla", "table", "acuerdos"],
  },
  {
    id: "bullet",
    label: "Lista con viñetas",
    hint: "- Elemento",
    insert: "- \n",
    keywords: ["lista", "viñetas", "bullet"],
  },
  {
    id: "numbered",
    label: "Lista numerada",
    hint: "1. Elemento",
    insert: "1. \n",
    keywords: ["numerada", "orden"],
  },
  {
    id: "hr",
    label: "Separador",
    hint: "---",
    insert: "\n---\n",
    keywords: ["separador", "linea", "hr"],
  },
];

type MinuteMarkdownEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
};

function getSlashContext(value: string, cursor: number) {
  const before = value.slice(0, cursor);
  const match = before.match(/(?:^|\n)([^\n]*?)\/([^/\n]*)$/);
  if (!match) return null;
  const query = match[2] ?? "";
  const slashStart = before.lastIndexOf("/");
  return { query, slashStart, replaceEnd: cursor };
}

function filterCommands(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords.some((kw) => kw.includes(q) || q.includes(kw)),
  );
}

export function MinuteMarkdownEditor({
  value,
  onChange,
  readOnly = false,
  className = "",
}: MinuteMarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashStart, setSlashStart] = useState(0);
  const [slashEnd, setSlashEnd] = useState(0);
  const [activeCommand, setActiveCommand] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");

  const filteredCommands = useMemo(() => filterCommands(slashQuery), [slashQuery]);

  const applySlashCommand = useCallback(
    (command: SlashCommand) => {
      const next =
        value.slice(0, slashStart) + command.insert + value.slice(slashEnd);
      onChange?.(next);
      setSlashOpen(false);
      setSlashQuery("");
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const pos = slashStart + command.insert.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [onChange, slashEnd, slashStart, value],
  );

  function syncSlashMenu(nextValue: string, cursor: number) {
    const ctx = getSlashContext(nextValue, cursor);
    if (!ctx) {
      setSlashOpen(false);
      return;
    }
    setSlashOpen(true);
    setSlashQuery(ctx.query);
    setSlashStart(ctx.slashStart);
    setSlashEnd(ctx.replaceEnd);
    setActiveCommand(0);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange?.(next);
    syncSlashMenu(next, e.target.selectionStart);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!slashOpen || filteredCommands.length === 0) {
      if (e.key === "/" && !readOnly) {
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (!el) return;
          syncSlashMenu(el.value, el.selectionStart);
        });
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveCommand((i) => (i + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveCommand((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applySlashCommand(filteredCommands[activeCommand]!);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSlashOpen(false);
    }
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("ok");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/50 px-3 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              mode === "edit"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-white hover:text-indigo-800"
            }`}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              mode === "preview"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-white hover:text-indigo-800"
            }`}
          >
            Vista previa
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly ? (
            <span className="hidden text-xs text-slate-500 sm:inline">
              Escribe <kbd className="rounded border px-1">/</kbd> para insertar bloques
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void copyMarkdown()}
            className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-50"
          >
            {copyState === "ok"
              ? "Copiado"
              : copyState === "error"
                ? "Error al copiar"
                : "Copiar markdown"}
          </button>
        </div>
      </div>

      {mode === "edit" ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => syncSlashMenu(value, e.currentTarget.selectionStart)}
            readOnly={readOnly}
            rows={22}
            spellCheck
            className={`${uiInput} min-h-[420px] w-full resize-y rounded-none border-0 font-mono text-sm leading-relaxed focus:ring-0 ${
              readOnly ? "bg-slate-50 text-slate-700" : ""
            }`}
            aria-label="Contenido de la minuta en Markdown"
          />
          {slashOpen && !readOnly && filteredCommands.length > 0 ? (
            <div
              className="absolute bottom-4 left-4 z-10 max-h-56 w-[min(100%,20rem)] overflow-y-auto rounded-xl border border-indigo-200 bg-white py-1 shadow-lg"
              role="listbox"
            >
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-indigo-700">
                Insertar bloque
              </p>
              {filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeCommand}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySlashCommand(cmd);
                  }}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm transition ${
                    index === activeCommand
                      ? "bg-indigo-50 text-indigo-950"
                      : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-medium">{cmd.label}</span>
                  <span className="text-xs text-slate-500">{cmd.hint}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="minute-markdown-preview px-4 py-4 text-sm leading-relaxed text-slate-800">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="mb-4 mt-2 text-2xl font-bold text-slate-900">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-3 mt-6 border-b border-indigo-100 pb-1 text-lg font-semibold text-indigo-950">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-4 text-base font-semibold text-violet-900">{children}</h3>
              ),
              p: ({ children }) => <p className="mb-3 whitespace-pre-wrap">{children}</p>,
              ul: ({ children }) => (
                <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
              ),
              li: ({ children }) => <li className="pl-1">{children}</li>,
              hr: () => <hr className="my-6 border-slate-200" />,
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto rounded-lg border border-emerald-100">
                  <table className="min-w-full text-sm">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-emerald-50 text-left text-xs font-semibold uppercase tracking-wide text-emerald-900">
                  {children}
                </thead>
              ),
              th: ({ children }) => <th className="px-3 py-2">{children}</th>,
              td: ({ children }) => (
                <td className="border-t border-emerald-50 px-3 py-2 align-top">{children}</td>
              ),
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
            }}
          >
            {value || "_Sin contenido_"}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
