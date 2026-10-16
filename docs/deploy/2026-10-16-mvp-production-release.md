# Liberação do MVP para produção — 16/10/2026

## Estado verificado

- A URL pública padrão do Supabase Auth foi corrigida para `https://logos-academy-three.vercel.app`.
- O diff posterior não possui atualizações pendentes; sete propriedades remotas de outros serviços permanecem explicitamente preservadas.
- Há oito migrations Academy pendentes no projeto remoto, de `20261013040227` até `20261016052000`. Elas já possuem contratos pgTAP executados no ambiente isolado do CI.
- O repositório agora contém uma release manual, concorrente e auditável em `.github/workflows/production-database.yml`. Ela valida lint, testes e build antes de executar `supabase db push --include-all` e comprova a convergência do histórico.
- O relatório Lighthouse reproduzível está em `.github/workflows/production-web-audit.yml`; a tentativa local não foi aceita como métrica porque o cache do npm estava comprometido e o PageSpeed respondeu com limitação de taxa.

## Única configuração humana necessária

No repositório GitHub, criar/abrir o ambiente **production**, protegê-lo com aprovação do responsável e cadastrar apenas o secret `SUPABASE_DB_URL`: a URI de conexão direta do banco do projeto `nqubjiosnlaatxxamiut`. Não registrar a URI em issues, arquivos locais ou chat.

Após isso, no branch `fix/mvp-completion`, executar **Actions → Production database release → Run workflow**, informar `APPLY` e aguardar as três provas: validação da aplicação, `db push` e histórico convergente. Só então mesclar o PR e confirmar que a Vercel concluiu o deploy de produção.

## Gates que não podem ser automatizados

O aceite operacional do produto foi registrado pelo responsável. A revisão jurídica LGPD, a definição de retenção e o ensaio controlado de exportação/revogação/recuperação continuam necessários antes de cadastrar alunos reais; a minuta não deve ser apresentada como parecer jurídico.
