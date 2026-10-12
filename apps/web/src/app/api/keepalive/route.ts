// Daily keep-alive (D-02): Supabase free projects pause after 7 idle days. Visitors no longer
// read Supabase (D-198, D-210); this keeps it alive for the data pipeline and reviewer sign-in.
// Vercel Cron calls this once a day (vercel.json);
// it runs one tiny read. Vercel sends `Authorization: Bearer $CRON_SECRET` on cron calls,
// so anyone else gets a 401.
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!supabase) return Response.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  const { count, error } = await supabase.from("datasets").select("id", { count: "exact", head: true });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 502 });
  return Response.json({ ok: true, datasets: count, at: new Date().toISOString() });
}
