# Links públicos de convite

## Objetivo

Todo convite da Logos Academy deve levar o aluno à ativação pública em
`https://logos-academy-three.vercel.app/ativar`, mesmo quando o administrador
gera o convite a partir do ambiente local.

## Contrato

- A origem de ativação é canônica e não pode ser derivada da requisição.
- O Supabase Auth recebe exatamente a URL pública `/ativar` como `redirectTo`.
- A mensagem de WhatsApp expõe um link curto da própria Academy no formato
  `https://logos-academy-three.vercel.app/c/<codigo>`.
- O código possui entropia suficiente, expira em 24 horas e resolve somente no
  servidor para o link individual do Supabase.
- O `GET` do link curto mostra uma confirmação pública e nunca acessa o endpoint
  de verificação do Supabase; somente o `POST` disparado pelo aluno abre o token.
- Robôs de preview do WhatsApp podem consultar o link curto sem consumir o
  convite individual.
- A CSP permite `form-action` somente para a própria aplicação e para a origem
  exata do projeto Supabase, necessária apó o redirecionamento do `POST`.
- Links inexistentes ou expirados terminam em `/ativar?error=invalid_link`.
- O link original do Supabase permanece criptografado no banco e acessível
  somente pela `service_role`.
- A página `/ativar` converte a sessão implícita entregue pelo Supabase em
  cookies antes de iniciar o cliente PKCE e remove os tokens da barra do navegador.

## Critérios de aceite

1. Nenhum convite novo contém `localhost` no link curto nem no `redirect_to`.
2. Um link curto válido aberto por `GET` não redireciona nem expõe o token do
   Supabase e oferece o botão `Continuar ativação`.
3. O `POST` desse botão redireciona para o endpoint de verificação; ao validar o
   token, o Supabase retorna para a página pública `/ativar`.
4. Link inválido ou expirado não funciona como redirecionador aberto.
5. A mensagem de WhatsApp contém somente o link curto.
6. Após abrir um convite válido, o e-mail aparece preenchido e somente leitura,
   os campos de senha ficam disponíveis e o botão `Ativar meu acesso` é habilitado.
7. Um acesso de preview antes do clique humano não altera o resultado do item 6.
