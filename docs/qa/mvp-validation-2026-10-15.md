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

As primeiras execuções do navegador falharam no login administrativo, com `GET /api/me` retornando 401. Esse resultado não comprova defeito no cadastro nem sucesso do convite. O prepare passou a verificar Auth e leituras RLS reais antes da interface; o diagnóstico do navegador registra apenas booleanos/categorias, nunca senhas/tokens/cookies/links. A causa do 401 ainda não foi comprovada. O fluxo restante não pode ser marcado aprovado enquanto essa etapa falha.

## Pendências de fechamento

Jornada real completa com sete ativações e quatro projetos; revisão visual/responsiva e WCAG AA nas telas alteradas; performance medida no browser; reconciliação de anexos incertos; classificação e decisão sobre o gate de tooling; revisão jurídica e aprovação operacional da minuta de privacidade; QA Mental; migrations/deploy e smoke autenticado após aprovação dos gates aplicáveis.

Não houve seed/reset, criação de alunos fictícios, leitura de senhas ou descarte de dados na produção durante esta etapa.
