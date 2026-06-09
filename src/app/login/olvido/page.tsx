import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import {
  uiAlertError,
  uiAlertSuccess,
  uiButtonPrimary,
  uiInput,
  uiLink,
} from "@/lib/ui-classes";
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
    <AuthShell
      title="Olvidaste tu contrasena"
      description="Te enviaremos un enlace para elegir una contrasena nueva. Revisa tambien spam o promociones."
    >
      {params.error && <p className={`mt-4 ${uiAlertError}`}>{params.error}</p>}
      {params.message && <p className={`mt-4 ${uiAlertSuccess}`}>{params.message}</p>}

      <form action={requestResetAction} className="mt-6 space-y-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="email@empresa.com"
          className={uiInput}
        />
        <button type="submit" className={uiButtonPrimary}>
          Enviar enlace
        </button>
      </form>

      <Link className={`mt-4 inline-block ${uiLink}`} href="/login">
        Volver al ingreso
      </Link>
    </AuthShell>
  );
}
