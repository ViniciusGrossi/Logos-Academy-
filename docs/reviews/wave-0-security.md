---
title: "Wave 0 — revisão de segurança"
date: 2026-09-05
status: approved-for-fix
---

# Findings altos

- `src/lib/supabase/admin.ts:7` · alta · resolvido · Adapter server-only expõe somente `writeAuditEvent`, sem cliente privilegiado bruto.
- `src/modules/identity/audit.repository.ts:14` · alta · resolvido · RPC transacional server-only valida ator ativo no tenant; `anon` e `authenticated` não executam.
- `src/modules/identity/schema.ts:21` · alta · resolvido · Metadata usa allowlist técnica de chaves e valores seguros.

## Decisão aprovada

Vinicius aprovou a RPC de auditoria sem novo endpoint HTTP em 2026-09-05.
