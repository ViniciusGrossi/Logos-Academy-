# Home Premium — Briefing de Coreografia de Movimento

> Addendum de motion da página inicial do aluno (`components/prototype/student-home.tsx`).
> **NÃO** cria identidade nova. Régua: [`docs/design-system.md`](./design-system.md) §Motion + §Elementos assinatura. Fonte narrativa: [`DESIGN.md`](../DESIGN.md).
> Objetivo: reinjetar a camada premium do protótipo v2 (`docs/Recriação página inicial aluno/Inicio Aluno v2 Premium.dc.html`) **sem violar "Energia Contida"** nem virar árvore de Natal.
> Consumidores: `component-builder` (constrói os primitivos da §4) → `frontend-engineer` (aplica na tela).

Princípio-mãe (design-system §77 / §135): **Energia Contida** — deslocamento 2–4px, sem overshoot, sem coreografia de entrada gratuita, motion confirma mudança de estado. Todo token abaixo é o do design-system; nada de valor de motion hardcoded.

---

## 1. Hierarquia de movimento em camadas

Quatro tiers. A regra de simultaneidade é o antídoto contra "tudo pisca ao mesmo tempo".

| Tier | Papel | Elementos (dos 7 + existentes) | Gatilho | Conta como "movimento competindo"? |
|---|---|---|---|---|
| **T0 — Entrada** | Encena a chegada, **uma vez**, depois silencia | `word-up` (contido), `bar-grow`, `line-reveal`, stagger do header, fade da mission | mount, `once` | Só no 1º paint. Nunca repete em re-render/scroll. |
| **T1 — Ambiente contínuo** | Textura de fundo viva, **atrás do conteúdo**, `aria-hidden` | `glow-breathe` (3 orbes), `radar-sweep`, `ticker`, `grid-drift`, `route-travel`/`mapPulse`, partículas ambiente | loop infinito | Não — desde que ≤ opacidade de fundo e fora da coluna de leitura (regra abaixo). |
| **T2 — Feedback de estado** | Confirma a ação do usuário no elemento que ele toca | hover/focus do statCard, signal, routeNode; nudge de ícone do botão; `MagneticAction`; `current-node`; preenchimento do `progressTrack` | hover / focus / dado muda | Só o elemento sob o ponteiro/foco. Um por vez por natureza. |
| **T3 — Assinatura pontual** | Um acento de personalidade, **no máximo um visível** | `caret` (typewriter no rótulo da ação), `orbit` (ponto no crosshair) | loop, mas único | **Sim — no máx. 1 por viewport.** |

### Regra de simultaneidade (a lei anti-árvore-de-Natal)
1. **Coluna de leitura limpa:** onde há texto que o aluno lê (missionCopy, route copy, signals) — **zero** movimento T1/T3 sobreposto. Ambiente vive nas margens/atrás, com máscara que o afasta do texto.
2. **Teto de loops T1 por viewport:** no máximo **3 orbes glow + 1 varredura (radar-sweep OU route-travel) + 1 ticker**. Nada além disso em loop simultâneo.
3. **T3 é único:** `caret` e `orbit` **nunca** rodam no mesmo viewport. Escolher um por seção (caret na mission, orbit no radar — que estão em viewports/scroll diferentes ✓).
4. **T0 não coexiste com T0:** entrada é sequenciada por stagger, não simultânea; termina e não volta.
5. Ninguém que carregue **peso semântico laranja** (CTA, checkpoint atual) recebe loop decorativo — laranja é sinal de ação (Rare Signal Rule).

---

## 2. Spec por elemento

Durações/eases **sempre** via token (`--dur-*`, `--ease-*`). Loops de ambiente (10–24s) ficam fora da escala de transição — são valores de loop, documentados como tal.

### T0 — Entrada (once)

**1. `word-up` — título hero palavra a palavra** ⚠️ *contido (ver §5)*
- Gatilho: mount, `once`. Stagger 60–80ms entre palavras.
- Duração/ease: `--dur-lenta` (500ms) por palavra, `--ease-entrada`.
- Amplitude: `translateY(4px)` + `opacity 0→1`. **Sem** `rotate`, **sem** `blur`, **sem** os `0.7em` do protótipo.
- `prefers-reduced-motion`: sem transform/stagger — título aparece estático, opacidade 1.

**2. `bar-grow` — barras `scaleX 0→1`**
- Gatilho: mount (miniBars) / dado muda (progressTrack), `once`. Stagger 100–120ms.
- Duração/ease: `--dur-lenta` (500ms), `--ease-entrada`. `transform-origin: left`.
- Amplitude: escala apenas; sem deslocamento. (Já existe no `progressTrack` via framer — manter, alinhar duração ao token.)
- `reduced-motion`: barra renderiza no valor final, sem crescer.

**3. `line-reveal` — sublinhado/divisor `scaleX`** (já na tela, `header::after`)
- Gatilho: mount, `once`. `--dur-enfase` (700ms), `--ease-entrada`, `transform-origin: left`.
- `reduced-motion`: linha estática (já coberto no CSS atual, linha 247).

