import { buildPrompt } from "./aiPrompt.js";

const API_KEY = "AIzaSyAxS4F4FBAlKTQ373lbGh4J3JplcI6PhgE";

export async function generateCommentsFromGemini(lessonText) {
  const prompt = buildPrompt(lessonText);

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Gọi Gemini thất bại");
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}
