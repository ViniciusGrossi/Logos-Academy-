# Validação do MVP — 15/10/2026

Escopo mantido: F01–F14 e specs posteriores aprovadas. **MVP ainda não concluído.** Produção permanece no commit `589b77d`; reparos estão no PR #3 em rascunho, sem migrations remotas deste lote.

## Evidência executada

- GitHub Quality gate #62, commit `4a8959a`: instalação limpa, lint, testes da aplicação, build e banco aprovados.
- Banco no runner isolado: **491 testes pgTAP / 29 arquivos**, incluindo conclusão positiva v3, todos os bloqueadores, tenant excluído, calendário/contexto individual, busca/visibilidade, snapshot de upload e dashboard global/reagendado.
- Última suíte local após atualização de ferramentas e correção da navegação: **232 testes / 46 arquivos aprovados**; TypeScript e lint aprovados em verificações focadas. Testes novos foram observados falhando antes dos respectivos reparos.
- Guard do ensaio destrutivo: **9/9 aprovados**; CI, opt-in, demo desativada e destinos loopback obrigatórios.
- Revisão estática identificou e corrigiu TOCTOU em uploads e ocultação do PATCH pela nova rota GET. Nenhuma dessas revisões, isoladamente, prova comportamento completo no navegador.

## Reparos entregues na branch

Conclusão deriva a última aula, não a posição local 16. Identidade e cinco helpers recusam tenant excluído. Encontros individuais têm contexto/calendário administrativo. A interface inclui matrícula adicional, confirmação de cancelamento, checkbox do arquivo físico, dashboard real e navegação paginada. Busca inclui acentos/tags mantendo liberação. Atlas ganhou duplicação/undo e filtros persistidos; Revisões tem fila geral/individual; portfólio percorre cursores. Calendário associa horário ao dia configurado, inclusive quando começa no segundo dia.

Os bytes dos anexos são verificados antes de gravar uma cópia exclusiva não gravável pelo cliente. A RPC publica sua referência atomicamente. Rejeições SQL definitivas removem somente a nova cópia; falhas de transporte de resultado incerto preservam o candidato para não apagar evidência cujo commit possa ter ocorrido. Reconciliação operacional de órfãos ainda precisa de procedimento e teste.

## Dependências e gate de segurança

