# Textura de superfície — obsidiana, sideral e pauta

**Status:** implementado em 2026-09-23. Este documento passou de plano a registro.
**Escopo:** só a textura. As luzes radiais laranja ficaram **fora** (inventário no anexo B).

---

## 1. O que foi trocado e por quê

O padrão `linear-gradient(cor 1px, transparent 1px)` + `linear-gradient(90deg, …)` existia em **26 declarações** espalhadas por 11 arquivos. O cliente resumiu bem: *"muitos cards estão com fundo quadriculado, e isso é muito AI Slop."*

O diagnóstico foi mais específico que "tem grade demais": **seis das ocorrências eram fundo de página inteira** — `.fieldPage`, `.profilePage`, `.home`, `.journey`, `.portal`, `.detail` — todas com passo de 4rem e luz laranja no mesmo canto. O mesmo bloco copiado. Por cima delas havia ainda malhas *internas* de card em outro passo (`.fieldGrid` 3.5rem, `.passportGrid` 2.5rem, `.hoverGrid` 2.15rem, `.cursorGrid` 1.6rem). Duas malhas desalinhadas no mesmo viewport produzem moiré, não textura — era isso que se enxergava.

A primeira versão deste plano propunha trocar tudo por **cor chapada**. O cliente rejeitou, com razão: o próprio `DESIGN.md` lista como anti-referência *"direções simples demais, com grandes títulos e amostras de cor, mas sem profundidade de produto"*. Chapado trocava um problema por outro.

A direção final saiu de uma comparação renderizada na página real, com quatro tratamentos lado a lado.

---

## 2. A regra

> **Obsidiana é o material de toda superfície. Sideral só dentro de canvas de mapa. Pauta só em superfície de leitura. Malha de dois eixos: em lugar nenhum.**

### Obsidiana — material de campo e de painel

Pedra vulcânica polida: luz direcional vinda de cima à esquerda, escurecimento tonal até o canto oposto, e veios de fratura escassos. **Só neutro** — não gasta laranja (ação) nem roxo (trilha Explorer), então as duas cores continuam significando o que significam.

```css
/* app/globals.css */
:root {
  --obsidian-light: rgb(255 255 255 / 5%);
  --obsidian-vein: rgb(255 255 255 / 9%);
  --obsidian-sheen: rgb(255 255 255 / 4%);
  --vein-mask: url("data:image/svg+xml,…"); /* 3 segmentos angulares */
}
html:not(.dark) {
  --obsidian-light: rgb(255 255 255 / 65%);
  --obsidian-vein: rgb(16 17 20 / 7%);
  --obsidian-sheen: rgb(255 255 255 / 45%);
}
```

Receita aplicada sobre o token de campo de cada módulo:

```css
background:
  radial-gradient(120% 80% at 6% -6%, var(--obsidian-light), transparent 54%),
  linear-gradient(158deg,
    color-mix(in srgb, var(--campo) 88%, var(--color-academy-paper)) 0%,
    var(--campo) 46%,
    color-mix(in srgb, var(--campo) 86%, #000) 100%);
```

Em tema claro a mesma receita vira pedra clara: a luz continua no mesmo canto, só o token muda. **Por isso não há duplicata de `:global(html:not(.dark))` para textura** — foram 8 regras eliminadas.

**Veios como máscara, não imagem.** O SVG define só a forma; a cor vem de `--obsidian-vein`. Uma peça, os dois temas:

```css
.fieldGrid {
  background: var(--obsidian-vein);
  mask-image: var(--vein-mask), linear-gradient(to left, #000 0 38%, transparent 76%);
  mask-composite: intersect;
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
}
```

Teto: **3 segmentos**, ancorados na borda, mascarados antes de chegar ao texto. Mais que isso e lê como vidro trincado — e trincado conota quebrado.

### Sideral — só onde há mapa

Campo estelar escasso (12 pontos, brilhos variados, sem repetição), em `--sidereal-stars`. Aplicado em exatamente **dois** lugares, ambos canvas de mapa com nós e rota:

- `journey-page.module.css` → `.mapCanvas` (rota dos 16 encontros)
- `knowledge-atlas.module.css` → `.mapCanvas::after` (mapa de conceitos)

Ali constelação não é cenário: é o que o desenho já é. **Sem roxo**, de propósito.

