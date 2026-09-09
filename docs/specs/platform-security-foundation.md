---
title: "platform-security-foundation — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-backend"
status: approved
wave: 0
tags: [spec, feature, sdd, security]
---

# Spec: platform-security-foundation

## Objetivo
Garantir que toda feature opere com tenant único, propriedade individual, autenticação, RLS, auditoria e respostas consistentes desde a primeira migration.

## Fora de Escopo
- Multi-organização, OAuth GitHub, interface de responsável/professor, IA, filas e realtime.
- Procedimento jurídico final de retenção e eliminação; permanece gate de deploy.

## Requisitos Funcionais
1. Resolver usuário autenticado, papel e tenant sem expor service role ao cliente.
2. Aluno acessa somente seu perfil, matrículas, arquivos e evidências; admin opera apenas o tenant Academy.
3. Toda tabela possui timestamps, `tenant_id`, soft delete quando aplicável, constraints e índices de RLS/FK.
4. PII mínima fica cifrada em repouso e nunca aparece em logs; eventos críticos são auditáveis.
5. Listagens sem limite natural usam cursor opaco e envelope de erro comum.

## API Contract
> Copiado de `specs/api.contracts.ts`; é o contrato base de todos os endpoints.
```typescript
export type Role = "admin" | "student";

export interface ApiError {
  code:
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "CONFLICT"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";
  message: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
  requestId: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface PageQuery {
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  items: readonly T[];
  nextCursor: string | null;
}
```

## Critérios de Aceite (= test cases do worker)
- [ ] Requisição sem sessão retorna `UNAUTHENTICATED` sem dado de domínio.
- [ ] Aluno A não lê nem altera linha/arquivo do aluno B, mesmo com UUID válido.
- [ ] Usuário de outro tenant não acessa dados Academy e associações cross-tenant falham no banco.
- [ ] Service role, PII e conteúdo pedagógico não aparecem no bundle nem em logs.
- [ ] Cursor inválido retorna `VALIDATION_ERROR`; paginação não repete nem perde registros.
- [ ] Operação crítica registra ator, tenant, ação, alvo, horário e `requestId` sem PII.
- [ ] Aluno autenticado não chama nenhuma rota administrativa.
- [ ] Admin do tenant A não lê linhas do tenant B, mesmo conhecendo seus UUIDs.
- [ ] PII aparece cifrada na leitura SQL bruta e decifrada somente no DTO autorizado.
- [ ] Service role não aparece no bundle, source map ou variáveis públicas do navegador.

## Restrições Técnicas
- **Tabelas:** todas; fundação em `tenants`, `users`, `tenant_memberships`, `audit_events`, `idempotency_keys`.
- **Endpoints:** contrato transversal aos 39 endpoints; nenhum endpoint novo.
- **Libs novas:** cliente Supabase e Zod já definidos na arquitetura; pgcrypto no PostgreSQL.
- **Background jobs:** não.

## Bootstrap técnico aprovado

Para tornar esta fundação testável sem alterar contratos de API, esta feature também entrega W0.1 e W0.10:

- instalar versões fixadas de `@supabase/supabase-js`, `@supabase/ssr`, Vitest e jsdom, com lockfile atualizado;
- criar clientes Supabase browser, server e admin server-only, além de `.env.example` sem valores reais;
- configurar `npm test` e fixtures multiusuário sem dados pessoais;
- criar guard, schemas e utilitários transversais. Eles serão exercidos pelo primeiro controller já previsto em contrato; nenhum endpoint será inventado nesta feature.
- registrar eventos críticos por RPC `logos_academy.write_audit_event`, sem endpoint HTTP. A função valida ator e tenant; o adapter server-only expõe apenas essa chamada e nunca um cliente privilegiado bruto.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| Supabase Auth/Postgres/Storage | plano do projeto | limites do provedor | dentro da infraestrutura contratada | ambiente local Supabase |

## Segurança
- **Auth:** JWT obrigatório; service role isolada em adapter server-only.
- **RLS:** deny by default; admin por membership do tenant e aluno por `student_profile_id`/`enrollment_id`.
- **Criptografia:** e-mail, nascimento e contatos do responsável com pgcrypto quando persistidos em tabela de domínio.
- **LGPD:** minimização, finalidade pedagógica/operacional, demo fictícia e logs sem dados pessoais.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| dba | migrations, constraints, RLS e pgTAP | agents/dba.md |
| security-auditor | OWASP, RLS e LGPD | agents/security-auditor.md |
| adversarial-tester | tentativas cross-user/cross-tenant | agents/adversarial-tester.md |

## Validação
- **GWT-01 — quebra capturada:** remover auth de uma rota. Dado request sem JWT, quando chama endpoint protegido, então recebe `UNAUTHENTICATED` e nenhum payload.
- **GWT-02 — quebra capturada:** afrouxar policy de ownership. Dado aluno A e UUID do aluno B, quando lê linha ou arquivo, então recebe `FORBIDDEN`/zero linhas.
- **GWT-03 — quebra capturada:** remover FK composta. Dados tenant A e entidade do tenant B, quando tenta associá-las, então a transação falha.
- **GWT-04 — quebra capturada:** registrar payload sensível. Dada operação com PII, quando os logs são inspecionados, então contêm somente IDs opacos e `requestId`.
- **GWT-05 — quebra capturada:** aceitar cursor arbitrário. Dado cursor malformado, quando lista recursos, então recebe `VALIDATION_ERROR`.
- **GWT-06 — quebra capturada:** omitir auditoria. Dada revogação/convite/review/conclusão, quando conclui, então existe evento com ator e alvo.
- **GWT-07 — quebra capturada:** autorizar por sessão sem role. Dado aluno autenticado, quando chama qualquer `/api/admin/*`, então recebe `FORBIDDEN` e nenhuma mutação ocorre.
- **GWT-08 — quebra capturada:** filtrar só por role. Dados admins dos tenants A e B, quando A consulta UUID de B, então recebe `FORBIDDEN`/zero linhas.
- **GWT-09 — quebra capturada:** persistir PII em claro. Dado contato cadastrado, quando SQL sob papel de auditoria lê a coluna física e a API autorizada lê o perfil, então o banco contém cipher e o DTO contém o valor correto.
- **GWT-10 — quebra capturada:** importar client administrativo no frontend. Dado build de produção, quando bundle/source maps e env públicas são inspecionados, então não contêm service role nem chave privilegiada.
```bash
npm test -- -t "platform-security"
supabase test db
```
