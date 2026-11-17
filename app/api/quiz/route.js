import { NextResponse } from "next/server";
import { approvedUser } from "@/lib/supabaseAdmin";
import { aiEnabled, askClaude } from "@/lib/anthropic";

export const runtime = "nodejs";

export async function POST(req) {
  if (!aiEnabled()) return NextResponse.json({ error: "The quiz maker isn't switched on yet." }, { status: 503 });
  const user = await approvedUser(req);
  if (!user) return NextResponse.json({ error: "Log in as an approved member to make quizzes." }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Try again." }, { status: 400 }); }
  const topic = String(body.topic || "").trim().slice(0, 120);
  const level = String(body.level || "300 level").trim().slice(0, 40);
  if (!topic) return NextResponse.json({ error: "Enter a topic." }, { status: 400 });

  const prompt = `Write a 5-question multiple-choice practice quiz for Social Science Education (Economics) students at the University of Benin, Nigeria, at ${level}. Topic: ${topic}. Each question has exactly 4 options and one correct answer. Use Nigerian context where natural. Reply with only JSON, no other text: {"questions":[{"q":"question","options":["","","",""],"answer":0,"explain":"one or two sentences on why the answer is right"}]} where answer is the index 0-3.`;

  try {
    const text = await askClaude({ system: "You write accurate exam-style practice questions. Output valid JSON only.", messages: [{ role: "user", content: prompt }], maxTokens: 1500 });
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const questions = (json.questions || [])
      .filter((x) => x && x.q && Array.isArray(x.options) && x.options.length === 4 && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4)
      .slice(0, 5)
      .map((x) => ({ q: String(x.q), options: x.options.map(String), answer: x.answer, explain: String(x.explain || "") }));
    if (!questions.length) throw new Error("empty");
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: "Couldn't make that quiz. Try a different topic." }, { status: 502 });
  }
}
