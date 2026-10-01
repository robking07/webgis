-- Core schema: dataset registry mirror, geography lookup, values, and insights.
-- Geometry lives in vector tiles, not here; this database holds attributes only,
-- which keeps it far below the 500 MB free-tier limit.
-- Public read-only access: anon/authenticated may SELECT, only the service role writes.

create table public.datasets (
  id text primary key,
  title text not null,
  category text not null,
  unit text not null,
  vintage text not null,
  -- full registry entry, as validated by data/registry/schema.ts
  entry jsonb not null,
  loaded_at timestamptz not null default now()
);

create table public.geographies (
  geoid text primary key,
  level text not null check (level in ('state', 'county', 'tract')),
  name text not null,
  state_fips text not null,
  county_fips text,
  aland_sqmi double precision not null check (aland_sqmi >= 0),
  -- internal point from the Census Gazetteer, for labels and fly-to
  lon double precision not null,
  lat double precision not null
);
create index geographies_level_idx on public.geographies (level);
create index geographies_state_idx on public.geographies (state_fips);

create table public.dataset_values (
  dataset_id text not null references public.datasets (id) on delete cascade,
  level text not null check (level in ('state', 'county', 'tract')),
  geoid text not null references public.geographies (geoid) on delete cascade,
  value double precision,
  moe double precision,
  primary key (dataset_id, level, geoid)
);
create index dataset_values_geoid_idx on public.dataset_values (geoid);

create table public.insights (
  id text primary key,
  x_dataset text not null references public.datasets (id) on delete cascade,
  y_dataset text not null references public.datasets (id) on delete cascade,
  level text not null default 'county',
  n integer not null check (n > 0),
  pearson_r double precision not null,
  spearman_rho double precision not null,
  -- 'published' insights are shown; 'flagged' ones failed a spuriousness check
  status text not null check (status in ('published', 'flagged', 'draft')),
  flags text[] not null default '{}',
  headline text,
  caption text,
  created_at timestamptz not null default now()
);
create index insights_x_idx on public.insights (x_dataset);
create index insights_y_idx on public.insights (y_dataset);

alter table public.datasets enable row level security;
alter table public.geographies enable row level security;
alter table public.dataset_values enable row level security;
alter table public.insights enable row level security;

create policy "public read" on public.datasets for select to anon, authenticated using (true);
create policy "public read" on public.geographies for select to anon, authenticated using (true);
create policy "public read" on public.dataset_values for select to anon, authenticated using (true);
create policy "public read published" on public.insights for select to anon, authenticated using (status = 'published');

grant select on public.datasets, public.geographies, public.dataset_values, public.insights to anon, authenticated;
