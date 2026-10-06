"use client";
// Hand vetting of Odd Pairings (D-116). A reviewer signs in with an emailed link, then
// approves or rejects each pair that passed the automatic checks. Only approved pairs
// whose numbers and wording are unchanged (fingerprint) appear on /specials.
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { StatusState } from "@webgis/design/components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InsightCard } from "@/components/InsightCard";
import { CANDIDATES, type Insight } from "@/lib/insights";
import { DATASET_BY_ID } from "@/lib/registry";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Its own storage key, so the review session never touches the public client.
const sb = url && key ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true, storageKey: "mapwich-review" } }) : null;

type Verdict = "approved" | "rejected";
interface Review { verdict: Verdict; fingerprint: string; note: string | null; reviewed_at: string }
type Tab = "todo" | Verdict;

export function PairingReview() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isReviewer, setIsReviewer] = useState<boolean | null>(null);
  const [reviews, setReviews] = useState<Map<string, Review> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    if (!sb || !uid) return;
    let live = true;
    (async () => {
      const { data: r, error: e1 } = await sb.from("reviewers").select("user_id").eq("user_id", uid).maybeSingle();
      if (!live) return;
      if (e1) return setError(e1.message);
      setIsReviewer(!!r);
      if (!r) return;
      const { data: rows, error: e2 } = await sb.from("insight_reviews").select("insight_id, verdict, fingerprint, note, reviewed_at");
      if (!live) return;
      if (e2) return setError(e2.message);
      setReviews(new Map((rows ?? []).map((x) => [x.insight_id as string, x as unknown as Review])));
    })();
    return () => { live = false; };
  }, [uid]);

  if (!sb) return <StatusState status="error" message="Reviewing needs the Supabase settings." />;
  if (session === undefined) return <StatusState status="loading" message="Checking sign-in…" />;
  if (!session) return <SignIn />;
  if (error) return <StatusState status="error" message={error} />;
  if (isReviewer === null) return <StatusState status="loading" message="Checking access…" />;
  if (!isReviewer) return <NotReviewer session={session} />;
  if (!reviews) return <StatusState status="loading" message="Loading your verdicts…" />;
  return <Queue session={session} reviews={reviews} setReviews={setReviews} />;
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | string>("idle");
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const { error } = await sb!.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/specials/review` } });
    setState(error ? error.message : "sent");
  };
  if (state === "sent") return <p className="max-w-md">Check your email for a sign-in link. Open it on this device; it brings you back here.</p>;
  return (
    <form onSubmit={send} className="flex max-w-md flex-col gap-3">
      <p className="text-muted-foreground">Sign in to vet Odd Pairings. You&apos;ll get a one-time link by email.</p>
      <Input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
      <Button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a sign-in link"}</Button>
      {state !== "idle" && state !== "sending" && <p className="text-sm text-destructive">{state}</p>}
    </form>
  );
}

function NotReviewer({ session }: { session: Session }) {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <p>Signed in as <strong>{session.user.email}</strong>, but this account isn&apos;t a reviewer yet.</p>
      <p className="text-sm text-muted-foreground">
        To add it, run this once in the Supabase SQL editor:{" "}
        <code className="break-all rounded bg-muted px-1.5 py-0.5 text-xs">insert into public.reviewers (user_id) values (&apos;{session.user.id}&apos;);</code>
      </p>
      <Button variant="outline" className="self-start" onClick={() => sb!.auth.signOut()}>Sign out</Button>
    </div>
  );
}

function statusOf(i: Insight, reviews: Map<string, Review>): { tab: Tab; changed: boolean } {
  const r = reviews.get(i.id);
  if (!r) return { tab: "todo", changed: false };
  if (r.fingerprint !== i.fingerprint) return { tab: "todo", changed: true };
  return { tab: r.verdict, changed: false };
}

function Queue({ session, reviews, setReviews }: { session: Session; reviews: Map<string, Review>; setReviews: (m: Map<string, Review>) => void }) {
  const [tab, setTab] = useState<Tab>("todo");
  const [pos, setPos] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lists = useMemo(() => {
    const out: Record<Tab, Insight[]> = { todo: [], approved: [], rejected: [] };
    for (const i of CANDIDATES) out[statusOf(i, reviews).tab].push(i);
    return out;
  }, [reviews]);
  const list = lists[tab];
  const at = Math.min(pos, Math.max(0, list.length - 1));
  const card = list[at];
  const existing = card ? reviews.get(card.id) : undefined;
  const changed = card ? statusOf(card, reviews).changed : false;

  // Reset the note/error when the card or its saved note changes (adjusted during render, not in an effect).
  const noteKey = `${card?.id}\n${existing?.note}`;
  const [seenNoteKey, setSeenNoteKey] = useState(noteKey);
  if (seenNoteKey !== noteKey) { setSeenNoteKey(noteKey); setNote(existing?.note ?? ""); setErr(null); }

  const decide = useCallback(async (verdict: Verdict) => {
    if (!card || saving) return;
    setSaving(true);
    const row = { insight_id: card.id, fingerprint: card.fingerprint, verdict, note: note.trim() || null, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() };
    const { error } = await sb!.from("insight_reviews").upsert(row);
    setSaving(false);
    if (error) return setErr(error.message);
    const next = new Map(reviews);
    next.set(card.id, row);
    setReviews(next);
    // Keep the position: the decided card leaves this list, so the next one slides in
    // (in the Approved/Rejected tabs, a re-decided card stays or moves accordingly).
    if (tab !== "todo" && tab === verdict) setPos(at + 1);
    fetch("/api/specials/revalidate", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => {});
  }, [card, saving, note, session, reviews, setReviews, tab, at]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("textarea, input") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "a") decide("approved");
      else if (e.key === "r") decide("rejected");
      else if (e.key === "j" || e.key === "ArrowRight") setPos((p) => Math.min(p + 1, list.length - 1));
      else if (e.key === "k" || e.key === "ArrowLeft") setPos((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, list.length]);

  const TABS: Array<[Tab, string]> = [["todo", "To review"], ["approved", "Approved"], ["rejected", "Rejected"]];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex gap-1.5">
          {TABS.map(([t, label]) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setPos(0); }}
              className="rounded-full border px-3 py-1 text-sm text-muted-foreground aria-selected:border-primary aria-selected:bg-primary aria-selected:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">
              {label} <span className="tabular-nums">{lists[t].length}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {session.user.email} · <button className="underline-offset-2 hover:underline" onClick={() => sb!.auth.signOut()}>Sign out</button>
        </p>
      </div>

      {!card ? (
        <StatusState status="empty" message={tab === "todo" ? "Nothing left to review." : "No cards here yet."} />
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
          <InsightCard key={card.id} insight={card} href={`/map?d=${card.x}&b=${card.y}`} />
          <aside className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground tabular-nums">Card {at + 1} of {list.length}</p>
            <p className="text-sm">
              <span className="font-medium">{DATASET_BY_ID.get(card.x)?.title}</span> × <span className="font-medium">{DATASET_BY_ID.get(card.y)?.title}</span>
            </p>
            {changed && <p className="rounded-md border border-primary/40 bg-primary/5 p-2 text-xs">Changed since you last reviewed it ({existing?.verdict}): the numbers or wording were updated.</p>}
            {existing && !changed && <p className="text-xs text-muted-foreground">You {existing.verdict} this on {new Date(existing.reviewed_at).toLocaleDateString()}.</p>}
            <label className="flex flex-col gap-1 text-sm">
              Note (private)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                className="rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
            </label>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => decide("approved")} disabled={saving}>Approve <kbd className="ml-1 text-xs opacity-70">A</kbd></Button>
              <Button className="flex-1" variant="outline" onClick={() => decide("rejected")} disabled={saving}>Reject <kbd className="ml-1 text-xs opacity-70">R</kbd></Button>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setPos(Math.max(at - 1, 0))} disabled={at === 0}>← Previous</Button>
              <Button variant="ghost" size="sm" onClick={() => setPos(Math.min(at + 1, list.length - 1))} disabled={at >= list.length - 1}>Next →</Button>
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <p className="text-xs text-muted-foreground">Keys: A approve · R reject · J/K next/previous. Approved cards appear on Specials within a minute.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
