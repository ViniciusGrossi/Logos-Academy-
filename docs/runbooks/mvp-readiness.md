# Prontidão do MVP

Este roteiro separa o que a base do código valida automaticamente do que só pode ser confirmado com as credenciais reais de produção. Não use o modo de demonstração como evidência de uma integração externa.

## Verificado no repositório e CI

- [x] Lint, testes unitários e build executam sem segredos reais.
- [x] Contratos pgTAP podem rodar contra uma instância Supabase isolada no CI.
- [x] Convite exige consentimento e informa a confirmação sem desmontar a tela.
- [x] Datas de convite usam o calendário da Academy e passam por validação antes do envio.
- [x] Contas administrativas navegam apenas pelas rotas administrativas; impersonação não é apresentada como recurso existente.
- [x] Falhas de contrato da fila de revisões registram os campos recebidos no servidor e orientam a conferir migrations.

## Exige ambiente Supabase real

- [x] Conferir migrations de revisão e aplicar a correção de contrato de `private.admin_submission_detail` no remoto.
- [x] Aplicar a regra de capacidade baseada em `classes.capacity` no remoto.
- [ ] Rodar o ensaio: aluno entra, abre atividade, anexa ou escreve evidência, envia, administrador revisa, aluno visualiza o feedback.
- [ ] Criar uma conta de aluno separada da conta administrativa e conferir as permissões de ambos os papéis.
- [ ] Verificar RLS e Storage: um aluno não pode baixar, listar ou assinar arquivo de outro aluno.
- [ ] Validar em produção o convite por link, o deep link/cópia da mensagem de WhatsApp e a criação de senha. SMTP não é mais requisito deste fluxo.
- [ ] Confirmar que os segredos de produção estão configurados somente no provedor de deploy e não no repositório.

## Registro de ensaio — 2026-09-29

| Verificação | Resultado | Evidência / próxima ação |
| --- | --- | --- |
| Contrato da fila de revisões | Aprovado | A função privada agora retorna aluno, atividade, turma e prazo; `anon` e `authenticated` não podem executá-la. |
| Capacidade de turma | Aprovado | Trigger, matrícula e leituras administrativas usam `classes.capacity`; a RPC continua exclusiva de `service_role`. |
| Isolamento das tabelas críticas | Aprovado | RLS está ativo e possui policies em entregas, itens, arquivos, revisões, matrículas e perfis. |
| Atlas: `knowledge_resources` | Pendente | RLS está ativo, mas não há policy. Revisar antes de expor leitura direta dessa tabela. |
| Login administrativo real | Bloqueado | As credenciais disponíveis não autenticaram no Supabase; confirmar uma conta administrativa de ensaio antes do teste HTTP. |
| Convite, ativação, envio e feedback reais | Pendente | Dependem da conta administrativa de ensaio e de um aluno de teste separado. |

Os alertas do advisor para schemas como `public`, `delphi`, `paideia` e outros produtos compartilhados não pertencem ao escopo da Logos Academy e não foram modificados neste ensaio.

## Registro complementar - producao (2026-09-29)

| Check | Result | Evidence / next action |
| --- | --- | --- |
| Admin login | Passed | Authentication and `/api/me` returned 200 with role `admin`. |
| Invite link | Passed | The API generated an activation link without sending e-mail; the invite redirect returned a session. |
| Student activation | Passed | A separate test student set a password, activated enrollment, signed in again, and received 200 from `/api/me` (`student`) and `/api/student/home`. |
| Invite class selection | Fixed | The UI no longer offers a class whose curriculum cannot accept enrollment. The only existing class belongs to retired Explorer v1; create a current-curriculum class before inviting through the class UI. |
| Evidence submission | Blocked by data | The test student received no assignment. The database has 8 assignments, but 0 are released or in progress. Release a real activity to a test enrollment. |
| Review queue and feedback | Blocked by secret | The published API returns 500 while decrypting an existing submission (`Wrong key or corrupt data`). Configure production `PII_ENCRYPTION_KEY` with the original encryption key, never the local placeholder. |
| QA v2 class and activity | Passed | Created a current Explorer v2 class, activated a QA enrollment, and released one activity. The class has 16 scheduled sessions and one available assignment. |
| Evidence draft and submission | Passed | The QA student opened the released activity, saved both required text responses, and submitted the evidence; both endpoints returned 200. |
| HTTP authorization isolation | Passed | The QA student received 403 for another student's activity and for `/api/admin/classes`. |

## Critério para demonstrar o MVP

O MVP só está pronto para demonstração operacional quando o fluxo acima é executado com dados reais, do convite ao feedback, sem dados mockados e com um registro de data, conta de teste e resultado.
