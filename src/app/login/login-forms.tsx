"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AuthShell } from "@/components/auth-shell";
import {
  uiAlertError,
  uiAlertSuccess,
  uiAlertWarning,
  uiButtonPrimary,
  uiInput,
  uiLink,
} from "@/lib/ui-classes";
import { supabaseAuthCookieOptions } from "@/utils/supabase/cookie-options";

type LoginFormsProps = {
  supabaseUrl: string | null;
  supabaseKey: string | null;
  initialError?: string;
  initialMessage?: string;
};

export function LoginForms({
  supabaseUrl,
  supabaseKey,
  initialError,
  initialMessage,
}: LoginFormsProps) {
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [pending, setPending] = useState(false);

  const envOk = !!(supabaseUrl && supabaseKey);
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createBrowserClient(supabaseUrl, supabaseKey, {
      cookieOptions: supabaseAuthCookieOptions(),
    });
  }, [supabaseUrl, supabaseKey]);

  async function handleSignIn(formData: FormData) {
    setError("");
    setMessage("");
    if (!supabase) return;
    setPending(true);
    try {
      const email = String(formData.get("signin_email") ?? "").trim();
      const password = String(formData.get("signin_password") ?? "");
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        return;
      }
      await new Promise((r) => setTimeout(r, 0));
      const dest = await fetch("/api/auth/post-login-redirect", {
        credentials: "include",
        cache: "no-store",
      });
      if (!dest.ok) {
        window.location.assign("/login");
        return;
      }
      const data = (await dest.json()) as { path?: string };
      window.location.assign(data.path ?? "/select-tenant");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesion.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Ingreso"
      description="Acceso por invitación: inicia sesión con la cuenta que te dio tu administrador. No hay registro público en esta pantalla."
    >
      {!envOk && (
        <p className={`mt-4 ${uiAlertWarning}`}>
          Faltan credenciales de Supabase en Vercel (Production o todos los
          entornos). Agrega la URL HTTPS del proyecto (
          <code className="rounded bg-amber-100 px-1">*.supabase.co</code>) y
          la clave anon o publishable. No uses{" "}
          <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> como
          URL. Nombres admitidos:{" "}
          <code className="rounded bg-amber-100 px-1">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          + publishable/anon, o{" "}
          <code className="rounded bg-amber-100 px-1">SUPABASE_URL</code> +{" "}
          <code className="rounded bg-amber-100 px-1">SUPABASE_ANON_KEY</code>.
          Tras guardar, redeploy. Para ver qué ve el servidor:{" "}
          <Link className="font-medium underline" href="/api/health/env" target="_blank" rel="noopener noreferrer">
            /api/health/env
          </Link>
          .
        </p>
      )}

      {error && <p className={`mt-4 ${uiAlertError}`}>{error}</p>}
      {message && <p className={`mt-4 ${uiAlertSuccess}`}>{message}</p>}

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSignIn(new FormData(e.currentTarget));
        }}
      >
        <input
          name="signin_email"
          type="email"
          required
          disabled={pending}
          autoComplete="email"
          placeholder="email@empresa.com"
          className={uiInput}
        />
        <input
          name="signin_password"
          type="password"
          required
          disabled={pending}
          autoComplete="current-password"
          placeholder="Contrasena"
          className={uiInput}
        />
        <button type="submit" disabled={pending || !envOk} className={uiButtonPrimary}>
          {pending ? "Procesando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center">
        <Link className={uiLink} href="/login/olvido">
          Olvidaste tu contrasena?
        </Link>
      </p>

      <Link className={`mt-4 inline-block ${uiLink}`} href="/">
        Volver al inicio
      </Link>
    </AuthShell>
  );
}
