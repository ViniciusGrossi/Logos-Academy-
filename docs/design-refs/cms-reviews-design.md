# Atlas CMS e Revisões — integração das referências aprovadas

Direção fornecida pelo usuário: projeto Claude Design `4e473bcb-c1bb-4ce6-9f37-292b03954be8`. Não criar outras direções. Referências importadas em `C:/la-atlas-cms-validation/docs/design-refs/claude-admin/`.

## Estado da leitura

- Revisões: referência importada `Revisoes Admin.dc.html`, template, lógica, estados e dependências analisados.
- Design system: `_ds_bundle.js` é apenas registro de namespace (`tokensOnly: true`), sem componentes compilados. `styles.css` importa tokens/fontes; fontes locais variáveis Inter (100–900) e JetBrains Mono (100–800), com swap.
- `support.js` é runtime gerado de Claude Design: parser/template, lógica, React/Babel externos, registry e modo preview. Serve à referência; não importar o runtime em produção. Traduzir o template para React com APIs reais.
- Atlas CMS: `Atlas CMS.dc.html` importado integralmente (1651 linhas). Biblioteca, editor, lógica, estados simulados, preview, checklist, histórico, assets e criação analisados. O protótipo define apresentação; seeds, timeouts e `fakeUpload` devem ser substituídos por APIs reais.

## Chassi e material

Usar AppShell existente, não criar outra sidebar dentro da página. A referência traz sidebar 264px, topbar sticky 64px, canvas Ink 950 e painéis Ink 900. Bordas discretas de 1px e radius 14px; campos/botões 10px. Marca é `brand/logos-academy-symbol-dark.png`; nome/conta são obtidos da sessão, nunca do seed do protótipo.

Cabeçalhos operacionais de Revisões usam Inter 30px/1.15, peso 700, tracking -0.02em; títulos de seção 18px/600; corpo 14–16px; metadados Mono 10–12px. CMS usa **DM Serif Display apenas no título Atlas** da biblioteca, 36–48px/1, peso 400, tracking -0.01em; resto da operação em Inter/Mono. Usar fonte local/fallback Georgia, não a chamada Google Fonts do protótipo. Eyebrows e ação principal em laranja; o fundo mantém neutros.

## Atlas CMS — biblioteca editorial

Até 1440px, padding clamp(16px, 3vw, 32px), gap 24px. Cabeçalho `Central editorial / Atlas` com descrição, link Atlas aluno e Novo conteúdo. Segue mapa editorial funcional: origem ATLAS à esquerda, três nós de coleção a 30/56/82% da largura, curva SVG para aulas 01–16 distribuídas de 13 a 97%; campo pontilhado 16px e altura 200px (168px no mobile). Clique em coleção/aula filtra a lista, a seleção tem rótulo e aria-pressed; legenda publicado/pendência/sem referência/filtro. Contagem de cobertura é publicação vinculada, não quantidade de itens.

Biblioteca: régua de 4 estados (rascunhos/publicados/arquivados/com pendências), busca, tabs Todos/Conceitos/Prompts/Sistemas de Design, filtros com chips removíveis e tabela editorial. Colunas completas: conteúdo, tipo, status, aulas, prontidão, alteração, ações; grid `minmax(260px,2.6fr) 128px 118px 124px 132px 150px 44px`. Linha contém título, resumo e até duas tags + excedente. Ao selecionar linha desktop, abre contexto lateral sticky top 80px, largura 300px, padding 18px, borda laranja; tabela reduz para `minmax(220px,2.4fr) 112px 116px 128px 44px`. Contexto apresenta publicado/status/vínculos/pendências e Continuar edição. Abaixo de 1100px, clique abre editor; contexto não ocupa outra coluna. Abaixo de 760px, tabela vira grid `minmax(0,1fr) auto`, conteúdo em linha integral e detalhes compactos rotulados.

Filtros: status, currículo/ciclo, aula, responsável, somente pendências. Contrato atual cobre kind/status/curriculum/cycle/lesson/tags/search; responsável e prontidão não existem nele. Paginação deve manter totais honestos: mapa/régua não podem contar apenas a página corrente e se apresentar como Atlas completo. Menu da linha: editar, duplicar, ver publicado, arquivar/restaurar, histórico. Arquivamento deve usar confirmação e guarda de versão. Ver publicado exige publicação real e link aluno correspondente; nunca abrir `Atlas.dc.html` estático.

