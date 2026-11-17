import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Class-rep actions that need the service role: reset a student's password, remove a student completely.
export async function POST(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const admin = adminClient();
  const { data: who } = await admin.auth.getUser(token);
  if (!who?.user) return NextResponse.json({ error: "Log in again." }, { status: 401 });
  const { data: me } = await admin.from("profiles").select("is_admin").eq("id", who.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Only class reps can do that." }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Try again." }, { status: 400 }); }
  const target = String(body.userId || "");
  if (!target) return NextResponse.json({ error: "No student chosen." }, { status: 400 });

  if (body.action === "reset") {
    const pw = String(body.password || "");
    if (pw.length < 6) return NextResponse.json({ error: "Use at least 6 characters." }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(target, { password: pw });
    if (error) return NextResponse.json({ error: "Couldn't reset that password." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "remove") {
    if (target === who.user.id) return NextResponse.json({ error: "You can't remove yourself here." }, { status: 400 });
    const { error } = await admin.auth.admin.deleteUser(target); // profile, chat and dashboard rows cascade
    if (error) return NextResponse.json({ error: "Couldn't remove that student." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
