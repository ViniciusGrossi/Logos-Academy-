# Jornada real isolada do MVP

Estado: harness executado no runner; **jornada ainda não aprovada**. Auth e leituras RLS da preparação passaram. O diagnóstico #6 e reprodução local identificaram cliques CDP fora da viewport sem submit; o commit `465e7dd` corrigiu isso. O ensaio #7 aprovou login real, criação da turma e negação cross-tenant; falhou ao avaliar a página de ativação do primeiro aluno. `0836342` acrescenta classificação privada e retry limitado a navegação transitória. Guardrails não comprovam a jornada e não encerram F01–F14, a revisão visual humana ou o gate LGPD.

## Executar

No GitHub Actions, executar **MVP real end-to-end** na branch que contém os reparos do MVP. O workflow também roda em PR para `main`. Não exige Docker/WSL na máquina Windows, secrets do repositório ou credenciais de produção.

O runner Ubuntu inicia Supabase CLI `2.118.0`, Auth, PostgreSQL e Storage locais; instala `agent-browser@0.27.2` separadamente das dependências do aplicativo e abre o Next em `http://localhost:3000`.

O modo local exige `CI=true`, `ACADEMY_E2E=isolated`, `ACADEMY_E2E_LOCAL=true`, `NODE_ENV=development`, `NEXT_PUBLIC_DEMO_MODE=false`. O guard recusa origens externas, URLs ambíguas, portas não previstas e execução sem opt-in antes de conectar/criar dados. A fixture não faz reset remoto, não carrega `.env.local` e não lê credenciais do usuário.

## O que é real

| Etapa | Execução e oracle |
| --- | --- |
| Administradores | Criados via Auth Admin local; vínculos de fixture no tenant operacional v3 e em tenant separado. Login pela interface, com cookies reais. |
| Convites | Endpoint real cria seis alunos coletivos e um individual; cada link passa pela confirmação humana e ativação com e-mail preenchido. Sétimo aluno coletivo deve retornar 409. |
| Individual | Calendário próprio de 16 encontros e contexto sem turma. IDs e ordem vêm das APIs reais. |
| Evidência | Primeira atividade preenchida no browser; arquivo PNG real pelo input nativo, Storage e finalize; rascunho e envio pelos botões. |
| Revisão | Rubrica real no browser, pedido de correção, reenvio v2 e aprovação sem observações. Histórico mantém v1/v2. |
| Jornada longa | APIs reais na sessão do browser liberam as demais 15 aulas, enviam os requisitos canônicos e aprovam os quatro Project Days. Arquivos adicionais atravessam PUT/finalize reais. |
| Frequência | Uma falta preservada, conclusão negada, reposição separada, apresentação e conclusão derivada sem flags manuais. |
| Isolamento | Aluno colega do mesmo tenant e admin de outro tenant não acessam atividade/arquivo do aluno individual. Aluno não acessa API administrativa. |
| Após conclusão | Consulta continua; edição e novo upload devem ser negados; portfólio percorre cursores e contém quatro projetos distintos. |
| Responsividade | Ficha administrativa em 375/768/1440, sem overflow, abas por teclado com URL, Voltar/Avançar e refresh. |

Não há `route.fulfill`, substituição de fetch, fake Auth ou RPC de conclusão que pré-aprove evidências. SQL de preparação cria apenas identidades administrativas e tenant; nenhuma entrega, presença ou projeto pronto é inserido como fixture.

## Evidência e privacidade

O único artifact é `artifacts/mvp-e2e/result.json`: nomes fixos de etapas, status e descrição genérica de falha. Não são publicados stdout/stderr do browser, logs do Next, tokens, senhas, cookies, links de ativação ou URLs assinadas. Credenciais efêmeras ficam em arquivo de modo `0600` no diretório temporário do runner, fora do checkout. Chaves exportadas pelo CLI são mascaradas antes de entrar em `GITHUB_ENV`.

Se um oracle falhar, o processo termina com exit code 1; não há skip para transformar comportamento inconclusivo em sucesso. O nome da etapa falha delimita a investigação sem expor dados. É possível aumentar observabilidade de forma revisada, nunca publicar logs privados completos.

## Limites que não devem ser confundidos com aceite completo

- A execução completa ainda precisa passar; inicializar os serviços e validar Auth na preparação não substitui os checkpoints da jornada.
- A primeira atividade e sua revisão usam a UI; a progressão extensa usa APIs reais e não comprova a qualidade visual de todas as 16 telas.
- Não substitui auditoria AA, medição LCP, estados loading/empty/error de todas as páginas, CMS ou teste de carga.
- O teste de futuro usa atividade liberada apenas para outra matrícula. A matriz completa de conceitos futuros, arquivo revogado, tenant soft-deleted e todas as mutações pós-conclusão permanece nos testes de contrato/segurança e deve ser consolidada no relatório final.
- Seeds históricos locais ainda existem no reset padrão, mas não são usados como evidência de jornada pronta. O aluno criado aqui percorre a jornada do zero.

Validação local segura: `node --test tests/e2e/isolation.test.mjs`; sintaxe: `node --check scripts/e2e/prepare.mjs` e `node --check scripts/e2e/journey.mjs`. Não executar fixture manual com URL remota.
