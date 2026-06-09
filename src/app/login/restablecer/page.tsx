import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { uiLink } from "@/lib/ui-classes";
import { getSupabasePublicEnv } from "@/utils/supabase/env";

import { RestablecerForm } from "./restablecer-form";

export const dynamic = "force-dynamic";

export default function RestablecerPage() {
  const creds = getSupabasePublicEnv();

  return (
    <AuthShell
      title="Nueva contrasena"
      description="Escribe y confirma tu nueva contrasena. Luego podras iniciar sesion de nuevo."
    >
      <div className="mt-6">
        <RestablecerForm
          supabaseUrl={creds?.url ?? null}
          supabaseKey={creds?.key ?? null}
        />
      </div>

      <Link className={`mt-6 inline-block ${uiLink}`} href="/login">
        Volver al ingreso
      </Link>
    </AuthShell>
  );
}
