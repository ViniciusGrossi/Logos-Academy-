---
title: "student-knowledge-atlas: Spec v2 — Atlas + CMS editorial"
date: 2026-09-16
projeto: "Logos Academy Platform"
fase: "release-1-fechamento"
status: approved
wave: 10
tags: [spec, student, atlas, cms, concepts, prompts, design-systems]
---

# Spec: student-knowledge-atlas (v2)

## Aprovação

- v1 (2026-09-12): três bibliotecas com revelação progressiva; CMS fora de escopo.
- **v2 (2026-09-16):** plano "Atlas — central de conhecimento da Logos Academy" enviado e aprovado por Vinicius para fechar a Release 1. Substitui “Glossário” por **Atlas**, acrescenta CMS administrativo por blocos, vídeo YouTube não listado, prompts personalizáveis e espécimes vivos de design systems. O plano integral enviado por Vinicius é a fonte de UX; esta spec fixa dados, contratos e gates.

## Objetivo

Uma única página `/atlas` onde o aluno recupera um conceito (vídeo curto + artigo), reutiliza um prompt (template explicado e personalizável) ou consulta um sistema de design (espécime vivo) — sem descobrir nada de aulas futuras. O admin cria e publica esse conteúdo em `/admin/atlas`.

## Rotas

| Rota | Papel | Observação |
|---|---|---|
| `/atlas?tab=conceitos\|prompts\|design-systems&item=<uuid>&q=&cycle=&lesson=&tag=` | aluno (e admin, superset) | estado completo na URL; tab padrão `conceitos` |
| `/glossario` | — | redirect permanente (308) para `/atlas?tab=conceitos` |
| `/admin/atlas` | admin | listagem e filtros |
| `/admin/atlas/novo?kind=concept\|prompt\|design_system` | admin | criação |
| `/admin/atlas/[id]` | admin | editor por blocos + prévia real |

Navegação do aluno: item “Glossário” vira “Atlas”. Navegação admin ganha “Atlas”.

## Experiência do aluno (resumo normativo)

- Cabeçalho editorial com contador de materiais liberados (soma de `facets.totalReleased` das três coleções).
- Tabs acessíveis e sticky; troca de tab preserva histórico (`router.push`), busca contextual à coleção.
- Filtros: ciclo, aula, tags; Conceitos adiciona “com vídeo” e duração de leitura. Popover no desktop, painel inferior (Sheet) no mobile.
- Desktop: índice à esquerda, leitor amplo à direita. 768: índice reduzido. 375: índice → detalhe → voltar (voltar remove só `item`, foco retorna ao item de origem).
- Leitura principal nunca em modal. Modais apenas: confirmar arquivamento; alertar saída com mudanças não salvas.
- Material futuro nunca exibe título/resumo/tipo; só `facets.hasUpcoming` → “novos materiais serão liberados”.
- **Conceito:** player 16:9 (facade com thumbnail `i.ytimg.com`, iframe criado só após clique, `youtube-nocookie.com`, `playsinline=1`, `rel=0`, `cc_load_policy=1`, `hl=pt-BR`, sem autoplay, altura mínima 200 px, removido ao trocar tab/item, fallback “Abrir no YouTube”, transcrição recolhível) + introdução (resumo, objetivo, duração, relacionados). Artigo ≤ 75ch em blocos; termina com “Em resumo”, perguntas de revisão, conceitos relacionados liberados e link para atividade. Sem vídeo: “Vídeo em preparação”, ilustração de sinal aguardando transmissão, tempo de leitura, CTA “Começar pela leitura”.
- **Prompt:** objetivo, quando usar/não usar, template formatado, anatomia, variáveis, exemplo de entrada/saída, cuidados, relacionados. “Copiar prompt” via Clipboard API, confirmação no botão + `aria-live`, reset ~2 s, fallback de seleção manual. “Personalizar antes de copiar” inline: um campo por variável, prévia local, nada persistido nem enviado a IA. Índice oferece “Copiar base”.
- **Sistema de Design:** propósito, princípios, paleta (copiar cor), tipografia com amostras, espaçamento e raios, componentes (lista fechada `button|field|card|badge|callout|navigation|editorial_block` renderizada por componentes controlados), exemplos, faça/evite, imagens de referência, relacionados. Miniatura do índice construída com a própria paleta.

