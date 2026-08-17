insert into public.users (id,email,name,password_hash,role,created_at,updated_at)
values (
  gen_random_uuid()::text,
  'p.bruin@engels.eu',
  'Patrick de Bruin',
  '$2b$12$Vnj8uuyGGkejM2jAPAg5AuLAy/5bASm3dc8akbQXBdBe6WliN9kKS',
  'ADMIN',
  now(),
  now()
)
on conflict (email) do update
set name=excluded.name,
    password_hash=excluded.password_hash,
    role='ADMIN',
    updated_at=now();
