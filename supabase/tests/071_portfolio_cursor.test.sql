begin;
create extension if not exists pgtap with schema extensions;
set local search_path=logos_academy,extensions;
select plan(4);
select set_config('app.project_evidence','on',true);
update project_records
set status='approved',approved_submission_id='1b000000-0000-0000-0000-000000000001',approved_at=now()-make_interval(secs:=extract(epoch from created_at)::integer)
where tenant_id='10000000-0000-0000-0000-000000000001' and enrollment_id='18000000-0000-0000-0000-000000000001';
select is(
  (select jsonb_array_length(page->'items') from (select logos_academy.student_portfolio_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','18000000-0000-0000-0000-000000000001',null,2) page) q),
  2,'first portfolio page accepts no cursor and returns the requested two items');
select ok(
  (select page->>'nextCursor' is not null from (select logos_academy.student_portfolio_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','18000000-0000-0000-0000-000000000001',null,2) page) q),
  'first portfolio page returns its opaque two-field cursor');
select is(
  (with first_page as (select logos_academy.student_portfolio_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','18000000-0000-0000-0000-000000000001',null,2) page), second_page as (select logos_academy.student_portfolio_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','18000000-0000-0000-0000-000000000001',first_page.page->>'nextCursor',2) page from first_page) select jsonb_array_length(page->'items') from second_page),
  2,'second portfolio page accepts the generated two-field cursor');
select throws_ok(
  $$select logos_academy.student_portfolio_page('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','18000000-0000-0000-0000-000000000001',encode(convert_to('[1,2,3]'::text,'utf8'),'base64'),2)$$,
  '22023','invalid cursor','portfolio rejects a cursor for another ordering shape');
select * from finish();
rollback;
