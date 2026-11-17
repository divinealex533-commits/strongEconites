import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabaseAdmin";
import { matricOk, matricEmail, normMatric, DEPTS, LEVELS } from "@/lib/shared";

export const runtime = "nodejs";

const bad = (msg, status = 400) => NextResponse.json({ error: msg }, { status });
const clip = (s, n) => String(s || "").trim().slice(0, n);

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return bad("Send the sign-up form again."); }

  const fullName = clip(body.fullName, 80);
  const matric = normMatric(body.matric);
  const password = String(body.password || "");
  const department = DEPTS.includes(body.department) ? body.department : "Other";
  const level = LEVELS.includes(body.level) ? body.level : "100L";
  const role = "Student"; // only the admin can make someone a course rep
  const phone = clip(body.phone, 20).replace(/[^\d+ ]/g, "");

  if (fullName.length < 3) return bad("Enter your full name.");
  if (password.length < 6) return bad("Use a password of at least 6 characters.");

  const admin = adminClient();
  const { data: settings } = await admin.from("settings").select("data").eq("id", 1).single();
  const prefixes = settings?.data?.matricPrefixes;
  if (!matricOk(matric, prefixes)) {
    return bad("That matric number isn't allowed for this class. Use your UNIBEN matric number, e.g. EDU24***** or B1******.");
  }

  const { data: taken } = await admin.from("profiles").select("id").eq("matric", matric).maybeSingle();
  if (taken) return bad("Someone has already signed up with that matric number. Tell a class rep.", 409);

  // The very first person to sign up becomes the site admin.
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  const first = (count || 0) === 0;

  const { data: created, error } = await admin.auth.admin.createUser({
    email: matricEmail(matric),
    password,
    email_confirm: true,
    user_metadata: { matric, full_name: fullName },
  });
  if (error || !created?.user) {
    const msg = /registered|exists/i.test(error?.message || "") ? "That matric number already has an account. Log in instead." : "Couldn't create your account. Try again.";
    return bad(msg, 409);
  }

  const { error: pErr } = await admin.from("profiles").insert({
    id: created.user.id, full_name: fullName, matric, department, level, role, phone,
    approved: first, is_admin: first,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return bad("Couldn't save your profile. Try again.", 500);
  }
  return NextResponse.json({ ok: true, admin: first });
}
