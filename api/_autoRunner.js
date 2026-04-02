const { buildRefreshPrompt } = require('./_autoPrompt');
const { requestGeminiText } = require('./_geminiClient');
const {
  MAX_RECENT_RUNS,
  MAX_RUN_HISTORY,
  createId,
  getEntries,
  getRunHistory,
  isEntryDue,
  normalizeEntry,
  normalizeRunHistoryItem,
  saveEntries,
  saveRunHistory,
} = require('./_autoStorage');
const { acquireLock, releaseLock } = require('./_redis');

const ALL_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

function getPreferredModelForEntry(entryId) {
  const hash = entryId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ALL_MODELS[hash % ALL_MODELS.length];
}

const RETRY_COOLDOWN_MS = 5 * 60 * 1000;

function splitComments(fullText) {
  return String(fullText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizeModelMeta(meta) {
  return {
    modelUsed: String(meta?.modelUsed || '').trim(),
    primaryModel: String(meta?.primaryModel || '').trim(),
    fallbackUsed: Boolean(meta?.fallbackUsed),
    attemptedModels: Array.isArray(meta?.attemptedModels)
      ? meta.attemptedModels.map((model) => String(model || '').trim()).filter(Boolean)
      : [],
  };
}

async function runEntryById(entryId, { triggeredBy = 'manual' } = {}) {
  const entryLockName = `entry:${entryId}`;
  const lockToken = await acquireLock(entryLockName, 300);

  if (!lockToken) {
    return {
      ok: false,
      status: 409,
      message: 'Mẫu này đang được xử lý bởi một tiến trình khác.',
    };
  }

  const startedAt = Date.now();

  try {
    const entries = await getEntries();
    const entry = entries.find((item) => item.id === entryId);

    if (!entry) {
      return {
        ok: false,
        status: 404,
        message: 'Không tìm thấy mẫu auto cần chạy.',
      };
    }

    const runningEntries = await saveEntries(
      entries.map((item) =>
        item.id === entryId
          ? normalizeEntry({
              ...item,
              lastStatus: 'running',
              lastAttemptAt: startedAt,
              lastError: '',
              retryAfterAt: 0,
            })
          : item,
      ),
    );

    const runningEntry = runningEntries.find((item) => item.id === entryId) || entry;
    const prompt = buildRefreshPrompt(
      runningEntry.flowType,
      runningEntry.lessonDescription,
      runningEntry.promptConfig,
      startedAt,
    );
    const preferredModel = getPreferredModelForEntry(entryId);
    const { text, meta } = await requestGeminiText(prompt, preferredModel);
    const modelMeta = normalizeModelMeta(meta);

    if (!String(text || '').trim()) {
      throw new Error('Gemini trả về nội dung rỗng cho mẫu auto này.');
    }

    const comments = runningEntry.flowType === 'flow2' ? text : splitComments(text);
    const runItem = normalizeRunHistoryItem({
      id: createId('run'),
      entryId: runningEntry.id,
      lessonPreview: runningEntry.lessonPreview,
      flowType: runningEntry.flowType,
      lessonDescription: runningEntry.lessonDescription,
      comments,
      timestamp: startedAt,
      ...modelMeta,
    });

    const runHistory = await getRunHistory();
    const nextRunHistory = await saveRunHistory([runItem, ...runHistory].slice(0, MAX_RUN_HISTORY));

    const latestEntries = await getEntries();
    const nextEntries = await saveEntries(
      latestEntries.map((item) =>
        item.id === entryId
          ? normalizeEntry({
              ...item,
              updatedAt: startedAt,
              scheduleAnchorAt: startedAt,
              lastGeneratedAt: startedAt,
              lastStatus: 'success',
              lastError: '',
              retryAfterAt: 0,
              runCount: (item.runCount || 0) + 1,
              recentRuns: [
                {
                  timestamp: startedAt,
                  status: 'success',
                  autoRunId: runItem.id,
                  triggeredBy,
                  ...modelMeta,
                },
                ...(Array.isArray(item.recentRuns) ? item.recentRuns : []),
              ].slice(0, MAX_RECENT_RUNS),
            })
          : item,
      ),
    );

    return {
      ok: true,
      status: 200,
      entry: nextEntries.find((item) => item.id === entryId) || runningEntry,
      runItem,
      state: {
        entries: nextEntries,
        runHistory: nextRunHistory,
      },
      meta,
    };
  } catch (error) {
    const latestEntries = await getEntries();
    const failedEntries = await saveEntries(
      latestEntries.map((item) =>
        item.id === entryId
          ? normalizeEntry({
              ...item,
              lastStatus: 'error',
              lastError: error.message || 'Không thể gọi Gemini',
              retryAfterAt: Date.now() + RETRY_COOLDOWN_MS,
              recentRuns: [
                {
                  timestamp: startedAt,
                  status: 'error',
                  error: error.message || 'Không có chi tiết lỗi',
                  triggeredBy,
                },
                ...(Array.isArray(item.recentRuns) ? item.recentRuns : []),
              ].slice(0, MAX_RECENT_RUNS),
            })
          : item,
      ),
    );

    return {
      ok: false,
      status: error.status || 500,
      message: error.message || 'Không thể chạy auto refresh',
      state: {
        entries: failedEntries,
        runHistory: await getRunHistory(),
      },
    };
  } finally {
    await releaseLock(entryLockName, lockToken);
  }
}

async function runDueEntries() {
  const cronLockToken = await acquireLock('cron:auto-refresh', 900);

  if (!cronLockToken) {
    return {
      ok: true,
      skipped: true,
      reason: 'locked',
      message: 'Cron đang được xử lý bởi một instance khác.',
      state: {
        entries: await getEntries(),
        runHistory: await getRunHistory(),
      },
    };
  }

  try {
    const entries = await getEntries();
    const dueEntries = entries.filter((entry) => isEntryDue(entry));
    const results = [];

    for (const entry of dueEntries) {
      const result = await runEntryById(entry.id, { triggeredBy: 'cron' });
      results.push({
        entryId: entry.id,
        lessonPreview: entry.lessonPreview,
        ok: result.ok,
        status: result.status,
        message: result.ok ? 'success' : result.message,
      });
    }

    return {
      ok: true,
      skipped: false,
      dueCount: dueEntries.length,
      processedCount: results.filter((item) => item.ok).length,
      failedCount: results.filter((item) => !item.ok).length,
      results,
      state: {
        entries: await getEntries(),
        runHistory: await getRunHistory(),
      },
    };
  } finally {
    await releaseLock('cron:auto-refresh', cronLockToken);
  }
}

module.exports = {
  runDueEntries,
  runEntryById,
};