## Atlas CMS — criação e editor

Criação em duas etapas: escolher Conceito/Prompt/Sistema de Design com ilustração esquemática discreta → escolher preset mostrando blocos numerados → Criar rascunho. Preset cria dados tipados editáveis. Catálogo Adicionar bloco agrupado em famílias, busca e thumbnails esquemáticos; adicionar após bloco selecionado ou ao final.

Editor ocupa altura útil sob topbar. Barra fixa interna: voltar Atlas, tipo, título editável até 420px, status; indicador de gravação, histórico, preview externo, salvar rascunho, publicar, menu. Grid **264px / minmax(360px,420px) / minmax(0,1fr)**: A Estrutura, B Propriedades, C Preview. Regiões A/B têm scroll próprio sem overflow horizontal; B usa superfície elevada. A contém metadados + spine numerada com nós/trilho, seleção tonal laranja, pendências e controle drag; selecionado expõe mover cima/baixo, duplicar, ocultar e remover (undo 6s). B contém tabs Conteúdo/Configurações, formulários específicos e ajuda/erro no campo. Configurações da referência: visibilidade aluno, largura estreita/padrão/larga (560/760/100%), alinhamento esquerda/centro e rótulo interno.

Breakpoints exatos: até 1360px, A 248px + B flex; C aparece por etapa Preview em largura integral. Até 1100px, uma região por etapa Estrutura/Editar/Preview, painel superior simplificado e rodapé de ações fixo. Até 1024px, navegação vira Sheet. Até 760px, título superior até 150px e folhas internas uma coluna. Não comprimir as três regiões em mobile.

Preview: cabeçalho com 375/768/1440, tema independente, Ajustar/100%, tela cheia. Canvas real de viewport dimensionado e escalado para caber, sem criar artefatos de reflow. Canvas padding 20/40/72px conforme largura; leitura principal até 760px; título 32/42/52px, subtítulo 22/26px, lead 17/20px. Seleção recíproca estrutura↔preview; bloco selecionado tem contorno editorial que não aparece ao aluno. Conceito sem vídeo mostra Vídeo em preparação; aluno continua lendo. Renderer compartilhado é obrigatório, inclusive paleta, tipografia, componentes seguros, prompt com variáveis e imagens autorizadas.

## Atlas CMS — sheets e fluxo editorial

Checklist lateral: trilho vertical agrupado Conteúdo/Visual/Acesso/Acessibilidade, progresso proporcional, itens ok/recomendação/bloqueio; falha clicável leva ao campo e fecha sheet. Selo final e resumo explicam quais aulas e blocos serão visíveis. Bloqueios impedem publicar; avisos permitem conforme validação real, sem afirmar contraste AA sem medir. Publicação de vídeo exige transcrição e confirmação de legendas, mesmo que a simulação faça checagem simplificada.

Histórico: Sheet com coluna de revisões 300px e detalhe flex, ação/autor/data/status, resumo de mudança, snapshot somente leitura, Restaurar como rascunho. Não repetir texto técnico `APPEND-ONLY` para administrador; explicar preservação do histórico. Restauração usa snapshot real e mantém publicado até nova publicação. Contrato lista revisões resumidas e não fornece snapshot/diff; planejar endpoint/projeção antes de prometer leitura/comparação completas.

Imagens: Sheet com galeria flex + propriedades 300px, busca, dropzone, seleção, dimensões/MIME/tamanho/status, alt obrigatório e legenda opcional. Estado enviando/processando/pronto/falhou real. PNG/JPEG/WebP até 5MB. Usar no bloco só após finalizar upload e receber status ready/alt; não usar timers ou dimensões inventadas. Assets atuais pertencem ao item; galeria não deve buscar outro proprietário sem autorização. Falha de sessão/rede/conflito conserva formulário e oferece retry ou comparação/cópia de alterações.

## Atlas CMS — assinaturas e motion específicas

Três assinaturas funcionais da referência: **Mapa editorial** (coleções ligadas às aulas), **Spine de construção** (blocos numerados) e **Ponte de seleção** (curva laranja temporária do bloco ao preview). Ponte desenha em 320ms, perde opacidade 420ms após ~820ms; endpoint aparece 220ms após 300ms. Some no reduced motion e em telas compactas; nunca permanece decorativa. Reordenação usa FLIP sincronizando spine/preview; export usa 360ms e curva com overshoot. Adaptar para ease de entrada da plataforma, mantendo deslocamento útil e previsibilidade. Entradas CMS 6px/250ms, sheets 24px/240ms, fade 150–200ms. Estado salvo recebe pulso único, não loop; loader/shimmer apenas enquanto operação existe.

