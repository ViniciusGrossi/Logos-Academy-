# Arquitetura — Logos Academy Platform

**Status:** aprovada tecnicamente para o MVP  
**Data:** 2026-09-01  
**Fontes de verdade:** `docs/PRD.md`, `specs/product.schema.json` e `specs/api.contracts.ts`

## 1. Decisão executiva

O MVP será um **monólito modular** em Next.js 15, hospedado na Vercel, com Supabase para autenticação, PostgreSQL e armazenamento privado. A aplicação apoia aulas presenciais; não é um LMS de vídeo.

Não entram no MVP: FastAPI, Edge Functions próprias, filas, cache distribuído, Realtime, IA em produção, OAuth do GitHub, notificações automáticas ou microsserviços. Nenhum requisito travado precisa desses componentes na escala inicial de até 23 alunos.

```text
Navegador
   │ HTTPS + sessão Supabase
   ▼
Next.js 15 (Vercel, runtime Node)
   ├── Server Components: leitura e composição de tela
   ├── Server Actions / Route Handlers: controllers
   ├── Services: regras e transações de negócio
   └── Repositories: único acesso a dados
             │
             ▼
Supabase
   ├── Auth (convite por e-mail e senha)
   ├── PostgreSQL 15 (RLS em todas as tabelas)
   └── Storage privado (arquivos das entregas)
```

O diagrama navegável está em [`docs/architecture/system.html`](architecture/system.html). O fluxo de dados está em [`docs/architecture/data.html`](architecture/data.html).

## 2. Princípios e limites

1. **Controller → Service → Repository → Supabase.** Controllers validam entrada e convertem resposta; services concentram regras; repositories são o único ponto de SQL/Supabase.
2. **Uma regra, uma implementação.** Server Actions e os 39 Route Handlers usam os mesmos services; nunca chamam a própria API por HTTP no servidor.
3. **Privado por padrão.** Um aluno só vê o próprio perfil, matrícula, atividade, entrega, feedback e portfólio. O admin só opera dados do tenant ao qual pertence.
4. **Banco como última barreira.** RLS, chaves estrangeiras, unicidade e transações protegem invariantes mesmo se um controller falhar.
5. **Estado derivado não é duplicado.** Atraso, progresso e elegibilidade de conclusão são calculados; não são booleanos editáveis.
6. **Escala real, desenho suficiente.** Paginação por cursor e índices adequados entram agora; filas e caches entram somente quando houver carga mensurável.

## 3. Arquitetura de software

### 3.1 Stack

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Interface | Next.js 15 App Router, React 19, TypeScript strict | Áreas Admin e Aluno, renderização e navegação |
| Design | Tailwind CSS v4, Shadcn UI, Lucide | Tokens oficiais e componentes acessíveis |
| Validação | Zod | Todo input em fronteira HTTP/ação |
| Aplicação | Server Actions e Route Handlers | Controllers finos sobre services compartilhados |
| Dados | Supabase JS + PostgreSQL 15 | Auth, transações, RLS e consultas |
| Arquivos | Supabase Storage privado | Upload e download por URL assinada |
| Hospedagem | Vercel + Supabase | Deploy da aplicação e serviços gerenciados |

O runtime de servidor será Node. Edge Runtime só será adotado se um caso concreto exigir e uma biblioteca crítica for compatível.

### 3.2 Módulos

| Módulo | Escopo |
|---|---|
| `identity` | sessão, convite, ativação e bloqueio de acesso |
| `students` | perfil do aluno, responsável e metadados de consentimento |
| `curriculum` | currículo, ciclos, aulas, conceitos, atividades, requisitos e critérios |
| `enrollments` | turmas, produto individual, matrículas e agenda fixa |
| `attendance` | presença, falta, reposição e requisito de 100% |
| `learning` | liberação gradual, atividades atribuídas, rascunhos e submissões |
| `reviews` | critérios binários, feedback pedagógico e correções |
| `projects` | quatro projetos, reflexão, apresentação e portfólio interno |
| `files` | autorização, upload, finalização e download privado |
| `insights` | painel operacional do admin e métricas derivadas |

Estrutura-alvo, criada somente durante o build:

```text
src/
  app/                 # páginas, Server Actions e Route Handlers
  modules/<dominio>/
    schemas.ts          # Zod e DTOs
    service.ts          # regra de negócio
    repository.ts       # acesso a dados
  lib/supabase/         # clientes browser, server e admin isolado
  components/           # UI compartilhada
```

