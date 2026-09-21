---
title: "Logos Academy Platform — State of Project"
date: 2026-09-20
fase_atual: "12"
etapa_atual: "Atlas ampliado com leitura progressiva, referências visuais e conceito de RAG; pronto para gate visual"
produto_tipo: "saas-premium"
proximo_passo: "Realizar gate visual humano do Atlas premium em 1440, 768 e 375 px; após aprovação, consolidar a página"
fases_skipped: []
gates:
  fase_1: pass
  fase_2: pass
  fase_3: pass
  fase_4: pass
  fase_5: pass
  fase_6: pass
  fase_7: pass
  fase_8: pass
  fase_9: pass
  fase_10: pass
  fase_11: pass
  fase_12: pass
features: { draft: 0, approved: 14, built: 14, reviewed: 12 }
overrides:
  - gate: npm-audit
    data: 2026-09-08
    motivo: "1 critical + 4 moderate sao devDependencies (Vitest/esbuild dev-server, nunca em producao); 2 high sao postcss build-time interno do Next 15 com CSS 100% first-party — zero vetor runtime em producao. CSO PASS 9/10. Limpo pelo upgrade Next 16 (em git stash) como milestone proprio."
status: "🟡 Produção estável · redesign local"
tags: [status, roadmap, logos-academy, plataforma-estudantil]
---

# ESTADO — Logos Academy Platform

> Driver único do projeto. A skill `/logos` lê este arquivo para rotear o trabalho.

## Em Andamento

- [ ] `student-knowledge-atlas`: versão premium implementada e validada em 1440/768/375, tema claro/escuro e movimento reduzido; aguardando gate visual humano.
- [x] `explorer-activity-system-v2`: implementação local concluída, gate visual aprovado e migrations aplicadas de forma controlada no Supabase.
- [x] `student-activity-workbench`: Mesa de Atividade Explorer v2 validada em 1440/768/375, tema claro/escuro e movimento reduzido; gate visual aprovado.
- [ ] Implementação do milestone `student-experience-elevation`: redesign de Início, Jornada, Projetos e Atividade; produção permanece estável até validação visual e deploy aprovado.

## Concluído

- [2026-09-20] Referência visual de RAG corrigida: conectores agora pertencem ao nó de destino por meio do componente interno reutilizável `FlowSequence`, evitando setas soltas, texto comprimido ou contato com bordas quando um fluxo cresce ou quebra linha. O beacon decorativo sem função do mapa foi removido para não parecer um quarto estado. Browser confirmou o RAG em 1440 e 375 px sem overflow; TypeScript, lint focalizado e testes do Atlas passaram.

- [2026-09-20] Auditoria e polish estrutural do Atlas concluídos: mapa e workspace passaram a compartilhar a mesma coluna, eliminando divisores desalinhados; âncoras respeitam as tabs sticky; a barra de leitura ganhou afastamento e progresso inicial correto; borda lateral irregular do item ativo foi removida; focos dentro de superfícies recortadas e alvos de toque foram corrigidos. Conceitos, Prompts e Sistemas de Design foram verificados em 1440/768/375, temas claro/escuro e movimento reduzido, sem overflow. Detector Impeccable zerou findings; TypeScript, lint focalizado, 72 testes e build passaram.

- [2026-09-20] Mapa de domínio do Atlas corrigido para representar exatamente as três coleções disponíveis: Conceitos, Prompts e Sistemas de Design. Os cinco nós e o pacote animado independente foram reduzidos a três marcadores; cada aba agora ativa exclusivamente seu ponto correspondente.

- [2026-09-20] Leitura conceitual do Atlas ampliada sem alongar a página: o primeiro bloco permanece exposto e os tópicos complementares entram em um `<details>` nativo, acessível por teclado. Hierarquia visual, Contraste e RAG receberam comparações visuais explicativas; RAG foi criado como conceito completo e vinculado à aula 11 pela migration 0052, respeitando a liberação progressiva. TypeScript, lint focalizado, 72 testes e build passaram; o browser confirmou o fluxo e ausência de overflow em 375 px.

- [2026-09-20] Player real do Atlas: “Hierarquia visual” passou a carregar sob demanda um vídeo público da Visme, com capa real, autoplay após gesto, controles, legendas do YouTube, tela cheia e saída externa. A CSP ganhou permissão mínima apenas para `youtube-nocookie.com`; a migration 0051 sincroniza os metadados no Supabase sem alterar migrations históricas.

- [2026-09-20] Atlas reformulado pela fusão entre a mesa cartográfica existente e o protótipo `Atlas.dc.html`, sem copiar sua estrutura: campo orbital SVG animado, rota viva entre coleções, marcador de progresso de leitura, transição compartilhada de abas e resposta física nos materiais. Framer Motion já presente no projeto foi reutilizado, sem dependências novas; 72 testes, lint com zero erros e build passaram. Inspeção real confirmou ausência de overflow em 1440/768/375, temas claro/escuro e fallback de movimento reduzido.

