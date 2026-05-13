import Link from "next/link";

import { getSupabasePublicEnv } from "@/utils/supabase/env";

import { RestablecerForm } from "./restablecer-form";

export const dynamic = "force-dynamic";

export default function RestablecerPage() {
  const creds = getSupabasePublicEnv();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Nueva contrasena
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Escribe y confirma tu nueva contrasena. Luego podras iniciar sesion de
          nuevo.
        </p>

        <div className="mt-6">
          <RestablecerForm
            supabaseUrl={creds?.url ?? null}
            supabaseKey={creds?.key ?? null}
          />
        </div>

        <Link
          className="mt-6 inline-block text-sm text-zinc-600 underline"
          href="/login"
        >
          Volver al ingreso
        </Link>
      </div>
    </main>
  );
}
