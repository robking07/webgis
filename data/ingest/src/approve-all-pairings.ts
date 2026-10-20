// One-off (issue #274, D-377): approve every current Odd Pairings candidate on
// Robbie's behalf, exactly as the review page writes a verdict (PairingReview.tsx). Idempotent:
// upserts one row per pair with today's fingerprint; existing notes are kept.
//   node data/ingest/src/approve-all-pairings.ts          dry run: shows what it would do
//   node data/ingest/src/approve-all-pairings.ts --apply  writes, then verifies the count
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, db } from "./util.ts";

// The env file lives at the main checkout's root; from a worktree that is three levels up.
for (const p of [join(ROOT, ".env.local"), join(ROOT, "../../../.env.local")]) if (existsSync(p)) { process.loadEnvFile(p); break; }

const { insights } = JSON.parse(readFileSync(join(ROOT, "apps/web/src/generated/insights.json"), "utf8")) as
  { insights: Array<{ id: string; status: string; fingerprint: string }> };
const candidates = insights.filter((i) => i.status === "published");
const apply = process.argv.includes("--apply");

const pool = db();
try {
  const reviewers = (await pool.query<{ user_id: string }>("select user_id from public.reviewers")).rows;
  if (reviewers.length !== 1) throw new Error(`expected exactly one reviewer (Robbie), found ${reviewers.length}; stopping`);
  const before = await pool.query("select verdict, count(*)::int as n from public.insight_reviews group by verdict order by verdict");
  console.log(`candidates: ${candidates.length}; existing verdicts:`, before.rows);
  if (apply) {
    const res = await pool.query(
      `insert into public.insight_reviews (insight_id, fingerprint, verdict, reviewed_by, reviewed_at)
       select id, fp, 'approved', $3, now() from unnest($1::text[], $2::text[]) as t(id, fp)
       on conflict (insight_id) do update set fingerprint = excluded.fingerprint, verdict = 'approved',
         reviewed_by = excluded.reviewed_by, reviewed_at = excluded.reviewed_at
       where (insight_reviews.verdict, insight_reviews.fingerprint) is distinct from ('approved', excluded.fingerprint)`,
      [candidates.map((c) => c.id), candidates.map((c) => c.fingerprint), reviewers[0].user_id],
    );
    console.log(`upserted ${res.rowCount} rows`);
  }
  const check = await pool.query<{ n: number }>(
    `select count(*)::int as n from public.insight_reviews r
     join unnest($1::text[], $2::text[]) as t(id, fp) on r.insight_id = t.id and r.fingerprint = t.fp
     where r.verdict = 'approved'`,
    [candidates.map((c) => c.id), candidates.map((c) => c.fingerprint)],
  );
  console.log(`approved rows matching a current candidate: ${check.rows[0].n} of ${candidates.length}`);
} finally {
  await pool.end();
}