- [2026-09-20] Candidato desktop do Atlas implementado em `/atlas`, com redirecionamento permanente de `/glossario`, três bibliotecas conectadas, mapa de domínio, busca contextual, vídeo sob demanda, personalização e cópia de prompts e espécimes vivos de sistemas de design. TypeScript, lint com zero erros, 72 testes e build passaram; temas claro/escuro foram inspecionados em 1440 px sem overflow. O CMS permanece fora desta entrega porque sua spec ainda está em rascunho.

- [2026-09-15] Publicação controlada do Explorer v2 no Supabase: como a 0045 original tentava reescrever o snapshot imutável da v1, ela foi corrigida para acrescentar apenas os campos de brief com valores históricos preservados; o conteúdo específico entrou exclusivamente no namespace v2. Foram aplicadas 0045, 0046, 0047, 0049 e 0050. Auditoria remota confirmou currículo v2 ativo, 4 ciclos, 16 atividades, Project Days 4/8/12/16, 63 requisitos, 92 critérios, projeção `student_activity_detail` v2, RLS forçado e execução exclusiva por `service_role`.

- [2026-09-15] Auditoria final da Mesa de Atividade Explorer v2: a prévia demo foi alinhada aos campos pedagógicos específicos das 16 missões (contexto, continuidade, evidência de portfólio, reflexão e ferramentas), em vez de usar textos genéricos. A suíte agora assegura que as 16 atividades e as 16 orientações existem e são completas; TypeScript, lint focalizado e 69 testes passaram. A disponibilidade remota continua condicionada ao gate humano e à aplicação controlada das migrations 0049/0050.

- [2026-09-15] Sincronizado o commit remoto `de3c071` (`feat: remodela agenda e perfil do estudante`): a branch local avançou por fast-forward, preservando a Mesa de Atividade ainda em trabalho. Dependências do calendário foram instaladas; TypeScript, 69 testes e build passaram. O calendário importado mantém avisos de lint internos sem bloquear a compilação.

- [2026-09-15] Correção do circuito da Mesa de Atividade: o destino dos seis fios deixou de usar uma altura fixa e agora é medido no DOM a partir do botão de envio ativo. Assim, em cada atividade e versão, a convergência termina na borda visível de “Enviar versão” ou “Enviar nova versão”, mesmo com formulários de alturas diferentes. TypeScript e 69 testes passaram.

- [2026-09-15] `explorer-activity-system-v2` consolidado localmente: 16 atividades em quatro ciclos foram estruturadas com desafio, objetivo, passos, entregáveis, critérios, plano B e evidência de portfólio; cada Project Day fecha um ciclo. A Mesa de Atividade passou a exibir contexto, rota do projeto, feedback e iteração, histórico paginado (cinco versões por página), abertura de arquivo já anexado, razão explícita de somente leitura e revisões imutáveis. Contracts, Controller → Service → Repository e migrations 0049/0050 foram sincronizados. Browser validou os percursos Explorer, Automation Lab e AI Product, 1440/768/375 sem overflow, tema claro/escuro e movimento reduzido; 69 testes, TypeScript, lint e build passaram. pgTAP 047/048 foi escrito, mas não executado porque Docker/Supabase local não estão disponíveis. Aguarda gate visual e aplicação remota.

- [2026-09-12] Acabamento v7 da emenda do circuito concluído: as terminações da hero foram recalculadas na altura real da borda, os seis pares agora se prolongam sobre ela e encontram o campo da página com desvio máximo de 0,8 px, sem terminais arredondados visíveis. Auditoria do fluxo confirmou que `/atividade` é orientada pelo `assignmentId`: o endpoint deriva projeto e trilha pelo ciclo da atividade, e a liberação de uma atividade de outro ciclo coloca o respectivo projeto em andamento. Assim, ao entrar pela navegação normal, o novo projeto e suas atividades substituem os anteriores; uma URL antiga com `assignmentId` continua exibindo deliberadamente o histórico antigo. Browser 1440, 64 testes, TypeScript, lint e build passaram.

- [2026-09-12] Refinamento v6 dos circuitos da Atividade concluído: a emenda hero/conteúdo foi alinhada com menos de 1 px de diferença; os seis fios ganharam rotas mais abertas, revestimento reduzido para 5 px, menor opacidade e ficaram sem contorno preto. A convergência foi medida no DOM e termina a 0,6 px do centro superior do botão “Enviar nova versão”, com conector vertical até o CTA. Browser 1440 e movimento reduzido passaram; 64 testes, TypeScript, lint e build passaram.

- [2026-09-12] Circuito visual v5 da Atividade concluído: seis fios Bézier com revestimento de 8 px, condutor e pulso interno saem visivelmente do núcleo “07”, percorrem a oficina em rotas diferentes e convergem no conector da ação “Enviar nova versão”. Opacidade foi calibrada para manter o conteúdo legível; movimento reduzido remove os pulsos. Browser 1440 e página inteira passaram; 64 testes, TypeScript, lint e build passaram.

