import { AdminReviewWorkspace } from "@/components/admin/admin-review-workspace";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminReviewWorkspacePage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  return <AppShell><AdminReviewWorkspace submissionId={submissionId} /></AppShell>;
}
