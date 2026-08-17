update public.users
set password_hash = '$2b$12$HvxcH7OWxfCcUY/bD3laFeVnvcpAIPC5BJEVnr/GLrEY2UCLLsl2K',
    updated_at = now()
where lower(email) = lower('p.bruin@engels.eu')
  and is_super_admin = true;
