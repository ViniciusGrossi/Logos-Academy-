# Logos Academy Platform — Design System

Direção consolidada: **A+C Premium — Oficina de Evidências**. Fonte de verdade narrativa e de componentes: [`DESIGN.md`](../DESIGN.md).

## Princípios

1. Ação antes de análise.
2. Evidência torna progresso concreto.
3. Premium significa precisão.
4. Tecnologia convida, não intimida.
5. Aluno e admin têm cadências diferentes.

## Tokens canônicos

### Cores

| Token | Valor | Uso |
|---|---:|---|
| `--color-ink-950` | `#101114` | sidebar, texto forte |
| `--color-ink-900` | `#17191D` | superfície escura elevada |
| `--color-ink-800` | `#22252A` | texto secundário forte |
| `--color-gray-600` | `#505761` | texto secundário |
| `--color-gray-400` | `#8A919A` | metadado |
| `--color-gray-200` | `#D5D8DC` | borda |
| `--color-gray-100` | `#E9EAEC` | divisor |
| `--color-gray-50` | `#F5F6F7` | canvas |
| `--color-white` | `#FFFFFF` | papel |
| `--color-orange-600` | `#E85F00` | ação pressionada |
| `--color-orange-500` | `#FF6B00` | ação e checkpoint |
| `--color-orange-400` | `#FF8126` | hover/foco |
| `--color-orange-100` | `#FFF0E5` | sinal suave |
| `--color-explorer` | `#7C5CFC` | percurso Explorer |
| `--color-builder` | `#FF6B00` | percurso Builder |
| `--color-engineer` | `#2563EB` | percurso Engineer |
| `--color-engineer-support` | `#0F766E` | suporte técnico |
| `--color-success` | `#16A34A` | concluído |
| `--color-warning` | `#D97706` | atenção/prazo |
| `--color-error` | `#DC2626` | erro/bloqueio |
| `--color-info` | `#0891B2` | informação |

Temas usam tokens semânticos `--background`, `--foreground`, `--surface`, `--surface-raised`, `--muted`, `--border` e `--primary`; não referencie hex direto em componentes.

### Tipografia

- Display: `DM Serif Display, Georgia, serif`; 48–64px; peso 400; linha .94–.98.
- UI/body: `Inter, Arial, sans-serif`; 14–18px; linha 1.45–1.6.
- Utility: `JetBrains Mono, Consolas, monospace`; 10–12px; tracking .06–.1em.
- Limite de leitura: 68ch. Serif no máximo uma vez por viewport.

### Espaçamento

