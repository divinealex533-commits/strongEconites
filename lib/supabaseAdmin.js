// Server only. Uses the service role key, which must never reach the browser.
import { createClient } from "@supabase/supabase-js";

export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Returns the signed-in, approved student behind a request, or null.
export async function approvedUser(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: p } = await admin.from("profiles").select("id, approved, is_admin").eq("id", data.user.id).single();
  return p && (p.approved || p.is_admin) ? p : null;
}
