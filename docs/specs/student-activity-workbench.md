---
title: "student-activity-workbench — Spec"
date: 2026-09-11
projeto: "Logos Academy Platform"
fase: "student-experience-elevation"
status: approved
wave: 8
tags: [spec, frontend, student, activity]
---

# Spec: student-activity-workbench

## Objetivo

Transformar `/atividade` em uma mesa de construção onde o aluno compreende a etapa atual, reage ao feedback, registra decisões e evidências e reconhece a evolução do projeto.

## Escopo desta execução

- Primeiro gate: implementação e inspeção visual em desktop 1440 px.
- Segundo gate, somente após aprovação: 768/375 px, estados completos, teclado, foco, contraste e movimento reduzido.
- Glossário, Agenda/Frequência e Perfil permanecem fora desta execução.

## Requisitos funcionais

1. Resolver a atividade atual pela Home quando a URL não contiver `assignmentId`; nenhum UUID pode existir no componente.
2. Exibir contexto do projeto e percurso real agregado pelo endpoint de detalhe da atividade.
3. Priorizar feedback de revisão antes da nova versão.
4. Suportar requisitos `text`, `file`, `external_link` e `github_repository` pelas APIs existentes.
5. Restaurar os valores do rascunho mais recente e permitir salvar ou enviar uma versão.
6. Exibir critérios, conceitos, estado, versão e histórico sem competir com a ação principal.
7. Representar `locked`, `available`, `draft`, `submitted`, `revision_requested` e `approved` com linguagem e tratamento próprios.

## Contrato

`ActivityDetail` recebe `project: ActivityProjectContext | null`, contendo `id`, `title`, `cyclePosition` e a trilha de assignments com status e última versão. Não há endpoint novo.

## Segurança e dados

- A projeção parte de `private.student_actor_assignment`, portanto mantém tenant, usuário e matrícula autorizados.
- Texto e links continuam descriptografados apenas pela RPC server-only existente.
- Upload mantém handshake assinado, validação de MIME/tamanho e finalize com conferência do objeto.
- Nenhum dado sensível entra em logs do navegador.

## Critérios de aceite do gate desktop

- [x] A ação principal e o feedback atual são compreendidos na primeira dobra em 1440 px.
- [x] A trilha usa somente IDs e estados recebidos da API.
- [x] Texto, link, GitHub e arquivo produzem o `SubmissionItemInput` correto.
- [x] Rascunho existente preenche a mesa de versão.
- [x] Projeto, conceitos, critérios e histórico aparecem com hierarquia clara.
- [x] Tema claro e escuro não apresentam overflow horizontal em 1440 px.
- [x] Testes focalizados, TypeScript e lint passam.

## Gate humano

Após a captura desktop, aguardar aprovação explícita antes de adaptar 768/375 px ou iniciar outra página.