- [2026-09-12] Desktop v4 de `student-activity-workbench` concluído após feedback visual: hero reconstruído como núcleo energético com Hover Grid e circuito pulsante até a área de envio; feedback ganhou entrada e chamadas finitas; “Pronto significa” virou checkpoint interativo; passos viraram rota conectada; apoios usam disclosures animados; Nova iteração ganhou preparação, pendências e progresso; Qualidade virou seção vertical própria; Histórico virou timeline expansível. Navegação 01–04, tema claro/escuro e movimento reduzido foram validados no browser; 64 testes, TypeScript, lint e build passaram.

- [2026-09-12] Polish desktop v3 de `student-activity-workbench` concluído com `component-scout` e `ui-polisher`: índice sticky com seção ativa e `aria-current`, CTA principal com resposta magnética contida, estado visual do anexo, hovers direcionais, disclosures táteis e motion focal sem loops ornamentais. A inspeção real em 1440 claro/escuro confirmou o índice abaixo do header, navegação correta e `prefers-reduced-motion`; 64 testes, TypeScript, lint focalizado e build passaram. Aguarda gate visual humano.

- [2026-09-12] Candidato desktop v2 de `student-activity-workbench` concluído: a Atividade ganhou orientação pedagógica, “pronto significa”, passos, apoios recolhíveis, múltiplos entregáveis, critérios atômicos, feedback geral e por critério, restauração segura após revisão, indicação de atraso, recibo de rascunho e histórico expansível com abertura de arquivos. A migration 0047 reescreve as 16 atividades a partir do currículo e preserva RLS/imutabilidade em runtime. Browser 1440 claro/escuro passou sem overflow; 64 testes, TypeScript, lint, build e `validate.py` passaram. Aguarda gate visual; migrations 0045–0047 continuam apenas locais.

- [2026-09-11] Candidato desktop de `student-activity-workbench` entregue para gate: `/atividade` virou uma mesa de construção com percurso real do projeto, feedback prioritário, fluxo conceito → decisão → evidência → feedback → revisão, formulário tipado para texto/arquivo/link/GitHub, critérios, conceitos e histórico. O contrato `ActivityDetail`, demo e migration 0046 foram sincronizados sem rota nova; 1440 px passou em tema claro/escuro, sem overflow ou erro de console. 63 testes, TypeScript e lint passaram. Responsividade e build final aguardam aprovação do desktop.

- [2026-09-11] `project-living-dossier` implementado localmente: `/projetos/[projectId]` ganhou Norte do projeto, brief pedagógico, critérios, conceitos e Mapa de decisões com versões, decisões e feedbacks vinculados às atividades. O contrato `ProjectDetail`, o modo demo e a migration 0045 foram sincronizados; migration ainda não aplicada em produção. Inspeção em 375/768/1440 passou sem overflow; 63 testes, TypeScript, lint e build passaram, restando apenas o warning preexistente de `isActionable` em `activity-detail.tsx`. Dev server reiniciado após o build.

- [2026-09-11] Iteração `auth-estudio-vivo` v4 — Campo Geodésico — concluída localmente: os anéis externos foram removidos e substituídos por malha interna, nós luminosos, varredura, balizas e constelações laterais. Explorer, Builder e Engineer flutuam verticalmente em cadências diferentes e usam glow pulsante contido; o estágio atual recebe ênfase maior. O Smooth Write existente voltou a aparecer nos campos com cursor laranja animado e sem cursor nativo duplicado. Login, ativação e recuperação foram inspecionados em 375/768/1440 sem overflow; `prefers-reduced-motion` congela cards, glow, campo e cursor. 63 testes e TypeScript passaram; lint e build passaram com apenas o warning preexistente de `isActionable` em `activity-detail.tsx`. Produção não foi alterada.

- [2026-09-11] Iteração `auth-estudio-vivo` v3 — Portal Aberto — concluída localmente: painel central menor em vidro fumê, cenário ampliado, progressão Explorer → Builder → Engineer distribuída nas órbitas e metadados laterais discretos. Spotlight, portal e partículas respondem ao cursor em três profundidades; foco e hover alteram o estágio ativo; `prefers-reduced-motion` entrega a cena estática. Login, ativação e recuperação foram inspecionados em 375/768/1440 sem overflow horizontal. 63 testes e TypeScript passaram; lint e build passaram com apenas o warning preexistente de `isActionable` em `activity-detail.tsx`. Produção não foi alterada.

- [2026-09-11] Iteração `auth-estudio-vivo` v2 concluída localmente após novo handshake: Portal Cinético como protagonista, superfície editorial clara do Caderno Imersivo e progressão Explorer → Builder → Engineer do Campo de Evidências. Login, ativação e recuperação preservam seus contratos; spotlight, arco orbital, partículas, foco dos campos, CTA magnético e progressão contextual respeitam `prefers-reduced-motion`. Browser validado em 375/768/1440 sem overflow horizontal, CTA visível na primeira dobra e sem erros de console. 63 testes, TypeScript, lint e build passaram; permanece apenas o warning preexistente de `isActionable` em `activity-detail.tsx`. Produção não foi alterada.

