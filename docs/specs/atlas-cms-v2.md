---
title: "atlas-cms-v2: Spec"
date: 2026-10-05
projeto: "Logos Academy Platform"
fase: "milestone-atlas-cms-2026"
status: approved
wave: 10
tags: [spec, atlas, cms, concepts, prompts, design-systems, video, admin]
depends_on: [student-knowledge-atlas]
---

# Spec: atlas-cms-v2

## Aprovação

Mapa Editorial (12/10): reformulação visual autorizada pelo usuário como elemento assinatura da biblioteca; percurso de 16 aulas em quatro projetos, núcleo Atlas, coleções, conexões responsivas e pulsos de energia. A navegação permanece vinculada aos IDs reais; slots sem aula não podem filtrar por IDs inventados. As conexões expressam navegação curricular, não cobertura de conteúdo publicado. Pulsos pausáveis e estáticos com movimento reduzido.

Refinamento aprovado em 12/10: tags em chips removíveis, inclusão por Enter e prevenção de duplicatas; seletor de blocos com busca, grupos Texto/Visual/Processo/Sistema e miniaturas, seguindo as capturas do usuário. Preservar os 16 tipos e os contratos existentes.

Direção inicial fornecida por Vinicius em 2026-09-15 e ampliada em 2026-10-05 após o uso real do Atlas. Vinicius autorizou planejar e implementar o CMS, com duas exigências centrais: corrigir o conteúdo com caracteres corrompidos e permitir que o próprio administrador publique materiais visualmente ricos sem depender de pedir alterações no código. Esta spec estende `student-knowledge-atlas` (base de leitura do aluno, migration `0048`) sem quebrar seus contratos.

## Objetivo

Substituir o Glossário pelo **Atlas**: uma página única com três coleções (Conceitos, Prompts, Sistemas de Design), alimentada por um **CMS administrativo por blocos visuais controlados** com fluxo editorial rascunho → publicado → arquivado, histórico restaurável e revelação progressiva por aula liberada. O administrador deve conseguir criar conteúdo com a mesma qualidade visual da interface atual sem editar código.

Rota principal `/atlas`. `/glossario` passa a **redirect permanente** para `/atlas?tab=conceitos`.

## Escopo

### Dentro
- Rename de rota + redirect 308.
- Migration complementar sobre a `0048`: estado editorial, tags, revisão, vídeo (transcrição + confirmação de legenda), vínculo N:N recurso↔aula, assets editoriais, bucket privado, RLS, índices, triggers, RPCs admin.
- CMS admin (`/admin/atlas/*`): listagem, editor por blocos, editor de vídeo YouTube, upload de assets, publicação/arquivamento, auditoria, guarda de concorrência por `updatedAt`.
- Biblioteca de composições prontas: comparação, fluxo, passos, checklist, faça/evite, paleta, tipografia e espécime de componente. Inserir um preset cria blocos editáveis, nunca HTML arbitrário.
- Preview fiel usando o mesmo renderer do aluno, checklist de publicação, aviso de alterações não salvas e histórico de revisões com restauração para rascunho.
- Validação preventiva de texto com sinais prováveis de dupla codificação UTF-8; o CMS bloqueia a publicação e aponta o campo afetado.
- 10 endpoints admin novos + extensão dos 4 endpoints de aluno existentes (filtros, blocos ampliados, vídeo com transcrição).
- UI aluno v2: 3 tabs com estado na URL, busca contextual, filtros por ciclo/aula/tags, índice + leitor, player lazy-load, personalizador de prompt, espécimes vivos de design system.

### Fora (não-MVP desta execução)
- Comentários, favoritos, histórico de visualização, controle de progresso de vídeo.
- IA para gerar/executar/avaliar prompts ou escrever conteúdo automaticamente. Uma futura sugestão por IA só poderá devolver os blocos tipados desta spec, atrás de feature flag e nova aprovação.
- Importação de HTML/CSS/JS arbitrário em design systems.
- YouTube Data API (validação de embed é local; sem chave).

## Modelo de dados (complementar à 0048)

> A `0048` já criou `knowledge_resources` (prompt/design_system) e estendeu `concepts` com vídeo/blocos. Esta migration preserva ids e conteúdo editorial existente; o backfill só acrescenta estado, vínculos e blocos visuais onde faltarem, sem apagar texto ou histórico.

### Estado editorial (concepts + knowledge_resources)
- `status text not null default 'published' check (status in ('draft','published','archived'))`.
  - Default `published` no ALTER preserva o comportamento atual das linhas já semeadas.
