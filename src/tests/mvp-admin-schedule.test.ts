import { describe, expect, it } from "vitest";
import { previewMeetingDates } from "@/components/admin/admin-schedule-preview";

describe("prévia do calendário administrativo", () => {
  it("gera16 encontros e associa a hora ao dia, não ao índice da aula", () => {
    const dates = previewMeetingDates({ startsOn: "2026-10-15", weekdays: [2, 4], startsAtLocal: ["18:00", "19:00"], durationMinutes: 120, timezone: "America/Sao_Paulo" });
    expect(dates).toHaveLength(16);
    expect(dates.slice(0, 3)).toEqual(["2026-10-15T19:00", "2026-10-20T18:00", "2026-10-22T19:00"]);
  });
  it("não inventa prévia para dias iguais, data ou fuso inválidos", () => {
    const schedule = { startsOn: "2026-10-15", weekdays: [2, 4] as const, startsAtLocal: ["18:00", "19:00"] as const, durationMinutes: 120, timezone: "America/Sao_Paulo" };
    expect(previewMeetingDates({ ...schedule, weekdays: [2, 2] })).toEqual([]);
    expect(previewMeetingDates({ ...schedule, startsOn: "" })).toEqual([]);
    expect(previewMeetingDates({ ...schedule, timezone: "invalido" })).toEqual([]);
  });
});
