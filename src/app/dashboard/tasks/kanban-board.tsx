"use client";

import { useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import {
  TASK_KANBAN_COLUMN_THEME,
  TASK_KANBAN_STATUSES,
  TASK_STATUS_LABEL,
  normalizeTaskStatus,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";

import { moveTaskAction, quickCreateTaskAction } from "./actions";
import { TaskEditDialog, type TaskCardDTO, type TaskMemberOption } from "./task-edit-dialog";

type ProjectOption = { id: string; name: string };

type Props = {
  tasks: TaskCardDTO[];
  projects: ProjectOption[];
  members: TaskMemberOption[];
  canWrite: boolean;
  defaultProjectId: string;
};

function assigneeLabel(task: TaskCardDTO) {
  return task.assigneeName?.trim() || task.assigneeEmail?.split("@")[0] || task.assigneeEmail;
}

function assigneeInitials(task: TaskCardDTO) {
  const label = assigneeLabel(task);
  if (!label) return null;
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

function dueChip(task: TaskCardDTO, column: TaskKanbanStatus) {
  if (!task.dueDate || column === "done") return null;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  const label = due.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  if (diffDays < 0) {
    return { label: `Vencida · ${label}`, className: "bg-rose-50 text-rose-700 ring-rose-200" };
  }
  if (diffDays <= 3) {
    return { label, className: "bg-amber-50 text-amber-800 ring-amber-200" };
  }
  return { label, className: "bg-slate-50 text-slate-600 ring-slate-200" };
}

function KanbanQuickAdd({
  column,
  projectId,
  theme,
}: {
  column: TaskKanbanStatus;
  projectId: string;
  theme: (typeof TASK_KANBAN_COLUMN_THEME)[TaskKanbanStatus];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("title", trimmed);
    fd.set("status", column);
    startTransition(async () => {
      try {
        await quickCreateTaskAction(fd);
        setTitle("");
        setOpen(false);
        router.refresh();
      } catch {
        alert("No se pudo crear la tarea.");
      }
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      setOpen(false);
      setTitle("");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-md border border-dashed px-2 py-2 text-left text-[11px] font-medium transition hover:bg-white ${theme.columnBorder} ${theme.headerText} opacity-80 hover:opacity-100`}
      >
        + Añadir tarea
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={title}
      disabled={pending}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => {
        if (!title.trim()) setOpen(false);
      }}
      placeholder="Título y Enter…"
      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
    />
  );
}

export function KanbanBoard({ tasks, projects, members, canWrite, defaultProjectId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskKanbanStatus | null>(null);
  const [editTask, setEditTask] = useState<TaskCardDTO | null>(null);
  const suppressOpenUntilRef = useRef(0);

  const byColumn = useMemo(() => {
    const m: Record<TaskKanbanStatus, TaskCardDTO[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const t of tasks) {
      const st = normalizeTaskStatus(t.status);
      m[st].push(t);
    }
    return m;
  }, [tasks]);

  function moveTo(column: TaskKanbanStatus) {
    if (!dragId || !canWrite) return;
    const fd = new FormData();
    fd.set("taskId", dragId);
    fd.set("status", column);
    startTransition(async () => {
      try {
        await moveTaskAction(fd);
        router.refresh();
      } catch {
        alert("No se pudo mover la tarea.");
      } finally {
        setDragId(null);
        setDragOverCol(null);
      }
    });
  }

  return (
    <>
      <div
        className={`flex min-h-[460px] gap-4 overflow-x-auto pb-2 ${isPending ? "opacity-60" : ""}`}
      >
        {TASK_KANBAN_STATUSES.map((col) => {
          const theme = TASK_KANBAN_COLUMN_THEME[col];
          const isDropTarget = dragOverCol === col;

          return (
            <section
              key={col}
              className={`flex w-[min(100%,288px)] shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm transition ${theme.columnBg} ${theme.columnBorder} ${
                isDropTarget ? `ring-2 ${theme.dropRing}` : ""
              }`}
              onDragEnter={() => canWrite && setDragOverCol(col)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCol((c) => (c === col ? null : c));
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                moveTo(col);
              }}
            >
              <header className={`relative border-b px-3 py-2.5 ${theme.columnBorder} bg-white/70`}>
                <span
                  className={`absolute inset-y-0 left-0 w-1 ${theme.accent}`}
                  aria-hidden
                />
                <h3
                  className={`pl-2 text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}
                >
                  {TASK_STATUS_LABEL[col]}
                </h3>
                <p className="pl-2 text-[11px] text-slate-500">
                  {byColumn[col].length} tarjeta{byColumn[col].length === 1 ? "" : "s"}
                </p>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {byColumn[col].map((task) => {
                  const due = dueChip(task, col);
                  const initials = assigneeInitials(task);

                  return (
                    <article
                      key={task.id}
                      draggable={canWrite}
                      onDragStart={(e) => {
                        if (!canWrite) return;
                        setDragId(task.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/task-id", task.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOverCol(null);
                      }}
                      onClick={() => {
                        if (Date.now() < suppressOpenUntilRef.current) return;
                        if (canWrite) setEditTask(task);
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && canWrite) {
                          e.preventDefault();
                          setEditTask(task);
                        }
                      }}
                      role={canWrite ? "button" : undefined}
                      tabIndex={canWrite ? 0 : undefined}
                      className={`group rounded-lg border border-slate-200 border-l-[3px] bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md ${theme.cardAccent} ${
                        canWrite ? "cursor-pointer active:cursor-grabbing" : ""
                      } ${dragId === task.id ? "ring-2 ring-slate-400" : ""} ${
                        col === "done" ? "opacity-90" : ""
                      }`}
                    >
                      <p
                        className={`text-sm font-medium leading-snug text-slate-900 ${
                          col === "done" ? "line-through decoration-slate-400" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="mt-1.5 truncate text-[11px] text-slate-500">{task.projectName}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {due ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${due.className}`}
                          >
                            {due.label}
                          </span>
                        ) : null}
                        {initials ? (
                          <span
                            className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200"
                            title={assigneeLabel(task) ?? undefined}
                          >
                            {initials}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                {byColumn[col].length === 0 && canWrite ? (
                  <p className="py-3 text-center text-[11px] text-slate-400">Arrastra tarjetas aquí</p>
                ) : null}
                {byColumn[col].length === 0 && !canWrite ? (
                  <p className="py-6 text-center text-[12px] text-slate-400">Sin tareas en esta columna</p>
                ) : null}
                {canWrite && defaultProjectId ? (
                  <KanbanQuickAdd column={col} projectId={defaultProjectId} theme={theme} />
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
      <TaskEditDialog
        task={editTask}
        projects={projects}
        members={members}
        onClose={() => {
          suppressOpenUntilRef.current = Date.now() + 400;
          setEditTask(null);
        }}
      />
    </>
  );
}
