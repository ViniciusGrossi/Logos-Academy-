---
title: "Auth — Estúdio Vivo de Evidências"
date: 2026-09-09
status: approved
milestone: visual-auth-2026
---

# Auth — Estúdio Vivo de Evidências

## Objetivo

Remodelar login, ativação e recuperação como uma entrada memorável para a Logos Academy, mantendo intactos os contratos de autenticação e a clareza da tarefa.

## Direção aprovada

- Base: Estúdio Vivo de Evidências, com mapa topográfico e rota de progresso.
- Complemento: portal circular, profundidade e iluminação mecânica da direção Portal de Missão.
- Paleta: tokens oficiais Ink, Raised, Paper, Canvas, Line, Muted e Academy Orange.
- Interface em Inter; metadados curtos em JetBrains Mono.
- A animação deve ser construída com SVG, CSS e Framer Motion já instalados, sem dependência visual adicional.

## Requisitos funcionais

- Preservar login por senha, sessão demo, redirecionamento seguro, ativação e recuperação.
- Preservar labels, helpers, autocomplete, exibição da senha, estados de erro, sucesso e processamento.
- Não adicionar cadastro aberto, autenticação social, “manter conectado” ou outros controles sem backend correspondente.

## Requisitos de experiência

- Fundo vivo com três camadas: ambiente, rota/nós e resposta ao ponteiro.
- Inputs, links e CTA com estados default, hover, focus-visible, active, disabled, loading, error e success quando aplicáveis.
- A ação de entrar deve permanecer evidente em até cinco segundos.
- Composição própria em 375, 768 e 1440 px, sem depender de hover no toque.
- `prefers-reduced-motion` deve interromper loops e substituir grandes transformações por estado estático.
- Contraste WCAG AA e alvos interativos mínimos de 44 px.

## Critérios de aceite

- [x] Login, ativação e recuperação renderizam a nova composição.
- [x] Fluxos existentes continuam funcionando e os testes de Auth permanecem verdes.
- [x] Não há overflow horizontal em 375, 768 e 1440 px.
- [x] Navegação por teclado e foco visível funcionam.
- [x] Movimento reduzido desativa loops e magnetismo.
- [x] TypeScript, lint, testes e build passam.
- [x] A tela é inspecionada no navegador nos três viewports.
