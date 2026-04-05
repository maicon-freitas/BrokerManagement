-- =============================================================================
-- Setup Supabase — executar UMA vez em projeto novo (SQL Editor).
-- Utilizadores: Authentication → Add user; depois linhas em public.profiles
-- (mesmo empresa_id, role empresa | corretor). Não commite seeds com senhas.
-- =============================================================================

-- --------------------------------------------------------------------------- 001
create extension if not exists "pgcrypto";

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'Imobiliária',
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  role text not null check (role in ('empresa', 'corretor')),
  nome_exibicao text,
  created_at timestamptz default now()
);

create index if not exists profiles_empresa_id_idx on public.profiles (empresa_id);

create table if not exists public.empresa_dados (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  payload jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.empresa_dados enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "empresas_select_member" on public.empresas;
create policy "empresas_select_member" on public.empresas for select using (
  id in (select empresa_id from public.profiles where id = auth.uid())
);

drop policy if exists "empresa_dados_all" on public.empresa_dados;
create policy "empresa_dados_all" on public.empresa_dados for all using (
  empresa_id in (select empresa_id from public.profiles where id = auth.uid())
)
with check (
  empresa_id in (select empresa_id from public.profiles where id = auth.uid())
);

-- --------------------------------------------------------------------------- 002 (bucket + políticas iniciais)
insert into storage.buckets (id, name, public)
values ('imovel-fotos', 'imovel-fotos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "imovel_fotos_public_read" on storage.objects;
drop policy if exists "imovel_fotos_auth_upload" on storage.objects;
drop policy if exists "imovel_fotos_auth_update" on storage.objects;
drop policy if exists "imovel_fotos_auth_delete" on storage.objects;

create policy "imovel_fotos_public_read"
  on storage.objects for select
  using (bucket_id = 'imovel-fotos');

create policy "imovel_fotos_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'imovel-fotos' and auth.role() = 'authenticated');

create policy "imovel_fotos_auth_update"
  on storage.objects for update
  using (bucket_id = 'imovel-fotos' and auth.role() = 'authenticated');

create policy "imovel_fotos_auth_delete"
  on storage.objects for delete
  using (bucket_id = 'imovel-fotos' and auth.role() = 'authenticated');

-- --------------------------------------------------------------------------- 005
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  recovery_token = coalesce(recovery_token, '')
where confirmation_token is null
   or email_change is null
   or email_change_token_new is null
   or recovery_token is null;

-- --------------------------------------------------------------------------- 006
drop policy if exists "imovel_fotos_public_read" on storage.objects;
drop policy if exists "imovel_fotos_auth_upload" on storage.objects;
drop policy if exists "imovel_fotos_auth_update" on storage.objects;
drop policy if exists "imovel_fotos_auth_delete" on storage.objects;

create policy "imovel_fotos_public_read"
  on storage.objects for select
  using (bucket_id = 'imovel-fotos');

create policy "imovel_fotos_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'imovel-fotos' and auth.uid() is not null);

create policy "imovel_fotos_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'imovel-fotos' and auth.uid() is not null)
  with check (bucket_id = 'imovel-fotos' and auth.uid() is not null);

create policy "imovel_fotos_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'imovel-fotos' and auth.uid() is not null);

-- --------------------------------------------------------------------------- 009 (equipa / sem recursão RLS)
create or replace function public.user_is_empresa_for_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'empresa'
      and p.empresa_id = target_company
  );
$$;

revoke all on function public.user_is_empresa_for_company(uuid) from public;
grant execute on function public.user_is_empresa_for_company(uuid) to authenticated;
grant execute on function public.user_is_empresa_for_company(uuid) to service_role;

drop policy if exists "profiles_select_team_if_empresa" on public.profiles;

create policy "profiles_select_team_if_empresa" on public.profiles
for select using (public.user_is_empresa_for_company(empresa_id));
