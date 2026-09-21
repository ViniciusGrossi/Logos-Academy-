---
title: "atlas-cms-v2: Spec"
date: 2026-09-15
projeto: "Logos Academy Platform"
fase: "milestone-atlas-cms-2026"
status: draft
wave: 10
tags: [spec, atlas, cms, concepts, prompts, design-systems, video, admin]
depends_on: [student-knowledge-atlas]
---

# Spec: atlas-cms-v2

## Aprovação

Direção fornecida por Vinicius em 2026-09-15 (documento de atualização "Atlas — central de conhecimento da Logos Academy"). Esta spec estende `student-knowledge-atlas` (base de leitura do aluno, migration `0048`) sem quebrar seus contratos.

## Objetivo

Substituir o Glossário pelo **Atlas**: uma página única com três coleções (Conceitos, Prompts, Sistemas de Design), alimentada por um **CMS administrativo por blocos** com fluxo editorial rascunho → publicado → arquivado e revelação progressiva por aula liberada.

Rota principal `/atlas`. `/glossario` passa a **redirect permanente** para `/atlas?tab=conceitos`.

## Escopo

### Dentro
- Rename de rota + redirect 308.
- Migration complementar sobre a `0048`: estado editorial, tags, revisão, vídeo (transcrição + confirmação de legenda), vínculo N:N recurso↔aula, assets editoriais, bucket privado, RLS, índices, triggers, RPCs admin.
- CMS admin (`/admin/atlas/*`): listagem, editor por blocos, editor de vídeo YouTube, upload de assets, publicação/arquivamento, auditoria, guarda de concorrência por `updatedAt`.
- 6 endpoints admin novos + extensão dos 4 endpoints de aluno existentes (filtros, blocos ampliados, vídeo com transcrição).
- UI aluno v2: 3 tabs com estado na URL, busca contextual, filtros por ciclo/aula/tags, índice + leitor, player lazy-load, personalizador de prompt, espécimes vivos de design system.

### Fora (não-MVP desta execução)
- Comentários, favoritos, histórico de visualização, controle de progresso de vídeo.
- IA para gerar/executar/avaliar prompts.
- Importação de HTML/CSS/JS arbitrário em design systems.
- YouTube Data API (validação de embed é local; sem chave).

## Modelo de dados (complementar à 0048)

> A `0048` já criou `knowledge_resources` (prompt/design_system) e estendeu `concepts` com vídeo/blocos. Esta migration **acrescenta**, preservando valores históricos — nunca reescreve o que existe.

### Estado editorial (concepts + knowledge_resources)
- `status text not null default 'published' check (status in ('draft','published','archived'))`.
  - Default `published` no ALTER preserva o comportamento atual das linhas já semeadas.
- `published_at timestamptz`, `archived_at timestamptz`.
- `tags text[] not null default '{}'`.
- `updated_by uuid` (FK admin `student_profiles`/identidade admin) para auditoria de última alteração.
- Vídeo (só `concepts`, já tem `video_*`): adicionar `video_transcript text`, `video_captions_reviewed boolean not null default false`. Publicação de conceito **com** vídeo exige `video_transcript` não vazio e `video_captions_reviewed = true`.

### Vínculo N:N recurso ↔ aula — `knowledge_resource_lessons`
Um prompt ou design system pode pertencer a várias aulas/trilhas.
- Colunas: `tenant_id`, `resource_id`, `lesson_template_id`, timestamps, `deleted_at`.
- PK `(tenant_id, resource_id, lesson_template_id)`; FKs compostas por tenant.
- Migração de dados: copiar o `lesson_template_id` atual de cada `knowledge_resources` para a tabela de vínculo (1 linha por recurso), preservando a coluna antiga como origem canônica até o backend migrar as leituras.
- Regra de acesso passa a ser: recurso `published` **E** ao menos uma aula vinculada liberada.

> Conceitos continuam usando `lesson_concepts` (já existe). O N:N novo é para `knowledge_resources`.

### Assets editoriais — `knowledge_assets`
- Colunas: `tenant_id`, `id`, `owner_kind text check in ('concept','resource')`, `owner_id uuid`, `bucket_path text`, `alt text not null`, `width int`, `height int`, `caption text`, `content_type text check in ('image/png','image/jpeg','image/webp')`, `byte_size int check (<= 5*1024*1024)`, timestamps, `deleted_at`.
- Bucket privado **`knowledge-assets`** (separado de `submissions`). URLs assinadas só emitidas após autorização admin do recurso.

### Índices / triggers / RLS
- Índices de listagem admin por `(tenant_id, kind, status, updated_at)` e por tag.
- `set_updated_at` nas tabelas novas.
- RLS habilitada **e forçada** em `knowledge_resource_lessons` e `knowledge_assets`; `revoke all` de anon/authenticated; `grant` mínimo a `service_role`.