Não haverá interfaces, factories ou barramentos internos com uma única implementação.

### 3.3 Fluxos críticos

**Convite.** O service cria ou reutiliza primeiro o usuário no Supabase Auth e só então executa a transação que cria usuário de domínio, aluno, consentimento e matrícula com o `auth_user_id` obrigatório. Se a transação falhar, o adapter administrativo desabilita o usuário órfão; uma nova tentativa localiza o mesmo e-mail normalizado e conclui a operação sem duplicar matrícula.

**Liberação gradual.** O admin libera a aula/atividade. Uma única transação materializa as atividades dos alunos ativos. `unique(enrollment_id, activity_template_id)` impede duplicação em reenvio.

**Entrega.** O aluno edita um rascunho. Ao enviar, o service valida liberação, requisitos, propriedade dos arquivos e URL do repositório, cria uma versão imutável e muda a atividade para `submitted`. Correções geram nova versão; o histórico permanece.

**Feedback.** O admin publica uma nova revisão append-only com critérios binários e feedback pedagógico na mesma transação que altera o estado da atividade. Uma correção administrativa supersede a revisão anterior sem apagá-la. Não há nota numérica.

**Conclusão.** O service deriva elegibilidade a partir de 100% das aulas presentes ou repostas, quatro projetos completos, reflexão, apresentação e ausência de correção pendente. O cliente nunca envia esses resultados como verdade.

## 4. Arquitetura de dados

### 4.1 Modelo e propriedade

O tenant representa a Logos Academy, não cada aluno. A propriedade individual é determinada por `student_profile_id` e `enrollment_id`. Turmas guardam informações coletivas; matrículas e atividades guardam o percurso individual. Em matrícula de turma, `class_id` é obrigatório; em matrícula individual, `class_id` é nulo e as 16 sessões pertencem diretamente à matrícula.

| Grupo | Tabelas |
|---|---|
| Acesso | `tenants`, `users`, `tenant_memberships` |
| Pessoas e LGPD | `student_profiles`, `guardian_records`, `consent_records` |
| Currículo | `curricula`, `cycles`, `lesson_templates`, `concepts`, `lesson_concepts`, `activity_templates`, `activity_requirements`, `activity_criteria` |
| Operação | `classes`, `enrollments`, `sessions`, `attendance_records`, `makeup_records` |
| Aprendizagem | `activity_assignments`, `submissions`, `submission_items`, `uploaded_files`, `reviews`, `criterion_reviews`, `feedback_receipts` |
| Evidências | `project_records`, `presentation_records`, `completion_records` |
| Infraestrutura interna | `audit_events`, `idempotency_keys`, `attendance_private_notes` |

As três tabelas de infraestrutura não alteram DTOs públicos: registram segurança, retries e notas exclusivas do admin. Todas as entidades do contrato têm `id uuid`, `tenant_id uuid`, `created_at timestamptz`, `updated_at timestamptz` e `deleted_at timestamptz`. Tabelas físicas internas mantêm a mesma base; registros append-only não são atualizados ou excluídos pela aplicação. FKs e colunas usadas por RLS são indexadas. FKs de negócio usam o par `(tenant_id, id)` quando isso impede associação cross-tenant no próprio banco.

### 4.2 Invariantes no banco

- Matrícula: `kind = 'class'` exige `class_id not null`; `kind = 'individual'` exige `class_id is null`; uma matrícula ativa por aluno e oferta.
- Turma: máximo de 6 matrículas ativas. A operação transacional de matrícula bloqueia a linha da turma antes de contar vagas.
- Presença: uma linha por sessão e matrícula; a reposição referencia a falta original sem apagá-la.
- Liberação: uma atividade atribuída por matrícula e modelo de atividade.
- Entrega: número de versão único por atividade; versão enviada é imutável.
- Revisão: cada publicação cria uma revisão imutável com uma decisão por critério; a revisão corrente é a mais recente por `(created_at, id)`.
- Conclusão: uma evidência por matrícula; só pode ser criada pela função que recalcula os requisitos.
- Exclusão lógica: relações e consultas normais ignoram `deleted_at is not null`.
- Nota privada de presença: fica em `attendance_private_notes`, protegida por policy admin-only; nunca divide linha com dados lidos pelo aluno.
- Auditoria: `audit_events` é append-only e registra ator, ação, entidade, request ID e metadados sem PII.