### T1 — Ambiente contínuo (loop, `aria-hidden`, atrás do conteúdo)

**4. `glow-breathe` — 3 orbes multi-cor** (ver política de cor §3)
- Gatilho: loop infinito, `ease-in-out`. Durações dessincronizadas: **13s / 17s / 21s**, delays negativos (`-4s`, `-8s`) p/ nunca pulsarem juntos.
- Amplitude: `opacity .42→.70` + `scale 1→1.08` (reduzir do 1.12 do protótipo p/ respiro mais contido). São radiais borrados de fundo — a regra dos 2–4px é p/ elementos de UI, não p/ luz ambiente; ainda assim mantemos o gesto discreto.
- `reduced-motion`: orbes estáticos em opacidade média (`.5`), sem pulsar.

**5. `radar-sweep` — varredura conic no card do radar**
- Gatilho: loop, `--ease-linear`, **9s**. `rotate 360deg`, `mask-image` radial p/ desaparecer nas bordas.
- Fica no canto do card, `aria-hidden`, atrás dos signals (coluna de leitura limpa).
- `reduced-motion`: sem rotação — conic estático ou oculto.

**6. `ticker` — marquee mono**
- Gatilho: loop, `--ease-linear`, **22s**, `translateX(0→-50%)` com conteúdo duplicado. `aria-hidden`.
- Amplitude: contínua e lenta; não compete porque é metadado de rodapé, fora do texto principal.
- `reduced-motion`: **para** (sem translate); mostra a lista estática (primeira metade). `pauseOnHover` recomendado.

**7. `route-travel`/`mapPulse` — pulso no traçado do mapa** (já na tela)
- Gatilho: loop, `--ease-linear`, ~7s, `stroke-dashoffset`. `aria-hidden`. Conta como a "1 varredura" do teto — **não** coexiste com radar-sweep no mesmo viewport (estão em seções separadas ✓).
- `reduced-motion`: sem animação (já coberto, linha 247), traçado estático.

### T2 — Feedback de estado (hover/focus/dado)

**8. Hover statCard / signal / routeNode / botão**
- Gatilho: hover + `focus-visible`. `--dur-rapida` (150ms) p/ cor/borda; `--dur-padrao` (250ms) p/ transform.
- Amplitude: `translateY(-2px)` (cards), `translateX(2–4px)` (signals/ícone). **Trocar o ease atual `cubic-bezier(.34,1.56,.64,1)` por `--ease-padrao`** — o `1.56` é overshoot, proibido por Energia Contida (ver §5).
- `reduced-motion`: sem transform; mantém mudança de cor/borda (feedback nunca só por cor — a borda laranja permanece). Já parcialmente coberto (linhas 248–249).

**9. `current-node` — pulso do checkpoint atual**
- Gatilho: loop suave no nó "current", `ease-in-out` ~2.6s (box-shadow apenas, sem deslocamento). É estado, não decoração — sinaliza "você está aqui".
- `reduced-motion`: sem pulso (já coberto), borda laranja estática marca o estado.

**10. `MagneticAction` — atração magnética do CTA primário** (já existe)
- Gatilho: pointer move dentro do botão. Deslocamento cap **≤4px**, `useSpring` sem overshoot (`stiffness ~150, damping ~20`, sem `bounce`).
- `reduced-motion` / touch: desativado (já respeitado no código via `reduceMotion`/`pointerType`).

### T3 — Assinatura pontual (máx. 1 por viewport)

**11. `caret` — cursor typewriter no rótulo da ação**
- Gatilho: loop `steps(1)` ~1.1s (blink, não transição). Fica no `actionKind` da mission.
- Amplitude: opacidade `1→.15`. Sem deslocamento. É acento de "sistema vivo".
- `reduced-motion`: caret **estático visível** (sem piscar) ou omitido — nunca pisca.

**12. `orbit` — ponto orbitando o crosshair**
- Gatilho: loop `--ease-linear` **9s**, `rotate`. Só no `missionSignal`/radar. Não coexiste com caret no viewport.
- Amplitude: órbita pequena (raio ~0.6rem), ponto 3–4px. `aria-hidden`.
- `reduced-motion`: sem órbita — ponto estático numa posição.

---

## 3. Política de acento multi-cor (roxo/azul além do laranja)

Disciplina: laranja é o sinal de ação (máx. ~10% da tela). Roxo (Explorer `#7C5CFC`) e azul (Engineer `#2563EB`) aparecem **somente onde um percurso é literalmente identificado**:

- ✅ **Nos 3 orbes `glow-breathe`** — cada orbe = uma cor de percurso (laranja/Builder, roxo/Explorer, azul/Engineer). É o único lugar de ambiente que carrega as três cores, e por isso é intencional: representa os três caminhos coexistindo ao fundo.
- ✅ **Chips/nós que nomeiam o percurso** (ex.: badge "Explorer · ciclo 01", ícone de sessão de um percurso específico) — cor semântica do percurso, borda + fundo tonal.
- ❌ **Nunca** em: CTAs, hovers genéricos, o traçado/rota do mapa (rota = percurso ativo = laranja), progress, foco, texto de corpo, bordas decorativas.

