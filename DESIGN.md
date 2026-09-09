---
name: Logos Academy Platform
description: Oficina digital em que a próxima ação produz evidência concreta.
colors:
  ink-workshop: "#101114"
  ink-raised: "#17191D"
  academy-orange: "#FF6B00"
  paper: "#FFFFFF"
  canvas: "#F5F6F7"
  line: "#D5D8DC"
  explorer-purple: "#7C5CFC"
  engineer-blue: "#2563EB"
  success: "#16A34A"
  warning: "#D97706"
  error: "#DC2626"
typography:
  display: { fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 56px, fontWeight: 400, lineHeight: 0.96, letterSpacing: -0.025em }
  headline: { fontFamily: 'Inter, Arial, sans-serif', fontSize: 32px, fontWeight: 750, lineHeight: 1.08, letterSpacing: -0.035em }
  title: { fontFamily: 'Inter, Arial, sans-serif', fontSize: 18px, fontWeight: 700, lineHeight: 1.3 }
  body: { fontFamily: 'Inter, Arial, sans-serif', fontSize: 16px, fontWeight: 400, lineHeight: 1.55 }
  label: { fontFamily: '"JetBrains Mono", Consolas, monospace', fontSize: 11px, fontWeight: 700, lineHeight: 1.3, letterSpacing: 0.08em }
rounded: { sm: 6px, md: 10px, lg: 14px, xl: 20px, pill: 999px }
spacing: { 1: 4px, 2: 8px, 3: 12px, 4: 16px, 5: 20px, 6: 24px, 8: 32px, 10: 40px, 12: 48px, 16: 64px, 20: 80px }
components:
  button-primary: { background: "{colors.academy-orange}", color: "{colors.ink-workshop}", rounded: "{rounded.md}" }
  field-default: { background: "{colors.paper}", color: "{colors.ink-workshop}", rounded: "{rounded.md}" }
  surface-work: { background: "{colors.paper}", color: "{colors.ink-workshop}", rounded: "{rounded.lg}" }
---

# Design System: Logos Academy Platform

## 1. Overview

**Creative North Star: "Oficina de Evidências"**

A plataforma parece uma oficina digital séria e acolhedora: estrutura escura e disciplinada ao redor de uma área de trabalho clara, com sinais técnicos discretos. A próxima ação aparece em até cinco segundos; versões, feedback e portfólio registram o que foi construído.

O premium vem da precisão de hierarquia, estados e comportamento — nunca de vidro, gradientes ou ornamentos de luxo. A interface rejeita LMS genérico, grades intermináveis de cards iguais, cyberpunk e editorial estático.

**Key Characteristics:**
- Ação antes de análise.
- Evidência antes de promessa.
- Cadência guiada para aluno; densidade calma para admin.
- Laranja raro, funcional e reconhecível.
- Motion curto, direcional e sem espetáculo.

## 2. Colors

Preto de oficina, papel luminoso e Academy Orange formam a base; cores de percurso e semânticas aparecem somente quando informam.

