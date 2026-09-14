---
title: "Project Living Dossier — Spec"
date: 2026-09-11
status: approved
wave: 8
tags: [spec, frontend, projects, pedagogy]
---

# Spec: Project Living Dossier

## Objetivo

Transformar `/projetos/[projectId]` em um dossiê vivo: o aluno entende o desafio, o público, o resultado esperado e acompanha decisões, versões e feedbacks dentro da linha de construção do projeto.

## Escopo aprovado

1. Exibir o **Norte do projeto** com desafio, problema, público, resultado esperado, critérios de qualidade e conceitos.
2. Converter a lista de atividades em **Mapa de decisões**, preservando ordem pedagógica, estado, versão e acesso à atividade.
3. Destacar a decisão textual mais recente e o feedback mais recente de cada atividade, quando existirem.
4. Preservar cabeçalho, progresso, próxima ação, estados loading/empty/error e responsividade.
5. Preencher o brief canônico dos quatro ciclos Explorer sem expor dados pessoais.

## Contrato

`ProjectDetail` passa a incluir `brief` e, em cada atividade, `decision` e `latestFeedback`. Durante o rollout, `brief` aceita `null` para que a interface mantenha fallback até a migration ser aplicada.

## Fora de escopo

- Editor administrativo do brief.
- Portfólio público.
- Duplicar upload, histórico integral ou revisão detalhada já disponíveis na atividade.
- Inferir aprendizado ou decisão com IA.

## Critérios de aceite

- [x] Creative Studio comunica o desafio antes da lista de atividades.
- [x] Problema, público, resultado, critérios e conceitos têm hierarquia própria.
- [x] O mapa mostra atividade, estado, versão, decisão e feedback quando disponíveis.
- [x] Cada etapa continua levando à atividade vinculada.
- [x] O contrato real e o modo demo fornecem os mesmos campos.
- [x] Dados legados sem brief recebem fallback compreensível.
- [x] Testes, TypeScript, lint e build passam.