## Modelo de dados (migration `0051_atlas_editorial_cms.sql`)

Pré-requisito: `0048_student_knowledge_atlas.sql` preservada e aplicada antes, em ordem.

1. **Editorial em `concepts` e `knowledge_resources`** (mesmas colunas nas duas tabelas):
   `status text check (status in ('draft','published','archived'))`, `draft_document jsonb not null`, `published_document jsonb`, `tags text[] not null default '{}'`, `curriculum_id uuid` (FK composta tenant), `published_at`, `archived_at`, `updated_by_user_id uuid` (FK composta users), `revision integer not null default 1`.
   Backfill: conteúdo existente vira `status='published'` com `draft_document = published_document` montado a partir das colunas atuais (compatível com `KnowledgeDocument`).
   Colunas legadas (`title`, `summary`, `body`, `content_blocks`, `video_*`, `artifact`) permanecem e são **projetadas a partir do snapshot publicado** no publish (compatibilidade com Início/Atividade).
2. **`knowledge_resource_lessons`** (tenant_id, knowledge_resource_id, lesson_template_id, timestamps, deleted_at; unique ativo por par). Backfill de `knowledge_resources.lesson_template_id`, que passa a ser nullable/deprecated. Conceitos continuam em `lesson_concepts`.
3. **`knowledge_assets`**: id, tenant_id, storage_path (gerado no servidor: `<tenant_id>/<asset_id>`), filename, content_type (`image/png|image/jpeg|image/webp`), size_bytes (≤ 5 MB), width, height (> 0), status (`pending|ready|rejected`), created_by_user_id, timestamps, deleted_at.
4. **Bucket privado `knowledge-assets`**: `public=false`, `file_size_limit=5242880`, mimes allowlist; sem policy para `authenticated`/`anon` (acesso só via service role e URL assinada).
5. RLS habilitada e forçada nas tabelas novas; `revoke all` de `public, anon, authenticated`; índices em FK e filtros (`tenant_id, status, kind`, `tags` GIN); triggers `set_updated_at`.
6. Funções de validação `private.knowledge_document_valid(p_kind text, p_document jsonb)`: allowlist de tipos de bloco, strings obrigatórias, hex `#RRGGBB`, `fontRole` e `DesignPreviewKind` válidos, `videoId ~ '^[A-Za-z0-9_-]{11}$'`, `href` somente `https://` ou `/`. Constraint em `draft_document` (estrutural) e em `published_document` (estrutural + publicação).

### Regra de acesso estudantil

`status = 'published' AND published_document IS NOT NULL AND archived_at IS NULL AND deleted_at IS NULL AND ≥ 1 aula vinculada liberada` (`private.student_released_lessons`). Permanece após conclusão da matrícula. Lista, busca, facets, relacionados e detalhe usam a mesma regra. Detalhe negado → `42501` (FORBIDDEN) sem metadados. `hasUpcoming` = existe item publicado do tipo cujas aulas vinculadas não estão liberadas.

### RPCs (todas `security definer`, `search_path=''`, `execute` somente `service_role`)

