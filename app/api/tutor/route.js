import { NextResponse } from "next/server";
import { approvedUser } from "@/lib/supabaseAdmin";
import { aiEnabled, askClaude, TUTOR_BRIEF } from "@/lib/anthropic";

export const runtime = "nodejs";

export async function POST(req) {
  if (!aiEnabled()) return NextResponse.json({ error: "The tutor isn't switched on yet." }, { status: 503 });
  const user = await approvedUser(req);
  if (!user) return NextResponse.json({ error: "Log in as an approved member to use the tutor." }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Ask again." }, { status: 400 }); }
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) return NextResponse.json({ error: "Type a question first." }, { status: 400 });

  try {
    const text = await askClaude({ system: TUTOR_BRIEF, messages });
    return NextResponse.json({ text });
  } catch (e) {
    const busy = e.status === 429 || e.status === 529;
    return NextResponse.json({ error: busy ? "The tutor is busy. Try again in a minute." : "The tutor couldn't answer that. Try again." }, { status: busy ? 429 : 502 });
  }
}
