import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Ruta legada: redirige a Usuarios conservando parámetros. */
export default async function AdminInviteRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") sp.set(key, value);
    else if (Array.isArray(value) && value[0]) sp.set(key, value[0]);
  }
  const q = sp.toString();
  redirect(q ? `/admin/users?${q}` : "/admin/users");
}