Exemplo do padrão mínimo de tabela, índice e política:

```sql
create table public.activity_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  enrollment_id uuid not null references public.enrollments(id),
  activity_template_id uuid not null references public.activity_templates(id),
  status text not null check (status in ('locked','available','draft','submitted','revision_requested','approved')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (enrollment_id, activity_template_id)
);

create index activity_assignments_student_queue_idx
  on public.activity_assignments (enrollment_id, status, due_at, id)
  where deleted_at is null;

alter table public.activity_assignments enable row level security;

create policy "student reads own assignments"
on public.activity_assignments for select to authenticated
using (
  tenant_id = (select private.current_tenant_id())
  and enrollment_id in (select private.current_student_enrollment_ids())
);
```

As funções `private.current_tenant_id()` e `private.current_student_enrollment_ids()` são `security definer`, usam `set search_path = ''`, verificam `auth.uid()` e não concedem execução a `anon`. Políticas de admin verificam `tenant_memberships.role = 'admin'`. O cliente comum nunca recebe `service_role`.

### 4.3 RLS, privilégios e paginação

- RLS habilitada em **todas** as tabelas, inclusive catálogos.
- Policies usam `(select auth.uid())` ou helpers privados para evitar reavaliação por linha.
- `anon` não tem acesso às tabelas do produto. `authenticated` recebe apenas operações cobertas por policy.
- O cliente administrativo do Supabase fica em módulo server-only e serve apenas para convite/bloqueio no Auth; não é repositório genérico.
- Listagens usam cursor estável `(created_at, id)` e `limit` máximo definido no contrato, nunca offset irrestrito.
- Consultas do painel usam agregações ou joins em uma chamada; N+1 é proibido.
- Índices parciais cobrem filas ativas (`deleted_at is null`, `status = 'submitted'`) e todos os FKs relevantes.

### 4.4 Dados pessoais e pgcrypto

O sistema não coleta CPF ou CNPJ. Dados de menor permanecem minimizados. Nome, telefone e e-mail do responsável, além da data de nascimento do aluno, serão armazenados como `bytea` cifrado por `pgp_sym_encrypt`; o uso será encapsulado em funções privadas com checagem explícita de admin. A chave fica em segredo de servidor/infraestrutura e nunca no navegador, migration ou log.

Para filtros e ordenação operacionais, usa-se um `display_name` mínimo no perfil do aluno; nenhum dado sensível cifrado será usado em busca aberta. O e-mail de autenticação permanece sob Supabase Auth. A migration de PII será separada (`0002_pii_pgcrypto.sql`) para auditoria.

O termo continua em papel. A plataforma guarda apenas status, versão, data de assinatura, responsável pelo registro, data de revogação e observação contextual — nunca o scan. Revogar consentimento desabilita acesso e pausa matrículas ativas, preservando o histórico para obrigação legal e auditoria.

### 4.5 Arquivos

- Um único bucket privado, sem URL pública.
- O servidor gera o caminho: `<tenant>/<student>/<assignment>/<file-id>`.
- O navegador recebe URL assinada curta para upload; depois chama finalização com o `fileId` opaco.
- A finalização confere existência, tamanho, MIME, matrícula, atividade e usuário antes de tornar o arquivo utilizável.
- Download exige nova autorização e URL assinada curta.
- Nome original é metadado, não parte confiável do caminho.
- Limites de tamanho e MIME são aplicados no controller e revalidados no service/storage.

## 5. IA

**Não aplicável ao MVP.** A plataforma ensina conceitos de IA, mas não executa modelos, RAG, tutor, geração de conteúdo ou correção automática. O feedback é integralmente pedagógico e humano. Isso reduz risco com dados de menores, custo e ambiguidade de avaliação.

Uma futura função de IA exigirá novo PRD/Spec Sync Request, base legal, avaliação de dados enviados ao provedor, human-in-the-loop, métricas e política explícita de retenção. Nenhuma infraestrutura é preparada antecipadamente.

## 6. Segurança — STRIDE

