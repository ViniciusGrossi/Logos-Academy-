begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  pg_get_functiondef('logos_academy.admin_publish_review(uuid,uuid,uuid,text,text,jsonb,text,uuid)'::regprocedure)
    like '%review criteria must exactly match the activity%',
  'publicação exige o conjunto completo de critérios'
);
select ok(
  pg_get_functiondef('logos_academy.admin_publish_review(uuid,uuid,uuid,text,text,jsonb,text,uuid)'::regprocedure)
    like '%for update%',
  'publicação bloqueia a entrega durante a transação'
);
select ok(
  exists(select 1 from pg_trigger where tgname = 'reviews_append_only' and not tgisinternal),
  'reviews publicadas são append-only'
);
select ok(
  has_function_privilege('service_role', 'logos_academy.admin_publish_review(uuid,uuid,uuid,text,text,jsonb,text,uuid)', 'execute')
  and not has_function_privilege('authenticated', 'logos_academy.admin_publish_review(uuid,uuid,uuid,text,text,jsonb,text,uuid)', 'execute'),
  'publicação de revisão é exclusiva do backend'
);

select * from finish();
rollback;
