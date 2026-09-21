begin;

update logos_academy.concepts
set
  video_url = 'https://www.youtube.com/watch?v=ZXItTIjC0Wk',
  video_title = '11 princípios de hierarquia visual, por Visme',
  video_duration_minutes = 8,
  updated_at = now()
where slug = 'hierarquia-visual'
  and tenant_id = (
    select id
    from logos_academy.tenants
    where slug = 'logos-academy'
      and deleted_at is null
  );

commit;
