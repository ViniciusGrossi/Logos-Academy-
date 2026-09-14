---
title: "activity-component-scout — recomendações de componentes"
date: 2026-09-13
projeto: "Logos Academy Platform"
status: proposed
scope: frontend-read-only
tags: [spec, frontend, component-scout, activity]
---

# Activity Component Scout

## Decisão

A tela `/atividade` não precisa de uma troca ampla de catálogo. A composição atual já tem assinatura própria — núcleo energético, circuito funcional, rota do projeto, feedback prioritário e linha de versões — e atende à direção **Oficina de Evidências**. A intervenção recomendada é consolidar acessibilidade e contratos visuais com componentes que já existem no repositório, preservando o layout aprovado.

Não instalar ReUI, React Bits, 21st.dev, OriginKit ou uma nova biblioteca de upload nesta execução. O ganho viria de trocar implementações manuais por primitivas já instaladas, não de adicionar outra linguagem visual.

## Evidência auditada

- Tela: `components/prototype/activity-detail.tsx` e `activity-detail.module.css`.
- Rota: `app/atividade/page.tsx`.
- Baseline visual: `docs/prototype-screenshots/activity-workbench-v7-continuous-seam-1440.png` e variante dark.
- Contrato funcional: `docs/specs/student-activity-workbench.md`.
- Design: `docs/design-system.md` e `DESIGN.md`.
- Inventário: `package.json`, `components/ui/*` e `components/academy/*`.
- O preview local não ficou pronto durante a auditoria; a leitura DOM foi substituída por fonte, CSS e screenshots atuais. Nenhuma conclusão dependeu de props inferidas de uma página externa.

## Inventário reutilizável

| Componente exato | Caminho/import | Uso recomendado na Atividade |
|---|---|---|
| `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` | `@/components/ui/accordion` | Apoios da orientação e versões do histórico. |
| `Progress` | `@/components/ui/progress` | Barra semântica da completude da versão, acompanhada de número e contagem textual. |
| `Button` | `@/components/ui/button` | Salvar, enviar, tentar novamente e abrir arquivo; aplicar classe Academy e altura mínima de 44 px. |
| `Input` | `@/components/ui/input` | Entregáveis `external_link` e `github_repository`. |
| `Textarea` | `@/components/ui/textarea` | Entregável textual/registro da decisão. |
| `StatusBadge` | `@/components/academy` | Status da atividade, resultado de critério e estado da versão. |
| `MagneticAction` | `@/components/academy` | Somente CTA primário da versão que exige ação; manter uma única ocorrência por viewport. |
| `StateScene` | `@/components/academy` | Candidato para unificar empty/error somente se o shell puder preservar a cópia e as ações atuais. |
| `Skeleton` | `@/components/ui/skeleton` | Loading já utilizado por `state-lab`; manter. |

Não reutilizar `Card` para brief, feedback, qualidade ou histórico: isso transformaria a página numa grade de cartões e violaria a regra Flat-at-Rest. Não reutilizar `ProgressRail` na rota do projeto: o componente não suporta links e só conhece quatro estados, enquanto a Atividade precisa navegar e representar seis estados contratuais.

## Varredura por área

