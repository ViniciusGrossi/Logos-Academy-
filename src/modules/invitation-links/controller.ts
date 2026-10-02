import { NextResponse } from "next/server";

import { academyActivationUrl } from "@/src/lib/public-site";
import { InvitationLinkRepository } from "@/src/modules/invitation-links/repository";
import { InvitationLinkService } from "@/src/modules/invitation-links/service";

export async function invitationLinkController(code: string): Promise<NextResponse> {
  const target = await new InvitationLinkService(new InvitationLinkRepository()).resolve(code);
  const destination = target ?? `${academyActivationUrl()}?error=invalid_link`;
  const response = NextResponse.redirect(destination, 307);
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}
