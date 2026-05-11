import { getSupabasePublicEnv } from "@/utils/supabase/env";

import { LoginForms } from "./login-forms";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const creds = getSupabasePublicEnv();

  return (
    <LoginForms
      supabaseUrl={creds?.url ?? null}
      supabaseKey={creds?.key ?? null}
      initialError={params.error}
      initialMessage={params.message}
    />
  );
}
