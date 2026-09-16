---
title: "Release 2 — Ideia e decisões"
date: 2026-09-16
projeto: "Logos Academy Platform"
status: rascunho
tags: [release-2, responsaveis, admin, decisoes]
---

# Release 2 — Admin completo + Responsáveis

> Release 1 = MVP aluno + admin (PRD v0.1.2, fechamento conduzido em outra frente).
> Release 2 = operação administrativa completa + área dos responsáveis.
> Professores ficam para a Release 3 ou 4.

## Escopo

| Onda | Conteúdo | Muda PRD/contratos? |
|---|---|---|
| **A** | Admin completo: convite, turmas, matrículas, reposição, conclusão, revisões e dashboard | Sim, pontual (SR-A1 a SR-A6) |
| B | Base dos responsáveis: papel, link de convite expirável, cadastro, vínculo, RLS | Sim (PRD v0.2) |
| C | Área do responsável: status, frequência, feedback, relatório | Sim |
| D | Gestão de responsáveis no admin, notificações, validação e deploy | Sim |

Decisão de Vinicius (2026-09-16): a Onda 0 (fechamento da Release 1) segue em outra frente; a Release 2 começa pela **Onda A**.

## Decisões de produto (Vinicius, 2026-09-16)

| # | Tema | Decisão |
|---|---|---|
| D1 | Quem ganha acesso | Qualquer responsável que o admin convidar. O admin gera um **link próprio e expirável**; a pessoa abre o link e se cadastra com **nome, e-mail e senha**. |
| D2 | O que o responsável vê | **Somente status e feedback.** Não vê o conteúdo das entregas (textos, arquivos, links). |
| D3 | Revogação do consentimento | O responsável **perde o acesso**. |
| D4 | Relatório para pais | **Entra na Release 2** (base: `08_Modelo_Relatorio_Pais.md`). |
| D5 | Notificações | Preferência por **WhatsApp**, se viável; e-mail é o fallback. |
| D6 | Ordem | Pular a Onda 0 nesta frente e começar pela Onda A. |

## Consequências e pontos a resolver no PRD v0.2

- **D1 · link expirável:** token opaco de uso único, com hash no banco, validade configurável, revogável pelo admin e vinculado a um aluno (e ao tenant). O cadastro por link cria um usuário `guardian`. Definir se o e-mail precisa ser confirmado antes do primeiro acesso e se o mesmo link serve para irmãos, ou se é um link por aluno com vínculo acumulado na mesma conta.
- **D1 × PRD §11:** o PRD exige "autenticação e vínculo verificado". O vínculo passa a ser verificado pela emissão do link pelo admin; registrar como alteração explícita.
- **D2:** a leitura do responsável usa projeções próprias (sem `submission_items`, arquivos, notas privadas de frequência nem texto das entregas). O feedback pedagógico publicado aparece, e o conteúdo avaliado não.
- **D3:** a revogação desativa os vínculos de responsáveis daquele aluno. Se o responsável tiver outros filhos com consentimento válido, a conta continua acessível apenas para eles.
- **D4 · competências não existem no banco:** é preciso modelar competências (lista fixa por currículo), avaliação qualitativa por período, pontos fortes, pontos de atenção, próximos passos e a indicação (Builder / com acompanhamento / reforçar / conversar). O admin preenche e publica o relatório; o responsável lê. Isso contradiz o PRD §3.2 ("avaliar com notas numéricas" é não objetivo), então a escala de evolução deve ser **qualitativa**, não numérica.
- **D5 · WhatsApp:** a API oficial (Meta WhatsApp Business Cloud API) exige conta Business verificada, número dedicado e templates aprovados, e é cobrada por conversa. O PRD v0.1 excluía automação de WhatsApp. Antes de assumir, validar: (a) reaproveitar alguma infraestrutura WhatsApp já existente em outro projeto Logos; (b) custo mensal esperado; (c) opt-in do responsável (LGPD). Até lá, e-mail transacional via Supabase Auth/SMTP é o caminho garantido.

## Próximos passos

1. Onda A: spec `docs/specs/admin-operations-completion.md` e aprovação das SR-A1 a SR-A6.
2. Em paralelo, só documentos: PRD v0.2 cobrindo D1–D5, com Spec Sync Request formal para o papel `guardian`.
