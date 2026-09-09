---
title: "activity-submission-files — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-backend"
status: approved
wave: 3
tags: [spec, feature, sdd, submission]
---

# Spec: activity-submission-files

## Objetivo
Permitir ao aluno registrar rascunho e enviar versões imutáveis com texto, links, GitHub e arquivos privados validados.

## Fora de Escopo
- OAuth GitHub, edição colaborativa, antivírus próprio, vídeo/áudio hospedado e upload acima de 20 MB.

## Requisitos Funcionais
1. Exibir objetivo, instruções, continuidade, prazo, requisitos, critérios, conceitos e projeto associado.
2. Salvar um rascunho single-writer por assignment com requisitos combináveis.
3. Validar HTTPS, domínio `github.com`, GitHub configurado quando exigido e `expectedDraftId`.
4. Emitir upload/download assinado curto por `fileId` opaco; validar MIME, tamanho, existência e propriedade no finalize.
5. Criar submissão imutável, aceitar atraso e permitir tentativas ilimitadas em matrícula ativa.
6. Bloquear mutação em matrícula pausada/concluída/cancelada, preservando leitura.

## Superfícies Frontend
- `/atividades/[assignmentId]`: fluxo único de instrução → rascunho → envio; critérios ficam visíveis e histórico usa Accordion/aside, sem tabs.
- `/perfil`: conta e GitHub, sem tabs.
- Upload, finalize e download são ações internas dessas superfícies, nunca uma biblioteca de arquivos.

## API Contract
```typescript
"GET /api/me": Endpoint<Record<string, never>, MeProfile>;
"PATCH /api/me": Endpoint<{ displayName?: string; githubUsername?: string }, MeProfile>;
"GET /api/student/activities/:assignmentId": Endpoint<{ assignmentId: UUID }, ActivityDetail>;
"PUT /api/student/activities/:assignmentId/draft": Endpoint<{
  assignmentId: UUID;
  items: readonly SubmissionItemInput[];
}, SubmissionDetail>;
"POST /api/student/activities/:assignmentId/submit": Endpoint<{
  assignmentId: UUID;
  expectedDraftId: UUID;
}, SubmissionDetail>;
"POST /api/files/upload-url": Endpoint<{
  assignmentId: UUID;
  filename: string;
  contentType: string;
  sizeBytes: number;
}, { file: UploadedFile; signedUploadUrl: string; expiresAt: ISODateTime }>;
"POST /api/files/:fileId/finalize": Endpoint<{ fileId: UUID }, UploadedFile>;
"GET /api/files/:fileId/download-url": Endpoint<{ fileId: UUID }, { signedDownloadUrl: string; expiresAt: ISODateTime }>;
```

## Critérios de Aceite (= test cases do worker)
- [ ] Detalhe contém todo contexto e apenas para assignment liberado/próprio.
- [ ] Rascunho incompleto salva, mas submissão lista requisitos ausentes.
- [ ] Submissão válida cria versão imutável e muda assignment para `submitted`.
- [ ] Prazo vencido aceita envio e preserva atraso derivado.
- [ ] Atividade GitHub bloqueia submissão sem perfil e rejeita host/protocolo inválido.
- [ ] Arquivo >20 MB, MIME executável ou `fileId` alheio é rejeitado antes de associação.
- [ ] Download alheio retorna `FORBIDDEN` sem URL assinada.
- [ ] Estado não ativo permite leitura e bloqueia rascunho/submissão.
- [ ] Aluno sem GitHub trabalha normalmente em atividade que não exige repositório.
- [ ] Link externo com protocolo diferente de HTTPS permanece inválido, independentemente de ser GitHub.

## Restrições Técnicas
- **Tabelas:** `activity_assignments`, `submissions`, `submission_items`, `uploaded_files`, `users`, `audit_events`.
- **Endpoints:** oito listados acima.
- **Libs novas:** nenhuma; `new URL()` para links.
- **Background jobs:** não; validação de arquivo ocorre no handshake upload/finalize.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| Supabase Storage | plano do projeto | limite do provedor | armazenamento inicial baixo | entrega por link externo para mídia |

## Segurança
- **Auth:** JWT student; URL assinada criada somente no servidor.
- **RLS:** assignment, draft e file pertencem à matrícula do aluno; bucket privado.
- **Criptografia:** conteúdo textual da entrega protegido em repouso conforme classificação; nenhum secret em item.
- **LGPD:** arquivos têm finalidade pedagógica, retenção definida antes do deploy e nunca entram em logs.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| backend-engineer | services, endpoints e validação Zod | agents/backend-engineer.md |
| integration-engineer | client resiliente de Storage | agents/integration-engineer.md |
| frontend-engineer | detalhe, rascunho e envio | agents/frontend-engineer.md |
| security-auditor | ownership e URLs assinadas | agents/security-auditor.md |

## Validação
- **GWT-01:** Dado assignment futuro/alheio, quando abre por UUID, então recebe `FORBIDDEN` sem detalhes.
- **GWT-02:** Dado rascunho sem item obrigatório, quando envia, então recebe `VALIDATION_ERROR.fieldErrors` e rascunho permanece.
- **GWT-03:** Dado rascunho válido, quando envia com `expectedDraftId`, então cria versão imutável e status `submitted`.
- **GWT-04:** Dado prazo vencido, quando envia, então aceita e `isLate` permanece derivável verdadeiro.
- **GWT-05:** Dada exigência GitHub sem perfil ou URL fora de `https://github.com`, quando envia, então orienta/configura ou rejeita.
- **GWT-06:** Dado arquivo 20 MB+1 ou executável ou de outro aluno, quando solicita/finaliza, então rejeita antes de associar.
- **GWT-07:** Dado aluno B com `fileId` do aluno A, quando pede download, então recebe `FORBIDDEN` sem URL.
- **GWT-08:** Dada matrícula `paused`, `completed` ou `cancelled`, quando tenta salvar/enviar, então bloqueia mutação e mantém GET disponível.
- **GWT-09:** Dado aluno sem GitHub e atividade sem requisito `github_repository`, quando salva e envia os demais requisitos, então o fluxo funciona.
- **GWT-10:** Dado item `external_link` com `http:` ou outro protocolo, quando salva/envia, então o requisito permanece inválido com `VALIDATION_ERROR`.
```bash
npm test -- -t "activity|submission|files"
# UI: agent-browser open localhost:3000/atividade → snapshot
```
