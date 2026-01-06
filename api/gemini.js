// Vercel serverless function to proxy Gemini requests server-side.
// Expects environment variables: GEMINI_API_URL and GEMINI_API_KEY
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const UPSTREAM_URL =
    process.env.GEMINI_API_URL ||
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const upstreamRes = await fetch(`${UPSTREAM_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await upstreamRes.text();
    // propagate status and content-type
    res.status(upstreamRes.status);
    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    return res.send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Proxy request failed" });
  }
};
