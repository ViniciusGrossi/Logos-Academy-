import { notFound } from "next/navigation";

import { InvitationGate } from "@/components/auth/invitation-gate";
import { isAcademyInvitationPath } from "@/src/lib/public-site";

export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isAcademyInvitationPath(`/c/${code}`)) notFound();
  return <InvitationGate code={code} />;
}
