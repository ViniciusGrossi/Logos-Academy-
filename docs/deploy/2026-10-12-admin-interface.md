# Publicação concluída — Atlas CMS e Revisões

PR: https://github.com/ViniciusGrossi/Logos-Academy-/pull/2
Branch: feat/admin-design-reference → main.

## Estado

Branch publicada; prévia Vercel inicial READY:
https://logos-academy-c43ioivoh-vinicius-projects-cf193513.vercel.app
Deployment: dpl_Eo4DmbRvmEsqWjuuMy2BzhZBVLEc.

Produção publicada pelo squash `589b77d`: `dpl_12WUzped3votALdMERJfb82QLDUx` READY no domínio https://logos-academy-three.vercel.app. CI do PR #54 e CI da main verdes: 183 testes de aplicação e 390 pgTAP. Smoke público aprovado; ensaio autenticado real ainda pendente.

Rollback de frontend: promover a versão anterior READY,
https://logos-academy-g7ua6mjt1-vinicius-projects-cf193513.vercel.app.

## Correções pré-deploy

- Validação local após os fixes: 183 testes em 29 arquivos aprovados; lint, TypeScript e git diff --check aprovados.
- CI #51 parou em npm ci: ausentes @emnapi/core/runtime 1.11.3. Lockfile regenerado com npm 10.9.4; npm ci --dry-run aprovado.
- Resolver de imagens estudantis não consulta mais knowledge_assets.bucket, que não existe no schema remoto. Bucket de storage permanece literal e filtros de tenant/proprietário/estado/caminho preservados.
- CSP permite imagens somente da origem Supabase exata e i.ytimg.com, além das fontes locais. Não ampliada para HTTPS indiscriminado; outras origens externas continuam bloqueadas. Preferir upload privado.
- CMS e mesa de revisão impedem alterações locais durante salvamento/publicação.
- Logout remove somente os rascunhos academy-review:* da aba; mantém dados de outras aplicações.
- Re-auditoria independente: zero críticas/altas pendentes; confiança 9/10 nos fixes. Sem alterações destrutivas ou mocks novos no banco.

## Banco

Projeto verificado: nqubjiosnlaatxxamiut, compartilhado com outros sistemas.
Schema desta publicação: logos_academy / atlas_private.
Consulta remota confirmou 16 aulas ativas, schema de knowledge_assets e ACL do finalize: anon/authenticated sem EXECUTE, service_role permitido.

Duas migrations incrementais aplicadas em produção:
20261012015740_atlas_asset_finalize_idempotent.sql e 20261013023132_admin_pagination_last_returned_cursor.sql.
Finalização idempotente e paginação sem omissão de registros. As quatro funções preservam assinaturas, ACL e dados; privilégios remotos verificados após aplicação.
Não executar resets/seeds ou limpezas históricas de contas no banco remoto.
pgTAP 062 e suíte completa passaram no GitHub antes da aplicação controlada. Snapshot das quatro funções em `2026-10-12-functions-rollback.sql`.

## Validação e acompanhamento

- Deploy autorizado; falhas antigas corrigidas sem excluir contratos nem desativar proteções. Paginação real corrigida e coberta por 11 verificações adicionais, inclusive empates de timestamp.
- Revisões independentes da migration e dos reparos de teste: zero blockers.
- CI do PR #54 e CI da main verdes; produção READY e alias canônico confirmado.
- Smoke: login 200 em 0,735 s; páginas administrativas 307 para login com next; APIs 401 anônimas; CSP/HSTS presentes; console do login limpo.
- Relatório e screenshot em `.gstack/deploy-reports/2026-10-12-pr2-deploy.md` e `2026-10-12-pr2-login.png`.
- Ensaio autenticado real de editor, upload/publicação e feedback ainda pendente; smoke anônimo não substitui essa validação.

## Ressalvas do review

- Duplicação/undo local de blocos e filtros CMS na URL ainda ausentes; remoção confirmada preservada. Findings médios documentados, não marcados como corrigidos.
- Rascunho de feedback continua restrito à aba, sem persistência no servidor.
- Advisories de dependências da CLI e guarda herdada de tenant excluído são baseline separado; não executado audit fix automático.
- Advisor remoto: tabelas editoriais backend-only com RLS sem policy de cliente continuam fechadas por desenho. Aviso preexistente fora da Academy em public.Leads (RLS desativado) não foi alterado neste deploy; requer tarefa separada. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0007_policy_exists_rls_disabled.
