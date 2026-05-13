import Link from "next/link";
import { redirect } from "next/navigation";

import { getAppUrl } from "@/lib/env";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function OlvidoContrasenaPage({ searchParams }: PageProps) {
  const params = await searchParams;

  async function requestResetAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!email) {
      redirect("/login/olvido?error=Ingresa+un+correo+valido.");
    }

    const supabase = await createClient();
    const app = getAppUrl();
    const redirectTo = `${app.value}/auth/callback?next=${encodeURIComponent("/login/restablecer")}`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      redirect(`/login/olvido?error=${encodeURIComponent(error.message)}`);
    }

    redirect(
      `/login/olvido?message=${encodeURIComponent(
        "Si existe una cuenta con ese correo, recibiras un enlace para restablecer la contrasena.",
      )}`,
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Olvidaste tu contrasena
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Te enviaremos un enlace para elegir una contrasena nueva. Revisa tambien
          spam o promociones.
        </p>

        {params.error && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {params.error}
          </p>
        )}
        {params.message && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
            {params.message}
          </p>
        )}

        <form action={requestResetAction} className="mt-6 space-y-3">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="email@empresa.com"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Enviar enlace
          </button>
        </form>

        <Link
          className="mt-4 inline-block text-sm text-zinc-600 underline"
          href="/login"
        >
          Volver al ingreso
        </Link>
      </div>
    </main>
  );
}