- `published_at timestamptz`, `archived_at timestamptz`.
- `tags text[] not null default '{}'`.
- `updated_by_user_id uuid` com FK composta `(tenant_id, updated_by_user_id) → logos_academy.users(tenant_id, id)` para auditoria de última alteração; a Service/RPC exige membership `admin` ativa.
- Vídeo (só `concepts`, já tem `video_*`): adicionar `video_transcript text`, `video_captions_reviewed boolean not null default false`. Publicação de conceito **com** vídeo exige `video_transcript` não vazio e `video_captions_reviewed = true`.

### Working draft separado — `knowledge_item_drafts`
- A linha em `concepts`/`knowledge_resources` é sempre a versão publicada (ou o registro-base ainda não publicado). Editar um item publicado **não altera nem retira** o conteúdo que o aluno já lê.
- Colunas: `tenant_id`, `id`, `concept_id uuid`, `resource_id uuid`, `payload jsonb`, `updated_by_user_id`, timestamps, `deleted_at`; `num_nonnulls(concept_id, resource_id) = 1`, FKs compostas e uniques parciais garantem no máximo um working draft ativo por item.
- Criar item grava o registro-base como `draft` e um working draft inicial. Ao começar a editar item publicado sem working draft, o Service projeta a versão publicada no formulário; o primeiro save cria o working draft com guarda `expectedDraftUpdatedAt = null`.
- Salvar altera apenas o working draft. Publicar valida e copia o payload para a tabela canônica na mesma transação, mantém/define `status='published'`, cria revisão e encerra o working draft por soft delete. A versão anterior fica no histórico.
- Restaurar uma revisão cria/substitui somente o working draft; a versão publicada continua visível até nova publicação. Arquivar altera apenas o status canônico e não destrói eventual working draft.
- Concorrência usa dois relógios explícitos: `expectedDraftUpdatedAt` para save/publish/restore e `expectedItemUpdatedAt` para publish/archive. `null` significa que o cliente espera ausência de working draft.

### Vínculo N:N recurso ↔ aula — `knowledge_resource_lessons`
Um prompt ou design system pode pertencer a várias aulas/trilhas.
- Colunas: `tenant_id`, `resource_id`, `lesson_template_id`, timestamps, `deleted_at`.
- PK `(tenant_id, resource_id, lesson_template_id)`; FKs compostas por tenant.
- Migração de dados: copiar o `lesson_template_id` atual de cada `knowledge_resources` para a tabela de vínculo (1 linha por recurso), preservando a coluna antiga como origem canônica até o backend migrar as leituras.
- Regra de acesso passa a ser: recurso `published` **E** ao menos uma aula vinculada liberada.

> Conceitos continuam usando `lesson_concepts` (já existe). O N:N novo é para `knowledge_resources`.

### Assets editoriais — `knowledge_assets`
- Colunas: `tenant_id`, `id`, `concept_id uuid`, `resource_id uuid`, `status text check in ('pending','ready','failed')`, `bucket_path text`, `original_filename text`, `alt text`, `width int`, `height int`, `caption text`, `content_type text check in ('image/png','image/jpeg','image/webp')`, `byte_size int check (<= 5*1024*1024)`, timestamps, `deleted_at`.
- `num_nonnulls(concept_id, resource_id) = 1`; ambas as opções têm FK composta com `tenant_id`, evitando referência polimórfica sem integridade.
- Bucket privado **`knowledge-assets`** (separado de `submissions`). Upload assinado só é emitido ao admin autorizado; leitura assinada só é emitida ao admin autorizado ou ao aluno que já possa ler o item proprietário pela regra de progressão.
- `bucket_path` é gerado no servidor no formato `{tenant_id}/{owner_kind}/{owner_id}/{asset_id}`; nenhum path enviado pelo cliente é aceito.
- Asset `pending` não pode ser publicado nem entregue ao aluno. No finalize, o servidor lê o objeto real e valida existência, magic bytes/MIME, tamanho e dimensões com `file-type` + `sharp`; só então grava metadados verificados, exige `alt` e muda para `ready`. Divergência ou falha marca `failed` e não associa o objeto ao conteúdo.