Aluno (novas; as de 0048 permanecem por compatibilidade):
- `student_atlas_concepts_page(p_tenant_id, p_actor_user_id, p_search, p_cycle, p_lesson, p_tag, p_has_video, p_max_reading_minutes, p_cursor, p_limit) → AtlasPage<AtlasConceptSummary>`
- `student_atlas_concept_detail(p_tenant_id, p_actor_user_id, p_concept_id) → ConceptDetail` (inclui `activity` = assignment liberado do aluno para a aula vinculada de menor posição)
- `student_atlas_library_page(p_tenant_id, p_actor_user_id, p_kind, p_search, p_cycle, p_lesson, p_tag, p_cursor, p_limit) → AtlasPage<LibraryResourceSummary>`
- `student_atlas_library_detail(p_tenant_id, p_actor_user_id, p_resource_id) → LibraryResourceDetail`

Busca insensível a acento sobre título, resumo e tags. Ordenação: posição da primeira aula liberada, depois título. Cursor opaco base64 como as páginas existentes.

Admin (exigem membership `admin` no tenant; auditam via `logos_academy.write_audit_event`):
- `admin_atlas_page(p_tenant_id, p_actor_user_id, p_kind, p_status, p_curriculum_id, p_cycle, p_lesson, p_tag, p_search, p_cursor, p_limit) → AdminKnowledgePage`
- `admin_atlas_detail(p_tenant_id, p_actor_user_id, p_item_id) → AdminKnowledgeItemDetail` (sem `assets[].url` e com `publishIssues: []`; o service completa)
- `admin_atlas_create(p_tenant_id, p_actor_user_id, p_curriculum_id, p_lesson_template_ids uuid[], p_document jsonb, p_request_id uuid) → detail` (status `draft`; `kind` do documento escolhe a tabela; slug único por tenant+kind → `23505`)
- `admin_atlas_update(p_tenant_id, p_actor_user_id, p_item_id, p_expected_updated_at timestamptz, p_curriculum_id, p_lesson_template_ids uuid[], p_document jsonb, p_request_id uuid) → detail` (salva só `draft_document`; divergência de `updated_at` → `40001`; item arquivado → `42501`)
- `admin_atlas_publish(p_tenant_id, p_actor_user_id, p_item_id, p_expected_updated_at, p_request_id) → detail` (revalida no banco: ≥ 1 aula do currículo, resumo, alt em toda imagem, asset `ready`, vídeo com transcrição e `captionsReviewed`; falha → `22023`; copia rascunho para snapshot e projeta colunas legadas)
- `admin_atlas_archive(p_tenant_id, p_actor_user_id, p_item_id, p_expected_updated_at, p_request_id) → detail`
- `admin_atlas_asset_create(p_tenant_id, p_actor_user_id, p_filename, p_content_type, p_size_bytes, p_width, p_height, p_request_id) → { id, storagePath, ...KnowledgeAsset }`
- `admin_atlas_asset_finalize(p_tenant_id, p_actor_user_id, p_asset_id) → KnowledgeAsset` (confere `storage.objects` no bucket: existência, tamanho e mime)
- `admin_atlas_asset_paths(p_tenant_id, p_asset_ids uuid[]) → [{ id, storagePath, status }]` (uso interno do service para assinar URLs)

Códigos: `42501` FORBIDDEN, `22023` VALIDATION_ERROR, `23505`/`40001` CONFLICT, `P0002` NOT_FOUND.

## Contratos

Fonte canônica: `specs/api.contracts.ts`, seção **Atlas** (`KnowledgeDocument`, `KnowledgeBlock`, `KnowledgeVideo`, artefatos, `AtlasPage`, DTOs admin). Endpoints:

- Mantidos (resposta ampliada): `GET /api/student/concepts`, `GET /api/student/concepts/:conceptId`, `GET /api/student/library`, `GET /api/student/library/:resourceId`.
- Novos: `GET|POST /api/admin/atlas`, `GET|PATCH /api/admin/atlas/:itemId`, `POST /api/admin/atlas/:itemId/publish`, `POST /api/admin/atlas/:itemId/archive`, `POST /api/admin/atlas/assets/upload-url`, `POST /api/admin/atlas/assets/:assetId/finalize`.

## Backend

