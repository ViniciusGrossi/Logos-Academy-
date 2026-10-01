begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Mantém apenas o Explorer v3. Perfis e contas de alunos não fazem parte
-- do currículo e são preservados; apenas seus vínculos legados são removidos.
create temp table legacy_curricula on commit drop as
select tenant_id, id
from logos_academy.curricula
where name = 'Explorer'
  and version in ('v1', 'v2');

create temp table legacy_cycles on commit drop as
select c.tenant_id, c.id
from logos_academy.cycles c
join legacy_curricula lc on lc.tenant_id = c.tenant_id and lc.id = c.curriculum_id;

create temp table legacy_lessons on commit drop as
select lt.tenant_id, lt.id
from logos_academy.lesson_templates lt
join legacy_cycles c on c.tenant_id = lt.tenant_id and c.id = lt.cycle_id;

create temp table legacy_activities on commit drop as
select at.tenant_id, at.id
from logos_academy.activity_templates at
join legacy_lessons lt on lt.tenant_id = at.tenant_id and lt.id = at.lesson_template_id;

create temp table legacy_criteria on commit drop as
select ac.tenant_id, ac.id
from logos_academy.activity_criteria ac
join legacy_activities at on at.tenant_id = ac.tenant_id and at.id = ac.activity_template_id;

create temp table legacy_classes on commit drop as
select c.tenant_id, c.id
from logos_academy.classes c
join legacy_curricula lc on lc.tenant_id = c.tenant_id and lc.id = c.curriculum_id;

create temp table legacy_enrollments on commit drop as
select e.tenant_id, e.id
from logos_academy.enrollments e
join legacy_curricula lc on lc.tenant_id = e.tenant_id and lc.id = e.curriculum_id;

create temp table legacy_assignments on commit drop as
select aa.tenant_id, aa.id
from logos_academy.activity_assignments aa
where exists (
  select 1 from legacy_enrollments e
  where e.tenant_id = aa.tenant_id and e.id = aa.enrollment_id
)
or exists (
  select 1 from legacy_activities at
  where at.tenant_id = aa.tenant_id and at.id = aa.activity_template_id
);

create temp table legacy_submissions on commit drop as
select s.tenant_id, s.id
from logos_academy.submissions s
join legacy_assignments aa on aa.tenant_id = s.tenant_id and aa.id = s.activity_assignment_id;

create temp table legacy_reviews on commit drop as
select r.tenant_id, r.id
from logos_academy.reviews r
join legacy_submissions s on s.tenant_id = r.tenant_id and s.id = r.submission_id;

create temp table legacy_attendance on commit drop as
select ar.tenant_id, ar.id
from logos_academy.attendance_records ar
join legacy_enrollments e on e.tenant_id = ar.tenant_id and e.id = ar.enrollment_id;

create temp table legacy_concepts on commit drop as
select distinct lc.tenant_id, lc.concept_id as id
from logos_academy.lesson_concepts lc
join legacy_lessons lt on lt.tenant_id = lc.tenant_id and lt.id = lc.lesson_template_id;

-- O trigger foi criado apenas para congelar o v1. Sem o v1, ele é resíduo
-- e impediria a limpeza dos registros que protege.
drop trigger if exists curricula_explorer_v1_immutable on logos_academy.curricula;
drop trigger if exists cycles_explorer_v1_immutable on logos_academy.cycles;
drop trigger if exists lesson_templates_explorer_v1_immutable on logos_academy.lesson_templates;
drop trigger if exists concepts_explorer_v1_immutable on logos_academy.concepts;
drop trigger if exists lesson_concepts_explorer_v1_immutable on logos_academy.lesson_concepts;
drop trigger if exists activity_templates_explorer_v1_immutable on logos_academy.activity_templates;
drop trigger if exists activity_requirements_explorer_v1_immutable on logos_academy.activity_requirements;
drop trigger if exists activity_criteria_explorer_v1_immutable on logos_academy.activity_criteria;

-- Estas duas proteções se aplicam a toda a base. Elas ficam desativadas
-- somente nesta transação para remover versões enviadas do currículo legado.
alter table logos_academy.submission_items disable trigger submission_items_immutable;
alter table logos_academy.submissions disable trigger submissions_immutable;

delete from logos_academy.attendance_private_notes apn
using legacy_attendance ar
where apn.tenant_id = ar.tenant_id and apn.attendance_record_id = ar.id;

