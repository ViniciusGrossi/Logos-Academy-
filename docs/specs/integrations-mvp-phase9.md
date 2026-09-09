---
title: "Integrações MVP — Fase 9"
date: 2026-09-07
status: approved
phase: 9
---

# Integrações do MVP

## Decisão

Não há integração externa de produção no MVP da Logos Academy Platform. A plataforma substitui o WhatsApp como fonte de verdade para conceito, atividade, entrega, feedback e frequência; ela não automatiza mensagens. GitHub é somente um identificador de perfil e uma URL HTTPS de repositório, sem OAuth nem chamada à API do GitHub.

Esta decisão já está prevista em `docs/PRD.md`, `docs/tasks.md` e `docs/ARCHITECTURE.md`. Ela preserva a privacidade de menores, reduz a superfície de ataque e evita jobs, webhooks e secrets sem necessidade no piloto de até 23 alunos.

## Fora do MVP

- WhatsApp/Evolution: notificações automáticas, webhook e envio em massa.
- N8N: fluxos de automação.
- GitHub: OAuth, leitura de perfil ou repositório e webhooks.
- IA: provedor, prompt de produção, tutor, correção ou geração de conteúdo.

## Contratos preservados

- `PATCH /api/me` aceita somente campos locais de perfil (`displayName` e `githubUsername`); a validação da URL de repositório continua no domínio da submissão.
- Nenhuma rota aceita payload de um provedor externo, assinatura de webhook ou segredo de integração.
- `.env.example` contém somente as credenciais do Supabase e a chave de cifragem local; não há token externo no cliente ou no servidor.

## Gatilho para nova integração

Uma integração futura exige uma nova spec aprovada antes de código, com: finalidade e base legal LGPD, minimização de dados de menores, cliente tipado com timeout/retry, erro estável, segredo em ambiente, webhook assinado com rate limit quando aplicável, operação em background para envio em lote e testes de sucesso, timeout/rate-limit e resposta malformada.

## Critérios de aceite

- [x] PRD, tarefas e arquitetura confirmam que integrações externas são fora do MVP.
- [x] Não existe cliente, webhook, token, prompt produtivo ou job externo especulativo no projeto.
- [x] A única referência ao GitHub é vínculo manual de usuário/URL, sem OAuth.
- [x] `.env.example` não expõe nem documenta segredo de provedor externo.
- [x] A Fase 9 não adiciona dependência, webhook ou infraestrutura sem uma necessidade aprovada.