- Módulo `src/modules/knowledge-atlas/` com Controller → Service → Repository → Supabase; Zod em todo input (`schema.ts` espelha os contratos, incluindo união discriminada de blocos e artefatos).
- `service.publishIssues(document, lessons, assets)` é a fonte única das pendências de publicação (usada no detail e antes de chamar publish, que devolve `VALIDATION_ERROR` com `fieldErrors`).
- Normalização de URL YouTube (`youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, `youtube.com/shorts/`, `youtube-nocookie.com/embed/`, `m.youtube.com`) → `videoId`; outros domínios rejeitados. Sem YouTube Data API.
- URLs assinadas de imagens (TTL curto) geradas pelo service somente para assets referenciados em documento já autorizado pela RPC.
- Upload: `createSignedUploadUrl` no bucket `knowledge-assets`, caminho gerado pelo servidor; nunca aceitar path do cliente.
- `mapRpcError` passa a mapear `40001` → CONFLICT.

## Estados e acessibilidade

Conforme plano aprovado: skeleton por tab reservando geometria de índice, player e artigo; vazio (antes da primeira liberação, busca sem resultado com filtros preservados, coleção vazia); erro independente para lista e detalhe com retry local e retorno seguro; tablist semântica; player com título acessível; alt obrigatório; `aria-live` na cópia; blocos do editor navegáveis e reordenáveis por teclado; `prefers-reduced-motion`; WCAG AA; foco retorna ao item no mobile. `AppShell` nunca é substituído.

## Critérios de aceite

- **GWT-01** Aluno vê apenas itens publicados ligados a aulas liberadas.
- **GWT-02** Aluno não descobre título, tipo ou resumo de recurso futuro (lista, busca, facets, relacionados, detalhe → FORBIDDEN).
- **GWT-03** Conteúdo liberado continua acessível após matrícula concluída.
- **GWT-04** Iframe do vídeo só existe após interação; player não causa layout shift.
- **GWT-05** Conceito sem vídeo mantém artigo completo e estado “Vídeo em preparação”.
- **GWT-06** Prompt copia template base e versão personalizada; clipboard bloqueado apresenta fallback.
- **GWT-07** Design system renderiza apenas previews permitidos.
- **GWT-08** Admin salva rascunho incompleto.
- **GWT-09** Admin não publica sem aulas vinculadas, resumo ou campos obrigatórios.
- **GWT-10** Conceito com vídeo não publica sem legenda revisada e transcrição.
- **GWT-11** Imagem não publica sem alt.
- **GWT-12** Edição concorrente retorna CONFLICT.
- **GWT-13** Arquivamento remove o recurso da visão estudantil.
- **GWT-14** Cross-tenant negado para leitura, escrita e assets.
- **GWT-15** Tabs, filtros, editor e reordenação funcionam por teclado.
- **GWT-16** 375, 768 e 1440 px sem overflow horizontal.
- **GWT-17** Loading, vazio e erro preservam navegação e geometria.

## Premissas e limites

Nome oficial Atlas; `/glossario` só redirect; YouTube não listado é distribuição, não controle de acesso; CMS exclusivo para `admin`; sem comentários, favoritos, histórico ou progresso de vídeo; sem IA para gerar/executar/avaliar prompts; sem importação de HTML/CSS/JS; sem exclusão definitiva pela interface.

## Gates desta execução

1. Spec e contratos sincronizados. ✅ (esta versão)
2. Revisão da spec (spec-reviewer).
3. `0048` aplicada em ambiente controlado — **somente após aprovação explícita de Vinicius** (produção compartilhada).
4. Migration `0051`, RLS e pgTAP.
5. Backend administrativo e testes.
6. CMS desktop.
7. Atlas do aluno em 1440 px, claro e escuro (modo demo com progressão equivalente).
8. **Gate visual humano.**
9. Após aprovação: 768/375, touch, estados e acessibilidade.
10. Testes completos, revisão de código, build e atualização do STATE.
