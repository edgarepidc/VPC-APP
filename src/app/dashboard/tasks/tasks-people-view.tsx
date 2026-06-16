"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  TASK_KANBAN_COLUMN_THEME,
  TASK_STATUS_LABEL,
  normalizeTaskStatus,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";
import {
  TASK_LABEL_COLOR_THEME,
  type TaskLabelColorKey,
  type TaskLabelRecord,
} from "@/modules/tasks/labels";

import { assignTaskAction } from "./actions";
import { TaskEditDialog, type TaskCardDTO, type TaskMemberOption } from "./task-edit-dialog";
import { TaskLabelChips } from "./task-label-picker";
import { TaskChecklistProgress, TaskPriorityDot } from "./task-ui";

export const UNASSIGNED_COLUMN_ID = "__none__";

type ProjectOption = { id: string; name: string };

type PeopleColumn = {
  id: string;
  title: string;
  subtitle?: string;
  theme: {
    accent: string;
    columnBg: string;
    columnBorder: string;
    headerText: string;
    dropRing: string;
    cardAccent: string;
  };
};

const UNASSIGNED_THEME = {
  accent: "bg-slate-600",
  columnBg: "bg-slate-50",
  columnBorder: "border-slate-200",
  headerText: "text-slate-700",
  dropRing: "ring-slate-400",
  cardAccent: "border-l-slate-400",
};

const MEMBER_COLOR_KEYS: TaskLabelColorKey[] = [
  "violet",
  "sky",
  "emerald",
  "amber",
  "rose",
  "teal",
  "indigo",
  "fuchsia",
];

const MEMBER_CARD_ACCENTS = [
  "border-l-violet-500",
  "border-l-sky-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-rose-500",
  "border-l-teal-500",
  "border-l-indigo-500",
  "border-l-fuchsia-500",
] as const;

function memberTheme(index: number) {
  const key = MEMBER_COLOR_KEYS[index % MEMBER_COLOR_KEYS.length] ?? "sky";
  const palette = TASK_LABEL_COLOR_THEME[key];
  return {
    accent: palette.columnAccent,
    columnBg: palette.columnBg,
    columnBorder: palette.columnBorder,
    headerText: "text-slate-800",
    dropRing: "ring-sky-400",
    cardAccent: MEMBER_CARD_ACCENTS[index % MEMBER_CARD_ACCENTS.length] ?? "border-l-sky-500",
  };
}

function memberLabel(m: TaskMemberOption) {
  return m.name?.trim() || m.email.split("@")[0] || m.email;
}

