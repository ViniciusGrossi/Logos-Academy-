---
title: "curriculum-bootstrap — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-backend"
status: approved
wave: 1
tags: [spec, feature, sdd, curriculum]
---

# Spec: curriculum-bootstrap

## Objetivo
Importar uma versão canônica e imutável do Explorer com 4 ciclos, 16 aulas, conceitos, atividades, critérios e quatro projetos.

## Fora de Escopo
- Builder, Engineer, CMS/editor curricular e alteração do conteúdo canônico pela UI.

## Requisitos Funcionais
1. Importar `../../../Curriculo/Curriculo_Operacional_Explorer.md` por artefato versionado e idempotente.
2. Validar cardinalidade 4 ciclos/16 aulas/4 projetos, ordem, relações e marca estrutural da reflexão/Demo Day.
3. Permitir somente instrução complementar e prazo por execução, sem mutar template canônico.

## API Contract
Nenhum endpoint operacional pertence a esta feature. As consultas de conceitos são responsabilidade de `student-home-journey-concepts`; esta spec entrega somente templates versionados para consumo interno.

## Critérios de Aceite (= test cases do worker)
- [ ] Import repetido não duplica versão nem entidades.
- [ ] Snapshot mantém exatamente 4 ciclos, 16 aulas, 4 projetos e relações pedagógicas.
- [ ] Instrução complementar altera só a execução escolhida.
- [ ] API operacional não edita objetivo ou critério canônico.

## Restrições Técnicas
- **Tabelas:** `curricula`, `cycles`, `lesson_templates`, `concepts`, `lesson_concepts`, `activity_templates`, `activity_requirements`, `activity_criteria`.
- **Endpoints:** nenhum; importação executada por migration de dados idempotente e versionada, não pelo seed de desenvolvimento nem por RPC pública.
- **Libs novas:** nenhuma; parser/importador determinístico local.
- **Background jobs:** não.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| — | — | — | R$ 0 | import local versionado |

## Segurança
- **Auth:** JWT de aluno/admin.
- **RLS:** templates canônicos são somente leitura; exposição ao aluno é controlada pela feature consumidora.
- **Criptografia:** nenhuma neste domínio.
- **LGPD:** conteúdo não contém dado pessoal; import rejeita metadados de aluno.

## Decisão de persistência aprovada

O Explorer v1 entra por migration de dados autocontida. A migration cria ou reutiliza o tenant operacional `logos-academy`, insere uma versão nova e imutável do currículo e faz upsert idempotente de suas entidades. O `seed.sql` continua reservado a fixtures fictícias de desenvolvimento e testes.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| dba | schema e seed/import idempotente | agents/dba.md |
| backend-engineer | importador e validação estrutural | agents/backend-engineer.md |

## Validação
- **GWT-01 — quebra capturada:** retirar idempotência. Dado currículo já importado, quando importa novamente, então contagens e IDs canônicos permanecem estáveis.
- **GWT-02 — quebra capturada:** perder uma relação. Dado snapshot Explorer, quando validado, então possui 4 ciclos, 16 aulas, 4 projetos e todas as FKs esperadas.
- **GWT-03 — quebra capturada:** editar template por execução. Dadas duas turmas, quando uma recebe instrução complementar, então a outra e o template não mudam.
- **GWT-04 — quebra capturada:** expor mutação canônica. Dado request operacional de alteração de critério, quando enviado, então retorna `FORBIDDEN`.
```bash
npm test -- -t "curriculum"
```
