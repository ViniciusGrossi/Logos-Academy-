---
title: "Auth — Campo Geodésico de Evidências"
date: 2026-09-11
status: approved
milestone: visual-auth-2026-v4
---

# Auth — Portal Aberto de Evidências

## Objetivo

Transformar login, ativação e recuperação na entrada memorável da Logos Academy, preservando a rapidez da autenticação e os contratos existentes. A nova execução deve parecer um espaço vivo de construção tecnológica, não um hero genérico com formulário ao lado.

## Direção aprovada

- Protagonista: **Portal Cinético**, escolhido por Vinicius em 11/09/2026.
- Traço do **Caderno Imersivo**: formulário mais claro, compacto e editorial, com hierarquia imediata.
- Traço do **Campo de Evidências**: progressão Explorer → Builder → Engineer conectada ao foco e ao avanço do formulário.
- Cena: um único arco luminoso focal, partículas contidas, poucos traços orbitais e spotlight responsivo ao ponteiro.
- Paleta aprovada: tokens oficiais Ink, Raised, Paper, Canvas, Line, Muted e Academy Orange.
- Interface em Inter; metadados curtos em JetBrains Mono.
- Referências: Kinetics para spotlight e feedback físico, React Bits para profundidade atmosférica, Shadcn/ReUI para semântica e estados do formulário.
- Implementação com SVG, CSS e Framer Motion já instalados; nenhuma dependência visual nova.

## Iteração Portal Aberto

- Reduzir o painel central em aproximadamente 30% para devolver protagonismo ao portal.
- Aplicar smoked liquid glass apenas à estrutura do login; texto, inputs e CTA preservam contraste e solidez.
- Retirar Explorer, Builder e Engineer do painel e distribuí-los como nós interativos nas órbitas laterais.
- Acrescentar metadados laterais leves — status, coordenadas e contexto da missão — sem criar novos cards dominantes.
- Ampliar a interação do fundo com três camadas: spotlight acompanha o cursor, portal responde com atraso e partículas se deslocam em sentido oposto.
- Limitar a amplitude e usar apenas transform/opacity para manter suavidade; toque e movimento reduzido recebem a cena estática.

## Iteração Campo Geodésico

- Remover elipses e arcos externos que façam o portal parecer um planeta com anéis de Saturno.
- Substituí-los por uma malha geodésica interna, contornos fragmentados, nós luminosos e balizas técnicas nas laterais.
- Fazer Explorer, Builder e Engineer flutuarem verticalmente em cadências diferentes, como objetos leves em órbita.
- Aplicar glow pulsante discreto aos três estágios, com intensidade maior somente no estágio atual.
- Manter os cards estáticos em telas de toque compactas e quando `prefers-reduced-motion` estiver ativo.
- Exibir o Smooth Write já existente: cursor laranja animado acompanha a digitação e respeita seleção, senha e movimento reduzido.
- Referências de comportamento: Kinetics para movimento com peso; React Bits Portal, Rising Lines e Glow Cursor apenas como inspiração de camadas, sem copiar shaders ou adicionar dependências.

## Requisitos funcionais

- Preservar login por senha, sessão demo, redirecionamento seguro, ativação e recuperação.
- Preservar labels, helpers, autocomplete, exibição da senha, estados de erro, sucesso e processamento.
- Não adicionar cadastro aberto, autenticação social, “manter conectado” ou controles sem backend correspondente.

## Requisitos de experiência

- A ação principal deve ser reconhecida em até cinco segundos e permanecer acima da dobra.
- O portal deve reagir ao foco: e-mail ativa Explorer, senha ativa Builder e CTA ativa Engineer.
- Inputs devem ter foco luminoso contido, label legível e transições sem alterar o layout.
- CTA deve responder a hover, foco, pressão e loading; magnetismo somente para mouse e movimento permitido.
- O fundo deve ter movimento ambiental lento, separado das respostas rápidas de interação.
- Mobile deve priorizar logo, mensagem curta, formulário e CTA; a progressão vira uma faixa compacta.
- `prefers-reduced-motion` deve interromper loops, paralaxe, spotlight e magnetismo.
- Contraste WCAG AA, navegação por teclado e alvos mínimos de 44 px.

## Critérios de aceite

- [x] Login, ativação e recuperação renderizam o Campo Geodésico sem anéis externos.
- [x] Os três cards flutuam em cadências distintas e recebem glow discreto sem comprometer a leitura.
- [x] Há elementos laterais adicionais sem competir com o formulário.
- [x] O Smooth Write é visível em e-mail e senha, sem cursor nativo duplicado.
- [x] Fluxos existentes continuam funcionando e os testes de Auth permanecem verdes.
- [x] Não há overflow horizontal em 375, 768 e 1440 px.
- [x] Navegação por teclado e foco visível funcionam.
- [x] Movimento reduzido desativa flutuação, glow pulsante, paralaxe, spotlight e magnetismo.
- [x] TypeScript, lint, testes e build passam.
- [x] A tela é inspecionada no navegador nos três viewports.
