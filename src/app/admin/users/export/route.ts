import { getSessionUser } from "@/lib/auth/session";
import { buildUsersCsv } from "@/modules/platform-users/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) {
    return new Response("No autorizado", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const tenantId = searchParams.get("tenantId")?.trim() || undefined;

  const csv = await buildUsersCsv({ q, tenantId });
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="usuarios-vpc-${stamp}.csv"`,
    },
  });
}