- [2026-09-09] Milestone visual `auth-estudio-vivo` concluído localmente: login, ativação e recuperação foram remodelados com mapa topográfico SVG, portal circular, rota ligada ao foco, resposta ao ponteiro, hovers, estados de formulário e motion reduzível. O fallback de `/ativar` sem configuração do Supabase deixou de quebrar a página. Inspeção em browser passou em 375/768/1440 sem overflow; `prefers-reduced-motion` desliga rota, sinal, portal e ponteiro. 63 testes, TypeScript, lint e build passaram. Produção ainda não foi alterada.

- [2026-09-09] Fase 12 concluída: deploy-check aprovado, `/cso` diário passou em 9/10 (sem finding reportável), Vercel confirmou o deployment de produção como `Ready`, smoke em produção confirmou `/login` 200 e `/`/`/admin` 307 sem sessão. O teste RLS em produção, numa transação revertida e sob `authenticated`, retornou zero matrículas cross-tenant; as 32 tabelas `logos_academy` têm RLS habilitado e forçado. Canary de 90 segundos realizou 3 checagens estáveis sem alertas e salvou evidências em `.gstack/canary-reports/`. Rollback: promover o deployment anterior na Vercel; se uma migration futura falhar, restaurar o snapshot do Supabase e registrar o incidente. A observação de dependências (`next` moderado e `postcss` transitivo alto no build) continua aceita e registrada para o milestone de upgrade.

- [2026-09-08] Produção publicada em `https://logos-academy-mu.vercel.app` (deployment `dpl_6o1dwaqp8tGxWUZrGeKoX65wtZBd`). O preset Next.js foi versionado em `vercel.json`; build remoto, login público e redirecionamento de rota protegida foram validados. Variáveis de produção permanecem configuradas na Vercel, sem modo demo e sem segredos no Git. O fechamento formal da Fase 12 permanece aberto até CSO, deploy-check e canary/monitoramento.

- [2026-09-08] Repositório Git independente criado e enviado para `ViniciusGrossi/Logos-Academy-`; commit inicial `bc76e84` em `main`, com `.env.local` e artefatos gerados excluídos pelo `.gitignore`.

- [2026-09-08] Fase 11 concluída: `docs/features.md` e `docs/flows.md` documentam a experiência de aluno, administrador e demo local; bugs e pattern do ciclo foram consolidados no Knowledge e o checkpoint registrou o fechamento em `04-Projetos/00-log.md`.

- [2026-09-08] Gate QA Mental da Fase 10 aprovado por Vinicius: apto como protótipo, isolamento entre tenants e RBAC administrativo confirmados. Indisponibilidade do banco deve exibir erro compreensível e orientar contato via WhatsApp; aviso automático fica explicitamente fora do MVP e entra na próxima etapa de integrações.

- [2026-09-08] Modo de demonstração local concluído: login por credenciais em `.env.local`, cookie `httpOnly` de 8 horas e logout próprio; dados fictícios em memória cobrem as telas de aluno e administração, sem alterar banco ou Auth remoto. A sidebar passou a expor links diretos para todas as rotas prontas. Seis testes demo, TypeScript, lint e build passaram; login, persistência de sessão, rota protegida e logout foram conferidos no navegador.

- [2026-09-07] Dados de demonstração semeados no tenant live `4e39d3d6` (a pedido de Vinicius, override do QA Mental): Vinicius como admin+aluno + aluna Lia; 1 turma (cap 6), 16 sessões, 6 presenças, 8 atividades (2 em revisão), 2 submissões finalizadas, 8 projetos (4 ciclos × 2), 1 consentimento verificado. PII cifrada com `academy-local-dev-pii-key` (mesma chave em `.env.local`). Auth de Lia criada em `auth.users` (FK NOT NULL).
- [2026-09-07] `.env.local` criado (URL + anon key reais, `PII_ENCRYPTION_KEY=academy-local-dev-pii-key`, `SUPABASE_SECRET_KEY` como placeholder para Vinicius colar). Confirmado gitignored.
- [2026-09-07] Navegação da sidebar já funcional via Next `<Link>` (`app-shell.tsx`) — nenhuma mudança necessária; RBAC alterna nav aluno/admin por `profile.role`.
- [2026-09-08] **Bug de infra corrigido**: schema `logos_academy` não estava exposto no PostgREST (`PGRST106`) → todas as APIs davam 500 ("Não foi possível resolver a sessão"). Fix: `alter role authenticator set pgrst.db_schemas=...,logos_academy` + `notify pgrst,'reload config/schema'`. ⚠️ Durabilidade: se Vinicius editar Exposed Schemas no painel Supabase, precisa manter `logos_academy` na lista.
- [2026-09-08] **Bug de código corrigido** (`app/api/me/route.ts`): `/api/me` passava pelo `activityController` que exige role `student` → admin recebia 403 e o app-shell nunca carregava perfil/toggle. Reescrito como handler próprio com `requireAuthenticated` (perfil é do próprio usuário; `getProfile` usa só tenantId+userId). PATCH segue exclusivo de aluno. Vinicius definido como `admin` (superset: vê as 7 telas de aluno via `requireAuthenticated` + as 3 de admin).

