// Minimal Anthropic Messages API call (server only).
export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

export async function askClaude({ system, messages, maxTokens = 900 }) {
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
  if (!res.ok) {
    const err = new Error("ai_failed");
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

export const TUTOR_BRIEF =
  "You are a patient tutor for SSE ECONITES: Social Science Education students (Economics) in the Faculty of Education, University of Benin, Nigeria. Explain clearly in simple English, use Nigerian examples (naira, markets, CBN, local schools) where they help, and connect ideas to teaching when relevant. Keep answers under 300 words, use short paragraphs or a short list, no tables. End with one quick question to check understanding.";
