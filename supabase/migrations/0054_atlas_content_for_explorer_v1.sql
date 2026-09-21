-- Atlas: conteúdo editorial para os conceitos reais do currículo.
--
-- As migrations 0048, 0051 e 0052 assumiam os slugs do modo demo
-- ('hierarquia-visual', 'contraste'), que não existem no banco: os conceitos
-- reais são outros 16, todos vinculados ao Explorer v1 e protegidos pela
-- trigger de imutabilidade criada em 0015.
--
-- Autorizado por Vinicius em 2026-09-21: suspender a trava durante esta
-- migration para enriquecer o conteúdo. A suspensão vale apenas dentro desta
-- transação; qualquer falha reverte inclusive o disable.
begin;

alter table logos_academy.concepts disable trigger concepts_explorer_v1_immutable;

-- 1. Backfill que a 0048 não conseguiu executar: todo conceito passa a ter ao
--    menos o bloco "Em resumo" derivado do próprio corpo.
update logos_academy.concepts
set
  content_blocks = jsonb_build_array(jsonb_build_object('type','text','heading','Em resumo','body',body)),
  updated_at = now()
where content_blocks = '[]'::jsonb
  and deleted_at is null;

-- 2. Vídeo e leitura aprofundada de hierarquia visual. O conteúdo vinha da
--    0051/0052 apontando para o slug de demonstração; aqui ele passa a viver
--    em "Storytelling e design", o conceito real de comunicação visual.
with operational_tenant as (
  select id
  from logos_academy.tenants
  where slug = 'logos-academy' and deleted_at is null
)
update logos_academy.concepts c
set
  video_url = 'https://www.youtube.com/watch?v=ZXItTIjC0Wk',
  video_title = '11 princípios de hierarquia visual, por Visme',
  video_duration_minutes = 8,
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
where c.tenant_id = t.id
  and c.slug = 'storytelling'
  and c.deleted_at is null;

alter table logos_academy.concepts enable trigger concepts_explorer_v1_immutable;

notify pgrst, 'reload schema';
commit;