### Histórico editorial — `knowledge_item_revisions`
- Snapshot append-only após cada operação explícita que altere estado (`save`, `publish`, `archive`, `restore`): `tenant_id`, `id`, `concept_id uuid`, `resource_id uuid`, `revision`, `snapshot jsonb`, `reason text check in ('save','publish','archive','restore')`, `created_by_user_id` com FK composta para `logos_academy.users`, `created_at`, `updated_at`, `deleted_at`.
- `num_nonnulls(concept_id, resource_id) = 1`, FKs compostas e uniques parciais `(tenant_id, concept_id, revision)` / `(tenant_id, resource_id, revision)`, com índices decrescentes por item.
- Save sem diferença semântica não cria revisão. Linhas de revisão nunca sofrem UPDATE/DELETE: `updated_at = created_at`, `deleted_at is null` e trigger append-only rejeita mutação.
- Restaurar nunca sobrescreve silenciosamente o publicado: cria uma nova revisão em estado `draft`, mantendo toda a linha do tempo.
- O snapshot contém apenas o DTO editorial validado, sem URL assinada, secret ou dado pessoal.

### Índices / triggers / RLS
- Índices de listagem admin por `(tenant_id, kind, status, updated_at)` e por tag.
- `set_updated_at` nas tabelas novas.
- RLS habilitada **e forçada** em `knowledge_item_drafts`, `knowledge_resource_lessons`, `knowledge_assets` e `knowledge_item_revisions`; `revoke all` de anon/authenticated; `grant` mínimo a `service_role`.
- pgTAP cobre como `anon` e `authenticated`: lista, detalhe, upload, finalize, revisões e restore não podem executar RPC admin nem ler tabelas diretamente; `service_role` ainda precisa passar `tenant_id` + `actor_user_id` e a RPC repete membership admin ativa.

### Blocos editoriais e visuais — estender `knowledge_content_blocks_valid`
Union atual: `text`, `callout`, `image`, `diagram`. Acrescentar, mantendo os existentes:
- `section` — `{ heading }` (título de seção).
- `list` — `{ ordered: bool, items: string[] }`.
- `gallery` — `{ items: AtlasImageSource[] }` (galeria pequena; máx 6).
- `code` — `{ language: string, code: string }`.
- `quote` — `{ body: string, attribution?: string }` (citação/definição destacada).
- `comparison` — `{ heading, left: { eyebrow?, title, body }, right: { eyebrow?, title, body }, emphasis: 'left'|'right'|'balanced' }`.
- `steps` — `{ heading, items: { title, body? }[] }` (2–6 etapas).
- `checklist` — `{ heading, items: { label, detail? }[] }` (2–8 itens).
- `do_dont` — `{ heading, do: string[], dont: string[] }`.
- `palette` — `{ heading, colors: { name, value, usage? }[] }` (2–8 cores; `value` validado como hex).
- `typography` — `{ heading, samples: { role, family, weight, sample }[] }`.
- `specimen` — union discriminada pelos componentes seguros definidos abaixo.
- `image` usa `source: AtlasImageSource`.

Contrato estrutural obrigatório para todo bloco administrativo:
```typescript
type AtlasBlockBase = { id: UUID; isVisible: boolean };
type AtlasImageSource =
  | { kind: "asset"; assetId: UUID; alt: string; caption?: string }
  | { kind: "external"; url: `https://${string}`; alt: string; caption?: string };
type AtlasSpecimen =
  | { component: "button"; props: { label: string; variant: "primary" | "secondary" | "outline"; disabled: boolean } }
  | { component: "field"; props: { label: string; placeholder: string; helpText?: string; state: "default" | "error" | "success" } }
  | { component: "card"; props: { eyebrow?: string; title: string; body: string; actionLabel?: string } }
  | { component: "badge"; props: { label: string; tone: "neutral" | "accent" | "success" | "warning" } }
  | { component: "callout"; props: { title: string; body: string; tone: "info" | "warning" | "success" } }
  | { component: "navigation"; props: { items: readonly string[]; activeIndex: number } }
  | { component: "editorial"; props: { eyebrow?: string; title: string; summary: string } };
