---
title: "Frontend Premium Phase 8"
date: 2026-09-07
status: approved
phase: 8
---

# Frontend Premium da Logos Academy

## Objetivo

Transformar o protótipo aprovado em uma plataforma estudantil completa, cinematográfica nos marcos e precisa nas tarefas diárias. O aluno deve identificar a próxima ação em até cinco segundos. O administrador deve operar turmas pequenas, encontros, alunos e revisões sem perder contexto pedagógico.

## Direções exploradas

### Sala de Controle

Shell predominantemente escuro, alta densidade, painéis modulares e navegação por comandos. Referências: 21st Dashboard Overview e Great UI Revision Timeline. É eficiente para o admin, mas fria demais para jovens iniciantes e excessiva para leitura de conceitos.

### Caderno Vivo

Superfícies claras, páginas editoriais, cards expansíveis com spring e evidências organizadas como folhas. É excelente para conceitos e portfólio, mas perde o contraste de marca e o senso de missão.

### Cinema de Evidências, selecionada

Combina a estrutura escura do Estúdio de Missões com a clareza do Caderno de Construção. Marcos, Auth e próxima missão usam composição cinematográfica; formulários, agenda, glossário e operação usam bancada clara e densa. Referências: nova `docs/design-refs/index2.html`, 21st Authentication Card, Skills Progress Dashboard, ProjectProgressCard e Great UI Revision Timeline.

## Linguagem de interação

- Movimento premium: curva principal `cubic-bezier(.16,1,.3,1)`; 140 ms, 260 ms e 520 ms.
- Cards de aprofundamento usam expansão por spring, sem ocultar ações essenciais.
- CTAs prioritários podem usar magnetismo de no máximo 8 px, somente em dispositivos com ponteiro fino.
- Spotlight segue o cursor em superfícies de missão e projeto; desativado em toque e movimento reduzido.
- Page transitions usam `AnimatePresence`; estados loading para content usam crossfade.
- Hover combina borda laranja progressiva, wash tonal, sombra tardia e deslocamento máximo de 2 px.
- Todo motion tem alternativa estática em `prefers-reduced-motion`.

## Componentes compartilhados

- `CinematicPage`: entrada e transição de contexto.
- `SpotlightCard`: luz localizada, inclinação discreta e borda viva.
- `SpringCard`: resumo expansível acessível com `aria-expanded`.
- `MagneticAction`: magnetismo contido e feedback de pressão.
- `ProgressRail`: progresso de jornada ou competência com leitura textual.
- `StateScene`: loading, empty e error com mesma geometria da tela real.
- `PageHeader`, `StatusBadge`, `DataList`, `FilterBar` e `MetricStrip`.

## Páginas do aluno

- Início: próxima missão, sessão seguinte, feedback e mapa de construção.
- Atividade: conceito, instruções, evidências, upload, GitHub, critérios e histórico.
- Jornada: ciclos, bloqueios, competências e progressão Explorer.
- Projetos: quatro Project Days e portfólio privado; detalhe por projeto.
- Glossário: busca instantânea, conceitos liberados e leitura aprofundada.
- Agenda: encontros presenciais, faltas, reposições e próximas entregas.
- Perfil: dados básicos, vínculo do GitHub e segurança da conta.

## Páginas administrativas

- Painel: decisões do dia, risco, encontros e revisões.
- Alunos: busca paginada, turma, pendências e acesso ao detalhe.
- Turmas: capacidade de seis, calendário e status.
- Encontro: frequência, liberação da atividade e remarcação; a chamada previamente registrada deve ser carregada antes da edição para impedir sobrescrita por valores presumidos.
- Revisões: rubrica completa, decisão derivada e feedback pedagógico.

## Auth

- Login por e-mail com senha e recuperação.
- Ativação de convite com criação de senha e medidor acessível.
- Recuperação de acesso com confirmação clara de envio.
- Auth não usa o shell autenticado e preserva marca, contraste e foco.

## Critérios de aceite

- [x] Todas as rotas acima existem e usam dados reais quando autenticadas.
- [x] Cada tela possui loading, empty e error reproduzíveis.
- [x] Auth cobre login, ativação e recuperação sem expor segredos.
- [x] Cards interativos são teclado-acessíveis e têm hover, focus e active.
- [x] Motion usa Framer Motion e GSAP com fallback de movimento reduzido.
- [x] 375, 768 e 1440 px não apresentam overflow horizontal.
- [x] O design usa somente tokens Academy e mantém o laranja como sinal raro.
- [x] Lint, TypeScript, testes, build e `validate-ui.py --rigor completo` passam.
- [x] Revisão final não possui finding crítico, alto ou médio.

## Evidências de encerramento

- Screenshots finais do Auth: `docs/prototype-screenshots/phase8-auth-login-375-final.png`, `phase8-auth-login-768-final.png` e `phase8-auth-login-1440-final.png`.
- `npm test` passou com 52 testes; lint, TypeScript, build e `validate-ui.py --rigor completo` passaram em 2026-09-07.
- Revisão independente rechecada após os ajustes de segurança, privacidade e acessibilidade: 0 críticos, 0 altos e 0 médios.