delete from logos_academy.makeup_records mr
using legacy_attendance ar
where mr.tenant_id = ar.tenant_id and mr.attendance_record_id = ar.id;

delete from logos_academy.attendance_records ar
using legacy_attendance la
where ar.tenant_id = la.tenant_id and ar.id = la.id;

delete from logos_academy.completion_records cr
using legacy_enrollments e
where cr.tenant_id = e.tenant_id and cr.enrollment_id = e.id;

delete from logos_academy.presentation_records pr
using legacy_enrollments e
where pr.tenant_id = e.tenant_id and pr.enrollment_id = e.id;

delete from logos_academy.project_records pr
where exists (
  select 1 from legacy_enrollments e
  where e.tenant_id = pr.tenant_id and e.id = pr.enrollment_id
)
or exists (
  select 1 from legacy_cycles c
  where c.tenant_id = pr.tenant_id and c.id = pr.cycle_id
);

delete from logos_academy.criterion_reviews cr
where exists (
  select 1 from legacy_reviews r
  where r.tenant_id = cr.tenant_id and r.id = cr.review_id
)
or exists (
  select 1 from legacy_criteria ac
  where ac.tenant_id = cr.tenant_id and ac.id = cr.activity_criterion_id
);

delete from logos_academy.feedback_receipts fr
using legacy_reviews r
where fr.tenant_id = r.tenant_id and fr.review_id = r.id;

delete from logos_academy.reviews r
using legacy_reviews lr
where r.tenant_id = lr.tenant_id and r.id = lr.id;

delete from logos_academy.submission_items si
using legacy_submissions s
where si.tenant_id = s.tenant_id and si.submission_id = s.id;

delete from logos_academy.uploaded_files uf
using legacy_assignments aa
where uf.tenant_id = aa.tenant_id and uf.activity_assignment_id = aa.id;

delete from logos_academy.submissions s
using legacy_submissions ls
where s.tenant_id = ls.tenant_id and s.id = ls.id;

delete from logos_academy.activity_assignments aa
using legacy_assignments la
where aa.tenant_id = la.tenant_id and aa.id = la.id;

delete from logos_academy.sessions s
where exists (
  select 1 from legacy_classes c
  where c.tenant_id = s.tenant_id and c.id = s.class_id
)
or exists (
  select 1 from legacy_enrollments e
  where e.tenant_id = s.tenant_id and e.id = s.enrollment_id
)
or exists (
  select 1 from legacy_lessons lt
  where lt.tenant_id = s.tenant_id and lt.id = s.lesson_template_id
);

delete from logos_academy.enrollments e
using legacy_enrollments le
where e.tenant_id = le.tenant_id and e.id = le.id;

delete from logos_academy.classes c
using legacy_classes lc
where c.tenant_id = lc.tenant_id and c.id = lc.id;

delete from logos_academy.activity_criteria ac
using legacy_activities la
where ac.tenant_id = la.tenant_id and ac.activity_template_id = la.id;

delete from logos_academy.activity_requirements ar
using legacy_activities la
where ar.tenant_id = la.tenant_id and ar.activity_template_id = la.id;

delete from logos_academy.activity_templates at
using legacy_activities la
where at.tenant_id = la.tenant_id and at.id = la.id;

delete from logos_academy.knowledge_resources kr
using legacy_lessons ll
where kr.tenant_id = ll.tenant_id and kr.lesson_template_id = ll.id;

delete from logos_academy.lesson_concepts lc
using legacy_lessons ll
where lc.tenant_id = ll.tenant_id and lc.lesson_template_id = ll.id;

delete from logos_academy.concepts c
using legacy_concepts lc
where c.tenant_id = lc.tenant_id
  and c.id = lc.id
  and not exists (
    select 1 from logos_academy.lesson_concepts remaining
    where remaining.tenant_id = c.tenant_id and remaining.concept_id = c.id
  );

delete from logos_academy.lesson_templates lt
using legacy_lessons ll
where lt.tenant_id = ll.tenant_id and lt.id = ll.id;

delete from logos_academy.cycles c
using legacy_cycles lc
where c.tenant_id = lc.tenant_id and c.id = lc.id;

delete from logos_academy.curricula c
using legacy_curricula lc
where c.tenant_id = lc.tenant_id and c.id = lc.id;

alter table logos_academy.submission_items enable trigger submission_items_immutable;
alter table logos_academy.submissions enable trigger submissions_immutable;

drop function if exists private.guard_explorer_v1_immutability();

notify pgrst, 'reload schema';

commit;
