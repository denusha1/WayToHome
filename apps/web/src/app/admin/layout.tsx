import { AuthBoundary } from '@/components/auth-boundary';
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthBoundary admin>{children}</AuthBoundary>;
}
