import { AdminSession } from "@/components/admin/admin-session";
import { AppShell } from "@/components/prototype/app-shell";

export default async function AdminSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <AppShell><AdminSession sessionId={sessionId} /></AppShell>;
}

