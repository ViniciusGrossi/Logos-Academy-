begin;

-- Ponytail: a 0056 criou o Explorer v3, mas o v2 permaneceu ativo no banco.
-- Turmas e matrículas v2 existentes continuam apontando para este currículo.
update logos_academy.curricula
set status = 'archived', updated_at = now()
where id = md5('logos-academy-explorer-v2-curriculum')::uuid
  and status = 'active';

commit;
