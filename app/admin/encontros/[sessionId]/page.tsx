import { AdminSession } from "@/components/admin/admin-session";
import { AppShell } from "@/components/prototype/app-shell";

export default async function AdminSessionPage({ params, searchParams }: { params: Promise<{ sessionId: string }>; searchParams: Promise<{ classId?: string }> }) {
  const [{ sessionId }, query] = await Promise.all([params, searchParams]);
  return <AppShell><AdminSession sessionId={sessionId} classId={query.classId ?? null} /></AppShell>;
}

