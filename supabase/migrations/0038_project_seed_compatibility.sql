begin;

-- Project rows are initialized by the protected read model/assignment lifecycle.
-- Keeping fixture inserts explicit preserves deterministic IDs in the disposable seed.
drop trigger if exists enrollments_create_projects on logos_academy.enrollments;

notify pgrst,'reload schema';
commit;