- [2026-08-31] Projeto inicializado via `/logos init` como `saas-premium`.
- [2026-08-31] Entrevista Socrática da Fase 1 concluída e `IDEA LOCK` aprovado.
- [2026-09-01] PRD, JSON Schema e 38 contratos iniciais criados, validados e revisados.
- [2026-09-01] `PRD LOCK` aprovado explicitamente; contratos congelados e Fase 3 iniciada.
- [2026-09-01] Arquitetura mínima Next.js + Supabase documentada; diagramas Archify renderizados e validados.
- [2026-09-01] SR-001 e SR-002 aprovados explicitamente por Vinicius.
- [2026-09-01] Recibo persistente de feedback e paginação de presença/portfólio sincronizados no PRD, schema e contratos.
- [2026-09-01] Contratos TypeScript strict, JSON Schema, `validate.py` e check de 39 endpoints passaram.
- [2026-09-01] Revisões independentes de contrato e arquitetura passaram sem blocker crítico ou alto.
- [2026-09-01] Gate da Fase 3 aprovado; Fase 4 iniciada.
- [2026-09-02] Quinze referências oficiais da Academy catalogadas e verificadas.
- [2026-09-02] Três direções visuais renderizadas, validadas em browser e preparadas para o gate humano.
- [2026-09-02] Gate `style_direction` aprovado: Estúdio de Missões como base, com linguagem de evidência do Caderno de Construção.
- [2026-09-02] `PRODUCT.md` criado pelo fluxo obrigatório da Impeccable.
- [2026-09-02] `DESIGN.md`, `.impeccable/design.json` v2 e `docs/design-system.md` consolidados.
- [2026-09-02] Direção A+C elevada para “Oficina de Evidências”, com Home do aluno, painel admin, temas, estados, motion e responsividade.
- [2026-09-02] Auditoria browser corrigiu logo externa, animação de layout e captura de toque da sidebar mobile.
- [2026-09-02] Protótipo real Next.js 15 criado com Home do aluno, Atividade e Painel admin, mock data e estados de conteúdo/loading/empty/error.
- [2026-09-02] Curadoria 21st aplicada ao trilho de progresso e aos campos; `skiper40` instalado via registry Shadcn e usado em um único link secundário.
- [2026-09-02] Smooth Input reconstruído sem DialKit, SSR-safe, com caret elástico, label persistente, helper acessível e fallback para movimento reduzido.
- [2026-09-02] Lint, TypeScript, build e auditoria responsiva 375/768/1440 passaram; screenshots do Handshake geradas.
- [2026-09-03] Handshake Visual aprovado explicitamente por Vinicius; gate da Fase 4 passou e o projeto avançou para a Fase 5.
- [2026-09-03] `/logos plan` concluiu 6 tracer bullets, 7 waves operacionais, 10 specs draft e registry; 39/39 endpoints e oráculos GWT validados.
- [2026-09-04] SR-003 e mapa de páginas aprovados: seis itens na navegação do aluno, quatro no admin e tabs somente entre visões do mesmo objeto.
- [2026-09-04] Batch das 10 specs aprovado explicitamente; gate da Fase 5 passou e o projeto avançou para a Fase 6.
- [2026-09-05] Schema core concluído em 9 migrations: 32 tabelas, RLS/Storage, pgcrypto, seed de dois tenants e 72 asserts pgTAP versionados.
- [2026-09-05] Duas rodadas de revisão adversarial corrigiram fluxos de submissão/upload, bypasses administrativos, seed, bucket privado, PII e aprovação auditável de projetos; revisão final estática aprovada sem finding crítico/alto.
- [2026-09-05] MCP Supabase adicionado ao `.mcp.json` do projeto para o ref `nqubjiosnlaatxxamiut`; autenticação permanece pendente no Claude CLI.
- [2026-09-05] Migrations 0001–0010 aplicadas no projeto Supabase `nqubjiosnlaatxxamiut` sob o schema isolado `logos_academy`: 32 tabelas com RLS e bucket privado `submissions`; seed local não foi aplicado no remoto.
- [2026-09-05] Schema `logos_academy` exposto na Data API por Vinicius; grants para authenticated e RLS nas 32 tabelas confirmados via banco.
- [2026-09-05] Migrations 0011-0013 aplicadas no projeto remoto: guards de atualização/evidência corrigidos e privilégios de escrita operacional mantidos exclusivamente no backend.
- [2026-09-05] Gate da Fase 6 aprovado: 72 asserts pgTAP passaram em transações revertidas (10 schema, 21 RLS, 20 regras, 21 RPCs); fixture nunca persistiu no projeto remoto.
- [2026-09-05] Advisors consultados: nenhum alerta associado ao schema `logos_academy`; alertas existentes pertencem aos schemas compartilhados `public`, `delphi` e `Logus_Tech_Oficinas` e ficaram fora do escopo.
- [2026-09-05] Wave 0 iniciou por `platform-security-foundation`, mas foi pausada por Sync Request: ausência de clientes Supabase, ambiente de teste e controller contratado impede TDD e uma implementação segura.
- [2026-09-05] Vinicius aprovou incorporar W0.1/W0.10 à fundação: clientes Supabase, `.env.example`, Vitest/jsdom e fixtures entram sem endpoint novo; spec atualizada antes do redispatch.
- [2026-09-05] `platform-security-foundation` concluída: clientes Supabase SSR/admin server-only, erro tipado, cursor, identidade tenant-aware e 7 testes verdes; TypeScript e lint passaram.
- [2026-09-06] RPCs transacionais de admissions aplicadas no Supabase remoto: criação de turma/sessões, matrícula, consentimento e convite idempotente são `SECURITY DEFINER` exclusivas de service role; 18 asserts pgTAP passaram em transação revertida.
- [2026-09-06] Recovery do convite após Auth aplicado no remoto: vínculo idempotente de `auth_user_id` sem PII e 9 asserts pgTAP passaram; o fluxo de convite server-only foi integrado e validado localmente.
- [2026-09-06] `admissions-classes-calendar` concluída: convite idempotente, consentimento, turmas, 16 sessões, matrículas, calendário e rotas contratadas usam adapters/RPCs server-only; 10 testes focalizados, TypeScript e lint passaram.
- [2026-09-06] Wave 1 aprovada após correções: migrations 0020–0023, callback de ativação, compensação Auth, posições globais 1–16 e DTOs completos passaram pela rerevisão sem finding crítico/alto.
- [2026-09-06] Wave 2 iniciou com migration 0024 aplicada no remoto: atualização administrativa de sessão e leitura paginada de frequência do aluno são RPCs server-only, sem nota privada.
- [2026-09-06] Rotas da Wave 2 implementadas no commit `aacf2ae`: 5 testes focalizados, TypeScript e lint passaram; aguardam correção de cursor/DTOs no banco antes da revisão.
- [2026-09-06] Wave 2 aprovada após migrations 0025–0026: cursor de frequência, DTOs de presença/reposição e posição global de sessão passaram pela rerevisão sem finding crítico/alto.
- [2026-09-06] Wave 3 no app concluída no commit `2cf2270`: rotas de Início, Jornada, Conceitos e confirmação de leitura usam RPCs server-only, validação Zod e erros normalizados; 2 testes focalizados, TypeScript e lint passaram. A revisão deve cobrir as lacunas remanescentes nos DTOs/paginação das RPCs 0027.
- [2026-09-06] Wave 3 aprovada após migrations 0028–0030: ownership de conceitos, recibo de feedback, DTOs derivados, prioridade Home e cursor foram rerevisados sem finding crítico/alto/médio.
- [2026-09-07] WIP committado (`ba8dd69`): RBAC no nav via `/api/me`, rubrica de critérios obrigatória na fila de revisão, jornada sem `enrollmentId` exigido, migration 0041, fix `rel=noreferrer` no skiper40. 46 testes vitest verdes, tsc e lint limpos.
- [2026-09-07] Gate da Fase 7 aprovado: 9 features (waves 0–5) built + reviewed sem finding crítico/alto; zero `any`, zero `console.log`, C→S→R respeitado. `e2e-acceptance` reclassificado como escopo Fase 10 (endurecimento adversarial + WCAG + E2E + LGPD) e não bloqueia o gate.
- [2026-09-07] Fase 8 iniciada. Telas core do protótipo já ligadas às APIs reais (Início, Atividade, Jornada, Projetos, Revisões, Admin); faltam Glossário, Agenda, Perfil, Alunos, Turmas, Encontro e o shell de auth.