function memberInitials(m: TaskMemberOption) {
  const label = memberLabel(m);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

type Props = {
  tasks: TaskCardDTO[];
  members: TaskMemberOption[];
  projects: ProjectOption[];
  labelCatalog: TaskLabelRecord[];
  canWrite: boolean;
};

export function TasksPeopleView({ tasks, members, projects, labelCatalog, canWrite }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<TaskCardDTO | null>(null);
  const suppressOpenUntilRef = useRef(0);

  const columns: PeopleColumn[] = useMemo(() => {
    const cols: PeopleColumn[] = [
      {
        id: UNASSIGNED_COLUMN_ID,
        title: "Sin asignar",
        subtitle: "Arrastra para asignar",
        theme: UNASSIGNED_THEME,
      },
    ];
    const sorted = [...members].sort((a, b) => memberLabel(a).localeCompare(memberLabel(b), "es"));
    sorted.forEach((m, index) => {
      cols.push({
        id: m.id,
        title: memberLabel(m),
        subtitle: m.email,
        theme: memberTheme(index),
      });
    });
    return cols;
  }, [members]);

  const byColumn = useMemo(() => {
    const m = new Map<string, TaskCardDTO[]>();
    for (const col of columns) m.set(col.id, []);
    for (const task of tasks) {
      const key = task.assigneeUserId ?? UNASSIGNED_COLUMN_ID;
      const bucket = m.get(key) ?? m.get(UNASSIGNED_COLUMN_ID)!;
      bucket.push(task);
    }
    return m;
  }, [tasks, columns]);

  function assignTo(columnId: string) {
    if (!dragId || !canWrite) return;
    const assigneeUserId = columnId === UNASSIGNED_COLUMN_ID ? "" : columnId;
    const fd = new FormData();
    fd.set("taskId", dragId);
    fd.set("assigneeUserId", assigneeUserId);
    startTransition(async () => {
      try {
        await assignTaskAction(fd);
        router.refresh();
      } catch {
        alert("No se pudo reasignar la tarea.");
      } finally {
        setDragId(null);
        setDragOverCol(null);
      }
    });
  }

  return (
    <>
      <p className="mb-3 text-sm text-slate-600">
        Columnas por persona. Arrastra tarjetas entre columnas para cambiar el responsable.
      </p>
      <div
        className={`flex min-h-[460px] gap-4 overflow-x-auto pb-2 ${isPending ? "opacity-60" : ""}`}
      >
        {columns.map((col) => {
          const theme = col.theme;
          const isDropTarget = dragOverCol === col.id;
          const items = byColumn.get(col.id) ?? [];
          const member = members.find((m) => m.id === col.id);

          return (
            <section
              key={col.id}
              className={`flex w-[min(100%,288px)] shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm transition ${theme.columnBg} ${theme.columnBorder} ${
                isDropTarget ? `ring-2 ${theme.dropRing}` : ""
              }`}
              onDragEnter={() => canWrite && setDragOverCol(col.id)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCol((c) => (c === col.id ? null : c));
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                assignTo(col.id);
              }}
            >
              <header className={`relative border-b px-3 py-2.5 ${theme.columnBorder} bg-white/70`}>
                <span className={`absolute inset-y-0 left-0 w-1 ${theme.accent}`} aria-hidden />
                <div className="flex items-center gap-2 pl-2">
                  {member ? (
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
                      {memberInitials(member)}
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <h3 className={`truncate text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>
                      {col.title}
                    </h3>
                    {col.subtitle ? (
                      <p className="truncate text-[10px] text-slate-500">{col.subtitle}</p>
                    ) : null}
                  </div>
                </div>
                <p className="pl-2 text-[11px] text-slate-500">
                  {items.length} tarjeta{items.length === 1 ? "" : "s"}
                </p>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {items.map((task) => {
                  const st = normalizeTaskStatus(task.status);
                  const statusTheme = TASK_KANBAN_COLUMN_THEME[st];
                  return (
                    <article
                      key={task.id}
                      draggable={canWrite}
                      onDragStart={(e) => {
                        if (!canWrite) return;
                        setDragId(task.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOverCol(null);
                      }}
                      onClick={() => {
                        if (Date.now() < suppressOpenUntilRef.current) return;
                        if (canWrite) setEditTask(task);
                      }}
                      className={`rounded-lg border border-slate-200 border-l-[3px] bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md ${statusTheme.cardAccent} ${
                        canWrite ? "cursor-pointer active:cursor-grabbing" : ""
                      } ${dragId === task.id ? "ring-2 ring-slate-400" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <TaskPriorityDot priority={task.priority} />
                        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
                          {task.title}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{task.projectName}</p>
                      {task.labels.length > 0 ? (
                        <div className="mt-2">
                          <TaskLabelChips labels={task.labels} max={2} size="xs" />
                        </div>
                      ) : null}
                      {task.checklist.length > 0 ? (
                        <div className="mt-2">
                          <TaskChecklistProgress items={task.checklist} />
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${statusTheme.columnBg} ${theme.headerText}`}
                        >
                          {TASK_STATUS_LABEL[st as TaskKanbanStatus]}
                        </span>
                        {task.dueDate ? (
                          <span className="text-[10px] text-slate-500">
                            {new Date(task.dueDate).toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                {items.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-slate-400">
                    {canWrite ? "Arrastra tareas aquí" : "Sin tareas"}
                  </p>
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
        labelCatalog={labelCatalog}
        onClose={() => {
          suppressOpenUntilRef.current = Date.now() + 400;
          setEditTask(null);
        }}
      />
    </>
  );
}
