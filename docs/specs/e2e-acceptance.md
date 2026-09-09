---
title: "e2e-acceptance — Spec"
date: 2026-09-03
projeto: "Logos Academy Platform"
fase: "build-integracoes"
status: approved
wave: 6
tags: [spec, feature, sdd, e2e]
---

# Spec: e2e-acceptance

## Objetivo
Provar em browser real que o MVP completo suporta a demonstração conduzida convite → conclusão sem violar isolamento, progressão ou acessibilidade.

## Fora de Escopo
- Carga de produção, deploy público, pagamentos, WhatsApp, professor/responsável e automação de certificado.

## Requisitos Funcionais
1. Executar jornada real com admin, aluno A e aluno B usando banco/Storage locais, não mocks de UI.
2. Cobrir turma de seis e matrícula individual no mesmo currículo.
3. Provar bloqueios de futuro, cross-user, ausência sem reposição e mutação pós-conclusão.
4. Cobrir content/loading/empty/error e 375/768/1440 sem erro de console.
5. Produzir roteiro e dados fictícios reproduzíveis para demonstração conduzida.

## API Contract
> Esta spec exercita o contrato canônico inteiro sem redefini-lo.
Não possui endpoint próprio nem ownership de implementação.
```typescript
export interface Endpoint<Request, Response> {
  request: Request;
  response: ApiResult<Response>;
}
```

## Critérios de Aceite (= test cases do worker)
- [ ] Convite → atividade → correção → aprovação → projeto funciona para aluno de teste.
- [ ] Turma de seis e individual operam o Explorer sem duplicar currículo.
- [ ] Conteúdo futuro falha por interface e chamada direta.
- [ ] Aluno A não acessa dado/arquivo do aluno B.
- [ ] Admin identifica todas as pendências no Dashboard.
- [ ] Falta sem reposição impede conclusão; reposição preserva a falta e remove o bloqueio.
- [ ] Quatro projetos aprovados aparecem no portfólio privado.
- [ ] Conclusão mantém leitura e bloqueia mutação.
- [ ] 375/768/1440 não têm overflow; build, testes, RLS e contratos passam.
- [ ] Tabs persistem em `?tab=`, sobrevivem a refresh/Voltar e funcionam com setas do teclado sem quebrar em duas linhas.

## Restrições Técnicas
- **Tabelas:** todas as tabelas MVP com fixtures descartáveis.
- **Endpoints:** todos os 39 de `ApiContracts`.
- **Libs novas:** Vitest, Testing Library e jsdom entram exclusivamente no harness W0.10; agent-browser já está disponível para E2E.
- **Background jobs:** não.

## Tokens e APIs Externas
| API | Modelo/Tier | Rate Limit | Custo estimado | Fallback |
|---|---|---|---|---|
| Supabase local | local | — | R$ 0 | reset/seed reproduzível |

## Segurança
- **Auth:** sessões reais separadas por contexto de browser.
- **RLS:** matriz admin/aluno A/aluno B/outro tenant e Storage privado.
- **Criptografia:** fixtures fictícias; testes comprovam que DTO não expõe cipher/PII indevida.
- **LGPD:** nenhum menor real; screenshots e logs usam nomes/e-mails fictícios.

## Sub-Agents Designados
| Agent | Task | SOP |
|---|---|---|
| e2e-tester | jornada ponta a ponta | agents/e2e-tester.md |
| adversarial-tester | cross-user, URL direta e inputs hostis | agents/adversarial-tester.md |
| ui-reviewer | a11y e responsividade | agents/ui-reviewer.md |
| security-auditor | RLS/LGPD/Storage | agents/security-auditor.md |

## Validação
- **GWT-01:** Dado admin e aluno convidado, quando completa entrega→correção→aprovação, então projeto recebe evidência aprovada.
- **GWT-02:** Dadas turma de seis e matrícula individual, quando carregadas, então compartilham uma versão curricular e têm sessões próprias corretas.
- **GWT-03:** Dado assignment futuro, quando aluno tenta UI e URL direta, então conteúdo não renderiza e API retorna `FORBIDDEN`.
- **GWT-04:** Dado aluno B e IDs do aluno A, quando consulta linhas/arquivos, então recebe `FORBIDDEN` e nenhuma URL assinada.
- **GWT-05:** Dadas pendências conhecidas, quando admin abre Dashboard, então cada uma aparece uma vez com motivo.
- **GWT-06:** Dada falta sem/depois com reposição, quando tenta concluir, então primeiro bloqueia e depois permite mantendo a ausência no histórico.
- **GWT-07:** Dados quatro Project Days aprovados, quando abre portfólio, então vê quatro projetos privados em ordem.
- **GWT-08:** Dada matrícula concluída, quando lê e tenta mutar, então leitura funciona e mutação falha.
- **GWT-09:** Dadas três viewports e estados obrigatórios, quando navega por teclado, então não há overflow, erro de console ou foco invisível.
- **GWT-10:** Dada qualquer página com tabs, quando seleciona uma aba, recarrega, usa Voltar e navega com setas, então a aba acompanha `?tab=` e o trilho permanece utilizável em 375 px.
```bash
npm test
supabase test db
python "C:/Users/everex/Documents/Logos Tech/.agents/skills/logos/scripts/validate.py"
# E2E: agent-browser open localhost:3000 → jornada completa
```