Escala: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px`. Base 4px. Alvo mínimo: 44×44px.

### Radius

- `--radius-sm: 6px`; controles internos.
- `--radius-md: 10px`; botões e campos.
- `--radius-lg: 14px`; objetos de trabalho.
- `--radius-xl: 20px`; painéis principais.
- `--radius-pill: 999px`; status compacto.

### Shadows

- `--shadow-soft: 0 4px 16px rgb(16 17 20 / 6%)`.
- `--shadow-elevated: 0 12px 40px rgb(16 17 20 / 10%)`.
- Repouso é plano; sombra responde à hierarquia ou interação.

### Motion

- `--dur-rapida: 150ms`; hover, focus e microestado.
- `--dur-padrao: 250ms`; accordion, tabs e sheet.
- `--dur-lenta: 500ms`; progresso estrutural.
- `--dur-enfase: 700ms`; somente conclusão importante.
- `--ease-padrao: cubic-bezier(.2,.8,.2,1)`.
- `--ease-entrada: cubic-bezier(.16,1,.3,1)`.
- `--ease-linear: linear`.
- Identidade: **Energia Contida** — deslocamento de 2–4px, sem overshoot, sem coreografia de entrada.

## @theme — Tailwind v4 CSS-first

Bloco canônico a aplicar no futuro `globals.css` da aplicação (não criar `tailwind.config.js`):

```css
@theme {
  --color-academy-ink: #101114;
  --color-academy-paper: #ffffff;
  --color-academy-canvas: #f5f6f7;
  --color-academy-orange: #ff6b00;
  --color-academy-explorer: #7c5cfc;
  --color-academy-engineer: #2563eb;
  --color-academy-success: #16a34a;
  --color-academy-warning: #d97706;
  --color-academy-error: #dc2626;
  --font-sans: Inter, Arial, sans-serif;
  --font-display: "DM Serif Display", Georgia, serif;
  --font-mono: "JetBrains Mono", Consolas, monospace;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --shadow-soft: 0 4px 16px rgb(16 17 20 / 6%);
  --shadow-elevated: 0 12px 40px rgb(16 17 20 / 10%);
  --ease-padrao: cubic-bezier(.2,.8,.2,1);
  --ease-entrada: cubic-bezier(.16,1,.3,1);
  --animate-fast: 150ms;
  --animate-standard: 250ms;
  --animate-slow: 500ms;
}
```

## Componentes e composição

- `Sidebar` + `Sheet`: chassi desktop/mobile; dark sempre disciplinado.
- `Progress`: mostra valor numérico e checkpoints, nunca só cor.
- `Accordion`: versões e feedback; summary inteiro clicável.
- `Tabs`: alterna estados e recortes do protótipo, mantendo o estado na URL para revisão compartilhável.
- `Tooltip`: apenas para icon-only; texto visível quando a ação não é óbvia.
- `Separator`: organiza listas sem fabricar cards.
- Buttons: verbo + objeto, 44px, primary/secondary/ghost/destructive/loading/disabled.
- Fields: label persistente, helper/error, foco de 3px.
- `Smooth Field`: label flutuante ocupa uma área reservada, sem substituir o nome acessível; transiciona apenas `transform`, cor e opacidade, preserva ajuda/erro e desativa deslocamento em `prefers-reduced-motion`.
- `Priority Halo`: borda luminosa direcional inspirada no `neon-border` da OriginKit, implementada com CSS nativo e reservada à próxima missão ou a um risco operacional urgente. Nunca aplicar como decoração em série.
- `Responsive Edge`: superfícies comuns recebem borda laranja parcial, wash de 5% e elevação máxima de 1px; ícones avançam 4px para indicar destino. Duração de 220ms com `--ease-entrance`.

Referências de catálogo: `ProjectProgressCard`, `Floating Label`, `Spotlight Card` e `Border Beam Panel`, encontrados no 21st. Tabs e Tooltip são componentes Shadcn instalados; o halo da OriginKit permanece uma adaptação CSS local porque o registry exige credencial separada.

## Elementos assinatura

1. **Chassi Academy** — sidebar Ink fixa, item ativo tonal e marca com respiro.
2. **Trilho de Missão** — próxima ação ligada a checkpoints nomeados.
3. **Mapa de Construção** — diagrama assimétrico com grid técnico sutil e destinos reais.
4. **Folha de Evidência** — linha documental de artefato, competência, status e data.
5. **Marcador de Versão** — `v01`, `v02`, `final` em Mono junto ao feedback.
6. **Papel de Oficina** — superfície clara, borda fina e sombra apenas em resposta.
7. **Energia Contida** — motion direcional curto que confirma avanço.
8. **Halo de Prioridade** — linha luminosa discreta que percorre somente o contorno da ação mais urgente, com fallback estático em movimento reduzido.

Cada tela das fases 8 e 10 deve usar ao menos dois elementos assinatura com função real.

## Responsividade e acessibilidade

- 1440: sidebar 248–272px; conteúdo até 1240px; composição assimétrica.
- 768: sidebar vira Sheet; controles permanecem rotulados; duas colunas viram uma quando necessário.
- 375: prioridade única, listas empilham, tabelas viram linhas documentais; sem scroll horizontal.
- WCAG 2.2 AA; teclado completo; `:focus-visible` evidente; contraste não depende do tema; `prefers-reduced-motion` remove transforms e movimentos não essenciais.

## Estados obrigatórios

Default, hover, focus-visible, active, disabled, loading, error, empty e success. Feedback nunca depende apenas de cor e ações assíncronas anunciam mudança via região `aria-live`.