### Blocos editoriais — estender `knowledge_content_blocks_valid`
Union atual: `text`, `callout`, `image`, `diagram`. Acrescentar, mantendo os existentes:
- `section` — `{ heading }` (título de seção).
- `list` — `{ ordered: bool, items: string[] }`.
- `gallery` — `{ items: { assetId|url, alt, caption? }[] }` (galeria pequena; máx 6).
- `code` — `{ language: string, code: string }`.
- `quote` — `{ body: string, attribution?: string }` (citação/definição destacada).
- `image` ganha suporte a `assetId` (referência ao bucket) além de `url` https curada.

## RPCs administrativas (service_role only, SECURITY DEFINER)

Toda RPC repete a autorização admin e o `tenant_id`. Nenhuma executável por `authenticated`/`anon`.

- `admin_atlas_list(tenant, actor, kind?, status?, curriculum?, cycle?, lesson?, tags?, search?, cursor?, limit)` → página de itens.
- `admin_atlas_detail(tenant, actor, item_id)` → item completo para o editor (inclui `updatedAt`).
- `admin_atlas_upsert(tenant, actor, payload)` → cria/edita **rascunho** (nunca publica). Valida blocos/artefato/metadados. Guarda de concorrência: rejeita se `expectedUpdatedAt` ≠ atual (errcode conflito).
- `admin_atlas_publish(tenant, actor, item_id, expectedUpdatedAt)` → roda todas as validações de publicação (vínculos ≥1, resumo, alt em imagens, legenda+transcrição se vídeo) e marca `published`.
- `admin_atlas_archive(tenant, actor, item_id)` → `archived`; some das listas do aluno; registro preservado (sem hard delete pela interface).
- `admin_atlas_asset_authorize(tenant, actor, owner, content_type, byte_size)` → cria linha `knowledge_assets` pendente + devolve dados para URL assinada de upload.
- `admin_atlas_asset_finalize(tenant, actor, asset_id, width, height, alt, caption?)` → confirma o asset após upload; exige `alt`.

Auditoria: toda escrita registra `updated_by` + timestamp; alterações relevantes logadas.

## Contratos (specs/api.contracts.ts)

### Tipos
- `KnowledgeItemStatus = "draft" | "published" | "archived"`.
- `KnowledgeVideo = { youtubeId: string; title: string; durationMinutes: number; transcript: string | null; captionsReviewed: boolean }`.
- `KnowledgeContentBlock` — union estendida (section, list, gallery, code, quote + os atuais; image aceita `assetId`).
- `AtlasItemKind = "concept" | "prompt" | "design_system"`.
- DTOs admin: `AdminAtlasListItem`, `AdminAtlasDetail`, `AdminAtlasUpsertInput`, `AdminAsset`, `AdminAssetUploadRequest/Response`, `AdminAssetFinalizeInput`.

### Endpoints de aluno (compatíveis; estendidos)
- `GET /api/student/concepts` — ganha filtros `cycle?`, `lesson?`, `hasVideo?`, `readingMax?`; item passa a expor `videoAvailable`, `tags`.
- `GET /api/student/concepts/:conceptId` — detalhe passa a expor `video: KnowledgeVideo | null` (mantém campos flat como deprecated até o front migrar) e blocos ampliados.
- `GET /api/student/library` — ganha `cycle?`, `lesson?`, `tags?`.
- `GET /api/student/library/:resourceId` — inalterado no shape além dos blocos ampliados.

### Endpoints admin (novos)
- `GET /api/admin/atlas` — lista filtrável/paginada de itens.
- `POST /api/admin/atlas` — cria rascunho (`kind` obrigatório).
- `GET /api/admin/atlas/:itemId` — detalhe para edição.
- `PATCH /api/admin/atlas/:itemId` — salva rascunho (guarda por `expectedUpdatedAt`).
- `POST /api/admin/atlas/:itemId/publish` — publica com validações.
- `POST /api/admin/atlas/:itemId/archive` — arquiva.
- `POST /api/admin/atlas/assets/upload-url` — autoriza upload → URL assinada.
- `POST /api/admin/atlas/assets/:assetId/finalize` — confirma asset (exige alt/dimensões).

Toda escrita segue Controller → Service → Repository → Supabase, Zod nos inputs, autorização admin no controller **e** nas RPCs.

## Progressão pedagógica (regra de acesso)

`conteúdo publicado + ao menos uma aula vinculada liberada`

1. Conteúdo `draft`/`archived` ou de aula não liberada → `FORBIDDEN` sem revelar título, tipo ou resumo.
2. Conteúdo liberado permanece legível após conclusão da matrícula.
3. Lista, busca, relacionados e detalhe usam a mesma regra.
4. A interface informa que novos materiais serão liberados, sem nomear conteúdos futuros.

## Vídeo (Conceitos)

- YouTube **não listado**: distribuição, não controle de acesso. Vídeos não devem conter material sensível.
- Player: sem autoplay; thumbnail + duração + botão; iframe só criado após clique; domínio de privacidade aprimorada (`youtube-nocookie`); `playsinline`, controles nativos, legendas; altura mínima 200 px; removido ao trocar tab/recurso; fallback "Abrir no YouTube" se embed bloqueado; transcrição recolhível.
- Conceito sem vídeo: "Vídeo em preparação" + tempo de leitura + CTA "Começar pela leitura"; artigo íntegro.

