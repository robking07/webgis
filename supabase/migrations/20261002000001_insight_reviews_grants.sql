-- D-116 fix: this project's default privileges give anon and authenticated every privilege
-- on new public tables, which made the column-level grant meaningless (anon could read
-- private notes on approved rows). Start from nothing and grant only what's needed.
revoke all on public.reviewers, public.insight_reviews from anon, authenticated;

grant select on public.reviewers to authenticated;
grant select, insert, update on public.insight_reviews to authenticated;
-- The public site may read which pairs are approved, nothing else.
grant select (insight_id, fingerprint, verdict) on public.insight_reviews to anon;