- [2026-09-07] Gate da Fase 8 aprovado: Glossário, Agenda, Perfil, Alunos, Turmas, Encontro e Auth foram entregues com estados, tokens Academy, motion Framer Motion/GSAP, fallback de movimento reduzido e responsividade registrada. `npm test` (52), lint, TypeScript, build e `validate-ui.py --rigor completo` passaram; revisão independente terminou sem finding crítico, alto ou médio.
- [2026-09-07] Hardening pós-revisão: retorno pós-auth aceita apenas path interno validado; notas privadas de frequência vazias são soft-deleted pela migration remota `0043_clear_attendance_private_note`; abas de Agenda têm roving tabindex e foco por setas.

- [2026-09-07] Gate da Fase 9 aprovado como não aplicável ao MVP: PRD, tarefas e arquitetura excluem WhatsApp automático, N8N, OAuth GitHub, IA em runtime e webhooks. A spec `integrations-mvp-phase9` documenta os gatilhos de evolução; varredura local e revisão de segurança não encontraram cliente externo, token real, webhook ou dependência especulativa. `npm test` (52), lint, TypeScript e build passaram; revisão final terminou sem finding crítico, alto ou médio.
- [2026-09-07] Fase 10 — ciclo técnico concluído: 57 testes, lint e build passaram; code review, security audit, UI review e auditoria adversarial foram rechecados após um único ciclo de correções. O banco remoto confirma RLS forçada em 32/32 tabelas e remoção do `EXECUTE` de `authenticated` das quatro RPCs legadas. `memoria/eval.json` registrou score 0,945. Falta apenas o QA Mental humano.

