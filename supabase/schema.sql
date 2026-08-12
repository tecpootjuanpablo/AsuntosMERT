-- ============================================================
-- CONTROL DE EXPEDIENTES JUDICIALES — ESQUEMA SUPABASE
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- SOCIOS (perfil ligado a cada usuario autenticado) ----------
create table if not exists public.socios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  created_at timestamptz default now()
);

-- ---------- EXPEDIENTES ----------
create table if not exists public.expedientes (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  juzgado text not null,
  materia text not null,
  actor text not null,
  demandado text not null,
  fojas_totales int default 0,
  socio_id uuid not null references public.socios(id) on delete cascade,
  created_at timestamptz default now()
);

-- ---------- ACTUACIONES ----------
create table if not exists public.actuaciones (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes(id) on delete cascade,
  tipo text not null check (tipo in ('Promoción','Auto','Sentencia','Audiencia','Notificación','Oficio')),
  fecha_acuerdo date not null,
  fecha_notificacion date,
  resumen text not null,
  foja int not null,
  termino_dias_otorgados int,
  termino_fecha_limite date,
  documento_texto text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Regla de negocio: todos los socios autenticados VEN todo
-- (para poder filtrar por socio responsable), pero solo el
-- socio dueño puede crear/editar/borrar sus propios registros.
-- ============================================================

alter table public.socios enable row level security;
alter table public.expedientes enable row level security;
alter table public.actuaciones enable row level security;

-- SOCIOS: cualquier autenticado puede ver la lista (para el filtro);
-- cada quien solo edita su propio perfil.
create policy "socios_select_all_autenticados"
  on public.socios for select
  using (auth.role() = 'authenticated');

create policy "socios_update_propio"
  on public.socios for update
  using (auth.uid() = id);

-- EXPEDIENTES: lectura abierta al despacho; escritura solo del dueño.
create policy "expedientes_select_all_autenticados"
  on public.expedientes for select
  using (auth.role() = 'authenticated');

create policy "expedientes_insert_propio"
  on public.expedientes for insert
  with check (auth.uid() = socio_id);

create policy "expedientes_update_propio"
  on public.expedientes for update
  using (auth.uid() = socio_id);

create policy "expedientes_delete_propio"
  on public.expedientes for delete
  using (auth.uid() = socio_id);

-- ACTUACIONES: lectura abierta al despacho; escritura solo si el
-- expediente asociado pertenece al usuario autenticado.
create policy "actuaciones_select_all_autenticados"
  on public.actuaciones for select
  using (auth.role() = 'authenticated');

create policy "actuaciones_insert_propio"
  on public.actuaciones for insert
  with check (
    exists (
      select 1 from public.expedientes e
      where e.id = expediente_id and e.socio_id = auth.uid()
    )
  );

create policy "actuaciones_update_propio"
  on public.actuaciones for update
  using (
    exists (
      select 1 from public.expedientes e
      where e.id = expediente_id and e.socio_id = auth.uid()
    )
  );

create policy "actuaciones_delete_propio"
  on public.actuaciones for delete
  using (
    exists (
      select 1 from public.expedientes e
      where e.id = expediente_id and e.socio_id = auth.uid()
    )
  );

-- ============================================================
-- Crea automáticamente el perfil en "socios" cuando tú (el admin)
-- des de alta un usuario nuevo desde Authentication > Users.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.socios (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- DATOS DE PRUEBA (opcional)
-- Sustituye 'TU-USER-ID-AQUI' por el id real de un usuario que
-- hayas creado en Authentication > Users, y descomenta para
-- cargar un expediente y sus actuaciones de ejemplo.
-- ============================================================
-- insert into public.expedientes (numero, juzgado, materia, actor, demandado, fojas_totales, socio_id)
-- values ('245/2024', 'Juzgado Tercero de lo Familiar de la Ciudad de México',
--         'Divorcio Incausado y Alimentos', 'María Fernanda López Rangel',
--         'Carlos Eduardo Sánchez Ibarra', 187, 'TU-USER-ID-AQUI');
