---
title: "Modo de demonstração — autenticação local e dados navegáveis"
status: approved
date: 2026-09-07
---

# Modo de demonstração

## Objetivo

Permitir uma demonstração local completa da Logos Academy sem depender de credenciais Supabase nem dados reais de menores.

## Escopo

- Login local somente fora de produção, com credenciais em `.env.local`.
- Cookie `httpOnly` de demonstração, recusado em produção.
- Dados fictícios coerentes para todas as telas de aluno e administração.
- Mutações da demonstração retornam sucesso fictício, sem gravar no Supabase.
- Sidebar leva a todas as telas disponíveis, preservando destaque da rota atual.

## Fora de escopo

- Não cria usuário no Supabase Auth.
- Não altera RLS, contratos de produção ou dados remotos.
- Não usa dados reais de alunos, responsáveis ou entregas.

## Critérios de aceite

1. Dado o modo demo local ativo, quando Vinicius informa as credenciais definidas no ambiente, então entra em `/` e vê dados preenchidos.
2. Dado modo demo ativo, quando acessa uma rota protegida sem o cookie, então é redirecionado para `/login`.
3. Dado login demo ativo, quando abre cada tela da sidebar, então vê conteúdo fictício coerente, sem loading ou erro permanente.
4. Dado qualquer tela, quando clica na navegação lateral, então chega à rota correspondente e a navegação marca a página atual.
5. Dado build de produção, quando o modo demo não está ativo, então nenhuma rota ou cookie demo concede acesso.
