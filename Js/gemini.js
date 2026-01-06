import { buildPrompt } from "./aiPrompt.js";

const API_BASE = window.BACKEND_URL || ""; // set window.BACKEND_URL to your Vercel URL when hosting frontend on GitHub

export async function generateCommentsFromGemini(lessonText) {
  const prompt = buildPrompt(lessonText);

  const res = await fetch(`${API_BASE}/api/gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error("Gọi Gemini thất bại");
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}
