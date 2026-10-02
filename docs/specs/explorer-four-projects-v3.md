---
title: "Explorer v3 — quatro projetos construídos em 16 aulas"
date: 2026-10-02
projeto: "Logos Academy Platform"
fase: "currículo | conteúdo"
status: approved
wave: 13
tags: [spec, explorer, curriculo, projetos, atividades]
---

# Spec: Explorer v3 — quatro projetos construídos em 16 aulas

## Objetivo

Transformar as 16 aulas do Explorer v3 em uma trilha de construção contínua: quatro projetos independentes, com quatro aulas cada, nos quais toda aula produz um incremento verificável. O quarto projeto deve combinar IA, experiência visual e automação em um produto novo.

## Princípios obrigatórios

- Projeto antes da teoria; conceitos entram para resolver o problema do build atual.
- Aulas 1–3 de cada ciclo introduzem e aplicam competências. A aula 4 integra, testa, corrige, documenta e apresenta sem conteúdo central novo.
- Toda aula gera evidência concreta na Academy.
- O aluno pode personalizar tema, público e problema. O contrato técnico e os critérios de qualidade permanecem.
- O aluno deve explicar decisões e limites; IA não substitui autoria.
- Chaves e segredos ficam somente no servidor e nas variáveis de ambiente.

## Projeto 1 — Assistente Pessoal Inteligente

Construir um assistente especializado para uma necessidade real escolhida pelo aluno. O professor particular com especialistas em Matemática, Português e História é o exemplo de referência, não o tema obrigatório.

### Contrato fixo

- interface responsiva, autoral e clara; um elemento visual reativo, como orbe, avatar ou waveform, é opcional;
- pelo menos três personas, especialidades ou modos selecionáveis;
- instrução complementar configurável pelo usuário;
- chamada server-side à Groq, com modelo principal e fallback;
- system prompt com objetivo, limites, formato de saída e comportamento proibido;
- respostas estruturadas e ao menos um recurso visual seguro renderizado pela interface;
- histórico persistente, memória útil e janela de contexto controlada;
- rate limit no servidor, proteção de segredo e tratamento de falhas;
- estados vazio, carregando, sucesso e erro;
- matriz mínima de cinco testes, incluindo limite, fallback e recuperação.

### Exemplo professor

O assistente orienta sem entregar respostas prontas, oferece modos de explicação, criação de exercício, pista e resolução acompanhada, exige evidência de tentativa e pode produzir explicações visuais animadas a partir de uma estrutura validada pela aplicação.

## Projeto 2 — Creative Studio

Construir um estúdio digital capaz de transformar um brief em uma campanha coerente para uma marca, causa, evento, produto ou projeto escolhido pelo aluno.

### Contrato fixo

- brief com objetivo, público, mensagem, tom, canais, restrições e chamada para ação;
- três direções criativas comparadas antes da escolha;
- sistema visual com paleta, tipografia, componentes e regras de consistência;
- prompts documentados e curadoria humana dos resultados;
- conjunto de peças em formatos distintos, com imagem e copy adaptadas ao canal;
- landing page responsiva com narrativa, CTA e movimento significativo;
- vídeo curto final ou storyboard completo com gancho, cenas, áudio/texto e ritmo;
- acessibilidade básica, contraste, texto alternativo e movimento reduzido;
- revisão de coerência entre mensagem, identidade, peças e página;
- publicação e apresentação do processo, incluindo descartes e melhorias.

## Projeto 3 — Automation Lab

Construir uma automação que retire trabalho manual de um processo real. A central inteligente de solicitações, que recebe, valida, classifica, encaminha e registra pedidos, é o exemplo de referência.

### Contrato fixo

- processo atual e processo futuro representados em diagrama;
- gatilho real por formulário ou webhook e contrato de entrada validado;
- armazenamento estruturado e estados de processamento;
- regras determinísticas antes da etapa de IA;
- IA usada em tarefa delimitada, com saída estruturada e indicador de confiança;
- revisão humana quando houver baixa confiança ou situação sensível;
- saída útil, como notificação, tarefa, resposta, registro ou atualização;
- idempotência ou deduplicação, retry controlado e caminho de erro;
- logs suficientes para explicar o que ocorreu sem expor dados sensíveis;
- painel ou relatório simples e cinco cenários de teste, incluindo duplicidade e falha.

## Projeto 4 — MVP: Produto Inteligente

