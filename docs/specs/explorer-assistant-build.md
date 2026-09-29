---
title: "explorer-assistant-build — Spec"
date: 2026-09-29
projeto: "Logos Academy Platform"
fase: "build-backend | build-frontend"
status: approved
wave: 12
tags: [spec, explorer, projeto-1, assistente, evidencias]
---

# Spec: explorer-assistant-build

## Objetivo

Fazer as quatro primeiras atividades do Explorer conduzirem a construção de um assistente web simples em contas externas do aluno, preservando na Academy os arquivos, links, versões, feedbacks e a versão atual do projeto.

## Fora de Escopo

- Provisionar contas GitHub, Vercel, Supabase ou Groq, ou guardar qualquer segredo delas.
- Executar, hospedar ou chamar a LLM a partir da Academy.
- Editar código no navegador, acessar repositório via OAuth ou sincronizar commits automaticamente.
- Incluir RAG, fine-tuning, autenticação de usuários do app, banco de dados do app ou colaboração em tempo real.

## Requisitos Funcionais

1. As atividades 1–4 do Explorer v2 passam a construir respectivamente interface, rota server-side + system prompt, refinamento/testes e deploy do assistente.
2. Cada atividade exige apenas artefatos compatíveis com seu marco: arquivos de código/documentação, texto, links HTTPS e repositório GitHub quando aplicável.
3. O aluno envia uma versão dos artefatos pela Mesa de Atividade e recebe revisão/uma nova versão pelo fluxo atual.
4. A página do Projeto 1 mostra uma mesa de construção com as peças aprovadas mais recentes: interface, rota de IA, system prompt, testes e deploy.
5. A Academy mostra links externos como referências; a execução do app ocorre no domínio publicado pelo aluno e a chave da Groq permanece exclusivamente como variável de ambiente da Vercel.
6. Aprovar a atividade 4 continua aprovando o Project Day e preservando o Projeto 1; não será criado um segundo fluxo manual de aprovação do projeto.

## API Contract

```typescript
export interface ProjectBuildArtifact {
  slot: "frontend" | "api" | "prompt" | "tests" | "deploy" | "repository";
  label: string;
  sourceActivityPosition: number;
  version: number;
  kind: SubmissionItemKind;
  value: string | null;
  fileId: UUID | null;
  fileName: string | null;
}

export interface ProjectDetail extends ProjectSummary {
  brief: ProjectBrief | null;
  build: readonly ProjectBuildArtifact[];
  activities: readonly ProjectActivity[];
}
// endpoint existente: GET /api/student/projects/:projectId
```

## Rollout

Explorer v3 é um novo namespace curricular para novas turmas. Explorer v2, suas matrículas e suas entregas permanecem imutáveis. O mapeamento de cada peça do projeto é explícito em `activity_requirements.project_slot`, nunca inferido do rótulo.

## Critérios de Aceite (= test cases do worker)

- [ ] O currículo mantém exatamente 16 atividades e quatro Project Days; somente as quatro primeiras mudam de conteúdo.
- [ ] A Atividade 1 orienta e recebe uma interface; a 2, rota server-side e prompt; a 3, refinamento e testes; a 4, deploy/repositório/documentação.
- [ ] Um artefato só aparece em `ProjectDetail.build` quando sua versão foi aprovada.
- [ ] Uma versão revisada substitui a peça anterior no mesmo slot, preservando o histórico da entrega.
- [ ] O projeto não recebe segredo, URL assinada de upload, conteúdo de variável de ambiente ou chamada direta à Groq.
- [ ] Aluno vê somente os próprios artefatos e admin de outro tenant não recebe o projeto.
- [ ] Nenhum erro em console/logs; TypeScript, lint, testes e build passam.

## Restrições Técnicas

- **Tabelas:** reutilizar `activity_templates`, `activity_requirements`, `activity_criteria`, `submissions`, `submission_items`, `activity_assignments` e `project_records`; `activity_requirements.project_slot` identifica a peça de projeto; sem tabela nova.
- **Endpoints:** somente `GET /api/student/projects/:projectId` recebe a projeção `build`; rotas de atividade e review existentes continuam sendo usadas.
- **Libs novas:** nenhuma.
- **Background jobs:** não.

## Segurança

- **Auth:** leitura somente do aluno proprietário; admin continua acessando evidências pela revisão do mesmo tenant.
- **RLS:** projeção de projeto usa a autorização existente da matrícula.
- **Criptografia:** texto da submissão continua cifrado; nenhum segredo de Vercel/Groq/GitHub é aceito como requisito ou renderizado.
- **LGPD:** links e arquivos são evidências pedagógicas privadas de menores; portfólio permanece privado.

## Validação

```bash
npm test -- --run
npx tsc --noEmit
npm run build
# UI: projeto 1 com evidência aprovada em localhost mostra as peças atuais sem overflow.
```
