---
title: "Ensaio ponta-a-ponta — runbook"
date: 2026-09-25
projeto: "Logos Academy Platform"
status: pendente
tags: [runbook, release-2, admin, ensaio]
---

# Ensaio ponta-a-ponta — runbook

Para a sessão que vai integrar a Onda A do admin e rodar o primeiro ciclo real
fora do modo demonstração. O `proximo_passo` do `STATE-PROJECT.md` é este
ensaio; o sistema de convites é só o primeiro elo dele.

Cada superfície da cadeia já foi construída e validada isoladamente, mas
nenhuma foi atravessada por um aluno real de ponta a ponta. É nas juntas que
os defeitos aparecem.

## Ponto de partida (apurado em 25/09/2026)

| Ref | Estado |
|---|---|
| `main` | igual a `origin/main`; contém todo o redesign do aluno |
| `feat/ui-scout-sweep` | `main` + 2 commits (uploader de evidências e correção do Atlas), publicado |
| `release-2/onda-a-admin` | **6 commits nunca mesclados** — é aqui que está o convite |
| `release-2/onda-b-atlas-student` | 1 commit (`feat(atlas): cria leitor estudantil`), provavelmente superado pelo Atlas atual em `main`; conferir antes de descartar |

Migrations em `main`: … `0052`, `0054`. **A `0053` não está em `main`** — existe
só na `release-2/onda-a-admin`.

## Etapa 1 — Integrar a Onda A do admin

Sem ela não há como convidar ninguém pela interface. A spec
`docs/specs/admin-operations-completion.md` (aprovada, wave 11) diagnostica
exatamente essas lacunas: a API existe, a tela não.

### O que a branch traz

- `components/admin/admin-operations-sheets.tsx` — `InviteStudentSheet`
  (aluno, responsável, relação, currículo, turma, versão do termo, confirmação
  de via física, `idempotency-key`) e `CreateClassSheet` (gera os 16 encontros).
- `supabase/migrations/0053_admin_operations_read_models.sql` — 520 linhas de
  RPCs, incluindo `admin_active_curricula` (alimenta o campo de currículo do
  convite) e `admin_file_download_target` (deixa o orientador baixar o anexo da
  entrega).
- Módulo `src/modules/admin-operations-completion/` completo.
- `supabase/tests/056_admin_operations_read_models.test.sql` (pgTAP).
- Contratos, mocks de demonstração e `specs/registry.json`.

### Comandos

    git checkout main
    git merge release-2/onda-a-admin

### Conflitos esperados: 3 arquivos

Verificado com `git merge-tree` — o merge **não** é puramente aditivo.

| Arquivo | Por quê |
|---|---|
| `components/admin/admin-students.tsx` | `main` construiu a aba Formação (F13) por conta própria no commit `677a777`; a Onda A mexe no mesmo arquivo. Manter a aba Formação de `main` e acrescentar o que a Onda A traz. |
| `components/layout/app-shell.tsx` | `main` remodelou a sidebar inteira (animações, badges, órbita da logo). Preservar a versão de `main`. |
| `specs/registry.json` | Flags `built`/`reviewed` das duas ondas. Reconciliar à mão: `projects-portfolio-completion` voltou a `reviewed=false` em `main` justamente porque a UI não existia — com a Onda A, reavaliar. |

### Verificação antes de seguir

    npx tsc --noEmit -p tsconfig.json
    npx eslint .
    npx vitest run
    npm run build

Referência atual: 0 erros de tipo, 0 erros de lint (20 avisos preexistentes de
`no-unused-vars`), 76 testes passando.

## Etapa 2 — Aplicar as migrations, nesta ordem

**`0053` antes de `0054`, obrigatoriamente.** Aplicar a `0054` sozinha deixa o
banco sem as RPCs administrativas que a Onda A pressupõe.

Não há CLI do Supabase configurado no projeto e não existe script de migration
no `package.json`; as ondas anteriores (0045–0050) foram aplicadas de forma
controlada pelo painel ou por conector.

**Antes de aplicar, conferir o que já está no banco:**

    select version, name
      from supabase_migrations.schema_migrations
     order by version desc
     limit 10;

Se a `0054` já tiver sido aplicada sem a `0053`, não reordene nada: aplique a
`0053` em seguida e confirme que os objetos que ela cria existem.

**Depois de aplicar:**

    select proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'logos_academy'
       and proname in ('admin_active_curricula',
                       'admin_file_download_target',
                       'admin_submission_workspace',
                       'admin_pending_makeups_page');

Os quatro devem aparecer. Rodar também o pgTAP `056` se houver Docker.

