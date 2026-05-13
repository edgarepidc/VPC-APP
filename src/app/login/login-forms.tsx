"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useMemo, useState } from "react";

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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Ingreso</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Acceso por invitación: inicia sesión con la cuenta que te dio tu
          administrador. No hay registro público en esta pantalla.
        </p>

        {!envOk && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
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
            <Link
              className="font-medium underline"
              href="/api/health/env"
              target="_blank"
              rel="noopener noreferrer"
            >
              /api/health/env
            </Link>
            .
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
            {message}
          </p>
        )}

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
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="signin_password"
            type="password"
            required
            disabled={pending}
            autoComplete="current-password"
            placeholder="Contrasena"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending || !envOk}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {pending ? "Procesando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-3 text-center">
          <Link
            className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
            href="/login/olvido"
          >
            Olvidaste tu contrasena?
          </Link>
        </p>

        <Link
          className="mt-4 inline-block text-sm text-zinc-600 underline"
          href="/"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
