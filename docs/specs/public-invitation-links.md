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
- Links inexistentes ou expirados terminam em `/ativar?error=invalid_link`.
- O link original do Supabase permanece criptografado no banco e acessível
  somente pela `service_role`.
- A página `/ativar` converte a sessão implícita entregue pelo Supabase em
  cookies antes de iniciar o cliente PKCE e remove os tokens da barra do navegador.

## Critérios de aceite

1. Nenhum convite novo contém `localhost` no link curto nem no `redirect_to`.
2. Um link curto válido responde com redirecionamento para o endpoint de
   verificação do Supabase.
3. Ao verificar o token, o Supabase redireciona para a página pública `/ativar`.
4. Link inválido ou expirado não funciona como redirecionador aberto.
5. A mensagem de WhatsApp contém somente o link curto.
6. Após abrir um convite válido, o e-mail aparece preenchido e somente leitura,
   os campos de senha ficam disponíveis e o botão `Ativar meu acesso` é habilitado.
