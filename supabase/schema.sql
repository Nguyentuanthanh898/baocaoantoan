-- Chạy toàn bộ file này một lần trong Supabase: SQL Editor > New query > Run
create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('Hành vi không an toàn','Điều kiện không an toàn')),
  area text not null check (char_length(area) <= 40),
  level text not null check (level in ('Thấp','Trung bình','Cao')),
  loc text check (char_length(loc) <= 120),
  description text not null check (char_length(description) between 5 and 800),
  suggestion text check (char_length(suggestion) <= 200),
  reporter text check (char_length(reporter) <= 60),
  photo_path text check (char_length(photo_path) <= 200),
  status text not null default 'Mới' check (status in ('Mới','Đang xử lý','Đã xử lý')),
  handler_note text check (char_length(handler_note) <= 500),
  updated_at timestamptz
);

create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;   -- không có policy: chỉ hàm bên dưới đọc được

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'))
$$;

alter table public.reports enable row level security;
drop policy if exists "anon insert" on public.reports;
drop policy if exists "admin all" on public.reports;
create policy "anon insert" on public.reports for insert to anon
  with check (status = 'Mới' and handler_note is null and updated_at is null
              and (photo_path is null or photo_path ~ '^[0-9a-f-]{36}\.jpg$'));
create policy "admin all" on public.reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant insert on public.reports to anon;
grant select, insert, update, delete on public.reports to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Thống kê công khai, không lộ nội dung báo cáo
create or replace function public.get_stats() returns json
language sql security definer set search_path = public stable as $$
  select json_build_object(
    'total', (select count(*) from reports),
    'by_kind', (select coalesce(json_object_agg(kind, c), '{}'::json) from (select kind, count(*) c from reports group by kind) s),
    'by_area', (select coalesce(json_object_agg(area, c), '{}'::json) from (select area, count(*) c from reports group by area) s),
    'by_status', (select coalesce(json_object_agg(status, c), '{}'::json) from (select status, count(*) c from reports group by status) s))
$$;
grant execute on function public.get_stats() to anon, authenticated;

-- Ảnh hiện trường: bucket riêng tư, ai cũng tải lên được, chỉ admin xem
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;
drop policy if exists "anon upload photos" on storage.objects;
drop policy if exists "admin read photos" on storage.objects;
drop policy if exists "admin delete photos" on storage.objects;
create policy "anon upload photos" on storage.objects for insert to anon with check (bucket_id = 'photos');
create policy "admin read photos" on storage.objects for select to authenticated using (bucket_id = 'photos' and public.is_admin());
create policy "admin delete photos" on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.is_admin());

-- Sau khi tạo tài khoản admin ở Authentication > Users, chạy (thay email):
-- insert into public.admins (email) values ('email-admin@congty.vn');
