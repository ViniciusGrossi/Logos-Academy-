begin;

with operational_tenant as (
  select id
  from logos_academy.tenants
  where slug = 'logos-academy' and deleted_at is null
)
update logos_academy.concepts c
set
  reading_minutes = 8,
  content_blocks = jsonb_build_array(
    jsonb_build_object('type','text','heading','Como o olhar decide','body','Antes de ler, o olhar compara escala, posição, contraste e espaço. A hierarquia organiza essas diferenças para que uma peça comunique sem depender de explicação adicional.'),
    jsonb_build_object('type','diagram','heading','Uma sequência de atenção','nodes',jsonb_build_array(
      jsonb_build_object('label','Mensagem','detail','O que precisa ser entendido primeiro.'),
      jsonb_build_object('label','Contexto','detail','O que sustenta e qualifica a mensagem.'),
      jsonb_build_object('label','Ação','detail','O que a pessoa deve fazer depois.')
    )),
    jsonb_build_object('type','text','heading','Escaneabilidade e padrões','body','O olhar procura âncoras conhecidas: título, imagem dominante, grupos próximos e uma ação destacada. Quando alinhamento e repetição são consistentes, a pessoa gasta menos energia para descobrir onde começar e compara informações com mais segurança.'),
    jsonb_build_object('type','callout','heading','Teste rápido','body','Afaste-se da tela por alguns segundos. Ao voltar, observe qual elemento você percebe primeiro. Se não for a mensagem principal, a hierarquia ainda precisa de ajuste.'),
    jsonb_build_object('type','text','heading','Erros frequentes','body','Muitos tamanhos, excesso de negrito e várias cores de destaque fazem cada elemento pedir atenção ao mesmo tempo. Uma hierarquia forte reduz protagonistas e usa as diferenças restantes para sustentar a leitura.')
  ),
  updated_at = now()
from operational_tenant t
where c.tenant_id = t.id and c.slug = 'hierarquia-visual' and c.deleted_at is null;

with operational_tenant as (
  select id
  from logos_academy.tenants
  where slug = 'logos-academy' and deleted_at is null
)
insert into logos_academy.concepts (
  id, tenant_id, slug, title, summary, body, reading_minutes, content_blocks
)
select
  md5('logos-academy-atlas-concept-rag')::uuid,
  t.id,
  'rag',
  'RAG',
  'Conecta a IA a fontes externas antes de produzir uma resposta.',
  'RAG, ou geração aumentada por recuperação, busca trechos relevantes em uma base de conhecimento e entrega esse contexto ao modelo antes de gerar a resposta.',
  9,
  jsonb_build_array(
    jsonb_build_object('type','text','heading','O problema: memória não é fonte','body','Um modelo responde a partir dos padrões aprendidos no treinamento e do contexto recebido na conversa. Ele não conhece automaticamente documentos privados, mudanças recentes ou a fonte exata de cada afirmação.'),
    jsonb_build_object('type','diagram','heading','O fluxo de uma resposta com RAG','nodes',jsonb_build_array(
      jsonb_build_object('label','Pergunta','detail','O usuário descreve o que precisa saber.'),
      jsonb_build_object('label','Recuperação','detail','O sistema encontra os trechos mais relacionados.'),
      jsonb_build_object('label','Contexto','detail','Os trechos recuperados acompanham a instrução.'),
      jsonb_build_object('label','Resposta','detail','O modelo responde usando as evidências disponíveis.')
    )),
    jsonb_build_object('type','text','heading','O que entra na base','body','Manuais, políticas, páginas, atas e catálogos precisam ser divididos em trechos pesquisáveis. Metadados como origem, data, autor e permissão ajudam a recuperar o material certo sem misturar contextos.'),
    jsonb_build_object('type','callout','heading','RAG não elimina verificação','body','Recuperar uma fonte ruim produz uma resposta bem escrita sobre uma evidência ruim. O sistema ainda precisa mostrar origem, lidar com ausência de resultado e admitir quando não encontrou base suficiente.'),
    jsonb_build_object('type','text','heading','Quando faz sentido','body','Use RAG quando a resposta depende de conteúdo específico, atualizado ou privado. Para tarefas criativas sem uma base documental, acrescentar recuperação pode aumentar custo e complexidade sem melhorar o resultado.')
  )
from operational_tenant t
on conflict (tenant_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  reading_minutes = excluded.reading_minutes,
  content_blocks = excluded.content_blocks,
  deleted_at = null,
  updated_at = now();

with operational_tenant as (
  select id
  from logos_academy.tenants
  where slug = 'logos-academy' and deleted_at is null
), rag_concept as (
  select c.id, c.tenant_id
  from logos_academy.concepts c
  join operational_tenant t on t.id = c.tenant_id
  where c.slug = 'rag' and c.deleted_at is null
)
insert into logos_academy.lesson_concepts (id, tenant_id, lesson_template_id, concept_id)
select
  md5('logos-academy-atlas-lesson-concept-rag')::uuid,
  r.tenant_id,
  md5('logos-academy-explorer-v1-lesson-11')::uuid,
  r.id
from rag_concept r
on conflict (tenant_id, lesson_template_id, concept_id) do update set
  deleted_at = null,
  updated_at = now();

commit;