## Prompts

- Detalhe: objetivo, quando usar/não usar, template, anatomia, variáveis, exemplo entrada/saída, cuidados, relacionados.
- Copiar: Clipboard API, confirmação no botão + `aria-live`, volta ao normal ~2 s, fallback de seleção manual se bloqueado.
- Personalizar antes de copiar: inline (sem modal); cada variável vira campo; prévia local; **nada é salvo no banco nem enviado a modelo de IA**; ação final copia preenchido.

## Sistemas de Design

- Espécime vivo: propósito, princípios, paleta (com copiar cor), tipografia, espaçamento/raios, componentes, exemplos, faça/evite, imagens, relacionados.
- Previews por **lista fechada** de componentes seguros: botão, campo, card, badge, callout, navegação, bloco editorial. O CMS não aceita HTML/CSS/JS arbitrário; admin escolhe o tipo e fornece tokens/textos; frontend renderiza com componentes controlados.

## Direção visual

- Mesmo `AppShell`, tokens e vocabulário das demais áreas do aluno.
- Cabeçalho editorial + busca contextual + 3 tabs (`?tab=conceitos|prompts|design-systems`) + `item=<uuid>`.
- Índice à esquerda, leitor amplo à direita (desktop). Sem modal para leitura principal.
- Modais só para: confirmar arquivamento (CMS) e aviso de saída com mudanças não salvas.
- Filtros: popover no desktop, painel inferior no mobile.
- Responsivo: 1440 (índice fixo + leitor amplo), 768 (índice reduzido), 375 (índice → detalhe → voltar; nunca duas colunas). Tabs sticky. Voltar remove só o recurso, preserva tab/busca/filtros. Nunca esconde o `AppShell`.

## Estados e acessibilidade

- Loading: skeleton por tab, reserva geometria do índice/player/artigo, player mantém proporção.
- Vazio: antes da 1ª liberação; busca sem resultado (preserva filtros + limpar); coleção sem publicado. Nunca revela nomes futuros.
- Erro: lista e detalhe falham independente; retry na região afetada; retorno seguro ao índice/Início.
- A11y: tablist/tab/tabpanel ou links com `aria-current`; player com título acessível; alt em imagens; cópia com `aria-live`; navegação de blocos por teclado; `prefers-reduced-motion`; contraste WCAG AA; foco retorna ao item que abriu o detalhe no mobile.

## Critérios de aceite (GWT)

- **GWT-01:** Aluno com aulas liberadas vê só itens publicados vinculados a essas aulas.
- **GWT-02:** Recurso futuro/rascunho/arquivado não aparece na lista/busca e o detalhe retorna `FORBIDDEN` sem metadados.
- **GWT-03:** Conteúdo liberado continua acessível após conclusão da matrícula.
- **GWT-04:** Vídeo só cria iframe após interação; player não causa salto de layout; troca de recurso encerra a reprodução.
- **GWT-05:** Conceito sem vídeo mantém artigo completo + "Vídeo em preparação".
- **GWT-06:** Prompt copia template e versão personalizada; clipboard bloqueado apresenta fallback; confirmação por `aria-live`.
- **GWT-07:** Design system renderiza apenas previews da lista fechada; nenhum HTML arbitrário.
- **GWT-08:** Admin salva rascunho incompleto; não publica sem vínculos/resumo/campos obrigatórios; conceito com vídeo não publica sem legenda revisada + transcrição; imagem não publica sem alt.
- **GWT-09:** Edição concorrente retorna conflito (`expectedUpdatedAt`).
- **GWT-10:** Arquivar remove o recurso da visão estudantil; registro preservado.
- **GWT-11:** Cross-tenant negado para leitura, escrita e assets.
- **GWT-12:** Tabs, filtros, editor e reordenação de blocos funcionam por teclado; 375/768/1440 sem overflow; loading/vazio/erro preservam navegação e geometria.

## Gates desta execução (mapa → fases /logos)

1. Spec + contratos sincronizados e revisados (`@spec-reviewer`) — **fase 5**, human gate `specs_batch`.
2. Migration complementar + RLS + pgTAP; `0048` aplicada antes — **fase 6** (worker `dba`).
3. Backend admin (CMS APIs + RPCs) com TDD, C→S→R, Zod — **fase 7** (`backend-engineer`).
4. CMS desktop + Atlas do aluno 1440 (claro/escuro) — **fase 8**; **gate visual humano**.
5. Após aprovação: 768/375, touch, estados e a11y final — **fase 8**.
6. Testes completos, revisão, build, STATE atualizado — **fase 10/11**.
7. Produção só após gate visual + aprovação explícita de deploy — **fase 12**.

## Premissas e limites

- Nome oficial: **Atlas**; `/glossario` só redirect.
- CMS exclusivo para `admin`.
- YouTube não listado é distribuição, não controle de acesso.
- Vídeos publicados no YouTube fora da plataforma; CMS registra e valida embed.
- Sem IA, sem import de HTML/CSS/JS, sem YouTube Data API nesta versão.
