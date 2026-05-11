import { LoginForms } from "./login-forms";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginForms
      initialError={params.error}
      initialMessage={params.message}
    />
  );
}