Em 2026-09-24 entrou uma terceira casa, e a única com dado real por nó: a
**Constelação de conceitos**, no leitor do Atlas. O conceito aberto fica no centro e
`ConceptDetail.relatedConcepts` em órbita, com pulso viajando por cada aresta.
Substitui a lista `RelatedItems` naquele ponto.

- **Laranja só no centro** ("você está aqui"). Os relacionados são neutros — se todos
  acendessem, o sinal de posição se dissolveria.
- **A órbita começa na horizontal (0°), não no topo.** Com 2 relacionados, começar em
  -90° empilha os dois no eixo vertical: desperdiça a caixa larga e faz a aresta cruzar
  o rótulo do centro. Foi exatamente o que aconteceu na primeira renderização.
- **Abaixo de 52rem vira lista empilhada.** Mesmo dado, sem comprimir rótulo.
- **Sem dependência nova.** O pulso é `stroke-dasharray` animado, o mesmo da rota da
  Jornada. A proposta original vinha com `@base-ui/react` e `motion` (duplicata do
  `framer-motion` já instalado) — e com um fundo pontilhado que é o mesmo papel de
  parede removido aqui.

### Pauta de bancada — só onde se lê

Um eixo, passo `--texture-step: 2rem`, cor `--texture-rule-on-paper` / `--texture-rule-on-ink`. Não é padrão novo: `student-pages.module.css:16`, `knowledge-atlas` `.reader` e `auth` `.formWrap` já faziam exatamente isso há tempos, com os mesmos números e nenhum token. O trabalho foi nomear e apontar o resto para lá.

---

## 3. O que mudou, arquivo por arquivo

| Arquivo | Mudança |
|---|---|
| `app/globals.css` | Tokens de obsidiana, sideral e pauta. Deletado o bloco morto `.construction-map`/`.map-grid`/`.checkpoint-code` (zero uso em `.tsx`). Deletado `.glow-field__grid` + `@keyframes grid-drift`. |
| `academy/glow-field.tsx` | Removida a prop `grid` (quadriculado **animado infinito**). Único consumidor era a galeria. |
| `academy/component-gallery.tsx` | `<GlowField grid />` → `<GlowField />` |
| `student-agenda.module.css` | Campo → obsidiana. `.fieldGrid` → veios. `.boardCell`: `background-image` sem `background-size` (borda improvisada) → `box-shadow: inset 0 0 0 1px var(--agenda-line)`. |
| `student-profile.module.css` | Campo → obsidiana. `.passportGrid` → veios. |
| `journey-page.module.css` | Campo → obsidiana. `.mapCanvas` → **sideral**. |
| `student-home.module.css` | Campo → obsidiana (escuro e claro). |
| `knowledge-atlas.module.css` | `.header` → obsidiana. `.mapCanvas::after` → **sideral**. `.videoFrame` perdeu a malha (ficava atrás de um iframe opaco). `.reader` → token. |
| `auth-experience.module.css` | `.grid` → pauta. `.evidencePanel` → obsidiana. `.formWrap` (2 variantes) → token, e removido o `linear-gradient(115deg)` ornamental. |
| `admin-experience.module.css` | `.sessionHero::after` → obsidiana. |
| `activity-detail.module.css` + `.tsx` | `.hoverGrid` deletado (regra + nó). Duplicava o radial de ponteiro que o `.hero` já tem. |
| `project-portal.module.css` + `.tsx` | Campo → obsidiana. `.cursorGrid` deletado (regra + nó). |
| `project-detail.module.css` + `.tsx` | Campo → obsidiana. `.focusCursorGrid` deletado (regra + nó). |
| `student-pages.module.css` | `.reader` → token. |

---

## 4. Armadilhas encontradas na execução

Registradas porque vão morder de novo.

1. **O inventário inicial estava incompleto.** O grep buscava `1px, transparent 1px` com espaço; `project-portal` e `project-detail` são minificados e escrevem `1px,transparent 1px`. Dois arquivos inteiros passaram batido na primeira auditoria. **Ao varrer CSS neste repo, considere as duas grafias.**