## Specs

| Spec | Status | Atualização |
|---|---|---|
| `docs/ideia.md` | aprovado | 2026-08-31 |
| `docs/PRD.md` | aprovado e locked — v0.1.2 (SR-003) | 2026-09-04 |
| `specs/product.schema.json` | validado | 2026-09-01 |
| `specs/api.contracts.ts` | validado — 39 endpoints | 2026-09-01 |
| `docs/ARCHITECTURE.md` | aprovado | 2026-09-01 |
| `docs/tasks.md` | aprovado — tasks ≤4h | 2026-09-04 |
| `specs/registry.json` | 10 features aprovadas | 2026-09-04 |
| `docs/specs/frontend-premium-phase8.md` | built e reviewed | 2026-09-07 |
| `docs/specs/integrations-mvp-phase9.md` | built e reviewed — não aplicável ao MVP | 2026-09-07 |
| `docs/specs/demo-auth-and-data.md` | built e validated — somente ambiente local | 2026-09-08 |
| `docs/specs/student-experience-elevation.md` | approved — redesign visual em implementação | 2026-09-10 |

## Workers Ativos

(nenhum.)

## Sync Requests Pendentes

(nenhum — RPCs transacionais aprovadas por Vinicius em 2026-09-05.)

## Bloqueios

- Migrations `0045_project_living_dossier.sql` e `0046_activity_workbench_context.sql` estão somente no repositório local; aplicar no Supabase, nesta ordem, antes de publicar o novo frontend.
- Fase 12 — `npm audit` ainda reporta 2 vulnerabilidades altas em PostCSS transitivo do Next 15 e 1 crítica/4 moderadas no toolchain Vitest/Vite. A correção automática exige `npm audit fix --force` (Next 16 + Vitest 5), uma atualização major que requer aprovação explícita e validação completa antes de novo deploy.
- Registro vivo de ADRs expõe apenas ADR-030, embora o playbook cite ADR-025–031; não numerar ADR global até o checkpoint corrigir a deriva.
- Git: o projeto vive dentro do repo do vault (sem `.git` próprio) e ~40 arquivos versionáveis seguem untracked (`docs/`, `specs/`, `supabase/migrations/`, `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`). Commits anteriores só rastrearam `app/` e `src/`. Regularizar antes do deploy (ADR-035: repo GitHub dedicado via `git init` na subpasta).

## Lições

- [2026-09-20] Indicadores em SVG devem normalizar o percurso pelo número real de estados. No mapa do Atlas, `pathLength="3"` garante um segmento por aba e evita que mudanças no desenho da curva deixem sobra no último estado.

- [2026-09-20] Em fluxos visuais compactos, setas não devem ser irmãos soltos entre caixas: o conector deve pertencer ao próximo passo, para que uma quebra de linha preserve a direção da leitura. Elementos puramente decorativos que parecem controles ou estados devem ser removidos quando não comunicam uma ação ou informação real.

- [2026-09-20] Superfícies visualmente relacionadas precisam derivar sua geometria da mesma variável, não de proporções independentes: no Atlas, mapa e workspace pareciam próximos, mas seus divisores divergiam alguns pixels. Elementos sticky também exigem `scroll-margin-top` nos destinos e progresso afastado das bordas para não cobrir conteúdo nem parecer uma borda duplicada.

- [2026-09-20] Elementos de navegação abstratos precisam manter correspondência visual 1:1 com a estrutura real. No mapa do Atlas, nós extras e um pacote percorrendo a rota sugeriam etapas inexistentes; três coleções exigem três marcadores de estado, sem um quarto sinal concorrente.

- [2026-09-20] Conteúdo denso não precisa produzir uma página longa: no Atlas, divulgação progressiva mantém a síntese e a referência visual no fluxo principal, enquanto exemplos, diagramas e ressalvas permanecem disponíveis sob demanda. Comparações “sem/com” devem explicar a falha e a correção, não apenas decorar o texto.

