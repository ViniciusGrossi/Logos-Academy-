# Atlas CMS e Revisões — entrega das referências

Implementação em `feat/admin-design-reference`, worktree `C:/la-admin-interface`. Produção não alterada nesta entrega.

## Atlas CMS

- `/admin/atlas`: biblioteca, busca, filtros, paginação, contadores globais, mapa de navegação por coleção/aula e criação de conteúdo.
- `/admin/atlas/[itemId]`: estrutura, propriedades e preview; edição dos 16 tipos de blocos e sete espécimes controlados, reordenação, visibilidade e exclusão confirmada.
- Metadados, aulas vinculadas, vídeos/transcrição/legendas, prompts e seus exemplos/variáveis; artefatos de design com paleta, tipografia, princípios e componentes.
- Preview compartilha renderer com o aluno; formatos 375/768/1440, temas e tela cheia.
- Rascunho, checklist de publicação, arquivamento e restauração preservam os relógios de concorrência e a versão publicada.
- Upload privado PNG/JPEG/WebP até 5 MB validado pelos bytes reais no servidor; leitura com URL assinada curta, tenant e proprietário conferidos.

## Revisões

- `/admin/revisoes`: turma, atividade, ciclo, prazo, busca, sete contadores clicáveis e roster incluindo quem ainda não enviou.
- `/admin/revisoes/[submissionId]`: evidências, arquivos, versões anteriores, rubrica, comentário por critério, correções, sugestões opcionais e orientação de reenvio.
- Aprovação sem escrever feedback quando satisfatório; confirmação antes do envio; correções exigem explicação.
- “Salvar rascunho nesta aba” usa sessionStorage separado por administrador e entrega. Não sincroniza entre dispositivos nem outros navegadores; a publicação usa a API real.

## Verificação e publicação

- Lint, TypeScript e build de produção aprovados na entrega inicial; refinamento de tags/catálogo validado com lint, TypeScript e 175 testes unitários/de integração aprovados.
- Biblioteca, editor e Revisões verificados em 375/768/1440 px sem overflow global; capturas locais de referência e implementação preservadas. Mesa de feedback exercitada com confirmação de aprovação; salvamento/publicação do CMS exercitados no modo local. Movimento reduzido habilitado durante a conferência final.
- Dados de demonstração somente no modo local de desenvolvimento; não há seed, contas ou conteúdo mockado criado em produção.
- Referências e capturas em `docs/design-refs/`; plano visual em `cms-reviews-design.md`.
- Migration incremental `20261012015740_atlas_asset_finalize_idempotent.sql` inclui pgTAP `062_atlas_asset_finalize_idempotent.test.sql`. Não aplicada em produção; execução de pgTAP depende do Supabase isolado no GitHub, pois esta máquina não oferece Docker/WSL.
- Antes de liberar: revisão do diff, pgTAP completo, aprovação visual, migration controlada e deploy, seguidos de ensaio autenticado admin → aluno com conteúdo real.
- Limites explícitos: histórico sem preview de snapshot (contrato só fornece metadados/restauração); rascunho de feedback local; mapa sem afirmação de cobertura por aula.

## Refinamento solicitado nas capturas

Mapa Editorial premium: núcleo Atlas com anéis, coleções com contagens reais, 16 aulas divididas nos quatro projetos e conexões responsivas calculadas a partir da posição dos elementos. Pulsos de energia em laranja, entrada escalonada, realce da seleção e atualização contextual no rodapé. Motion-design orientou a hierarquia núcleo → coleções → aulas, cadência e movimento reduzido. Os pulsos podem ser pausados e são suspensos fora da viewport. Nenhuma conexão afirma cobertura publicada. A prévia usa 16 aulas exclusivamente locais; produção usa o currículo ativo real e desabilita slots sem aula. Validação: 181 testes, lint e TypeScript; capturas `atlas-map-premium-{1440,768,375}.png`.

Tags agora usam chips com remoção individual, inclusão por Enter, prevenção de duplicatas e Backspace no campo vazio; permanecem armazenadas como string[] no contrato existente. O seletor de blocos é um modal central com busca, grupos Texto/Visual/Processo/Sistema/Outros e miniaturas CSS usando somente tokens da plataforma. Os 16 tipos continuam disponíveis. Busca ignora acentos, o foco inicia no campo de pesquisa, Escape fecha e a seleção insere o bloco real no editor.

Capturas: `atlas-tags-chips-1440.png`, `atlas-block-picker-1440.png` e `atlas-block-picker-375.png`.
