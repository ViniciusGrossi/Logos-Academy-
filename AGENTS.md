# Logos Academy Platform — Context

## Sistema

Plataforma de apoio à formação presencial da Logos Academy para organizar conceitos, atividades, entregas, feedbacks e evolução por projetos de alunos de 12 a 17 anos.

**produto_tipo:** saas-premium  
**Stack:** padrão Logos Tech (Next.js 15 + Tailwind CSS v4 + Shadcn UI + Supabase + Vercel). Desvios exigem ADR em `docs/ARCHITECTURE.md`.

## Sessão — leia primeiro

1. Ler `STATE-PROJECT.md`.
2. Invocar `/logos`; ele roteia fase, skills e workers.
3. Não iniciar implementação sem spec aprovada.

## Fontes de verdade

1. `specs/api.contracts.ts` e `specs/product.schema.json`
2. `docs/specs/[feature].md`
3. `docs/PRD.md`
4. `docs/ARCHITECTURE.md`
5. `STATE-PROJECT.md`

## Regras inegociáveis

- Controller → Service → Repository → Supabase.
- Zero `any`; Zod em todo input.
- RLS em toda tabela, incluindo isolamento por `tenant_id` e por usuário/papel.
- Dados de menores são privados por padrão; nenhuma demonstração usa dados reais.
- Paginação em listagens; operações pesadas em background.
- Secrets somente em `.env`; nunca registrar dados pessoais em logs.
- Tailwind v4 CSS-first com tokens em `@theme`; sem `tailwind.config.js`.
- Dados em hooks, não diretamente em componentes.

## SDD e gates

Mudança de contrato exige Spec Sync Request. Nenhum código é escrito sem spec aprovada. Gates humanos: Idea Lock, PRD Lock, Style Direction, Handshake Visual, Specs Batch, QA Mental e Deploy.

## Knowledge

- Aprendizados: `../../../memoria/learnings.md`
- Patterns: `../../../02-Knowledge/patterns.md`
- ADRs: `../../../02-Knowledge/decisoes.md`
- Bugs: `../../../02-Knowledge/bugs-e-solucoes.md`

