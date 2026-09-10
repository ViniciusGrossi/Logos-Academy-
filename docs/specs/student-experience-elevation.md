---
title: "Student Experience Elevation — Visual Redesign"
date: 2026-09-10
status: approved
milestone: visual-product-2026
wave: 8
tags: [spec, frontend, design, motion]
---

# Student Experience Elevation — Visual Redesign

## Objetivo

Elevar Início, Jornada e Projetos ao padrão visual do Auth “Estúdio Vivo de Evidências”, preservando contratos, dados, rotas e fluxos existentes.

## Direção

- A experiência do aluno é uma oficina viva: progresso, evidência e próximo passo têm presença espacial, resposta tátil e movimento intencional.
- O Auth fornece a atmosfera — topografia, rota, profundidade e luz de borda — sem ser copiado literalmente para a área de trabalho.
- Movimento deve comunicar estado ou orientar atenção; não entra como decoração repetitiva.
- A paleta e a tipografia existentes continuam canônicas. Nenhuma cor ou espaçamento é hardcoded fora dos tokens Academy.

## Escopo desta wave

1. **Início:** cena de progresso, rota de missão, destaque da próxima ação e feedback animado em marcos concluídos.
2. **Jornada:** trilha de aprendizado explorável, com progressão, conexões e revelação progressiva de detalhes.
3. **Projetos:** coleção de evidências, com cards em camadas, preview contextual e navegação com continuidade visual.
4. **Sistema compartilhado:** primitives reutilizáveis de entrada em cascata, magnetismo apenas para CTAs prioritários, foco/hover direcional e transições com spring.

## Fora de escopo

- Alterar APIs, schemas, RLS, permissões, dados de produção ou regras pedagógicas.
- Trocar a navegação de informação, esconder conteúdo essencial em animações, ou converter páginas administrativas no mesmo espetáculo visual.
- Adicionar dependências sem inspeção prévia e necessidade real. `framer-motion` e `gsap` já instalados são suficientes por padrão.

## Critérios de aceite

- [ ] As três rotas preservam conteúdo, CTAs e estados loading/empty/error existentes.
- [ ] Cada tela tem uma composição própria e um elemento de assinatura que comunica progresso/evidência, não apenas cards genéricos.
- [ ] CTAs prioritários têm feedback tátil; ações secundárias permanecem discretas.
- [ ] Animações respeitam `prefers-reduced-motion` e não dependem de hover em dispositivos de toque.
- [ ] Teclado, foco visível, contraste WCAG AA e alvos de 44 px são preservados.
- [ ] Não há overflow horizontal em 375, 768 e 1440 px; há screenshot de cada rota nesses viewports.
- [ ] Testes existentes passam, com novos testes para lógica visual/interativa.
- [ ] TypeScript, lint, build e `validate-ui.py --rigor completo` passam.

## Regras de motion

- Springs para progresso, expansão e confirmação, com easing uniforme entre primitives.
- Parallax, magnetismo ou resposta ao ponteiro só em superfícies de destaque; desligados em touch e movimento reduzido.
- Stagger de entrada curto e apenas na primeira carga ou mudança intencional de contexto.
- GSAP, se usado, fica restrito a uma cena de assinatura por rota; Framer Motion cobre o restante.

## Referências de implementação

- 21st: “Onboarding Stages” orienta a progressão da Home; “Interactive Tech Stack Builder” orienta a materialidade de Projetos. Referências de comportamento, não componentes copiados cegamente.
- Kinetics: card expansível, contador elástico, tab deslizante e feedback de clique orientam os primitives, adaptados aos tokens Academy.
- ReUI `data-grid`/`filters` fica reservado à futura elevação funcional do Admin, fora desta wave.

## Validação

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
python "C:/Users/BSBIA02-PROF01/Documents/Vinicius/Logos-Tech-master/Logos-Tech-master/.claude/skills/logos/scripts/validate-ui.py" --rigor completo
```