## Campos do protótipo que precisam sync

Blocos do export são modelo local (`abertura`, `texto`, `comparacao`, `especime`, `prompt` etc.) com `id`, `hidden`, `width`, `align`, `internal`. Não enviar esse objeto diretamente às RPCs: converter para `AtlasContentBlock`/artifact/meta reais. `hidden/width/align/internal` não aparecem no contrato atual; persistir só com extensão aprovada do schema/validador/renderer ou retirar controles sem suporte explícito. Não perder notas ocultas silenciosamente ao salvar. `abertura` corresponde principalmente ao título/resumo + seção; prompt e sistema têm artifacts estruturados, não bloco livre. Campo tempo de leitura também não está no draft comum. Catálogo, presets e campos devem ser limitados aos tipos válidos.

## Revisões — lista

Hierarquia: cabeçalho `Acompanhamento da turma / Revisões` + CTA revisar fila → filtros → sete contagens clicáveis → busca e tabela. Contagens: total, enviaram, não enviaram, aguardando revisão, precisam corrigir, aprovados, atrasados. Mostrar resultados reais, inclusive alunos sem entrega.

Conteúdo até 1280px, padding clamp(20px, 3vw, 32px), gap principal 24px. Filtros flex com gap 12px; campos 44px. Tabela: aluno, situação, versão, enviado em, prazo, ação. Referência desktop usa grid `minmax(180px,1.4fr) minmax(220px,1.6fr) 72px 130px 140px 150px`, mínimo 820px, linha compacta 10px ou confortável 16px. Em mobile converter para linhas documentais com rótulos para evitar overflow global; preservar busca e filtro ativo.

Prioridade: reentregas e atrasados primeiro, depois demais pendentes; data de envio define antiguidade. Status e atraso são dimensões diferentes. Mostrar espera por revisão somente com data real. Ação primária `Revisar`, secundárias `Ver feedback`, `Ver histórico`, `Lembrar aluno`. Lembrete abre mensagem editável para copiar manualmente no WhatsApp; não implica envio automático.

## Revisões — mesa

Navegação superior: voltar à turma, posição da fila, aluno anterior/próximo. Preservar turma/atividade/filtros ao voltar. Grid até 1440px, colunas `minmax(0,1fr) 420px`, gap 24px. Painel avaliação sticky top 132px, máximo `100vh - 148px`, rolagem interna desktop. Abaixo de 82rem (1312px), uma coluna e painel estático; abaixo de 64rem (1024px), sidebar Sheet; abaixo de 48rem (768px), filtros ocupam a largura e breadcrumb encurta.

Esquerda: status/reentrega/atraso → título/objetivo → metadados aluno/turma/projeto/versão/envio → feedback anterior quando existente → entregáveis numerados → histórico. Evidência de texto em superfície elevada legível; imagem com prévia real autorizada, ampliar/baixar; URL externa segura; comparação anterior somente com respostas históricas reais. Não transportar imagens fictícias, nomes ou datas do seed.

Direita: rubrica com contador, duas escolhas exclusivas por critério (`Atendeu`, `Precisa de ajuste`), comentário recolhível. Ajuste abre comentário específico; orientação geral e como reenviar aparecem com obrigatoriedade clara. Sugestão opcional não bloqueia aprovação. Aprovar sem marcar critérios equivale a registrar todos como atendidos e abre confirmação; se qualquer ajuste estiver marcado, aprovação fica indisponível. Confirmação mostra exatamente rubrica e texto que serão enviados. Após sucesso, painel confirma resultado e oferece próximo pendente; parecer existente é somente leitura.

Proteger saída com alterações: continuar, descartar, salvar rascunho e sair. Persistência de rascunho exige decisão funcional descrita abaixo; não declarar salvo quando há apenas estado React.

## Tokens: referência → aplicação

