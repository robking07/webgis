-- Hand vetting of Odd Pairings (D-1xx, see docs/decisions): a pair reaches /specials only
-- after a reviewer approves it, and only while its numbers and caption are unchanged
-- (`fingerprint` from the insights export). Reviewers sign in with Supabase Auth.

-- Who may vet cards. Rows are added by hand (SQL editor or service role) after a
-- reviewer's first sign-in; nobody can add themselves.
create table public.reviewers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.reviewers enable row level security;
create policy "reviewers see their own row" on public.reviewers
  for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.reviewers to authenticated;

-- One verdict per pair. `fingerprint` is the card content that was approved; when the
-- export's fingerprint changes, the pair needs review again.
create table public.insight_reviews (
  insight_id text primary key,
  fingerprint text not null,
  verdict text not null check (verdict in ('approved', 'rejected')),
  note text,
  reviewed_by uuid not null default auth.uid() references auth.users (id),
  reviewed_at timestamptz not null default now()
);
create index insight_reviews_verdict_idx on public.insight_reviews (verdict);
alter table public.insight_reviews enable row level security;

-- Reviewers read and write everything, including private notes.
create policy "reviewers read" on public.insight_reviews
  for select to authenticated
  using (exists (select 1 from public.reviewers r where r.user_id = (select auth.uid())));
create policy "reviewers insert" on public.insight_reviews
  for insert to authenticated
  with check (
    exists (select 1 from public.reviewers r where r.user_id = (select auth.uid()))
    and reviewed_by = (select auth.uid())
  );
create policy "reviewers update" on public.insight_reviews
  for update to authenticated
  using (exists (select 1 from public.reviewers r where r.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.reviewers r where r.user_id = (select auth.uid()))
    and reviewed_by = (select auth.uid())
  );
grant select, insert, update on public.insight_reviews to authenticated;

-- The public site learns only which pairs are approved, never notes or reviewers:
-- a column-level grant plus a row policy limited to approvals.
create policy "public reads approvals" on public.insight_reviews
  for select to anon using (verdict = 'approved');
grant select (insight_id, fingerprint, verdict) on public.insight_reviews to anon;
