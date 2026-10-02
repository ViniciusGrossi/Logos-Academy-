import { z } from "zod";

import { isAcademySupabaseVerificationUrl } from "@/src/lib/public-site";
import type { InvitationLinkRepository } from "@/src/modules/invitation-links/repository";

const InvitationCodeSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/u);

export class InvitationLinkService {
  constructor(private readonly repository: Pick<InvitationLinkRepository, "resolve">) {}

  async resolve(input: unknown): Promise<string | null> {
    const parsed = InvitationCodeSchema.safeParse(input);
    if (!parsed.success) return null;
    const target = await this.repository.resolve(parsed.data);
    return target && isAcademySupabaseVerificationUrl(target) ? target : null;
  }
}
