---
title: "Revisão adversarial — migrations Atlas CMS v2"
date: 2026-10-06
reviewer: code-reviewer (modo migrations, Codex)
escopo: 8d33777..9fbdb14
gate: fail
---

# Revisão adversarial — migrations Atlas CMS v2

> Relatório original do reviewer, recuperado do log da sessão Codex. Ciclo de correção do DBA em andamento.

STATUS: ✅ (revisado — não significa zero findings)  
MODO: migrations  
COBERTURA: commits `8d33777..9fbdb14`; 4/4 arquivos do escopo lidos integralmente; `docs/specs/atlas-cms-v2.md`, `specs/api.contracts.ts`, `docs/ARCHITECTURE.md`, `STATE-PROJECT.md` (`## Lições`), `0001_foundation.sql`, `0003_curriculum.sql`, `0006_rls_storage_completion.sql`, `0008_final_hardening.sql`, `0010_logos_academy_api.sql`, `0015_bootstrap_explorer_v1.sql`, `0016_admissions_transactions.sql`, `0048_student_knowledge_atlas.sql`, `0054_atlas_content_for_explorer_v1.sql`, `0058_fix_explorer_v1_immutability_trigger.sql`, `0059_purge_explorer_v1_v2.sql`, padrões em `bugs-e-solucoes.md`/`decisoes.md`; comandos `git diff`, `git diff --check`, `rg` de policies/GRANTs/functions/Storage/testes. Nenhum arquivo editado.

FINDINGS:

| path:line | severidade | problema | fix |
|---|---|---|---|
| `supabase/migrations/20261006031625_atlas_cms_editorial_schema.sql:20` | CRÍTICA | A cadeia limpa não é executável: a migration `0059_purge_explorer_v1_v2.sql:81,222` já remove `concepts_explorer_v1_immutable` e sua função, mas esta migration executa `ALTER TABLE ... DISABLE TRIGGER concepts_explorer_v1_immutable` sem `IF EXISTS`; PostgreSQL aborta aqui e nenhuma migration Atlas posterior é aplicada. A mesma suposição reaparece em `20261006031629...:280`. | Remover os `DISABLE/ENABLE` obsoletos ou proteger condicionalmente via catálogo, e adicionar teste de `supabase db reset` desde zero. |
| `supabase/migrations/20261006031629_atlas_cms_validation_backfill.sql:304` | ALTA | O backfill não é idempotente: toda execução concatena mais um bloco `comparison` a cada conceito, embora o ID determinístico já exista; o segundo CTE apenas normaliza o resultado duplicado. | Inserir o bloco somente quando não existir bloco com o ID determinístico/tipo esperado e testar duas execuções do DML. |
| `supabase/migrations/20261006031634_atlas_cms_admin_rpcs.sql:567` | ALTA | `student_concept_detail`, `student_library_detail` (`:625`) e `admin_atlas_detail` (`:256`) devolvem `resolvedAssets: []` incondicionalmente. Um item publicado com bloco `asset` passa na publicação, mas chega ao renderer sem `readUrl`, divergindo de `ConceptDetail`, `LibraryResourceDetail`, `AdminAtlasDetail` e da regra de leitura assinada. | Projetar os assets referenciados/autorizados ou retirar o campo da RPC e garantir, com contrato/teste de repository, que ele seja preenchido antes do DTO sair. |
| `supabase/migrations/20261006031634_atlas_cms_admin_rpcs.sql:485` | ALTA | A finalização confia em `p_verified_content_type`, `p_verified_byte_size`, `p_verified_width` e `p_verified_height`; `storage.objects.metadata` só confirma MIME/tamanho declarados e não há verificação de magic bytes nem dimensões reais. Assim, a RPC pode marcar `ready` um objeto cujo conteúdo diverge, contrariando GWT-17. | Derivar MIME/magic bytes/dimensões no servidor a partir do objeto e passar prova não controlada pelo cliente, ou encapsular a inspeção em fluxo testado antes de permitir `ready`. |
| `supabase/migrations/20261006031629_atlas_cms_validation_backfill.sql:351` | ALTA | O backfill de `knowledge_resources` apenas adiciona `id/isVisible`; os design systems publicados pela `0048` continuam somente com bloco textual, sem `palette` + `specimen`, embora novos publishes exijam ambos. Portanto há linhas canônicas `published` que não satisfazem o próprio checklist editorial novo. | Backfilar blocos válidos para recursos existentes ou reclassificá-los como draft até passarem pela publicação validada; testar todos os recursos publicados. |
| `supabase/migrations/20261006031629_atlas_cms_validation_backfill.sql:63` | ALTA | A validação JSONB não implementa união fechada: blocos, `source` e `props` aceitam chaves extras; por exemplo, um specimen pode persistir props arbitrárias além das previstas. Isso diverge de GWT-07 (“rejeita ... props não previstas”). | Validar conjuntos exatos de chaves por discriminante, inclusive objetos aninhados, e cobrir payloads com HTML/CSS/JS/props extras. |
| `supabase/migrations/20261006031634_atlas_cms_admin_rpcs.sql:334` | ALTA | Falhas de publicação retornam apenas `atlas publication checklist failed`; GWT-14 exige erro com caminho estável para focar o campo/bloco. As funções booleanas descartam qual regra/caminho falhou. | Fazer a validação retornar erros estruturados/códigos por caminho ou lançar códigos estáveis por campo/bloco e testá-los. |
| `supabase/tests/059_atlas_cms_v2.test.sql:30` | ALTA | O pgTAP não cumpre a matriz declarada na spec: como `authenticated` testa só tabela drafts + RPC list; como `anon`, só tabela assets + RPC detail. Não testa upload, finalize, revisões e restore para ambos os papéis, nem leituras diretas das quatro tabelas por ambos; também não executa o caminho feliz/falha como `service_role`. | Parametrizar testes para todas as RPCs/tabelas sob `anon` e `authenticated`, e executar autorização/cross-tenant sob `SET LOCAL ROLE service_role`. |
| `supabase/migrations/20261006031634_atlas_cms_admin_rpcs.sql:370` | MÉDIA | `admin_atlas_archive` não exige estado atual `published`; aceita arquivar item `draft` ou novamente `archived`, criando revisão `archive` e alterando relógio apesar do fluxo especificado `draft → published → archived`. O check de datas também permite archived sem `published_at`. | Bloquear archive salvo para `status='published'` e testar transições inválidas/repetidas. |
| `supabase/tests/059_atlas_cms_v2.test.sql:70` | MÉDIA | Concorrência é exercida somente para relógio de draft no publish. Não há teste de `expectedDraftUpdatedAt` em save/restore nem de `expectedItemUpdatedAt` em publish/archive, embora GWT-09 cubra todas essas mutações. | Adicionar casos stale para cada relógio/operação e provar ausência de alteração/revisão após conflito. |
| `supabase/tests/059_atlas_cms_v2.test.sql:102` | MÉDIA | Assets são testados apenas por FK cross-tenant e constraint de metadata `ready`; não há teste das RPCs authorize/finalize para owner errado, objeto ausente, MIME/tamanho divergente, asset pending em publish ou transição para failed. | Cobrir integralmente GWT-17 com fixtures de `storage.objects` e asserts sobre status, revisão e publicação. |

