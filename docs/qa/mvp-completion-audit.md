# MVP: auditoria de conclusão — 13/10/2026

Objetivo original mantido: concluir o MVP inteiro e provar funcionamento, não apenas o deploy do CMS. Produção de referência: 589b77d; CI anterior 183 unitários/390 pgTAP, insuficiente para provar jornada completa.

| Requisito | Estado inicial | Próxima prova/reparo |
|---|---|---|
| F01 convite/ativação | não verificado ponta a ponta | link inerte, POST humano, ativação e novo login reais |
| F02 início | não verificado ponta a ponta | prioridade correção/feedback, leitura idempotente |
| F03 jornada/liberação | individual incompleto | operar encontro individual e bloqueios futuro/segmentação |
| F04 conceitos/Atlas | busca incompleta | sem acento/tag e regras de visibilidade |
| F05 atividade | não verificado ponta a ponta | rascunho, arquivo, envio imutável e reenvio |
| F06 revisão | fila individual ausente | incluir individuais, rubrica e feedback reais |
| F07 portfólio | cursor ignorado | quatro projetos e histórico multi-matrícula completos |
| F08 currículo | artefatos v3 presentes | corroborar 4 projetos/16 aulas e canonicidade |
| F09 matrículas/turmas | UI de matrícula/cancelamento ausente | aluno existente, individual, limite seis, calendário |
| F10 frequência/reposição | listas truncadas/individual bloqueado | páginas completas, falta preservada/reposição |
| F11 dashboard | interface parcial | filas, filtro turma/risco, taxa e ações |
| F12 consentimento/GitHub | confirmação física implícita | checkbox e revogação bloqueando acesso |
| F13 conclusão | bloqueada no v3 | snapshot exige local position=16; provar caso positivo |
| F14 arquivos | metadata sem inspeção real | bytes, proprietário, tipos/tamanho e download real |

Reparos adicionais: tenant excluído continua autorizado por helpers/identidade; logs externos não minimizados; tabs/filtros sem URL; controles CMS duplicação/ocultação/undo pendentes.

Dependências humanas: sessão admin para smoke publicado; procedimento LGPD revisado juridicamente e aprovado operacionalmente. Testes fictícios são exclusivos do ambiente isolado.

Evidências e resultados serão acrescentados após execução. Nenhum item será marcado concluído apenas por intenção, flag ou review estático.