> O conector Supabase da sessão que apurou este runbook enxerga apenas outra
> conta (`Teste de projetos`, `apostas`), e o `.env.local` da worktree aponta
> para `demo-local`. O estado aplicado **não foi confirmado** — é o primeiro
> passo de quem tiver as credenciais certas.

## Etapa 3 — O ensaio, elo a elo

Fora do modo demonstração (`NEXT_PUBLIC_DEMO_MODE` desligado), com turma
Explorer v2 e um aluno de teste com e-mail real.

### 1. Criar turma

`CreateClassSheet` → `POST /api/admin/classes`.

**Verificar:** `/admin/turmas/[classId]` lista **16 encontros** na ordem
curricular, no fuso `America/Sao_Paulo`.

### 2. Convidar o aluno

`InviteStudentSheet` → `POST /api/admin/students/invite`.

O backend (`src/lib/supabase/admissions-admin.ts`) faz claim idempotente por
hash do payload, cria o usuário com `inviteUserByEmail`, finaliza via RPC com
PII cifrada e tem rollback compensatório se o finalize falhar.

**Verificar:** resposta com `studentId`, `enrollmentId` e `invitationSentAt`;
usuário novo em `auth.users`; e-mail efetivamente recebido.

**Falha provável:** campo de currículo vazio → a `0053` não foi aplicada.

### 3. Ativar o acesso — elo de maior risco

O aluno abre o link do e-mail e define senha em `/ativar`.

A ativação de verdade acontece em `app/api/auth/callback/route.ts`, que troca o
código por sessão e chama `activate_invited_student` — é o que vira a matrícula
de convidada para ativa.

**O risco:** em `components/auth/auth-experience.tsx:124` a recuperação de senha
passa `redirectTo` explícito para `/api/auth/callback?next=…`. O convite, em
`src/lib/supabase/admissions-admin.ts:26`, chama `inviteUserByEmail(input.email)`
**sem `redirectTo`** — usa o Site URL padrão do projeto Supabase. Se o link não
passar pelo callback, a ativação nunca roda.

**Verificar:** depois do primeiro acesso, a matrícula está ativa no banco, não
apenas o usuário criado no Auth.

**Se falhar:** passar `redirectTo` no `inviteUserByEmail`, simétrico ao
`resetPasswordForEmail`, e garantir a URL na allowlist de Redirect URLs do
Supabase. É uma linha.

### 4. Liberação da primeira atividade

**Verificar:** `/api/student/home` devolve `primaryAction` apontando para a
primeira atividade do ciclo 1, e `/inicio` mostra o caminho.

### 5. Entrega com anexo

`/atividade` → uploader → `POST /api/files/upload-url` → PUT na URL assinada →
`POST /api/files/:id/finalize` → `PUT …/draft` → `POST …/submit`.

**Verificar fora do modo demonstração:** o PUT real acontece e o anel de
progresso avança de forma determinada (o envio usa XHR e reporta bytes; no modo
demonstração ele gira indeterminado por não haver PUT). Tipos aceitos e limite
de 20 MB são validados no navegador antes de subir.

**Atenção:** só aqui se confirma que o bucket e as políticas de Storage estão
certos em produção — o modo demonstração nunca exercita isso.

### 6. Correção pelo orientador

`/revisoes` → `POST /api/admin/submissions/[submissionId]/review`.

**Verificar:** o orientador consegue **abrir o anexo** do aluno. Isso depende de
`admin_file_download_target`, que vem na `0053` — sem ela, corrige no escuro.

### 7. Reentrega

Status vai para `revision_requested`; o aluno vê o feedback por critério e envia
a v2.

**Verificar:** a revisão anterior permanece imutável e o histórico pagina (cinco
versões por página).

### 8. Projeto aprovado

O Project Day fecha o ciclo.

**Verificar:** `/projetos/[projectId]` mostra o Mapa de decisões ligando versões,
decisões e feedbacks às atividades.

### 9. Apresentação e conclusão

Aba **Formação** em `/admin/alunos/[studentId]` (já em `main`): checklist dos
cinco requisitos, registro da apresentação (Demo Day ou substitutiva) e
confirmação de conclusão.

**Verificar:** a matrícula concluída fica somente-leitura.

## Depois do ensaio

- Registrar o resultado no `STATE-PROJECT.md` e fechar ou reabrir os itens
  `aguardando gate visual humano`.
- Fazer o gate visual humano das páginas do aluno em 1440, 768 e 375 px.
- Decidir o destino da `release-2/onda-b-atlas-student`.
