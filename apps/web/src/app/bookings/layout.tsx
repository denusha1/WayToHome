import { AuthBoundary } from '@/components/auth-boundary';
export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthBoundary>{children}</AuthBoundary>;
}
