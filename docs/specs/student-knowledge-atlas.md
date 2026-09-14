---
title: "student-knowledge-atlas: Spec"
date: 2026-09-12
projeto: "Logos Academy Platform"
fase: "milestone-visual-product-2026"
status: approved
wave: 9
tags: [spec, student, glossary, concepts, prompts, design-systems]
---

# Spec: student-knowledge-atlas

## Aprovação

Direção solicitada e aprovada por Vinicius em 2026-09-12: remodelar o Glossário e executar três bibliotecas com revelação progressiva.

## Objetivo

Transformar `/glossario` em um Atlas de conhecimento que ajude o aluno a recuperar um conceito, reutilizar um prompt ou consultar um sistema visual sem antecipar conteúdos de aulas futuras.

## Estrutura da página

### Conceitos

- Busca por nome ou ideia.
- Vídeo explicativo curto quando publicado.
- Explicação editorial densa ao lado do vídeo.
- Blocos seguros de texto, imagem, diagrama e destaque, sem HTML arbitrário.
- Conceitos relacionados limitados ao conteúdo já liberado.
- Ausência de vídeo vira estado "Vídeo em preparação", sem impedir a leitura.

### Biblioteca de Prompts

- Prompts reutilizáveis vinculados à aula que os apresenta.
- Template copiável, anatomia do prompt, variáveis, exemplo de entrada e exemplo de saída.
- O botão de copiar produz confirmação acessível e temporária.
- Busca não retorna prompts de aulas futuras.

### Biblioteca de Design Systems

- Referências visuais vinculadas à aula que as apresenta.
- Paleta, tipografia, princípios e componentes exibidos como espécimes vivos.
- A biblioteca ensina função e decisão, não oferece apenas amostras decorativas.
- Busca não retorna sistemas de aulas futuras.

## Progressão pedagógica

1. Todo recurso possui vínculo explícito com uma `lesson_template`.
2. O aluno acessa o recurso quando existe uma atividade dessa aula com estado diferente de `locked` e `released_at` preenchido.
3. Conteúdo liberado permanece legível depois da conclusão da matrícula.
4. Lista, busca, relacionados e detalhe usam a mesma regra.
5. Acesso direto a UUID futuro retorna `FORBIDDEN` sem revelar título, resumo ou tipo.
6. A interface informa que novos materiais serão liberados, mas não mostra nomes de conteúdos futuros.

## Contratos

- Os endpoints atuais de conceitos permanecem compatíveis e passam a fornecer mídia e blocos estruturados no detalhe.
- `GET /api/student/library?kind=prompt|design_system&search=&cursor=&limit=` lista recursos liberados.
- `GET /api/student/library/:resourceId` devolve o detalhe liberado e seu artefato tipado.
- Nenhuma integração com modelo de IA é criada; prompts são conteúdo pedagógico estático.
- Vídeos usam URL HTTPS curada. Upload e CMS administrativo ficam fora desta execução.

## Segurança e dados

- Nova tabela de recursos usa `tenant_id`, timestamps, soft delete, RLS habilitada e forçada.
- Acesso estudantil é resolvido no backend com usuário, matrícula, aula e assignment liberado.
- RPCs são executáveis somente por `service_role` e repetem a autorização no detalhe.
- Conteúdo estruturado é JSON validado por constraints e renderizado por componentes, nunca por `dangerouslySetInnerHTML`.

## Direção visual

- Mesmo `AppShell`, tokens e vocabulário de Início, Jornada, Projetos e Atividade.
- Três tabs acessíveis com `?tab=conceitos|prompts|design-systems`.
- Composição desktop em índice lateral e superfície editorial ampla.
- Assinatura: mapa de conhecimento que muda de configuração conforme a biblioteca selecionada.
- Troca de tab e seleção duram entre 150 e 250 ms; sem animação ornamental contínua.
- Academy Orange permanece sinal de seleção, foco e ação.

## Estados obrigatórios

- Carregamento com estrutura equivalente à página.
- Biblioteca vazia antes da primeira liberação.
- Busca sem resultado.
- Erro de lista e erro de detalhe com nova tentativa.
- Recurso sem vídeo.
- Confirmação de cópia de prompt.
- Conteúdo disponível.

## Critérios de aceite

- **GWT-01:** Dado um aluno com duas aulas liberadas, quando abre Conceitos, então vê somente conceitos vinculados a essas aulas.
- **GWT-02:** Dado RAG vinculado a uma aula futura, quando busca por RAG ou acessa seu UUID, então a lista não o revela e o detalhe retorna `FORBIDDEN`.
- **GWT-03:** Dado um conceito com vídeo e blocos, quando o seleciona, então vídeo e explicação aparecem lado a lado em 1440 px.
- **GWT-04:** Dado um conceito sem vídeo, quando abre o detalhe, então lê todo o conteúdo e vê o estado "Vídeo em preparação".
- **GWT-05:** Dado um prompt liberado, quando copia o template, então a área de transferência recebe o texto e o botão confirma a ação por `aria-live`.
- **GWT-06:** Dado um design system liberado, quando abre, então visualiza paleta, tipografia, princípios e componentes sem HTML arbitrário.
- **GWT-07:** Dado um recurso liberado e matrícula concluída, quando consulta o detalhe, então a leitura permanece disponível.
- **GWT-08:** Dado teclado ou movimento reduzido, quando alterna tabs e recursos, então foco, seleção e conteúdo permanecem claros sem depender de animação.
- **GWT-09:** Dado desktop 1440 px, quando usa qualquer uma das três tabs, então não existe overflow horizontal e a leitura principal preserva até 75 caracteres por linha.

## Gates desta execução

1. Spec e contratos sincronizados.
2. Persistência e demo com progressão equivalente.
3. Desktop 1440 px implementado e inspecionado em tema claro e escuro.
4. Gate visual humano.
5. Somente após aprovação: 768/375, touch, estados completos e acessibilidade final.
