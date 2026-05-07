import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 font-sans">
      <main className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          EMBUS Project Platform
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600">
          Base inicial para SaaS multitenant con gestion de proyectos, tareas y
          control de permisos por rol.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            href="/login"
          >
            Entrar al sistema
          </Link>
          <Link
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            href="/dashboard/projects"
          >
            Ver dashboard (demo)
          </Link>
        </div>
      </main>
    </div>
  );
}
