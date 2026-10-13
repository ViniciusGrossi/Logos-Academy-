# Preparação de publicação — Atlas CMS e Revisões

PR: https://github.com/ViniciusGrossi/Logos-Academy-/pull/2
Branch: feat/admin-design-reference → main.

## Estado

Branch publicada; prévia Vercel inicial READY:
https://logos-academy-c43ioivoh-vinicius-projects-cf193513.vercel.app
Deployment: dpl_Eo4DmbRvmEsqWjuuMy2BzhZBVLEc.

Produção ainda não alterada. Rollback de frontend: promover a versão anterior READY,
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

Única migration incremental da branch:
20261012015740_atlas_asset_finalize_idempotent.sql.
Apenas substitui a implementação existente por finalização idempotente, mantém ACL e não remove dados. Ainda NÃO aplicada em produção.
Não executar resets/seeds ou limpezas históricas de contas no banco remoto.
pgTAP 062 e suite completa devem passar no GitHub antes da aplicação controlada.

## Gates ainda necessários

- Deploy autorizado pelo usuário; CI #52 aprovou aplicação, Atlas 059, Revisões 058 e finalize 062. Suíte geral de banco permanece bloqueada por testes obsoletos e bug real do cursor em 0053.
- Correção incremental adicional: `20261013023132_admin_pagination_last_returned_cursor.sql`, ainda não aplicada remotamente. Mesmas assinaturas, validação de tenant/admin e ACL, sem alteração de dados.
- Nova execução CI verde para aplicação e banco.
- Revisão do diff final após reparo dos contratos.
- Migration incremental controlada, merge e Vercel produção READY.
- Smoke público e ensaio autenticado real de administração/leitura de assets.

## Ressalvas do review

- Duplicação/undo local de blocos e filtros CMS na URL ainda ausentes; remoção confirmada preservada. Findings médios documentados, não marcados como corrigidos.
- Rascunho de feedback continua restrito à aba, sem persistência no servidor.
- Advisories de dependências da CLI e guarda herdada de tenant excluído são baseline separado; não executado audit fix automático.
- Advisor remoto: tabelas editoriais backend-only com RLS sem policy de cliente continuam fechadas por desenho. Aviso preexistente fora da Academy em public.Leads (RLS desativado) não foi alterado neste deploy; requer tarefa separada. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0007_policy_exists_rls_disabled.
