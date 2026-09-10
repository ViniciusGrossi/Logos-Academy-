# Deploy check — 2026-09-09

Status: **PASS**

| Item | Evidência |
| --- | --- |
| Variáveis e segredos | `.env*` ignorado, com exceção de `.env.example`; nenhum arquivo de ambiente rastreado. |
| Build e qualidade | 63 testes, TypeScript, lint e build de produção passaram. |
| Segurança | CSO diário 9/10, sem finding com confiança mínima 8/10. Riscos de dependência documentados no relatório local. |
| Banco | Schema `logos_academy`: 32/32 tabelas com RLS habilitado e forçado; teste real cross-tenant retornou zero linhas. |
| Produção | Vercel deployment `dpl_6o1dwaqp8tGxWUZrGeKoX65wtZBd` em estado `Ready`; login público 200 e rotas privadas redirecionam 307. |
| Monitoramento | Canary com três checagens estáveis, sem alertas, e screenshots de produção armazenados em `.gstack/canary-reports/screenshots/`. |
| Rollback | Reverter pela promoção do deployment anterior da Vercel; para mudança de banco, usar backup/snapshot do Supabase antes de qualquer migration corretiva. |

Riscos aceitos: `next` com alerta moderado e `postcss` transitivo com alerta alto, ambos com correção disponível. O segundo é utilizado apenas na cadeia de build, com CSS first-party e sem CSS controlado por usuário. A atualização para Next 16 ficou como milestone explícito.