| Referência | Token existente/decisão |
|---|---|
| `--color-ink-950` / `#101114` | `--color-academy-ink` |
| `--color-ink-900` / `#17191D` | `--color-academy-raised` |
| `--color-white` | `--color-academy-paper` |
| `--color-orange-500` | `--color-academy-orange` |
| `--color-orange-400` | `--color-academy-orange-hover` |
| `--color-orange-100` | `--color-academy-orange-soft` |
| `--muted` escuro / `#B8BDC4` | alias semântico de texto secundário; não confundir `--muted` Shadcn (superfície) com texto |
| `--border` escuro / `#343941` | borda semântica scoped da área admin |
| `--accent` (laranja no export) | `--color-academy-orange`; `--accent` Shadcn tem outra semântica |
| `--motion-fast/standard/slow/emphasis` | 150/250/500/700ms da referência; mapear em aliases de motion documentados, sem substituir tokens globais por acidente |
| `--ease-standard/emphasis` | `--ease-standard/entrance` existentes (mesmas curvas) |
| `--font-sans/mono` | Inter / JetBrains Mono; reutilizar fontes locais da plataforma |

Orange com texto branco no export deve receber ajuste de contraste local: usar Ink no CTA laranja, conservando geometria e identidade. Tons claros de sucesso/erro usados no export precisam virar tokens semânticos de texto em superfície escura. Não copiar hex espalhados na implementação.

## Componentes mínimos compartilhados

Reutilizar Button, Input, Textarea, DropdownMenu, Popover, Sheet, Tooltip, Skeleton, Tabs e Accordion existentes. Criar/adaptar apenas: toolbar de filtros; tira de status-contagem; lista editorial/roster responsiva; painel sticky de propriedades/avaliação; confirmação com resumo; aviso de alterações não salvas; linha de histórico; estado assíncrono de região. Preferir dialog acessível do ecossistema existente, com foco preso/restaurado, em vez de copiar overlay HTML sem gestão de foco.

CMS deve compartilhar `AtlasItemRenderer` com Atlas aluno. Blocos tipados, presets, preview e checklist são responsabilidade de componentes compartilhados; nenhum HTML/CSS/JS livre entra no conteúdo editorial.

## Motion e estados

Referência: hover tonal, progress bar 500ms com curva de entrada; confirmação surge com opacidade 150ms e deslocamento vertical 8px/250ms. Usar foco evidente 2px + offset 2px, controles 44px, labels persistentes. Reduced motion remove deslocamento/animação e conserva sinais estáticos. Sem pulse contínuo, glow em todos os cards, efeitos que dominam tabela ou entrada teatral.

Implementar loading/empty/error/success por região, sem substituir toda página diante de erro isolado. Busca sem resultado preserva filtros e oferece limpar. Guardar seleção na URL. Anunciar save/publicação/cópia em aria-live; erros com mensagem e foco na origem. Status nunca apenas por cor. Arquivos/URLs precisam autorização e estados de indisponibilidade/expiração.

## Lacunas e integração funcional

| Recurso visual | Integração necessária |
|---|---|
| CMS completo | Neste worktree há contratos/migrations, mas faltam rotas `/admin/atlas`, API admin, módulo Controller→Service→Repository e hooks. Implementar ações reais antes de ligar CTAs. |
| Preview CMS | Extrair/ampliar renderer atual interno a `components/student/knowledge-atlas.tsx`; formato de blocos deve coincidir com contrato/migration. |
| Rascunho de avaliação | Não existe endpoint no contrato atual. Definir persistência autorizada e escopo; local por usuário/submission se escolhido deve ser explicitamente descrito como local. |
| Como reenviar + Sugestões | Contrato de publicação oferece `feedback` + comentários por critério. Compor texto com rótulos previsíveis sem perder conteúdo, ou sincronizar contrato se campos estruturados forem necessários. |
| Projeto/Prazo/antiguidade | Derivar apenas de DTOs reais. Filtro Projeto precisa vínculo real; não usar select decorativo com opções seed. |
| Comparação anterior | Confirmar se histórico retorna respostas/artefatos completos; se não, adicionar projeção apropriada ou oferecer acesso à versão histórica. |
| Notificação | Texto de sucesso deve afirmar apenas efeito existente; publicação disponível ao aluno não prova envio externo. |

Arquivos centrais para alteração: `components/admin/admin-review-overview.tsx`, `admin-review-workspace.tsx`, `reviews-experience.module.css`; novos CMS e renderer; `components/layout/app-shell.tsx` para entrada Atlas administrativa. Documentar sync dos tokens em `docs/design-system.md`. Nenhuma alteração global ao tema é autorizada por este plano isoladamente; preservar demais telas enquanto integra a referência.
