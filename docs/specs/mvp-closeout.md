# Conclusão integral do MVP — reparos e prova de aceite

Status: aprovado no escopo da autorização do usuário de 13/10/2026 para concluir o MVP. Não amplia para professor, pagamentos, WhatsApp automático ou tutor hospedado.

## Fonte de verdade

F01–F14 e aceite global de docs/PRD.md, junto às specs posteriores aprovadas (Explorer v3, convites por link/WhatsApp, Atlas CMS v2 e revisão satisfatória sem texto obrigatório). As decisões posteriores substituem trechos antigos conflitantes; flags do registry não comprovam execução.

## Reparos autorizados

1. Conclusão identifica a última aula curricular, inclusive v3 com posição local 1–4; tenant excluído não autentica nem autoriza RLS/RPC.
2. Operação individual possui calendário, contexto do encontro, chamada, reagendamento, liberação e revisão sem turma fictícia.
3. Aluno existente recebe nova matrícula; cancelamento exige confirmação; consentimento exige confirmação explícita do arquivo físico.
4. Dashboard mostra filas reais, turma/risco, taxas e ações; listas administrativas e portfólio percorrem todos os cursores.
5. Abas e filtros persistem em URL e histórico; CMS completa duplicação, ocultação e undo conforme spec já aprovada.
6. Busca conceitual/editorial normaliza acentos e pesquisa tags/termos relacionados sem antecipar conteúdo futuro.
7. Arquivos são inspecionados no backend, logs minimizados e dependências separadas entre runtime e ferramentas de desenvolvimento.
8. E2E usa Auth/PostgreSQL/Storage reais isolados no runner GitHub, com browser e dados fictícios locais. Nunca apontar fixtures/reset/seed para produção.

## Leitura administrativa mínima necessária (SR-MVP-01)

Implementa F03/F09/F10 existentes; não cria entidade nem papel:

- GET /api/admin/sessions/:sessionId → AdminSessionContext: session, classId|null, enrollmentId|null, studentId|null e enrollments. Matrícula individual tem contexto próprio; turma e matrícula são mutuamente exclusivos.
- GET /api/admin/enrollments/:enrollmentId/calendar → readonly SessionSummary[] (16 encontros do Explorer, ordenados pedagogicamente).
- Auth: admin real do mesmo tenant; ID validado; RPC backend-only com assert_tenant_admin. Não reutilizar endpoint estudantil por impersonação.
- lessonPosition na leitura administrativa representa ordem global no currículo, preservada após reagendamento.

## Cenários Given/When/Then

- Dado Explorer v3 com 16 encontros cumpridos, quatro projetos, reflexão e apresentação aprovados e sem correção, quando confirma conclusão, então matrícula é completed e leitura posterior funciona sem aceitar mutação.
- Dado tenant excluído, quando membro com JWT válido consulta ou muta, então identidade/RLS/RPC negam acesso.
- Dada matrícula individual ativa, quando admin abre encontro, registra chamada e libera, então somente essa matrícula recebe conteúdo.
- Dado aluno existente, quando nova matrícula é confirmada, então histórico anterior é preservado; turma com seis ativos rejeita o sétimo.
- Dado arquivo físico não confirmado, quando salva consentimento, então operação é bloqueada; confirmação válida registra ator/data.
- Dadas listas com mais registros que o limite, quando percorre páginas, então não há omissão/duplicação e a última página termina com cursor nulo.
- Dadas abas/filtros, quando altera, recarrega e usa Voltar, então estado corresponde à URL, com teclado e sem overflow em 375/768/1440.
- Dado bloco editorial, quando duplica/oculta/remove/desfaz, então IDs e conteúdo permanecem válidos, o undo recupera remoção e oculto não chega à publicação estudantil.
- Dado título acentuado/tag de conteúdo publicado e liberado, quando pesquisa sem acento, então encontra; draft/arquivado/futuro continua oculto.
- Dados bytes incompatíveis com MIME permitido, quando finaliza, então objeto não fica ready; arquivo real permitido pode ser baixado somente pelo dono/admin autorizado.
- Dado erro externo contendo dados pessoais, quando reportado, então logs contêm apenas identificador, operação e código técnico permitido.
- Dado ambiente isolado, quando executa jornada convite → ativação → entrega → correção → reenvio → quatro projetos → reposição → apresentação → conclusão, então Auth/Storage reais e todos os critérios são comprovados, sem mocks de UI.

## Gate humano independente

Procedimento LGPD e aprovações jurídica/operacional permanecem obrigatórios e não são presumidos. Uma minuta técnica não é aprovação jurídica. A conclusão do objetivo depende também dessa evidência e dos gates humanos aplicáveis.
