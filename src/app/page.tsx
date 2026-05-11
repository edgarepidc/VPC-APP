import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Root URL: send users to login. Avoids Supabase `getUser()` here without a working
 * Edge middleware refresh (Next/Vercel + @supabase/ssr can throw otherwise).
 * Logged-in users can use /select-tenant or /dashboard from the app shell after login.
 */
export default function HomePage() {
  redirect("/login");
}
