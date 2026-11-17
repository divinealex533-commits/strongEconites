// AI for the Study Hub (server only). Uses Google Gemini when GEMINI_API_KEY is set
// (it has a free tier), otherwise Anthropic Claude when ANTHROPIC_API_KEY is set.
export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

function fail(status) { const err = new Error("ai_failed"); err.status = status; return err; }

async function askGemini({ system, messages, maxTokens }) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    }),
  });
  if (!res.ok) throw fail(res.status);
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) throw fail(502);
  return text;
}

async function askAnthropic({ system, messages, maxTokens }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) throw fail(res.status);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

// kept as askClaude so the API routes don't need to change
export async function askClaude({ system, messages, maxTokens = 900 }) {
  if (process.env.GEMINI_API_KEY) return askGemini({ system, messages, maxTokens: Math.max(maxTokens, 2048) });
  return askAnthropic({ system, messages, maxTokens });
}

export const TUTOR_BRIEF =
  "You are a patient tutor for SSE ECONITES: Social Science Education students (Economics) in the Faculty of Education, University of Benin, Nigeria. Explain clearly in simple English, use Nigerian examples (naira, markets, CBN, local schools) where they help, and connect ideas to teaching when relevant. Keep answers under 300 words, use short paragraphs or a short list, no tables. End with one quick question to check understanding.";
