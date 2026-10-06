import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Read-only public client (RLS allows SELECT only). Null if env isn't configured.
 *  Place details no longer come from here (static files, `lib/details.ts`); it serves the
 *  keep-alive ping and tract geography. */
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
