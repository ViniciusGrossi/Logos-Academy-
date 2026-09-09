import { AdminStudentDetail } from "@/components/admin/admin-students";
import { AppShell } from "@/components/prototype/app-shell";

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <AppShell><AdminStudentDetail studentId={studentId} /></AppShell>;
}

