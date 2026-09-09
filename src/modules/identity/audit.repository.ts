import { writeAuditEvent } from "@/src/lib/supabase/admin";
import type { AuditEventInput } from "@/src/modules/identity/schema";

export class AuditRepository {
  async record(event: AuditEventInput): Promise<void> {
    await writeAuditEvent(event);
  }
}