Construir um produto novo para um problema e público definidos pelo aluno. Ele não reutiliza o tema dos projetos anteriores, mas integra suas competências: IA especializada, experiência visual coerente e automação confiável. Uma plataforma para organizar evento escolar é o exemplo de referência.

### Contrato fixo

- problema, usuário, promessa central, hipótese e métrica de sucesso explícitos;
- um fluxo principal completo e demonstrável, com escopo conscientemente limitado;
- identidade visual, interface responsiva e estados essenciais;
- recurso de IA com regras, prompt, fallback e uso explicado;
- dados estruturados e automação que produz consequência real;
- histórico ou estado do usuário, tratamento de falhas e recuperação;
- rate limit, segredos protegidos, privacidade e validação de entrada;
- cinco cenários ponta a ponta e ao menos uma melhoria após teste com outra pessoa;
- deploy, repositório, README, arquitetura, limites e roteiro de apresentação.

## Matriz das 16 aulas

| Aula | Projeto | Incremento obrigatório |
|---:|---|---|
| 1 | Assistente Pessoal | problema, público, modos/personas, contrato de comportamento e interface-base |
| 2 | Assistente Pessoal | rota Groq segura, prompt estruturado, seleção de modo e instrução complementar |
| 3 | Assistente Pessoal | memória/contexto, resposta visual, fallback, rate limit e estados de interface |
| 4 | Assistente Pessoal | integração, cinco testes, correção, documentação, deploy e demonstração |
| 5 | Creative Studio | brief, referências e três direções criativas comparadas |
| 6 | Creative Studio | identidade, biblioteca de componentes, prompts e peças multiformato |
| 7 | Creative Studio | landing page, copy, movimento, vídeo ou storyboard e acessibilidade |
| 8 | Creative Studio | integração, revisão de coerência, correção, publicação e apresentação |
| 9 | Automation Lab | processo atual/futuro, gatilho, contrato de dados e critérios de sucesso |
| 10 | Automation Lab | workflow executável, validação, armazenamento, regras e saída útil |
| 11 | Automation Lab | IA estruturada, confiança, revisão humana, idempotência, retry e logs |
| 12 | Automation Lab | cinco cenários, correção, documentação, painel/relatório e demonstração |
| 13 | MVP | descoberta, proposta, hipótese, métrica, escopo e protótipo do fluxo principal |
| 14 | MVP | identidade, interface responsiva, dados, estados e experiência do fluxo |
| 15 | MVP | IA, automação, integração, segurança, observabilidade e recuperação |
| 16 | MVP | testes ponta a ponta, melhoria externa, deploy, documentação e Demo Day |

## Persistência na plataforma

- Atualizar os quatro `cycles` do Explorer v3, incluindo desafio, problema, público, resultado, critérios e conceitos.
- Atualizar os 16 `lesson_templates` e os 16 `activity_templates` com título, objetivo, referência, contexto, instruções, passos, continuidade, plano B, reflexão, evidência e ferramentas.
- Substituir requisitos e critérios das 16 atividades por entregáveis e verificações coerentes com cada incremento.
- Manter os IDs determinísticos do Explorer v3 e não criar tabelas ou endpoints.
- Preservar currículos legados arquivados e não alterar entregas já existentes.

## Critérios de aceite

- [ ] Existem exatamente quatro ciclos e 16 aulas ativas no Explorer v3.
- [ ] Cada ciclo possui quatro aulas e termina em Project Day/Demo Day.
- [ ] Todos os campos pedagógicos das 16 atividades estão preenchidos.
- [ ] Toda atividade possui ao menos três passos, dois requisitos obrigatórios e três critérios atômicos.
- [ ] As atividades 4, 8, 12 e 16 integram e validam o que foi construído, sem introduzir núcleo teórico novo.
- [ ] O Assistente não exige orbe nem o tema professor; ambos aparecem somente como opções de referência.
- [ ] O MVP exige, no mesmo fluxo principal, IA, experiência visual e automação.
- [ ] O conteúdo exibido pela projeção `student_activity_detail` reflete a nova trilha.
- [ ] Teste automatizado protege contagens, títulos, completude e invariantes curriculares.

## Fora de escopo

- Criar editor de código, provisionar contas externas ou armazenar chaves de alunos.
- Obrigar uma ferramenta visual, um provedor de geração ou um tema específico.
- Reestruturar telas, endpoints, autorização ou fluxo de revisão da Academy.
