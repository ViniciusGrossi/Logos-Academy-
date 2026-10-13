import { afterEach, describe, expect, it } from "vitest";
import { clearLocalReviewDrafts } from "@/src/lib/review-draft-storage";
afterEach(() => sessionStorage.clear());
describe("review draft logout privacy", () => {
  it("removes every Academy review draft while preserving unrelated app data", () => {
    sessionStorage.setItem("academy-review:admin-a:submission-a", "feedback privado");
    sessionStorage.setItem("academy-review:admin-a:submission-b", "outro feedback");
    sessionStorage.setItem("academy-review:admin-b:submission-a", "outra sessão");
    sessionStorage.setItem("other-app:key", "preservado");
    clearLocalReviewDrafts(sessionStorage);
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem("other-app:key")).toBe("preservado");
  });
  it("supports an empty tab", () => {
    expect(() => clearLocalReviewDrafts(sessionStorage)).not.toThrow();
  });
});