| Área | Diagnóstico atual | Recomendação concreta | Decisão |
|---|---|---|---|
| Hero e núcleo | Distintivo e funcional; comunica posição, versão e estado sem card genérico. | Manter `CoreWires`, `energyCore` e telemetria. Nenhum background externo. | Manter |
| Rota do projeto | `<ol>` navegável, estados reais e ligação visual com o núcleo. | Manter estrutura nativa. Não substituir por stepper de catálogo nem por `ProgressRail`. | Manter |
| Faixa de metadados | Clara, mas status é texto solto. | Usar `StatusBadge` apenas no status; tempo, versão e prazo continuam texto documental. | Ajuste local |
| Feedback | Primeiro bloco após contexto e com tratamento visual próprio. | Manter `FeedbackPanel`; trocar somente os chips de critérios por `StatusBadge` (`success`/`warning`) para consistência semântica. | Ajuste local |
| Navegação de seções | Funciona como índice sticky e não como troca de views. | Manter âncoras nativas. Não usar `Tabs`, pois as seções coexistem no documento. | Manter |
| Brief | Hierarquia “por quê → missão → pronto significa” já resolve a compreensão. | Manter a composição e `<section>`; não envolver em `Card`, `SpotlightCard` ou disclosure. | Manter |
| Passos | `<ol>` horizontal integra a rota pedagógica ao circuito e não representa progresso individual. | Manter lista nativa. Não adicionar `Progress`: não há estado de conclusão por passo no contrato. | Manter |
| Apoios | Quatro disclosures mantêm conteúdo secundário fora do caminho principal, mas reimplementam estado/ARIA/animação. | Compor o mesmo grid com `Accordion type="multiple"`; cada apoio vira `AccordionItem value={slug}`, com trigger inteiro de 44 px. Preservar ícone, eyebrow e assimetria 7/5 do CSS. | Trocar base |
| Console de iteração | Três instruções curtas e pendências visíveis. | Manter estrutura estática. Acrescentar `Progress value={completion}` no `completionTrack`, com rótulo visível e `aria-valuetext` equivalente à contagem. | Ajuste local |
| Texto e URLs | Inputs nativos têm aparência correta, porém duplicam estados de foco, inválido e disabled. | Substituir tags por `Textarea` e `Input type="url"`; preservar `<label>`, helper, `required`, `pattern` e valores. Aplicar classes locais, sem alterar props de domínio. | Trocar base |
| Upload | Dropzone autoral, direta e compatível com o handshake existente. | Manter `<input type="file">` nativo sobre a área. Nenhum uploader novo; preservar MIME, 20 MB, estado enviando e arquivo anexado. | Manter |
| Ações | Linguagem e hierarquia corretas; botões reimplementam estados básicos. | Usar `Button variant="outline"` no rascunho e `Button` no envio, ambos com `size`/classe para 44 px. Envolver apenas o CTA principal em `MagneticAction`. | Trocar base |
| Qualidade | Lista documental com resultado por critério; não tem cara de tabela ou card cru. | Manter `<ol>`; usar `StatusBadge` no resultado quando existir e conservar número quando ainda não revisado. | Ajuste local |
| Histórico | Timeline é assinatura, mas cada versão reimplementa disclosure com `useState`. | Manter trilho, marcadores `vNN`, evidências e review; trocar somente a base expansível por `Accordion type="multiple"`. `AccordionItem value={submission.id}` preserva mais de uma versão aberta para comparação. | Trocar base |
| Empty/error/loading | Estados existem antes do conteúdo e não quebram o contrato. | Manter nesta wave. Unificar em `StateScene` somente em mudança compartilhada posterior; não duplicar a mesma alteração apenas nesta página. | Manter |

## Composição exata proposta

### Apoios da orientação

```tsx
<Accordion type="multiple" className={styles.supportDeck}>
  <AccordionItem value="tool-hint" className={styles.supportDisclosure}>
    <AccordionTrigger className={styles.supportTrigger}>…</AccordionTrigger>
    <AccordionContent className={styles.supportContent}>…</AccordionContent>
  </AccordionItem>
</Accordion>
```

O array deve ser derivado dos quatro campos já existentes (`toolHint`, `planB`, `portfolioEvidence`, `reflectionPrompt`), sem criar novo contrato. O grid continua no CSS Module; Radix controla abertura, teclado e ARIA.

### Entregáveis

```tsx
<Textarea className={styles.requirementControl} required={requirement.required} … />
<Input type="url" className={styles.requirementControl} required={requirement.required} pattern={…} … />
```

O `<label>` e o helper permanecem fora da primitiva. Em erro de envio, marcar o controle correspondente com `aria-invalid` e associar a mensagem por `aria-describedby`; não alterar `RequirementValue` ou `SubmissionItemInput`.

### Progresso da versão

```tsx
<Progress
  value={completion}
  aria-label="Completude da versão"
  aria-valuetext={`${draftItems.length} de ${activity.requirements.length} evidências`}
/>
```

O número percentual e a contagem continuam visíveis. A barra usa Academy Orange somente como progresso, em conformidade com a Rare Signal Rule.

### Histórico

