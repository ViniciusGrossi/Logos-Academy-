# Correção da suíte de contratos do banco

Status: aprovado pelo usuário em 2026-10-12.

## Problema e escopo

O CI #52 passou na aplicação e nos contratos 058/059/062, mas falhou na suíte completa pgTAP. Atualizar expectativas comprovadamente obsoletas após as migrations, sem diminuir cobertura, desativar regras de segurança ou alterar dados de produção. Não restaurar Explorer v1/v2.

## Aceite

- Dado o schema final, quando a suíte verifica tabelas, então todas as tabelas reais são cobertas por RLS e timestamps, mantendo o inventário core obrigatório.
- Dadas assinaturas e privilégios atuais, quando os testes inspecionam RPCs, então verificam as assinaturas completas e a restrição ao backend, inclusive bloqueio de acesso direto.
- Dado o currículo v3, quando os contratos de currículo executam, então comprovam quatro projetos, 16 aulas e aposentadoria das versões anteriores.
- Dadas fixtures transacionais, quando são inseridas, então respeitam FKs e imutabilidade sem desativar triggers.
- Dadas páginas consecutivas de revisão, quando o cursor é usado, então não omitem nem repetem versões; falha real da implementação deve ser escalada, não acomodada pelo teste.
- Dada a branch final, quando o GitHub executar a suíte completa, então aplicação e banco passam sem filtros para esconder falhas.

## Segurança e operação

Fixtures somente no Supabase isolado do runner. Nenhum reset, seed ou teste com escrita no projeto remoto compartilhado. Migrations já aprovadas não são reescritas para acomodar testes. Regressões reais exigem correção incremental e revisão antes do deploy.

## Regressão confirmada durante diagnóstico

As três projeções administrativas da migration 0053 usam a primeira linha omitida como cursor junto com predicado exclusivo. Isso perde um registro por página. A correção incremental usa a última linha devolvida apenas quando existe linha excedente, com ordenação explícita tanto da página quanto do cursor. Assinaturas, filtros de tenant, validação de administrador, decriptação e ACL backend-only permanecem iguais.