- [2026-09-20] Em conteúdo audiovisual, player e explicação não devem dividir uma coluna estreita: controles, título e imagem precisam de largura própria. No Atlas, o player ocupa uma linha inteira e o contexto pedagógico virou uma faixa independente abaixo, com espaçamento explícito.
- [2026-09-20] Um iframe correto ainda falha se `frame-src` herdar `default-src 'self'`: players externos devem receber uma permissão CSP explícita e restrita ao host necessário. Validar vídeo exige clicar e observar reprodução real; capa e iframe presente no DOM não provam que o conteúdo toca.
- [2026-09-20] Referências `.dc.html` são documentação visual, não fonte de produção: devem ficar fora do lint. Ao absorver uma referência, preservar o fluxo validado e importar apenas os princípios que faltam; no Atlas, profundidade e movimento entraram no campo orbital, enquanto busca, índice e leitura permaneceram próprios do produto.
- [2026-09-20] Uma biblioteca pedagógica ganha identidade quando sua assinatura visual também explica a navegação: no Atlas, o mapa cartográfico conduz entre conceitos, prompts e sistemas de design, enquanto `tab`, busca e item permanecem na URL para preservar o contexto de estudo.
- [2026-09-12] Em polish solicitado como “mais efeitos e componentes”, microinterações isoladas não bastam: a diferença precisa aparecer na composição e na hierarquia do primeiro viewport. Na Atividade, o foco aprovado para nova tentativa foi núcleo energético + circuito funcional, com os demais movimentos subordinados ao fluxo pedagógico.
- [2026-09-12] Executar `next build` enquanto qualquer `next dev` usa a mesma pasta `.next` deixa HTML e chunks CSS incompatíveis e pode exibir o SVG bruto. Antes de todo build, localizar e encerrar os processos dev deste projeto; depois do build, reiniciar o servidor e validar visualmente o mesmo `localhost` entregue ao usuário.
- [2026-09-15] Estados assíncronos da área do aluno não podem usar um esqueleto universal: cada página informa um `layout` para reservar a geometria da experiência final. Ação de vazio deve levar ao próximo passo real e falha deve manter retry + retorno seguro; o `AppShell` precisa continuar fora do conteúdo assíncrono.
- [2026-09-15] Em layouts com sidebar, os breakpoints precisam considerar a largura útil do conteúdo, não apenas o viewport. A Home deve empilhar título e indicadores ainda em larguras de notebook para evitar quebra palavra a palavra no título principal.
- [2026-09-15] O Logos Academy está aninhado em um workspace que também possui `package-lock.json`; sem fixar `turbopack.root` no `next.config.ts`, o Next pode resolver módulos pela raiz errada e interromper a compilação de todas as páginas após uma importação nova. Após mudar dependências ou imports de páginas, reiniciar o dev server e validar as sete rotas autenticadas antes de apresentar o localhost.
- [2026-08-31] A plataforma não substitui a aula presencial → conceitos são referência; atividades e acompanhamento prolongam o encontro.
- [2026-08-31] Dados pessoais do aluno não justificam um tenant por aluno → tenant representa a Logos Academy; propriedade individual usa aluno, matrícula e RLS.
- [2026-08-31] “GitHub conectado” não implica OAuth → no MVP, vincular perfil e enviar URL do repositório.
- [2026-09-01] Chamar a tela inicial do aluno de dashboard confundia ação com análise → aluno terá `Início`; dashboards ficam para admin e, futuramente, responsáveis.
- [2026-09-01] Percentual mínimo de presença não representa a regra pedagógica → concluir qualquer módulo exige 100% dos encontros, com reposição obrigatória para faltas.
- [2026-09-01] Feedback “novo” exige estado de leitura próprio; não pode ser inferido de `revision_requested` porque feedback aprovado também precisa aparecer.
- [2026-09-01] Coleções pequenas por matrícula podem ser limitadas pelo domínio, mas históricos entre matrículas precisam de paginação explícita.
- [2026-09-02] Login do CLI 21st não autoriza automaticamente o registry remoto no Shadcn; componentes externos só entram após inspeção do código-fonte.
- [2026-09-02] DialKit pertence ao playground do Smooth Input, não ao produto; preservar a microinteração não exige levar a ferramenta de configuração para produção.
- [2026-09-03] Hovers amplos e secos não comunicam o caráter premium da Academy → usar deslocamento de 1–2 px, borda laranja progressiva e movimento direcional; reservar o halo animado às superfícies prioritárias.
- [2026-09-04] Tabs só agrupam visões do mesmo objeto; Jornada, Atividade, Dashboard e Revisão detalhada permanecem fluxos contínuos para não esconder sequência ou decisão.
- [2026-09-05] Em triggers reutilizados, ramificar por `tg_table_name` antes de referenciar campos de `new`; booleanos SQL não protegem campos ausentes em todos os tipos de registro.
- [2026-09-05] Grants amplos para schema customizado não podem reabrir escritas operacionais: reaplicar revogações backend-only após o grant e cobrir o limite com pgTAP.
- [2026-09-07] Regex de data não valida o calendário: datas impossíveis precisam de round-trip UTC antes de alcançar uma RPC, para retornarem 400 em vez de erro interno.
- [2026-09-08] Um projeto Vercel legado marcado como `Other` pode construir Next.js, mas empacotar middleware de forma incompatível; `vercel.json` com `framework: "nextjs"` versiona e aplica o override por deploy.
