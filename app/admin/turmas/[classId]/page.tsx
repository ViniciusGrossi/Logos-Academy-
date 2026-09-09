import { AdminClassDetail } from "@/components/admin/admin-classes";
import { AppShell } from "@/components/prototype/app-shell";

export default async function AdminClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return <AppShell><AdminClassDetail classId={classId} /></AppShell>;
}

