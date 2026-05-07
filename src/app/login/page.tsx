import Link from "next/link";
import { redirect } from "next/navigation";

import { createDemoSession } from "@/lib/auth/session";

export default function LoginPage() {
  async function signInAction() {
    "use server";
    await createDemoSession();
    redirect("/select-tenant");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Ingreso</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Este login demo crea una sesion local para probar multitenancy y RBAC.
        </p>

        <form action={signInAction} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Entrar como usuario demo
          </button>
        </form>

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
