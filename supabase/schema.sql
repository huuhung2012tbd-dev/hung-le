-- HUNG LE electrical catalogue: PostgreSQL schema for Supabase
create extension if not exists pgcrypto;

create type public.app_role as enum ('owner','staff');
create type public.stock_status as enum ('in_stock','check_supplier','unconfirmed');
create type public.banner_status as enum ('draft','published');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  name text not null,
  slug text not null unique,
  sku text unique,
  origin text,
  description text,
  reference_price numeric(14,2) check (reference_price is null or reference_price >= 0),
  availability public.stock_status not null default 'unconfirmed',
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_brand_idx on public.products(brand_id);
create index products_published_featured_idx on public.products(is_published,is_featured);
create index products_name_search_idx on public.products using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(sku,'')));

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  storage_path text,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images(product_id,sort_order);

create table public.product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  spec_group text,
  spec_name text not null,
  spec_value text not null,
  unit text,
  sort_order integer not null default 0
);
create index product_specs_product_idx on public.product_specs(product_id,sort_order);

create table public.spec_templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  button_label text,
  button_url text,
  image_url text,
  storage_path text,
  status public.banner_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','success','failed')),
  storage_reference text,
  details text
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  created_at timestamptz not null default now()
);
create index audit_events_created_idx on public.audit_events(created_at desc);

create or replace function public.current_role()
returns public.app_role language sql stable security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and active = true
$$;

create or replace function public.is_staff_or_owner()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles
    where id=auth.uid() and active=true and role in ('owner','staff'))
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles
    where id=auth.uid() and active=true and role='owner')
$$;

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_specs enable row level security;
alter table public.spec_templates enable row level security;
alter table public.banners enable row level security;
alter table public.site_settings enable row level security;
alter table public.backup_runs enable row level security;
alter table public.audit_events enable row level security;

-- Public catalogue read access only to active/public records.
create policy "public read brands" on public.brands for select using (true);
create policy "public read active categories" on public.categories for select using (is_active=true);
create policy "public read published products" on public.products for select using (is_published=true);
create policy "public read images of published products" on public.product_images for select
 using (exists(select 1 from public.products p where p.id=product_id and p.is_published=true));
create policy "public read specs of published products" on public.product_specs for select
 using (exists(select 1 from public.products p where p.id=product_id and p.is_published=true));
create policy "public read published banners" on public.banners for select using (status='published');

-- Staff may maintain product content and view customer-facing settings; only owner can delete products.
create policy "staff read profiles" on public.profiles for select using (public.is_staff_or_owner());
create policy "owner manage profiles" on public.profiles for all using (public.is_owner()) with check (public.is_owner());

create policy "staff insert products" on public.products for insert with check (public.is_staff_or_owner());
create policy "staff update products" on public.products for update using (public.is_staff_or_owner()) with check (public.is_staff_or_owner());
create policy "owner delete products" on public.products for delete using (public.is_owner());

create policy "staff insert product images" on public.product_images for insert with check (public.is_staff_or_owner());
create policy "staff update product images" on public.product_images for update using (public.is_staff_or_owner()) with check (public.is_staff_or_owner());
create policy "owner delete product images" on public.product_images for delete using (public.is_owner());

create policy "staff insert specs" on public.product_specs for insert with check (public.is_staff_or_owner());
create policy "staff update specs" on public.product_specs for update using (public.is_staff_or_owner()) with check (public.is_staff_or_owner());
create policy "owner delete specs" on public.product_specs for delete using (public.is_owner());

create policy "owner manage categories" on public.categories for all using (public.is_owner()) with check (public.is_owner());
create policy "owner manage brands" on public.brands for all using (public.is_owner()) with check (public.is_owner());
create policy "owner manage templates" on public.spec_templates for all using (public.is_owner()) with check (public.is_owner());
create policy "owner manage banners" on public.banners for all using (public.is_owner()) with check (public.is_owner());
create policy "public read public settings" on public.site_settings for select using (key in ('contact','business','social'));
create policy "owner manage settings" on public.site_settings for all using (public.is_owner()) with check (public.is_owner());
create policy "owner read backups" on public.backup_runs for select using (public.is_owner());
create policy "owner insert backups" on public.backup_runs for insert with check (public.is_owner());
create policy "owner read audit" on public.audit_events for select using (public.is_owner());

-- Create profile automatically when an auth user is created; role defaults to staff.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,full_name,role)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'staff')
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Seed approved business catalogue taxonomy.
insert into public.brands(name,slug) values
 ('CADIVI','cadivi'),('Schneider Electric','schneider-electric'),
 ('Panasonic','panasonic'),('LS Electric','ls-electric'),('Sino','sino')
on conflict do nothing;

insert into public.categories(name,slug,sort_order) values
 ('Dây điện, cáp điện CADIVI','day-dien-cap-dien-cadivi',1),
 ('Thiết bị đóng cắt','thiet-bi-dong-cat',2),
 ('Công tắc, ổ cắm điện','cong-tac-o-cam-dien',3),
 ('Đèn LED, thiết bị chiếu sáng','den-led-chieu-sang',4),
 ('Tủ điện, thiết bị điện công nghiệp','tu-dien-cong-nghiep',5),
 ('Ống luồn dây, phụ kiện điện','ong-luon-day-phu-kien',6),
 ('Thiết bị tự động hóa, biến tần','tu-dong-hoa-bien-tan',7),
 ('Thiết bị điện dân dụng','thiet-bi-dien-dan-dung',8),
 ('Thiết bị điện công trình','thiet-bi-dien-cong-trinh',9)
on conflict do nothing;

insert into public.site_settings(key,value) values
 ('contact','{"phone":"0909660910","zalo":"0909660910","email":"","facebook":""}'),
 ('business','{"name":"HÙNG LÊ","address":"39I Ngô Nhân Tịnh, Phường Bình Tiên, Quận 6, TP. Hồ Chí Minh","domain":"HungLe.com"}'),
 ('social','{"maps_url":""}')
on conflict (key) do nothing;

-- Storage bucket. Upload/delete policies are applied to storage.objects.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-media','product-media',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "public view product media" on storage.objects for select
using (bucket_id='product-media');
create policy "staff upload product media" on storage.objects for insert
with check (bucket_id='product-media' and public.is_staff_or_owner());
create policy "staff update product media" on storage.objects for update
using (bucket_id='product-media' and public.is_staff_or_owner())
with check (bucket_id='product-media' and public.is_staff_or_owner());
create policy "owner delete product media" on storage.objects for delete
using (bucket_id='product-media' and public.is_owner());
