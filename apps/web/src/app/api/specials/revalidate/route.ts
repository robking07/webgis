// Refresh /specials right after a verdict (D-116). Only a signed-in reviewer may call it:
// the bearer token must belong to a user listed in public.reviewers.
import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { APPROVALS_TAG } from "@/lib/approvals";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!url || !key) return Response.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  if (!token) return new Response("Unauthorized", { status: 401 });
  const sb = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: user, error } = await sb.auth.getUser(token);
  if (error || !user.user) return new Response("Unauthorized", { status: 401 });
  const { data: reviewer } = await sb.from("reviewers").select("user_id").eq("user_id", user.user.id).maybeSingle();
  if (!reviewer) return new Response("Forbidden", { status: 403 });
  revalidateTag(APPROVALS_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
