create index if not exists invitation_links_created_by_idx
  on logos_academy.invitation_links (tenant_id, created_by_user_id);
