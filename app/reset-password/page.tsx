import ResetPasswordClient from './reset-password-client';

type ResetPasswordPageProps = {
  searchParams?: {
    token?: string;
  };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  return <ResetPasswordClient initialToken={searchParams?.token || ''} />;
}
