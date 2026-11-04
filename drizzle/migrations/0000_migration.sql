create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.handle_first_admin();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('protein','special','drink')),
  name text not null,
  description text not null default '',
  price numeric(10,2),
  image_url text,
  available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select to anon, authenticated using (true);
create policy "admin write products" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.sides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  available boolean not null default true,
  sort_order int not null default 0
);
grant select on public.sides to anon, authenticated;
grant insert, update, delete on public.sides to authenticated;
grant all on public.sides to service_role;
alter table public.sides enable row level security;
create policy "public read sides" on public.sides for select to anon, authenticated using (true);
create policy "admin write sides" on public.sides for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.sizes (
  code text primary key,
  label text not null,
  price numeric(10,2) not null,
  available boolean not null default true,
  sort_order int not null default 0
);
grant select on public.sizes to anon, authenticated;
grant insert, update, delete on public.sizes to authenticated;
grant all on public.sizes to service_role;
alter table public.sizes enable row level security;
create policy "public read sizes" on public.sizes for select to anon, authenticated using (true);
create policy "admin write sizes" on public.sizes for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.settings (
  id int primary key default 1 check (id = 1),
  open_time text not null default '10:30',
  close_time text not null default '14:30',
  open_days int[] not null default '{1,2,3,4,5,6}',
  hours_text text not null default 'Segunda a sábado, das 10h30 às 14h30',
  delivery_enabled boolean not null default true,
  delivery_fee numeric(10,2) not null default 5,
  pickup_enabled boolean not null default true,
  delivery_info text not null default 'Entregamos em Vinhedo. Tempo médio de 30 a 50 minutos.',
  force_closed boolean not null default false
);
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "public read settings" on public.settings for select to anon, authenticated using (true);
create policy "admin update settings" on public.settings for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.settings (id) values (1);
insert into public.sizes (code,label,price,sort_order) values ('P','Pequena',22,1),('M','Média',25,2),('G','Grande',30,3);
insert into public.sides (name,sort_order) values ('Farofa',1),('Macarrão alho e óleo',2),('Couve refogada',3);
insert into public.products (category,name,description,price,image_url,sort_order) values
 ('protein','Linguiça calabresa','Calabresa acebolada, douradinha na chapa.',null,'/__l5e/assets-v1/358b220f-d04d-41a1-852d-553ee8f8d021/calabresa.jpg',1),
 ('protein','Feijoada','Feijão preto com carnes selecionadas, cozido devagar.',null,'/__l5e/assets-v1/d8b9c390-6226-448f-aa98-46f634caef8e/feijoada.jpg',2),
 ('protein','Frango frito','Pedaços de frango sequinhos e crocantes.',null,'/__l5e/assets-v1/313bb903-79a6-4c9a-bd00-e9701fef2eac/frango-frito.jpg',3),
 ('protein','Costelinha suína frita','Costelinha temperada e frita até ficar crocante.',null,'/__l5e/assets-v1/89851cc4-94f9-4205-ba46-4f7b3e59d501/costelinha.jpg',4),
 ('protein','Costela ao molho','Costela bovina macia no molho caseiro.',null,'/__l5e/assets-v1/071e6184-40fb-4835-8605-0d45d0075793/costela-molho.jpg',5),
 ('special','Frango à Parmegiana','Frango à parmegiana acompanhado de arroz, feijão, farofa e fritas.',35,'/__l5e/assets-v1/d8cb3360-8622-499f-80b3-c7311bba77ce/parmegiana.jpg',1),
 ('drink','Refrigerante 600ml','Gelado, diversos sabores.',10,'/__l5e/assets-v1/eb22760f-4869-46b8-9e2d-ab8d77913a14/refri600.jpg',1),
 ('drink','Água sem gás','Garrafa 500ml.',4.5,'/__l5e/assets-v1/f7a65783-4611-48f7-82ad-f9c778d5df8d/agua.jpg',2),
 ('drink','Suco natural','Feito na hora com frutas da estação.',12,'/__l5e/assets-v1/e7e77b47-20e6-41d5-b9a6-ddcd9390cdbd/suco.jpg',3),
 ('drink','Refrigerante lata','350ml, diversos sabores.',6,'/__l5e/assets-v1/e51cc905-a9e9-405b-b3c8-7b5dc205c830/lata.jpg',4);

create policy "anyone read product images" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "admin upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "admin update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "admin delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));