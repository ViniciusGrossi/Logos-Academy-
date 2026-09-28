# Handoff — Atlas / Release 2

Para quem estiver trabalhando neste worktree (`Logos-Academy-`, branch `main`):

- `specs/api.contracts.ts` foi alterado com tipos e endpoints do Atlas.
- `docs/specs/student-knowledge-atlas.md` foi reespecificado como v2.
- Há arquivos parciais deixados por workers em `src/modules/knowledge-atlas/`, `app/api/admin/atlas/`, `src/tests/knowledge-atlas.test.ts`, além de alterações em `src/lib/supabase/rpc-error.ts` e nas rotas de `concepts` e `library`.
- A migration `0048_student_knowledge_atlas.sql` **não está aplicada** no Supabase remoto.

Não misture essas alterações com o branch independente `release-2/onda-b-atlas-student`, que contém apenas a interface estudantil do Atlas.
