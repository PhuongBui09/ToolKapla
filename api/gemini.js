// Vercel serverless function to proxy Gemini requests server-side.
// Expects environment variables: GEMINI_API_URL and GEMINI_API_KEY

function buildUpstreamUrl(baseUrl, apiKey, shouldStream) {
  const normalizedBaseUrl = shouldStream
    ? baseUrl.replace(":generateContent", ":streamGenerateContent")
    : baseUrl.replace(":streamGenerateContent", ":generateContent");

  const url = new URL(normalizedBaseUrl);
  url.searchParams.set("key", apiKey);

  if (shouldStream) {
    url.searchParams.set("alt", "sse");
  }

  return url.toString();
}

async function pipeStreamToResponse(upstreamRes, res) {
  const reader = upstreamRes.body && upstreamRes.body.getReader
    ? upstreamRes.body.getReader()
    : null;

  if (!reader) {
    const text = await upstreamRes.text();
    return res.send(text);
  }

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value) {
      res.write(Buffer.from(value));
    }
  }

  return res.end();
}

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
  const shouldStream = req.query && req.query.stream === "1";

  if (!API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const upstreamRes = await fetch(buildUpstreamUrl(UPSTREAM_URL, API_KEY, shouldStream), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    res.status(upstreamRes.status);

    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    if (shouldStream && upstreamRes.ok) {
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      if (res.flushHeaders) {
        res.flushHeaders();
      }
      return pipeStreamToResponse(upstreamRes, res);
    }

    const text = await upstreamRes.text();
    return res.send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Proxy request failed" });
  }
};
