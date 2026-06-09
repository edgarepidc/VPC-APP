"use client";

import { useState, useTransition } from "react";

import { adminActionBtnSecondary } from "@/lib/ui-classes";

import { resetPasswordAction } from "../users/actions";

type Props = {
  userId: string;
  email: string;
  disabled?: boolean;
};

export function UserPasswordReset({ userId, email, disabled }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { mode: "temp"; password: string }
    | { mode: "link"; link: string }
    | { error: string }
    | null
  >(null);

  function run(mode: "temp" | "link") {
    setResult(null);
    startTransition(async () => {
      const res = await resetPasswordAction(userId, mode);
      if (!res.ok) {
        setResult({ error: res.error });
        return;
      }
      if (res.mode === "temp") {
        setResult({ mode: "temp", password: res.password });
      } else {
        setResult({ mode: "link", link: res.link });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => run("temp")}
          className={adminActionBtnSecondary}
        >
          {pending ? "…" : "Clave temp."}
        </button>
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => run("link")}
          className={adminActionBtnSecondary}
        >
          {pending ? "…" : "Enlace"}
        </button>
      </div>
      {result && "error" in result ? (
        <p className="text-xs text-rose-700">{result.error}</p>
      ) : null}
      {result && "password" in result ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          <p className="font-medium">Contraseña temporal para {email}</p>
          <code className="mt-1 block break-all font-mono text-[11px]">{result.password}</code>
          <p className="mt-1 text-[10px] text-amber-800">Compártela de forma segura; pide cambiarla al primer acceso.</p>
        </div>
      ) : null}
      {result && "link" in result ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs">
          <p className="font-medium text-slate-800">Enlace de recuperación</p>
          <a
            href={result.link}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-[11px] text-slate-700 underline"
          >
            Abrir enlace
          </a>
        </div>
      ) : null}
    </div>
  );
}