| Ameaça | Cenário | Controle MVP |
|---|---|---|
| Spoofing | aluno tenta assumir outra identidade | Supabase Auth, cookie seguro, verificação server-side e convite pré-cadastrado |
| Tampering | troca de `studentId`, `fileId` ou estado da atividade | Zod, ownership no service, RLS, FKs e estados alterados só por transação autorizada |
| Repudiation | disputa sobre presença, entrega ou feedback | ator, timestamps, versões imutáveis e registro contextual de alterações |
| Information disclosure | arquivo ou dado de outro menor é exposto | RLS, bucket privado, URLs curtas assinadas, PII cifrada e nenhum dado pessoal em logs |
| Denial of service | abuso de login, upload ou listagens | limites do provedor, tamanho/MIME, paginação e rate limit nas mutações sensíveis |
| Elevation of privilege | chave administrativa usada no cliente | `service_role` somente server-only, módulo estreito, membership admin validada antes de cada operação |

Sessões administrativas sensíveis exigem reautenticação conforme recursos do provedor. Logs registram IDs técnicos e resultado, nunca conteúdo de feedback, telefone, e-mail ou arquivo.

## 7. Consistência, falhas e observabilidade

- Operações que alteram múltiplas tabelas usam função PostgreSQL/RPC transacional através do repository.
- Unicidade torna convite, liberação e criação de conclusão seguros contra repetição. `expectedDraftId`/versão evita sobrescrita concorrente em entregas.
- Convite, revisão e apresentação aceitam chave de idempotência no controller; `(tenant_id, actor_id, route, key)` e o hash do payload distinguem retry legítimo de conflito. O endpoint de detalhe devolve a revisão mais recente; as anteriores permanecem imutáveis no banco e o audit log registra o motivo da nova publicação, sem duplicar conteúdo pedagógico.
- Erros retornam código estável, mensagem segura e `request_id`; detalhes ficam no servidor sem PII.
- Métricas iniciais: erros por rota, latência p95, falhas de upload, convites falhos e volume de atividades aguardando feedback há mais de 48h.
- Sem worker: a interface recalcula/revalida ao concluir mutações. Processamento assíncrono só entra com notificações ou relatórios pesados.

### 7.1 Interpretações de implementação do contrato travado

- `studentId` significa sempre `student_profiles.id`; o ID do Supabase Auth é `authUserId`.
- As 16 `sessions` materializadas são a fonte de verdade da agenda. Dias e horários recebidos na criação servem para gerar as sessões; remarcações alteram a sessão, preservando histórico. Não há tabela especulativa de recorrência.
- O callback server-side do convite ativa usuário e matrícula através de `ActivationService`; não é um endpoint público adicional.
- “Corrigir entrega” continua sendo prioridade 1 quando o estado é `revision_requested`. “Ver feedback novo” é uma prioridade distinta para revisão ainda não visualizada, inclusive quando aprovada; `feedback_receipts` registra a visualização de forma idempotente.
- A reflexão final é identificada estruturalmente pela atividade da 16ª aula do currículo Explorer versionado, validada no import. Não depende do título digitado.
- A cardinalidade 4 ciclos/16 aulas do JSON Schema representa um snapshot de uma versão do currículo; versões diferentes são linhas diferentes no banco.
- URLs de repositório passam por `new URL()` e exigem `protocol === 'https:'` e `hostname === 'github.com'`.
- Turma, execução do Explorer e projetos têm limites naturais de 6, 16 e 4. Históricos de presença e portfólio atravessam matrículas e usam cursor público, sem truncamento silencioso.
- Rascunho é single-writer no MVP. A submissão final usa `expectedDraftId`; edição simultânea em múltiplas abas é uma limitação conhecida até o contrato ganhar revisão otimista.
- O arquivo JSON descreve formatos de domínio/API, não tipos físicos: pgcrypto cifra no banco e o repository devolve o DTO autorizado já decifrado.

## 8. Ambientes e deploy

Há ambientes separados de desenvolvimento e produção, cada um com projeto Supabase, storage e secrets próprios. Migrations são versionadas e aplicadas antes do deploy compatível. Seed usa apenas dados fictícios; nenhuma demonstração usa menores reais.

Checks obrigatórios: TypeScript strict, lint, testes unitários de regras, testes de integração de repository/RLS e smoke E2E dos fluxos críticos. O deploy bloqueia se migration ou teste RLS falhar. Backups e retenção seguem a configuração contratada do Supabase e serão verificados antes do piloto.

## 9. ADRs do projeto

### ADR-LA-001 — Monólito modular gerenciado

