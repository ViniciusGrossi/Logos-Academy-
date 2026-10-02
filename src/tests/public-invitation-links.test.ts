import { describe, expect, it } from "vitest";

import {
  academyActivationUrl,
  academyInvitationUrl,
  isAcademySupabaseVerificationUrl,
} from "@/src/lib/public-site";
import { InvitationLinkService } from "@/src/modules/invitation-links/service";

const code = "AbCdEf0123_-xyzXYZ89ab";
const providerLink =
  "https://nqubjiosnlaatxxamiut.supabase.co/auth/v1/verify?token=test&type=invite&redirect_to=https://logos-academy-three.vercel.app/ativar";

describe("links públicos de convite", () => {
  it("mantém ativação e convite no domínio público, sem fallback local", () => {
    expect(academyActivationUrl()).toBe("https://logos-academy-three.vercel.app/ativar");
    expect(academyInvitationUrl(code)).toBe(`https://logos-academy-three.vercel.app/c/${code}`);
    expect(academyActivationUrl()).not.toContain("localhost");
  });

  it("aceita somente links do Supabase que retornam para /ativar em producao", () => {
    expect(isAcademySupabaseVerificationUrl(providerLink)).toBe(true);
    expect(isAcademySupabaseVerificationUrl(providerLink.replace(academyActivationUrl(), "http://localhost:3000"))).toBe(false);
  });

  it("nao resolve codigo invalido nem redirecionamento adulterado", async () => {
    const valid = new InvitationLinkService({ resolve: async () => providerLink });
    const altered = new InvitationLinkService({ resolve: async () => providerLink.replace(academyActivationUrl(), "https://example.com") });

    await expect(valid.resolve(code)).resolves.toBe(providerLink);
    await expect(valid.resolve("curto")).resolves.toBeNull();
    await expect(altered.resolve(code)).resolves.toBeNull();
  });
});
