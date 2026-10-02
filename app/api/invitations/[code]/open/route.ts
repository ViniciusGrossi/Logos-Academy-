import { invitationLinkController } from "@/src/modules/invitation-links/controller";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return invitationLinkController(code);
}