**Decisão:** Next.js + Supabase, sem serviço backend separado.  
**Razão:** atende todo o contrato com menor superfície operacional.  
**Revisitar quando:** houver processamento pesado, integração que precise de worker ou gargalo comprovado.

### ADR-LA-002 — Tenant único com isolamento explícito

**Decisão:** a Logos Academy é o tenant; todas as entidades carregam `tenant_id`.  
**Razão:** dados pessoais pertencem ao aluno, mas isolamento organizacional e RLS precisam de uma raiz estável.  
**Revisitar quando:** o produto for licenciado para outra organização.

### ADR-LA-003 — Sem IA no produto MVP

**Decisão:** conceitos de IA são conteúdo; feedback e conclusão são humanos.  
**Razão:** nenhum requisito exige inferência e os usuários incluem menores.  
**Revisitar quando:** uma hipótese pedagógica mensurável justificar a função.

### ADR-LA-004 — Arquivos por identificador opaco

**Decisão:** contratos trafegam `fileId`; caminhos reais ficam no servidor e o bucket é privado.  
**Razão:** evita enumeração e vazamento de estrutura/identidade.

### ADR-LA-005 — PII mínima e cifrada

**Decisão:** dados pessoais necessários são minimizados; campos sensíveis operacionais usam pgcrypto e funções privadas.  
**Razão:** público de 12–17 anos e regra global da Logos Tech.

## 10. Decisões desafiadas

| Pergunta | Resposta |
|---|---|
| Cada aluno deveria ser um tenant? | Não. Tenant é fronteira organizacional; propriedade individual já é resolvida por perfil, matrícula e RLS. |
| Precisamos de backend Python? | Não. O contrato não contém IA ou carga que justifique outro deploy. |
| Precisamos de Realtime? | Não no piloto. Revalidação após mutações e atualização manual cobrem 2–3 turmas. |
| Precisamos de fila? | Não. Convites são poucos e as demais mutações são rápidas/transacionais. |
| O service pode usar `service_role` para facilitar? | Não. Isso anularia a última barreira. Só operações Auth Admin usam cliente privilegiado isolado. |
| A plataforma deve guardar o termo assinado? | Não. O requisito é papel; guardar scan aumenta risco sem benefício ao MVP. |
| O painel precisa de warehouse? | Não. Agregações indexadas no PostgreSQL atendem a escala inicial. |

## 11. Riscos e gatilhos de evolução

| Risco | Mitigação agora | Gatilho de evolução |
|---|---|---|
| Auth + banco não atômicos no convite | status persistido, unicidade e retry | falhas recorrentes justificam job de reconciliação |
| Funções pgcrypto aumentam complexidade | superfície pequena e testes de autorização | busca por PII exige estratégia de hash/tokenização revisada |
| Agregações do painel crescem | índices e consultas agregadas | p95 acima da meta com volume real justifica view/cache |
| Upload malicioso | bucket privado, MIME/tamanho e ownership | exigência contratual justifica antivírus assíncrono |
| Expansão para responsáveis/professores | papéis reservados no modelo, sem UI/policy ativa | novo PRD libera as jornadas e policies específicas |

## 12. Critérios de aceite arquitetural

- O contrato inteiro cabe na topologia proposta sem serviço adicional.
- Todo acesso segue Controller → Service → Repository → Supabase.
- Toda tabela possui RLS e teste de isolamento entre usuários.
- Nenhuma credencial privilegiada chega ao navegador.
- Arquivos permanecem privados e são resolvidos por `fileId`.
- Conclusão, atraso e progresso são derivados de evidências.
- A arquitetura preserva falta original e histórico de versões.
- IA está explicitamente fora do runtime do MVP.
- Diagramas Archify são validados e abrem offline.

## 13. Pendências de provisionamento, não de arquitetura

- Confirmar a região disponível do Supabase no momento da criação do projeto, priorizando residência e menor latência adequadas ao Brasil.
- Definir valores exatos de limite de arquivo, duração de URL assinada, rate limit e retenção antes do piloto.
- Validar o procedimento de backup/restauração e o encarregado LGPD antes de inserir dados reais.
- O registro corporativo consultado contém ADR-030, mas não expõe os ADR-025–029 e ADR-031 citados pelo playbook; esta divergência documental deve ser corrigida no checkpoint, sem inventar decisões ausentes.
