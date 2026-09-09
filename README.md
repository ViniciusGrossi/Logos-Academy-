# Logos Academy Platform

Plataforma de apoio às aulas presenciais da Logos Academy. O aluno consulta conceitos, executa uma atividade por vez, registra evidências e acompanha sua jornada; o administrador opera turmas, encontros, frequência e feedback.

## Rotas principais

- Aluno: `/`, `/atividade`, `/jornada`, `/projetos`, `/glossario`, `/agenda` e `/perfil`.
- Administração: `/admin`, `/admin/alunos`, `/admin/turmas` e `/admin/encontros/[sessionId]`.
- Acesso: `/login`, `/ativar` e `/recuperar-senha`.

## Desenvolvimento

### Demonstração local

Para apresentar a interface sem depender de dados remotos, configure `NEXT_PUBLIC_DEMO_MODE=true` e as credenciais locais `DEMO_LOGIN_EMAIL` e `DEMO_LOGIN_PASSWORD` em `.env.local`. O modo cria uma sessão `httpOnly` temporária e atende a interface com dados em memória. Ele é desligado automaticamente em produção e não é um mecanismo de autenticação para deploy.

1. Copie `.env.example` para `.env.local` e preencha as credenciais do Supabase.
2. Execute `npm install` e `npm run dev`.
3. Para validar: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` e `python C:/Users/everex/Documents/Logos Tech/.agents/skills/logos/scripts/validate-ui.py --rigor completo`.

O design usa tokens Academy, Framer Motion e GSAP; o movimento respeita `prefers-reduced-motion`. As telas consomem os endpoints do schema `logos_academy` e não incluem dados de demonstração em produção.
