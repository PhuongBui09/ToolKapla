// Vercel serverless function to proxy Gemini requests server-side.
// Expects environment variables: GEMINI_API_URL and GEMINI_API_KEY

const DEFAULT_UPSTREAM_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";
// Giữ Gemini 3 Flash làm model chính. Danh sách mặc định chỉ dùng các fallback miễn phí còn an toàn hơn.
const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];
const QUOTA_COOLDOWN_MS = 30 * 1000;
const MISSING_MODEL_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const modelCooldowns = new Map();

function parseModelFromUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    const match = url.pathname.match(/\/models\/([^/:]+)(?::[^/]+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function buildUpstreamUrl(baseUrl, apiKey, shouldStream, modelName) {
  const url = new URL(baseUrl);
  const action = shouldStream ? "streamGenerateContent" : "generateContent";
  const match = url.pathname.match(/^(.*\/models\/)([^/:]+)(?::[^/]+)?$/);

  if (match) {
    const selectedModel = modelName || match[2];
    url.pathname = `${match[1]}${selectedModel}:${action}`;
  } else {
    url.pathname = shouldStream
      ? url.pathname.replace(":generateContent", ":streamGenerateContent")
      : url.pathname.replace(":streamGenerateContent", ":generateContent");
  }

  url.searchParams.set("key", apiKey);

  if (shouldStream) {
    url.searchParams.set("alt", "sse");
  } else {
    url.searchParams.delete("alt");
  }

  return url.toString();
}

function parseModelList(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueModels(models) {
  return [...new Set(models.filter(Boolean))];
}

function getCandidateModels(baseUrl) {
  const primaryModel = parseModelFromUrl(baseUrl) || "gemini-3-flash-preview";
  const configuredFallbacks = parseModelList(process.env.GEMINI_FALLBACK_MODELS);
  const fallbackModels = configuredFallbacks.length
    ? configuredFallbacks
    : DEFAULT_FALLBACK_MODELS;
  const preferredModels = uniqueModels([primaryModel, ...fallbackModels]);
  const now = Date.now();
  const readyModels = [];
  const coolingModels = [];

  preferredModels.forEach((modelName) => {
    const cooldownUntil = modelCooldowns.get(modelName) || 0;

    if (cooldownUntil > now) {
      coolingModels.push({ modelName, cooldownUntil });
      return;
    }

    readyModels.push(modelName);
  });

  coolingModels.sort((a, b) => a.cooldownUntil - b.cooldownUntil);

  return {
    primaryModel,
    models: [
      ...readyModels,
      ...coolingModels.map((entry) => entry.modelName),
    ],
  };
}

function parseJsonSafely(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseRetryDelayMs(retryDelay) {
  if (typeof retryDelay !== "string") {
    return null;
  }

  const match = retryDelay.trim().match(/^([\d.]+)s$/i);
  if (!match) {
    return null;
  }

  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null;
}

function classifyGeminiFailure(statusCode, errorText) {
  const payload = parseJsonSafely(errorText);
  const apiError = payload && payload.error ? payload.error : null;
  const details = Array.isArray(apiError && apiError.details) ? apiError.details : [];
  const retryInfo = details.find(
    (detail) => detail && detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
  );
  const apiStatus = apiError && apiError.status ? apiError.status : "";
  const normalizedMessage = String(apiError && apiError.message ? apiError.message : errorText || "");
  const normalizedMessageLower = normalizedMessage.toLowerCase();
  const isQuotaError =
    statusCode === 429 ||
    apiStatus === "RESOURCE_EXHAUSTED" ||
    normalizedMessage.includes("Quota exceeded");
  const isMissingModel =
    statusCode === 404 || apiStatus === "NOT_FOUND" || normalizedMessageLower.includes("not found");

  return {
    payload,
    apiStatus,
    retryDelayMs: parseRetryDelayMs(retryInfo && retryInfo.retryDelay),
    shouldTryNextModel: isQuotaError || isMissingModel,
    cooldownMs: isQuotaError
      ? parseRetryDelayMs(retryInfo && retryInfo.retryDelay) || QUOTA_COOLDOWN_MS
      : isMissingModel
        ? MISSING_MODEL_COOLDOWN_MS
        : 0,
  };
}

function setModelCooldown(modelName, cooldownMs) {
  if (!modelName || !Number.isFinite(cooldownMs) || cooldownMs <= 0) {
    return;
  }

  modelCooldowns.set(modelName, Date.now() + cooldownMs);
}

async function fetchWithModelFallback({
  baseUrl,
  apiKey,
  shouldStream,
  requestBody,
}) {
  const { primaryModel, models } = getCandidateModels(baseUrl);
  let lastFailure = null;

  for (let index = 0; index < models.length; index += 1) {
    const modelName = models[index];
    const upstreamUrl = buildUpstreamUrl(baseUrl, apiKey, shouldStream, modelName);
    let upstreamRes;

    try {
      upstreamRes = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (err) {
      throw err;
    }

    if (upstreamRes.ok) {
      return {
        ok: true,
        upstreamRes,
        modelName,
        primaryModel,
        attemptedModels: models.slice(0, index + 1),
      };
    }

    const errorText = await upstreamRes.text();
    const failure = classifyGeminiFailure(upstreamRes.status, errorText);
    lastFailure = {
      status: upstreamRes.status,
      text: errorText,
      contentType: upstreamRes.headers.get("content-type"),
      modelName,
      primaryModel,
      attemptedModels: models.slice(0, index + 1),
      shouldTryNextModel: failure.shouldTryNextModel,
    };

    if (failure.cooldownMs > 0) {
      setModelCooldown(modelName, failure.cooldownMs);
    }

    const hasNextModel = index < models.length - 1;
    if (!failure.shouldTryNextModel || !hasNextModel) {
      return {
        ok: false,
        failure: lastFailure,
      };
    }

    console.warn(
      `[Gemini proxy] ${modelName} failed with ${upstreamRes.status}. Trying next fallback model.`,
    );
  }

  return {
    ok: false,
    failure: lastFailure,
  };
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
    DEFAULT_UPSTREAM_URL;
  const API_KEY = process.env.GEMINI_API_KEY;
  const shouldStream = req.query && req.query.stream === "1";

  if (!API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const result = await fetchWithModelFallback({
      baseUrl: UPSTREAM_URL,
      apiKey: API_KEY,
      shouldStream,
      requestBody: req.body,
    });

    if (!result.ok) {
      const { failure } = result;
      res.setHeader("X-Gemini-Model-Used", failure.modelName || "");
      res.setHeader("X-Gemini-Primary-Model", failure.primaryModel || "");
      res.setHeader("X-Gemini-Model-Fallback", String(failure.modelName !== failure.primaryModel));
      res.setHeader("X-Gemini-Model-Attempts", (failure.attemptedModels || []).join(","));
      if (failure.contentType) {
        res.setHeader("Content-Type", failure.contentType);
      }
      return res.status(failure.status || 500).send(failure.text || "");
    }

    const { upstreamRes, modelName, primaryModel, attemptedModels } = result;
    const fallbackUsed = modelName !== primaryModel;
    res.setHeader("X-Gemini-Model-Used", modelName);
    res.setHeader("X-Gemini-Primary-Model", primaryModel);
    res.setHeader("X-Gemini-Model-Fallback", String(fallbackUsed));
    res.setHeader("X-Gemini-Model-Attempts", attemptedModels.join(","));
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