```tsx
<Accordion type="multiple" className={styles.historyList}>
  {activity.submissionHistory.map((submission) => (
    <AccordionItem key={submission.id} value={submission.id} className={styles.historyVersion}>
      <AccordionTrigger className={styles.historyTrigger}>…</AccordionTrigger>
      <AccordionContent className={styles.historyPanel}>…</AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

Não usar `SpringCard` aqui: ele gerencia uma seção isolada e adicionaria uma segunda implementação de disclosure. O `Accordion` instalado cobre comparação de versões, foco e teclado com menos código.

## Pesquisa de catálogo e anti-repetição

| Fonte | Consulta/resultado | Veredito |
|---|---|---|
| ReUI Tier 1 | Busca gratuita por workflow de atividade, stepper, entregáveis, feedback, histórico e upload retornou zero componentes. Os blocos relacionados exigem plano pago. | Rejeitado: custo/licença e densidade inadequados. |
| Motion Primitives Tier 1 | `Disclosure` existe, mas duplicaria o `Accordion` Radix já instalado. `Sliding Number` serviria apenas para animar `completion`, com benefício cosmético. | Rejeitado pela regra reuse-first/YAGNI. |
| 21st.dev Tier 2 | Já foi usado no próprio projeto (`skiper40`, referências de Progress/Card/Fields). | Não abrir nova busca; evita repetição e consumo de cota. |
| OriginKit Tier 2 | Halo já foi adaptado localmente no design system. | Não buscar/instalar outro componente. |
| React Bits Tier 1 | Produto SaaS revendido; Commons Clause exige decisão humana registrada. | Fora de escopo e desnecessário. |

Esta rodada de planejamento não instala registry novo. Se a execução for contabilizada como uma wave formal sujeita à cota de exploração, registrar Sync Request para o orquestrador decidir entre dispensar a cota por YAGNI ou selecionar um item novo em outra tela onde haja necessidade real; não forçar um componente nesta página.

## Motion e licença

- Tratar o produto como `motion_rigor: completo`, limitado pela identidade local **Energia Contida**: entrada sutil, feedback de estado e microinteração; sem scroll-scrub.
- Não adicionar background animado ou WebGL. O circuito atual já é o único foco de movimento e possui tratamento para `prefers-reduced-motion`.
- `Accordion` usa a animação instalada (`tw-animate-css`) e os tokens `--dur-padrao`/`--ease-entrada`; o polisher pode calibrar duração depois, sem trocar estrutura.
- Nenhuma licença nova é necessária para as trocas recomendadas.

## Ordem mínima de implementação

1. Migrar apoios e histórico para `Accordion`, preservando classes e layout.
2. Migrar textarea/URLs e ações para `Textarea`, `Input` e `Button`.
3. Inserir `Progress` e normalizar badges semânticos com `StatusBadge`.
4. Validar `available`, `draft`, `revision_requested`, `submitted`, `approved` e `locked`; validar loading, error e empty.
5. Comparar 1440 claro/escuro com o screenshot v7; depois validar 768/375, teclado e movimento reduzido.

## Critérios de aceite

- O hero, circuito, rota, primeira dobra e ordem das quatro seções não mudam.
- Feedback continua acima da navegação de seções quando existe.
- Apoios e versões abrem por mouse, Enter e Space; foco permanece visível.
- Mais de uma versão pode permanecer aberta para comparação.
- `text`, `file`, `external_link` e `github_repository` produzem os mesmos payloads.
- Rascunho, upload e envio preservam loading, disabled, success e error.
- A completude expõe percentual e contagem, sem depender apenas de cor.
- Nenhum hex, lógica de dados, hook, endpoint ou prop semântica nova é introduzido.
- Sem drift visual relevante contra `activity-workbench-v7-continuous-seam-1440.png`.

## Fora de escopo

- Alterar layout aprovado, copy pedagógica, contratos, hooks ou dados.
- Instalar dependência ou registry durante esta etapa de especificação.
- Refinar easing, stagger, spring ou outros detalhes reservados ao ui-polisher.
- Consolidar globalmente `state-lab` e `StateScene` sem uma tarefa compartilhada própria.
