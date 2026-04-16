import ResetPasswordClient from './reset-password-client';

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;

  return <ResetPasswordClient initialToken={resolvedSearchParams?.token || ''} />;
}