```
Cada variante de `KnowledgeContentBlock` é `AtlasBlockBase & { type: ... }`. `asset` e `external` são mutuamente exclusivos pelo discriminante `source.kind`. O admin atribui `id` UUID uma vez; duplicar gera outro id. `isVisible=false` preserva o bloco apenas no rascunho/preview administrativo e ele nunca integra DTO estudantil, busca ou leitura publicada.

Blocos de propósito visual: `image`, `diagram`, `gallery`, `comparison`, `steps`, `checklist`, `do_dont`, `palette`, `typography` e `specimen`. Regras de publicação:
- conceito: ao menos 1 bloco visual e ao menos 1 bloco textual explicativo;
- prompt: artefato de prompt completo (objetivo, template, variáveis e exemplo) conta como bancada visual funcional; se não houver variáveis, exige 1 bloco visual adicional;
- sistema de design: paleta válida e ao menos 1 `specimen` obrigatório;
- todo asset exige `alt`; cor nunca pode ser o único portador de significado; blocos vazios ou com mojibake são recusados.

O renderer é um pacote compartilhado entre preview administrativo e Atlas do aluno. A fronteira será:
- `AtlasContentRenderer({ blocks, assets, mode })`: blocos e assets já resolvidos, sem fetch interno;
- `AtlasArtifactRenderer({ artifact, mode })`: bancada de prompt ou espécime de design system;
- `AtlasVideoRenderer({ video, mode })`: player/transcrição, com preview seguro;
- `AtlasItemRenderer({ item, mode, viewport })`: única composição dos três renderers acima, usada por aluno e preview admin.

Índice, busca, filtros e controles do editor ficam fora desse pacote. `mode` é `student | admin_preview`; não altera estrutura/conteúdo, apenas habilita contornos e rótulos editoriais no preview. O servidor resolve `assetId` para `ResolvedAtlasAsset` somente após autorização. O `ConceptVisualReference` hardcoded será migrado para blocos persistidos e removido após o backfill, para que nenhum conceito dependa de `slug` para ganhar ilustração.

## RPCs administrativas (service_role only, SECURITY DEFINER)

Toda RPC repete a autorização admin e o `tenant_id`. Nenhuma executável por `authenticated`/`anon`.

- `admin_atlas_list(tenant, actor, kind?, status?, curriculum?, cycle?, lesson?, tags?, search?, cursor?, limit)` → página de itens.
- `admin_atlas_detail(tenant, actor, item_id)` → item completo para o editor, com versão publicada e working draft separados.
- `admin_atlas_upsert(tenant, actor, payload, expectedDraftUpdatedAt)` → cria/edita somente o working draft. Valida blocos/artefato/metadados e rejeita relógio divergente.
- `admin_atlas_publish(tenant, actor, item_id, expectedDraftUpdatedAt, expectedItemUpdatedAt)` → valida o working draft, copia para a linha canônica e encerra o draft atomicamente.
- `admin_atlas_archive(tenant, actor, item_id, expectedItemUpdatedAt)` → `archived`; aplica guarda da linha canônica, some das listas do aluno e preserva registro/draft.
- `admin_atlas_revisions(tenant, actor, item_id, cursor?, limit)` → histórico paginado sem snapshots pesados na listagem.
- `admin_atlas_restore(tenant, actor, item_id, revision, expectedDraftUpdatedAt)` → valida snapshot e cria/substitui working draft sem tocar na versão publicada.
- `admin_atlas_asset_authorize(tenant, actor, owner, content_type, byte_size)` → cria linha `knowledge_assets` pendente + devolve dados para URL assinada de upload.
- `admin_atlas_asset_finalize(tenant, actor, asset_id, alt, caption?)` → inspeciona o objeto após upload, persiste apenas metadados derivados no servidor e exige `alt`.

Auditoria: toda escrita registra `updated_by_user_id` + timestamp e cria `audit_events`; payload do evento contém ids/status, nunca conteúdo integral ou URL assinada.

## API Contract — Sync Request para `specs/api.contracts.ts`

> Este bloco é a fonte exata do sync contratual a executar imediatamente após o gate humano. Até ele ser copiado para `specs/api.contracts.ts` e o type-check passar, o build permanece bloqueado.

### Tipos
- `KnowledgeItemStatus = "draft" | "published" | "archived"`.
- `KnowledgeVideo = { youtubeId: string; title: string; durationMinutes: number; transcript: string | null; captionsReviewed: boolean }`.
- `KnowledgeContentBlock` — union estendida (blocos editoriais e visuais acima; image usa `AtlasImageSource`).
- `ConceptDetail` e `LibraryResourceDetail` ganham `resolvedAssets: readonly ResolvedAtlasAsset[]`; cada URL curta já passou pela mesma autorização pedagógica do detalhe.
- `AtlasItemKind = "concept" | "prompt" | "design_system"`.
- DTOs admin: `AdminAtlasListQuery`, `AdminAtlasListItem`, `AdminAtlasDetail`, `AdminAtlasCreateInput`, `AdminAtlasDraftInput`, `AdminAtlasSaveInput`, `AdminAsset`, `AdminAssetUploadRequest/Response`, `AdminAssetFinalizeInput`.
- Revisões/assets: `AdminAtlasRevisionListItem`, `AdminAtlasRestoreInput`, `AdminAsset`, `AdminAssetUploadResponse`, `ResolvedAtlasAsset`.

### Assinaturas canônicas
```typescript
type AdminAtlasListQuery = PageQuery & {
  kind?: AtlasItemKind;
  status?: KnowledgeItemStatus;
  curriculum?: UUID;
  cycle?: UUID;
  lesson?: UUID;
  tags?: readonly string[];
  search?: string;
};
type AdminAtlasCreateInput = { kind: AtlasItemKind; title: string };
type AdminAtlasDraftCommon = {
  title: string;
  slug: string;
  summary: string;
  tags: readonly string[];
  lessonTemplateIds: readonly UUID[];
  contentBlocks: readonly KnowledgeContentBlock[];
};
type AdminAtlasConceptDraft = AdminAtlasDraftCommon & { kind: "concept"; video: KnowledgeVideo | null; artifact: null };
type AdminAtlasPromptDraft = AdminAtlasDraftCommon & { kind: "prompt"; video: null; artifact: Extract<LibraryArtifact, { type: "prompt" }> };
type AdminAtlasDesignSystemDraft = AdminAtlasDraftCommon & { kind: "design_system"; video: null; artifact: Extract<LibraryArtifact, { type: "design_system" }> };
type AdminAtlasDraftInput = AdminAtlasConceptDraft | AdminAtlasPromptDraft | AdminAtlasDesignSystemDraft;
type AdminAtlasSaveInput = { expectedDraftUpdatedAt: ISODateTime | null; draft: AdminAtlasDraftInput };
type AdminAtlasRestoreInput = { itemId: UUID; revision: number; expectedDraftUpdatedAt: ISODateTime | null };
type AdminAtlasListItem = {
  id: UUID; kind: AtlasItemKind; title: string; summary: string;
  status: KnowledgeItemStatus; tags: readonly string[]; linkedLessonCount: number;
  hasWorkingDraft: boolean; itemUpdatedAt: ISODateTime; draftUpdatedAt: ISODateTime | null;
  updatedByUserId: UUID | null;
};
type AdminAtlasDetailBase = {
  id: UUID; status: KnowledgeItemStatus; itemUpdatedAt: ISODateTime;
  publishedAt: ISODateTime | null; archivedAt: ISODateTime | null;
  hasWorkingDraft: boolean; draftUpdatedAt: ISODateTime | null;
  assets: readonly AdminAsset[]; resolvedAssets: readonly ResolvedAtlasAsset[];
  revisionCount: number;
};
type AdminAtlasDetail = AdminAtlasDetailBase & (
  | { kind: "concept"; draft: AdminAtlasConceptDraft; published: AdminAtlasConceptDraft | null }
  | { kind: "prompt"; draft: AdminAtlasPromptDraft; published: AdminAtlasPromptDraft | null }
  | { kind: "design_system"; draft: AdminAtlasDesignSystemDraft; published: AdminAtlasDesignSystemDraft | null }
);
type AdminAssetUploadRequest = {
  ownerKind: "concept" | "resource";
  ownerId: UUID;
  filename: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  sizeBytes: number;
};
type AdminAssetFinalizeInput = { alt: string; caption?: string };
type AdminAsset = {
  id: UUID; ownerKind: "concept" | "resource"; ownerId: UUID;
  status: "pending" | "ready" | "failed"; filename: string;
  contentType: "image/png" | "image/jpeg" | "image/webp"; sizeBytes: number;
  width: number | null; height: number | null; alt: string | null; caption: string | null;
  createdAt: ISODateTime; updatedAt: ISODateTime;
};
type AdminAssetUploadResponse = { asset: AdminAsset; signedUploadUrl: string; expiresAt: ISODateTime };
type ResolvedAtlasAsset = {
  id: UUID; readUrl: string; expiresAt: ISODateTime; alt: string;
  caption: string | null; width: number; height: number;
  contentType: "image/png" | "image/jpeg" | "image/webp";
};
type AdminAtlasRevisionListItem = {
  revision: number; reason: "save" | "publish" | "archive" | "restore";
  title: string; createdByUserId: UUID; createdAt: ISODateTime;
};
// Propriedade adicionada às interfaces existentes no sync contratual:
interface ConceptDetail { resolvedAssets: readonly ResolvedAtlasAsset[] }
interface LibraryResourceDetail { resolvedAssets: readonly ResolvedAtlasAsset[] }

