import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Como superadmin puedes crear organizaciones (tenants) vacias y luego
        invitar usuarios desde cada tenant en Miembros.
      </p>
      <Link
        className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        href="/admin/tenants"
      >
        Gestionar tenants
      </Link>
    </div>
  );
}