2. **Remover seletor de arquivo minificado deixa prefixo órfão.** Apagar `.cursorGrid{…}` de uma linha que era `…}:global(html:not(.dark)) .cursorGrid{…}` deixou `:global(html:not(.dark)) ` solto no fim da linha, que colou no `@keyframes` seguinte. Resultado: `Selector "0%,100%" is not pure` e **três rotas em 500**. Em CSS Modules minificado, remova o seletor *com* o prefixo, ou varra órfãos depois.

3. **Script multi-arquivo que grava por arquivo falha pela metade.** Um `patch()` que escreve ao fim de cada arquivo deixa os anteriores gravados quando um posterior lança. Conferir estado real antes de reexecutar, senão o segundo run falha em padrão que já foi aplicado.

---

## 5. Verificação

```bash
# Deve dar 0 — inclui a grafia minificada:
node -e "const fs=require('fs'),g=require('child_process');
let t=0;for(const f of g.execSync('find app components -name \"*.css\" -not -path \"*/node_modules/*\"').toString().trim().split('\n')){
const m=(fs.readFileSync(f,'utf8').match(/linear-gradient\(90deg,\s*[^;}]*?1px,\s*transparent 1px\)/g)||[]);if(m.length){console.log(f,m.length);t+=m.length}}
console.log('TOTAL:',t)"

npx tsc --noEmit && npx eslint . && npm test
```

Resultado em 2026-09-23: **0 quadriculados**, `tsc` 0 erros, `eslint` 0 erros, 73 testes passando, 8 rotas em 200 (`/`, `/agenda`, `/perfil`, `/jornada`, `/atlas`, `/projetos`, `/atividade`, `/admin`), sem erro de página no console.

---

## 6. Registrar no DESIGN.md

Ainda **pendente**. Acrescentar em §5 "Signature Components":

> **Obsidiana.** Material de toda superfície: luz direcional de cima à esquerda, escurecimento tonal até o canto oposto, até 3 veios de fratura ancorados na borda. Só neutro — nunca gasta laranja nem roxo.
> **Sideral.** Campo estelar escasso, exclusivo de canvas de mapa com nós e rota. Nunca em fundo de página, nunca com roxo.
> **Pauta de bancada.** Um eixo, passo no ritmo do corpo, só em superfície de leitura ou escrita. No máximo uma por viewport.
> **Malha de dois eixos: proibida.**

Sem esse registro, o vazio volta a ser preenchido pelo default — foi assim que o quadriculado entrou.

---

## Anexo A — classificação original (26 declarações)

- **Papel de parede, removidas:** 19 (+2 encontradas depois nos arquivos minificados)
- **Funcionais, viraram sideral:** 2 (`journey` e `atlas` `.mapCanvas`)
- **Já eram pauta, tokenizadas:** 3 (`auth` `.formWrap` ×2, `atlas` `.reader`) + `student-pages` `.reader`
- **Não era textura:** 1 (`.boardCell` — borda improvisada)
- **CSS morto:** 1 (`.map-grid`)

---

## Anexo B — luzes radiais laranja (FORA DO ESCOPO)

Não tocado nesta rodada, por decisão do cliente. Inventário levantado na mesma auditoria:

| Tela | Luzes simultâneas |
|---|---|
| Auth | 4 |
| Início | 2 + 3 orbes do GlowField = 5 |
| Agenda | 3 |
| Atlas | 3 |
| Jornada | 2 |
| Perfil | 1 + halos |
| Atividade | 1 |

`DESIGN.md` §2 põe teto de ~10% de laranja na tela ("The Rare Signal Rule") e §6 proíbe glow. A regra proposta é **uma luz por viewport, e só se for reativa ao ponteiro** — aí é afordância de hover, que §4 permite. Com a obsidiana neutra no campo, o ganho dessa limpeza agora seria maior do que era antes.

---

## Anexo C — achados fora de escopo

1. **`auth-experience.module.css:633-644`** — `.panel` usa `backdrop-filter: blur(24px) saturate(138%)` sobre fundo semitransparente: glassmorphism, banido nominalmente em §6 e §5 (*"Background: Paper ou Ink, nunca vidro"*). Também em `student-agenda` e `student-home`.
2. **Tipografia sub-legível** — 9 tamanhos abaixo de `.6rem` em mono com `letter-spacing`, espalhados pelos módulos de aluno. É a linguagem de rótulo da casa; mudar exige decisão de sistema, não correção pontual.
