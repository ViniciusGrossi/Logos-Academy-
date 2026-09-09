import { AuditRepository } from "@/src/modules/identity/audit.repository";
import { AuditEventInputSchema, type AuditEventInput } from "@/src/modules/identity/schema";

export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async record(input: AuditEventInput): Promise<void> {
    await this.repository.record(AuditEventInputSchema.parse(input));
  }
}
