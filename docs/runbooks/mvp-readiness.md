# Prontidão do MVP

Este roteiro separa o que a base do código valida automaticamente do que só pode ser confirmado com as credenciais reais de produção. Não use o modo de demonstração como evidência de uma integração externa.

## Verificado no repositório e CI

- [x] Lint, testes unitários e build executam sem segredos reais.
- [x] Contratos pgTAP podem rodar contra uma instância Supabase isolada no CI.
- [x] Convite exige consentimento e informa a confirmação sem desmontar a tela.
- [x] Datas de convite usam o calendário da Academy e passam por validação antes do envio.
- [x] Contas administrativas navegam apenas pelas rotas administrativas; impersonação não é apresentada como recurso existente.
- [x] Falhas de contrato da fila de revisões registram os campos recebidos no servidor e orientam a conferir migrations.

## Exige ambiente Supabase real

- [ ] Aplicar e conferir todas as migrations remotas, especialmente as que atualizam as RPCs de revisão e de entregas.
- [ ] Rodar o ensaio: aluno entra, abre atividade, anexa ou escreve evidência, envia, administrador revisa, aluno visualiza o feedback.
- [ ] Criar uma conta de aluno separada da conta administrativa e conferir as permissões de ambos os papéis.
- [ ] Verificar RLS e Storage: um aluno não pode baixar, listar ou assinar arquivo de outro aluno.
- [ ] Configurar SMTP, URL do site e URLs de redirecionamento; validar convite, criação de senha e expiração do link.
- [ ] Confirmar que os segredos de produção estão configurados somente no provedor de deploy e não no repositório.

## Critério para demonstrar o MVP

O MVP só está pronto para demonstração operacional quando o fluxo acima é executado com dados reais, do convite ao feedback, sem dados mockados e com um registro de data, conta de teste e resultado.