Next atualizado dentro da linha 15, para `15.5.28`; PostCSS interno corrigido com override `8.5.30`. Vitest `4.1.11` usa a transformação JSX OXC; configuração conforme [migração oficial do Vite](https://vite.dev/guide/migration.html). CLI Shadcn e Testing Library são ferramentas de desenvolvimento, não dependências runtime.

`npm audit --omit=dev`: **0 vulnerabilidades**. Auditoria completa: **9 entradas high**, propagadas de uma advisory raiz de `braces <=3.0.3`, em cadeias de ESLint/CLI; não são nove vulnerabilidades HTTP independentes. O [advisory primário](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) não indica versão corrigida, e a consulta ao registro retornou latest `3.0.3`.

Mitigação observada: não está na árvore de produção; tooling só deve processar repositório/configuração confiáveis, sem servidor CLI/MCP exposto. Isso **não zera o audit completo nem autoriza uma exceção automática** ao gate. Decisão de risco ou correção upstream continua pendente.

## Ensaio real ainda não aprovado

Os runners iniciaram PostgreSQL, Auth, Storage e Next reais; fixtures ficam exclusivamente locais. A instalação multiplataforma foi corrigida regenerando o lockfile a partir de manifesto em diretório vazio; `npm ci` limpo e dry-run com npm 10/Linux aprovados depois disso.

As primeiras execuções do navegador falharam no login administrativo, com `GET /api/me` retornando 401. O prepare comprovou Auth e leituras RLS reais. A execução #6 delimitou: formulário válido, nenhum evento submit, nenhuma requisição de login e nenhum estado pending. Reprodução local isolada confirmou que o botão estava abaixo da viewport: o clique CDP atingiu HTML fora da tela. Após `scrollintoview`, um clique genuíno atingiu BUTTON e disparou submit/pending. Não foi necessário alterar autenticação ou contornar a interface.

O commit `465e7dd` traz controles para a área visível antes das interações e corrige o uso de focus na ferramenta. O ensaio #7 **aprovou login real dos dois administradores, criação de turma com 16 encontros e negação cross-tenant**. Parou na ativação do primeiro aluno, durante avaliação no browser; a causa ainda não está comprovada. `0836342` classifica falhas sem vazar saída privada e permite repetir somente avaliação interrompida por navegação transitória. Isso não comprova o sucesso do convite nem o restante da jornada. Diagnósticos registram apenas booleanos/categorias e endpoints fixos, nunca senhas/tokens/cookies/links.

## Pendências de fechamento

**E2E #21 (`7e0dbdf`) e #23 (`bae1445`) — jornada integral aprovada**: os nove checkpoints passaram em browser contra Auth, PostgreSQL, REST e Storage descartáveis reais. A evidência cobre login e fronteira entre tenants; capacidade; convite/ativação e agenda individual; ocultação do conteúdo não liberado; upload, rascunho, envio, correção, reenvio e aprovação; Atlas com publicação, asset privado, leitura, restauração e arquivamento; 16 aulas, quatro projetos e bloqueio por falta; reposição, apresentação, conclusão e bloqueio de mutações; portfólio paginado e URL/responsividade de abas em 375/768/1440. Downloads de evidência foram comparados por SHA-256 para aluno e administrador. O Quality #79 também aprovou lint, build e **233/233 testes de aplicação**, e **518 pgTAP / 31 arquivos**. Quality #81 repetiu aplicação e banco após o ajuste de espera do editor Atlas; E2E #23 confirmou os nove checkpoints na cabeça atual da branch. Isso não substitui gates humanos de LGPD, acessibilidade/performance e aceite visual.

**E2E #16 (`59588f6`)**: envio/correção/reenvio/aprovação pela interface passaram, incluindo autorização de download administrativo após o reparo. CMS avançou por criação/publicação UI, upload/finalize real de imagem privada, leitura do aluno e download, ocultação de bloco, conflito sem sobrescrita e negação do colega sem aula liberada. Parou no upload de asset cross-tenant: backend retornou 500, não URL; causa identificada no SQL de autorização que compara resultado possivelmente NULL com `<>`/`NOT IN`, permitindo chegar à FK em vez de rejeitar explicitamente. `8023f46` adiciona a migration `20261015221636` e 23 asserts pgTAP: dono ausente, apagado, malformado, de outro tenant ou com tipo incompatível é recusado antes do INSERT; os três proprietários válidos continuam autorizados. Restauração/arquivamento, quatro projetos e conclusão ainda não comprovados. A próxima execução também valida SHA-256 dos downloads de evidência por aluno e administrador.

**E2E #15 e correção de produto**: o envio da atividade foi persistido; a leitura administrativa do anexo falhou com 500. Causa confirmada no contrato SQL existente de `admin_file_download_target(uuid,uuid,uuid,text)`: o repository enviava somente os três UUIDs e omitia `p_encryption_key`. `c258b1a` envia a chave exclusivamente server-side, sem mudança de ACL/RLS nem exposição no DTO. Regressão unitária falhou antes e passou depois; 19 testes focados, TypeScript e suíte completa **233/233 em 46 arquivos** passaram. Não exige migration nova. `59588f6` integra um nono checkpoint CMS; execução ainda pendente, sem afirmar runtime PASS. Os dois oracles fracos apontados em review foram reforçados: releitura integral após conflito e restauração de conteúdo realmente distinto com comparação de draft/publicado.

**Avanço comprovado no E2E #14 (`4692157`)**: login e isolamento administrativo; seis alunos ativados na turma e sétimo rejeitado por capacidade; aluno individual ativado com calendário de 16 encontros/contexto; bloqueios de acesso administrativo, outro tenant, outro aluno e atividade não liberada. O fluxo chegou à UI da primeira atividade, realizou upload Storage/finalize e salvou rascunho real. Parou ao procurar o botão de envio enquanto a interface concluía a operação anterior. `4ccfe59` aguarda controle visível/habilitado com o mesmo nome antes do clique; envio, revisão, quatro projetos e conclusão ainda não aprovados. Sessão nativa nova por ativação eliminou a parada anterior neste ensaio, sem mudança na autenticação do produto.

E2E #11/#12: login/tenant continuam aprovados; falta o alvo semântico do botão de confirmação (`journey.mjs`, linha 39 naquela revisão). Diagnóstico secundário indisponível não prova falha do formulário de ativação. Memória disponível no runner: aproximadamente 12 GB; hipótese de falta de RAM não sustentada. Node do E2E foi atualizado para 24, conforme engines de agent-browser 0.27.2, mas #12 persistiu. Reprodução local da rota pública `/c/` com código sintético mostrou heading, botão e avaliação DOM funcionando, sem banco ou token real. `3760800` acrescenta GET inerte com user-agent WhatsApp, checagem de ausência do URL de verificação no HTML e espera explícita pelo heading antes do clique. Ensaio #13 pendente; não substitui nem relaxa a ativação real.

Atualização: E2E #10 parou em `click-confirmation`; até a avaliação diagnóstica do navegador do aluno ficou indisponível. O resultado não prova defeito no preenchimento do e-mail da página de ativação. `51de0c7` acrescenta validação do protocolo JSON e diagnóstico de capacidade, sem logs privados; retira somente serviços auxiliares não utilizados do Supabase local. Auth, banco, REST, gateway, e-mail e Storage reais permanecem. Nova execução pendente. Verificação visual parcial local em `mvp-admin-visual-2026-10-15.md`, sem overflow nas telas/medidas declaradas; não encerra gate visual/AA.

Jornada real completa com sete ativações e quatro projetos; revisão visual/responsiva e WCAG AA nas telas alteradas; performance medida no browser; reconciliação de anexos incertos; classificação e decisão sobre o gate de tooling; revisão jurídica e aprovação operacional da minuta de privacidade; QA Mental; migrations/deploy e smoke autenticado após aprovação dos gates aplicáveis.

Não houve seed/reset, criação de alunos fictícios, leitura de senhas ou descarte de dados na produção durante esta etapa.