SPEC DRIFT:

- GWT-07: FAIL — JSONB aceita props/chaves não previstas.
- GWT-08: AMBÍGUO — atomicidade está no corpo da função, mas a cadeia limpa aborta antes de criá-la; recursos publicados legados não passam pelo checklist novo.
- GWT-09: implementação parcial e teste insuficiente para todos os relógios/operações.
- GWT-11: autorização tenant+admin está repetida nas implementações privadas, mas a matriz anon/authenticated/service_role não foi exercida.
- GWT-14: FAIL — erros genéricos, sem caminho estável.
- GWT-16: implementação estruturalmente append-only; cobertura não prova conflitos/restore/no-op em toda a matriz.
- GWT-17: FAIL/ambíguo — RPC não prova magic bytes/dimensões derivados e os testes não exercem o fluxo.
- Contratos `resolvedAssets`: FAIL — sempre `[]`.

SEGURANÇA:

- RLS habilitada/forçada nas quatro tabelas novas: pass estático.
- GRANTs explícitos e sem hard delete para `service_role`: pass estático.
- `anon`/`authenticated` sem privilégios diretos nas tabelas novas: pass estático; cobertura dinâmica incompleta.
- `SECURITY DEFINER` com `search_path=''`: pass estático.
- Implementações privilegiadas em schema não exposto + wrappers invoker: pass estático.
- `PUBLIC`/`anon`/`authenticated` revogados das RPCs admin: pass estático.
- Tenant + ator admin ativo em toda RPC admin: pass estático via `private.assert_tenant_admin`.
- Soft delete e FKs compostas cross-tenant: pass estático.
- Revisões append-only: pass estático; teste owner-only, não como `service_role`.
- Bucket privado e sem policies de cliente: pass estático para desenho server-only.
- Inspeção real de objeto/magic bytes: finding.
- Advisors remotos Supabase: ambíguo, MCP indisponível.

LIMITAÇÕES: Docker/Supabase local indisponível, portanto migrations e pgTAP não foram executados; a falha do trigger é determinada estaticamente pela ordem `0059` → migrations timestampadas. MCP `get_advisors` indisponível. `fallow` não instalado. O worktree já continha alterações do usuário em STATE/specs; foram preservadas.

RESUMO: 1 crítica · 7 altas · 3 médias — GATE: fail. A migration não pode avançar: primeiro é necessário tornar o reset limpo executável e fechar ao menos os findings altos de contrato/Storage/testes.