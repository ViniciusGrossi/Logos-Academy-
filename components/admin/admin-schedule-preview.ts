import type { ScheduleInput } from "@/specs/api.contracts";

export const initialAdminSchedule: ScheduleInput = { startsOn: "", weekdays: [2, 4], startsAtLocal: ["18:00", "18:00"], durationMinutes: 120, timezone: "America/Sao_Paulo" };

/** Datas civis iguais às geradas por private.schedule_sessions, não pelo fuso do browser. */
export function previewMeetingDates(schedule: ScheduleInput): readonly string[] {
  if (schedule.weekdays[0] === schedule.weekdays[1] || schedule.weekdays.some((day) => day < 0 || day > 6)) return [];
  const cursor = new Date(`${schedule.startsOn}T00:00:00Z`);
  if (!Number.isFinite(cursor.getTime()) || cursor.toISOString().slice(0, 10) !== schedule.startsOn) return [];
  if (schedule.startsAtLocal.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return [];
  try { new Intl.DateTimeFormat("pt-BR", { timeZone: schedule.timezone }).format(cursor); } catch { return []; }
  const dates: string[] = [];
  while (dates.length < 16) {
    const index = schedule.weekdays.indexOf(cursor.getUTCDay());
    if (index >= 0) dates.push(`${cursor.toISOString().slice(0, 10)}T${schedule.startsAtLocal[index]}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