### Primary
- **Academy Orange** (#FF6B00): ação primária, checkpoint atual e foco de marca; máximo aproximado de 10% da tela.

### Secondary
- **Explorer Purple** (#7C5CFC): identificação do percurso Explorer, nunca CTA global.
- **Engineer Blue** (#2563EB): identificação do percurso Engineer e informação técnica.

### Neutral
- **Ink Workshop** (#101114): sidebar, texto de máxima ênfase e superfícies escuras.
- **Paper** (#FFFFFF): superfície de trabalho.
- **Canvas** (#F5F6F7): fundo de página.
- **Line** (#D5D8DC): divisores e contornos.

**The Rare Signal Rule.** Academy Orange é sinal de ação ou estado; se tudo chama atenção, nada chama atenção.

## 3. Typography

**Display Font:** DM Serif Display (Georgia fallback)
**Body Font:** Inter (Arial/system fallback)
**Label/Mono Font:** JetBrains Mono (Consolas fallback)

**Character:** Inter sustenta uma ferramenta direta. DM Serif aparece só em momentos editoriais de ambição; Mono identifica versão, prazo, sessão e dado.

### Hierarchy
- **Display** (400, 48–64px, .94–.98): um único título editorial por tela de aluno.
- **Headline** (750, 28–36px, 1.08): títulos de área e painel admin.
- **Title** (700, 18px, 1.3): objetos de trabalho.
- **Body** (400, 16px, 1.55): instruções com máximo de 68ch.
- **Label** (700, 11px, .08em, uppercase): metadados curtos, não parágrafos.

**The One Editorial Moment Rule.** Serif ocorre no máximo uma vez por viewport; controles e dados ficam em Inter/Mono.

## 4. Elevation

O sistema é plano por padrão. Bordas e diferença tonal organizam; sombras surgem apenas quando uma superfície precisa se separar ou responder a hover.

### Shadow Vocabulary
- **Soft** (`0 4px 16px rgb(16 17 20 / 6%)`): superfície elevada em repouso.
- **Elevated** (`0 12px 40px rgb(16 17 20 / 10%)`): sheet, menu e objeto em hover.

**The Flat-at-Rest Rule.** Não empilhar cards sombreados nem aninhar cartões em cartões.

## 5. Components

### Buttons
- **Shape:** raio 10px, altura mínima 44px.
- **Primary:** laranja com texto Ink; verbo + objeto.
- **Hover / Focus:** clareia para #FF8126, eleva 1px e desloca o ícone 4px; foco de 3px com offset; active comprime 1px.
- **Secondary:** papel com borda; ghost apenas em superfícies escuras.

### Chips
- **Style:** pill compacto para estado, prazo e versão; cor sempre semântica.
- **State:** selecionado usa fundo tonal e borda; chip não substitui botão.

### Cards / Containers
- **Corner Style:** 14px, 20px somente em grandes painéis.
- **Background:** Paper ou Ink, nunca vidro.
- **Shadow Strategy:** plana no repouso; Soft/Elevated por função.
- **Border:** 1px Line.
- **Internal Padding:** 16–32px.
- **Hover:** borda recebe Orange parcial, wash de 5% e elevação de 1px. Somente missão prioritária e risco urgente usam halo animado no contorno.

### Inputs / Fields
- **Style:** Paper, borda 1px, raio 10px, 44px mínimo.
- **Focus:** borda Orange + halo Orange Soft de 3px.
- **Error / Disabled:** Error explícito com mensagem; disabled reduz contraste sem esconder rótulo.
- **Smooth Field:** label persistente em slot reservado; animação curta de `transform`/cor/opacidade, ajuda e erro associados por `aria-describedby`, sem deslocamento quando `prefers-reduced-motion` estiver ativo.

### Navigation
- Sidebar escura fixa no desktop e Sheet no mobile; item ativo tem superfície tonal e marcador laranja. Tabs Shadcn alternam estados de demonstração sem movimento de layout.

### Architecture Shadcn
- `Sheet` para navegação móvel; `Progress` no trilho; `Accordion` em feedback; `Tabs` nos estados do protótipo; `Tooltip` em ações icon-only. Os componentes instalados recebem tokens Academy sem alterar seus contratos acessíveis.

### Signature Components
- **Trilho de Missão:** próxima ação + checkpoints.
- **Mapa de Construção:** progresso não linear com destinos nomeados.
- **Folha de Evidência:** artefato, competência e status numa linha.
- **Marcador de Versão:** versão, data e estado sempre próximos do artefato.
- **Halo de Prioridade:** contorno luminoso discreto, derivado do padrão `neon-border`, usado somente na próxima missão e em risco urgente; nunca em cards comuns.

## 6. Do's and Don'ts

### Do:
- **Do** revelar a próxima ação em até cinco segundos.
- **Do** usar 4px como unidade e alvos interativos mínimos de 44px.
- **Do** mostrar hover, focus-visible, active, disabled, loading, error, empty e success quando aplicáveis.
- **Do** preservar WCAG 2.2 AA, teclado e `prefers-reduced-motion`.
- **Do** usar Academy Orange apenas para ação, progresso ou foco.

### Don't:
- **Don't** criar um LMS genérico ou grades intermináveis de cards idênticos.
- **Don't** usar cyberpunk, glow, glassmorphism, gradientes decorativos ou estética de luxo.
- **Don't** infantilizar adolescentes com mascotes, confete ou gamificação rasa.
- **Don't** usar editorial estático que esconda a ação.
- **Don't** usar faixa lateral colorida maior que 1px como decoração.
- **Don't** animar entrada de página em cascata; motion comunica mudança de estado.
