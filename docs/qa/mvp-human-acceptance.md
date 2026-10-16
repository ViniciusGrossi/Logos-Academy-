---
title: "Logos Academy — aceite humano para liberação do MVP"
date: 2026-10-16
status: pendente
---

# Aceite humano para liberação do MVP

Este roteiro transforma os gates restantes de liberação em evidências simples e auditáveis. Ele **não** substitui parecer jurídico, não concede conformidade regulatória automaticamente e não deve registrar senhas, tokens, links de convite ou dados reais de alunos.

## Como registrar o aceite

Para cada bloco, registre data, ambiente (preview ou produção), responsável, resultado e um link para a evidência sanitizada (captura, gravação, ticket ou documento). Uma falha abre correção e novo teste; não se marca o bloco como aprovado por exceção verbal.

## 1. Aceite visual, responsivo e de acessibilidade

Executar nas telas de aluno, admin, Revisões e Atlas CMS, em 375 px, 768 px e 1440 px:

- [ ] Não há corte, sobreposição ou rolagem horizontal involuntária.
- [ ] Navegação por teclado funciona com `Tab`, `Shift+Tab`, `Enter`, `Espaço` e `Esc`; o foco permanece visível.
- [ ] Modais, menus, abas, editor e diálogos retornam o foco ao controle de origem ao fechar.
- [ ] Textos, ações, estados de erro e sucesso permanecem compreensíveis com zoom de 200%.
- [ ] A preferência de redução de movimento reduz animações não essenciais sem impedir uso.
- [ ] Contraste, rótulos de campos e alternativas textuais de imagens foram revisados contra o critério AA aplicável.
- [ ] A experiência foi aprovada visualmente por quem responde pelo produto, inclusive a área de Revisões e o Atlas CMS.

## 2. Aceite operacional do fluxo acadêmico

Usar apenas contas e dados de teste autorizados:

- [ ] Admin cria turma, confere capacidade e acompanha quem enviou ou não uma atividade.
- [ ] Admin cria convite individual e o aluno ativa a conta por link em domínio publicado, sem depender de `localhost`.
- [ ] Aluno preenche, salva rascunho, anexa evidência, envia versão e visualiza o próprio histórico.
- [ ] Admin abre a submissão, aprova ou solicita ajustes com feedback; aluno reencontra o feedback e reenvia.
- [ ] Conteúdo ainda não liberado não aparece ao aluno; conteúdo liberado aparece na ordem esperada.
- [ ] Falta bloqueia a progressão e a reposição restaura o caminho previsto.
- [ ] Apresentação registrada conclui o ciclo; após conclusão, o portfólio fica somente leitura.
- [ ] Admin cria no Atlas um rascunho, adiciona blocos, publica, consulta como aluno, restaura uma versão e arquiva sem perder a trilha.

## 3. Privacidade, operação e LGPD

Este bloco requer o responsável operacional e, quando aplicável, revisão jurídica:

- [ ] Finalidade, base legal, aviso de privacidade, retenção e canal para solicitações do titular foram aprovados para o uso pretendido.
- [ ] O fluxo de convite, consentimento de responsável e tratamento de dados de menores foi revisado para o público real da Academy.
- [ ] Há responsável nomeado e procedimento de atendimento para acesso, correção, exclusão, incidente e revogação de acesso.
- [ ] O time sabe quais dados podem ser inseridos em atividades, anexos e Atlas; exemplos e testes não expõem dados pessoais desnecessários.
- [ ] Logs, capturas de QA e evidências de aceite foram verificados para não conter segredos, links de ativação ou informações pessoais reais.
- [ ] O procedimento técnico em `docs/compliance/lgpd-operational-procedures.md` foi lido e adaptado à operação antes do primeiro aluno real.

## 4. Risco técnico que exige decisão explícita

- [ ] O responsável técnico decidiu se o alerta transitivo de desenvolvimento (`braces`) fica temporariamente aceito, documentando escopo e prazo, ou se a atualização do fornecedor é requisito antes da publicação.
- [ ] A decisão não altera o fato de que dependências de produção precisam permanecer sem vulnerabilidades conhecidas de severidade inaceitável.

## Registro de decisão de liberação

| Campo | Registro |
| --- | --- |
| Ambiente validado | |
| Data e hora | |
| Responsável pelo produto | |
| Responsável operacional | |
| Responsável jurídico (quando aplicável) | |
| Evidências sanitizadas | |
| Pendências aceitas e prazo | |
| Decisão | `Aprovar para merge/publicação` / `Reprovar` |

## Critério final

Só é permitido integrar a PR de MVP à `main`, aplicar migrações em produção e promover a Vercel após: CI técnico verde, jornada E2E verde, todos os blocos acima aprovados e revisão da PR concluída. Depois da promoção, repetir um smoke test de login, convite, atividade e Atlas no domínio publicado.