Regra de ouro: se a cor não está dizendo "este é o percurso X", ela não entra. Fora dos orbes ambiente e dos identificadores de percurso, a tela é laranja+ink+paper.

---

## 4. Split shared vs page-local

### → Primitivos reutilizáveis em `src/components/ui-shared/` (o `component-builder` constrói esta lista)

Todos: `aria-hidden` nas camadas decorativas, fallback `prefers-reduced-motion` embutido, tokens do design-system, zero dependência nova (framer-motion já instalado; preferir CSS puro onde o gesto é loop).

| Primitivo | O que encapsula | API mínima (props) |
|---|---|---|
| **`GlowField`** | Camada de ambiente: N orbes `glow-breathe` + `grid-drift` opcional + máscara que afasta do texto | `orbs?: { color: string; size: string; x: string; y: string; dur: number; delay?: number }[]` (default = 3 orbes de percurso) · `grid?: boolean` · `className?` · render como `<div aria-hidden>` absoluto. Estático em reduced-motion. |
| **`Ticker`** | Marquee horizontal contínuo com conteúdo duplicado p/ loop `-50%` | `items: React.ReactNode[]` · `durationSec?: number` (default 22) · `pauseOnHover?: boolean` (default true) · `aria-hidden` default true. Para (estático) em reduced-motion. |
| **`WordReveal`** | Título revelado palavra a palavra, **contido** (4px, sem rotate/blur) | `children: string` · `as?: ElementType` (default `h1`) · `staggerMs?: number` (default 70) · `amplitudePx?: number` (default 4) · `once?: boolean` (default true). Renderiza texto plano em reduced-motion (uma word span, sem stagger). |
| **`SpotlightCard` / `BorderBeamPanel`** | Superfície com spotlight que segue o ponteiro (`--spot-x/y`) e feixe de borda opcional (deriva do Priority Halo, design-system §122/§136) | `spotlight?: boolean` · `beam?: boolean` (reservado a prioridade/risco — não decoração) · `as?` · `children`. Spotlight e beam off em reduced-motion; borda estática permanece. |

> `WordReveal` é candidato novo (não citado no §125) mas justificável: o `word-up` é um gesto de hero reusável em outras telas editoriais do aluno. Se o `component-builder`/Vinicius preferir manter local por ora, é aceitável — os outros 3 são o núcleo compartilhado.

### → Fica local em `student-home` (específico do conteúdo, não reusável)

- **Mapa de construção** (SVG: `mapRoute`/`mapPulse`/`route-travel`/`mapPoint`/`point-ring`) — geometria e traçado próprios da home.
- **`radar-sweep`** conic no card do radar — acoplado ao layout do card de sinais.
- **`caret`** no rótulo da ação — acento textual pontual da mission.
- **`orbit`** no crosshair — acento do `missionSignal`.
- **`current-node`**, **miniBars/progressRing/progressTrack**, **`MagneticAction`** (já em `@/components/academy`) — trilho/estado específicos, permanecem.

---

## 5. Conformidade com Energia Contida e Elementos assinatura

Dos 7 pré-curados, **2 violam o princípio como estão no protótipo** e vão contidos:

1. **`word-up` (violação):** protótipo usa `translateY(0.7em)` (~11px) + `rotate(1.5deg)` + `blur(6px)` + cascata de 6 palavras — exatamente o "animar entrada em cascata" que DESIGN.md §147 proíbe e amplitude muito acima de 4px. **Versão contida (adotada):** `translateY(4px)` + fade, sem rotate, sem blur, stagger enxuto, `once`. Mantém o gesto palavra-a-palavra (premium) dentro do orçamento de 4px.
2. **Overshoot nos hovers atuais (violação já no código):** `student-home.module.css` usa `cubic-bezier(.34,1.56,.64,1)` em statCard (l.44), routeNode (l.104), signal (l.120) — o `1.56` é overshoot/bounce, proibido por Energia Contida. **Correção:** trocar por `--ease-padrao` `cubic-bezier(.2,.8,.2,1)`.

Os outros 5 (`glow-breathe`, `radar-sweep`, `ticker`, `bar-grow`, `caret`, `orbit`) são **loops de ambiente ou acentos** — não deslocam UI de leitura, então a regra dos 2–4px não os restringe; ficam disciplinados pela §1 (tiers + teto de simultaneidade) e §3 (cor). `bar-grow` é `scaleX` (crescimento de progresso = "confirma avanço", alinhado ao elemento assinatura #7).

**Elementos assinatura cobertos** (design-system §127): #3 Mapa de Construção (map/route local), #7 Energia Contida (todo o T2 contido), #8 Halo de Prioridade (via `BorderBeamPanel`, uso reservado). A home usa ≥2 com função real ✓.

**Riscos abertos:** (a) o teto de loops T1 (§1.2) precisa ser verificado no viewport real 375/768/1440 pelo `ui-reviewer` — em mobile as seções colapsam e mais loops podem cair no mesmo viewport. (b) `blur()` em orbes ambiente é custo de GPU; se houver jank em mobile, reduzir/remover o blur antes de reduzir a opacidade.