"GET /api/student/concepts": Endpoint<PageQuery & { search?: string; cycle?: UUID; lesson?: UUID; hasVideo?: boolean; readingMax?: number }, Page<ConceptSummary>>;
"GET /api/student/concepts/:conceptId": Endpoint<{ conceptId: UUID }, ConceptDetail>;
"GET /api/student/library": Endpoint<PageQuery & { kind: LibraryResourceKind; search?: string; cycle?: UUID; lesson?: UUID; tags?: readonly string[] }, Page<LibraryResourceSummary>>;
"GET /api/student/library/:resourceId": Endpoint<{ resourceId: UUID }, LibraryResourceDetail>;
"GET /api/admin/atlas": Endpoint<AdminAtlasListQuery, Page<AdminAtlasListItem>>;
"POST /api/admin/atlas": Endpoint<AdminAtlasCreateInput, AdminAtlasDetail>;
"GET /api/admin/atlas/:itemId": Endpoint<{ itemId: UUID }, AdminAtlasDetail>;
"PATCH /api/admin/atlas/:itemId": Endpoint<{ itemId: UUID } & AdminAtlasSaveInput, AdminAtlasDetail>;
"POST /api/admin/atlas/:itemId/publish": Endpoint<{ itemId: UUID; expectedDraftUpdatedAt: ISODateTime; expectedItemUpdatedAt: ISODateTime }, AdminAtlasDetail>;
"POST /api/admin/atlas/:itemId/archive": Endpoint<{ itemId: UUID; expectedItemUpdatedAt: ISODateTime }, AdminAtlasDetail>;
"GET /api/admin/atlas/:itemId/revisions": Endpoint<{ itemId: UUID } & PageQuery, Page<AdminAtlasRevisionListItem>>;
"POST /api/admin/atlas/:itemId/revisions/:revision/restore": Endpoint<AdminAtlasRestoreInput, AdminAtlasDetail>;
"POST /api/admin/atlas/assets/upload-url": Endpoint<AdminAssetUploadRequest, AdminAssetUploadResponse>;
"POST /api/admin/atlas/assets/:assetId/finalize": Endpoint<{ assetId: UUID } & AdminAssetFinalizeInput, AdminAsset>;
```

### Endpoints de aluno (compatíveis; estendidos)
- `GET /api/student/concepts` — ganha filtros `cycle?`, `lesson?`, `hasVideo?`, `readingMax?`; item passa a expor `videoAvailable`, `tags`.
- `GET /api/student/concepts/:conceptId` — detalhe passa a expor `video: KnowledgeVideo | null`, `resolvedAssets` autorizados (mantém campos flat como deprecated até o front migrar) e blocos ampliados.
- `GET /api/student/library` — ganha `cycle?`, `lesson?`, `tags?`.
- `GET /api/student/library/:resourceId` — ganha blocos ampliados e `resolvedAssets` autorizados.

### Endpoints admin (novos)
- `GET /api/admin/atlas` — lista filtrável/paginada de itens.
- `POST /api/admin/atlas` — cria rascunho (`kind` obrigatório).
- `GET /api/admin/atlas/:itemId` — detalhe para edição.
- `PATCH /api/admin/atlas/:itemId` — salva working draft (guarda por `expectedDraftUpdatedAt`, inclusive `null`).
- `POST /api/admin/atlas/:itemId/publish` — publica com validações.
- `POST /api/admin/atlas/:itemId/archive` — arquiva com `expectedItemUpdatedAt`.
- `GET /api/admin/atlas/:itemId/revisions` — histórico paginado.
- `POST /api/admin/atlas/:itemId/revisions/:revision/restore` — restaura como novo rascunho.
- `POST /api/admin/atlas/assets/upload-url` — autoriza upload → URL assinada.
- `POST /api/admin/atlas/assets/:assetId/finalize` — confirma asset; cliente envia `alt`/`caption`, servidor deriva MIME/tamanho/dimensões.

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

## Experiência do CMS

- Entrada no menu administrativo: `Atlas`; dashboard com contagem de rascunhos, publicados, arquivados e pendências de publicação.
- Criar conteúdo começa pela escolha `Conceito`, `Prompt` ou `Sistema de Design`; cada tipo abre um template inicial útil, nunca uma tela totalmente vazia.
- Editor em três regiões no desktop: estrutura de blocos, propriedades do bloco selecionado e preview fiel. Em telas menores, as regiões viram etapas; o CMS continua utilizável em 768 px, mas edição densa é otimizada para desktop.
- Ações por bloco: adicionar por preset, duplicar, mover por botões/teclado ou drag handle, ocultar do rascunho e remover com undo local.
- `Salvar rascunho` é explícito, com indicador de estado (`Alterações não salvas`, `Salvando`, `Salvo às…`, `Conflito`). Mudanças não salvas bloqueiam saída acidental.
- `Publicar` abre checklist com erros clicáveis que focam o campo/bloco correspondente. O botão só habilita após validação local e a RPC repete todas as regras.
- Preview usa dados do formulário ainda não salvos, o mesmo renderer e os mesmos breakpoints/tokens do aluno; oferece 375/768/1440 e tema claro/escuro.
- Presets visuais não codificam cores livres: usam tokens do design system. Paletas editoriais exibem as cores do conteúdo, mas a moldura e os controles continuam usando tokens da plataforma.
- Busca/listagem admin mostram tipo, status, aulas vinculadas, última alteração e responsável; filtros ficam na URL.

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

- **GWT-01:** **Dado** aluno com uma ou mais aulas liberadas, **quando** lista ou busca no Atlas, **então** recebe somente itens `published` vinculados a ao menos uma dessas aulas.
- **GWT-02:** **Dado** item futuro, `draft` ou `archived`, **quando** o aluno lista, busca ou abre seu UUID, **então** ele não aparece nas coleções e o detalhe retorna `FORBIDDEN` sem título, tipo ou resumo.
- **GWT-03:** **Dado** item liberado antes da conclusão da matrícula, **quando** o aluno conclui e volta ao detalhe, **então** a leitura permanece disponível em modo somente leitura.
- **GWT-04:** **Dado** conceito com vídeo válido, **quando** o aluno abre o detalhe e ainda não interagiu, **então** não existe iframe; **quando** inicia e depois troca de item, **então** o layout não salta e a reprodução anterior é encerrada.
- **GWT-05:** **Dado** conceito publicado sem vídeo, **quando** o aluno abre o detalhe, **então** vê artigo completo, tempo de leitura, “Vídeo em preparação” e CTA “Começar pela leitura”.
- **GWT-06:** **Dado** prompt publicado, **quando** o aluno copia o template ou preenche variáveis e copia a versão personalizada, **então** recebe confirmação por `aria-live`; se Clipboard API falhar, recebe fallback de seleção manual sem perder o texto.
- **GWT-07:** **Dado** sistema de design publicado, **quando** o renderer recebe o artefato, **então** renderiza somente variantes da lista fechada e rejeita HTML, CSS, JavaScript ou props não previstas.
- **GWT-08:** **Dado** rascunho incompleto, **quando** o admin salva, **então** o rascunho é preservado; **quando** tenta publicar sem vínculo/resumo/campo obrigatório, ou vídeo sem transcrição/legenda revisada, **então** a publicação falha sem mudar o status.
- **GWT-09:** **Dado** editor aberto com `expectedDraftUpdatedAt` ou `expectedItemUpdatedAt` antigo, **quando** outra sessão já salvou, publicou, arquivou ou restaurou o item, **então** a nova mutação retorna `CONFLICT` e não sobrescreve dados.
- **GWT-10:** **Dado** item publicado, **quando** admin arquiva com versão atual, **então** cria revisão `archive`, remove o item de lista/busca/detalhe estudantil e preserva registro e histórico.
- **GWT-11:** **Dado** ator do tenant B com ids pertencentes ao tenant A, **quando** lista, lê, salva, publica, arquiva, restaura, autoriza/finaliza asset ou pede leitura assinada, **então** recebe negação fail-closed sem metadados nem URL.
- **GWT-12:** **Dado** uso por teclado ou viewport 375/768/1440, **quando** admin/aluno navega tabs, filtros, editor e reordenação, **então** foco, estados loading/vazio/erro e geometria permanecem utilizáveis, sem overflow global e respeitando reduced motion.
- **GWT-13:** **Dado** admin sem conhecimento de código, **quando** cria conceito pelo preset “Comparação”, edita os lados e abre preview, **então** vê o mesmo resultado do aluno e consegue publicar sem intervenção técnica.
- **GWT-14:** **Dado** conteúdo sem visual obrigatório, alt, vínculo, espécime/paleta, campo de prompt ou com sinal de mojibake, **quando** admin abre o checklist ou publica, **então** recebe erro com caminho estável que foca o campo/bloco correspondente.
- **GWT-15:** **Dado** o mesmo DTO normalizado, **quando** preview admin e página do aluno renderizam em 375/768/1440 e claro/escuro, **então** ambos usam `AtlasItemRenderer` e produzem a mesma árvore de conteúdo/artifact/assets; apenas os contornos editoriais de `mode` diferem.
- **GWT-16:** **Dado** operação explícita que altera estado, **quando** admin salva, publica, arquiva ou restaura, **então** cria exatamente uma revisão append-only; restaurar cria novo rascunho sem alterar snapshots anteriores ou posteriores, e save sem mudança não cria revisão.
- **GWT-17:** **Dado** asset pendente, inexistente, cross-tenant, acima de 5 MB ou cujo objeto diverge em MIME/magic bytes/tamanho/dimensões, **quando** finaliza, publica ou pede leitura, **então** o servidor não o marca `ready`, não publica o item e não retorna URL assinada.

## Gates desta execução (mapa → fases /logos)

1. Spec + contratos sincronizados e revisados (`@spec-reviewer`) — **fase 5**, human gate `specs_batch`.
2. Migration complementar + RLS + pgTAP; `0048` aplicada antes — **fase 6** (worker `dba`).
3. Backend admin (CMS APIs + RPCs) com TDD, C→S→R, Zod — **fase 7** (`backend-engineer`).
4. CMS desktop + Atlas do aluno 1440 (claro/escuro) — **fase 8**; **gate visual humano**.
5. Após aprovação: 768/375, touch, estados e a11y final — **fase 8**.
6. Testes completos, revisão, build, STATE atualizado — **fase 10/11**.
7. Produção só após gate visual + aprovação explícita de deploy — **fase 12**.

## Restrições técnicas

- **Arquitetura:** Controller → Service → Repository → Supabase; renderer compartilhado não acessa rede/banco.
- **Tabelas:** `concepts`, `knowledge_resources`, `knowledge_item_drafts`, `knowledge_resource_lessons`, `knowledge_assets`, `knowledge_item_revisions`, `lesson_concepts`, `users`, `tenant_memberships`, `audit_events`.
- **Endpoints:** os 14 listados no bloco API Contract (4 estudantis compatíveis + 10 administrativos).
- **Lib nova:** `sharp`, dependência runtime usada exclusivamente no servidor para decodificar PNG/JPEG/WebP, validar formato real e extrair dimensões. Reorder e presets não adicionam biblioteca.
- **Background jobs:** não no MVP; cada asset tem no máximo 5 MB e é inspecionado de forma síncrona no finalize com timeout e limite de memória.

## Tokens e APIs externas

| API | Uso | Limite/custo | Fallback |
|---|---|---|---|
| Supabase Storage | bucket privado, upload e leitura assinados | plano do projeto; 5 MB por asset | rascunho permanece editável e asset fica `failed` |
| YouTube `youtube-nocookie.com` | embed lazy de vídeo não listado | sem YouTube Data API | transcrição e link externo explícito |

## Sub-agents designados

| Agent | Responsabilidade | SOP |
|---|---|---|
| `dba` | migration, RLS, GRANTs, storage e pgTAP | fase 6 `/logos` |
| `backend-engineer` | módulo C→S→R, Zod, endpoints e testes | fase 7 `/logos` |
| `component-builder` | renderer e blocos compartilhados | fase 8 wave 0 `/logos` |
| `frontend-engineer` | CMS, preview e integração estudantil | fase 8 `/logos` |
| `ui-polisher` | microinterações sem alterar comportamento | pós-wave fase 8 `/logos` |
| `code-reviewer` | diff + migration + integração | fase 10 `/logos` |
| `security-auditor` | assets, RLS e cross-tenant | fase 10 `/logos` |

## Validação

```bash
python "C:/Users/everex/Documents/Logos Tech/.agents/skills/logos/scripts/validate.py"
npm run lint
npm test
npx tsc --noEmit
npm run build
npx supabase test db
```

- E2E autenticado: admin cria rascunho com preset, envia asset, publica, aluno liberado lê, admin restaura e arquiva.
- Browser: handshake visual em 1440 claro/escuro antes de adaptar 768/375; depois validar teclado, reduced motion e ausência de overflow.

## Premissas e limites

- Adendo de implementação (12/10): `GET /api/admin/atlas/options` entrega aulas ativas paginadas e totais globais por coleção/status, com autorização administrativa revalidada no banco. O mapa permite filtrar por coleção/aula, mas não afirma cobertura editorial por aula sem um agregado específico.
- O histórico expõe metadados e restauração real para rascunho; o contrato não contém snapshots para comparar previews de versões antigas.
- Referências aprovadas: `docs/design-refs/claude-admin/Atlas CMS.dc.html` e `Revisoes Admin.dc.html`. O runtime de protótipo não é incluído na aplicação.
- Nome oficial: **Atlas**; `/glossario` só redirect.
- CMS exclusivo para `admin`.
- YouTube não listado é distribuição, não controle de acesso.
- Vídeos publicados no YouTube fora da plataforma; CMS registra e valida embed.
- Sem IA generativa no MVP, sem import de HTML/CSS/JS, sem YouTube Data API nesta versão.
- A autonomia editorial desta versão vem de presets e blocos validados. Uma assistência por IA pode ser adicionada depois sem mudar o renderer, desde que produza exclusivamente `KnowledgeContentBlock[]` válido e permaneça sob revisão humana antes de salvar.
