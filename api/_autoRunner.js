const { buildRefreshPrompt } = require('./_autoPrompt');
const { requestGeminiText } = require('./_geminiClient');
const {
    MAX_RECENT_RUNS,
    MAX_RUN_HISTORY,
    createId,
    getEntries,
    getNextRunAt,
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
const DEFAULT_DUE_BATCH_SIZE = 3;
const MAX_DUE_BATCH_SIZE = 20;

function parsePositiveInt(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
    const parsed = Number.parseInt(String(value || ''), 10);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
}

function getDueBatchSize() {
    return parsePositiveInt(process.env.AUTO_DUE_BATCH_SIZE, DEFAULT_DUE_BATCH_SIZE, {
        min: 1,
        max: MAX_DUE_BATCH_SIZE,
    });
}

function getEntryActionAt(entry) {
    const retryAfterAt = Number(entry?.retryAfterAt) || 0;
    return retryAfterAt > 0 ? retryAfterAt : getNextRunAt(entry);
}

function compareDueEntries(left, right) {
    return (
        getEntryActionAt(left) - getEntryActionAt(right) ||
        (left.updatedAt || 0) - (right.updatedAt || 0) ||
        String(left.id || '').localeCompare(String(right.id || ''))
    );
}

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
        // Remove old runs for this entryId to keep only the latest per entry
        const filteredRunHistory = runHistory.filter((run) => run.entryId !== runningEntry.id);
        const nextRunHistory = await saveRunHistory(
            [runItem, ...filteredRunHistory].slice(0, MAX_RUN_HISTORY),
        );

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

async function runDueEntries({ maxToProcess = getDueBatchSize() } = {}) {
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
        const dueEntries = entries.filter((entry) => isEntryDue(entry)).sort(compareDueEntries);
        const scheduledEntries = dueEntries.slice(0, maxToProcess);
        const results = [];

        for (const entry of scheduledEntries) {
            const result = await runEntryById(entry.id, { triggeredBy: 'cron' });
            results.push({
                entryId: entry.id,
                lessonPreview: entry.lessonPreview,
                ok: result.ok,
                status: result.status,
                message: result.ok ? 'success' : result.message,
            });
        }

        const latestEntries = await getEntries();
        const latestRunHistory = await getRunHistory();
        const remainingDueCount = latestEntries.filter((entry) => isEntryDue(entry)).length;

        return {
            ok: true,
            skipped: false,
            dueCount: dueEntries.length,
            scheduledCount: scheduledEntries.length,
            batchSize: maxToProcess,
            processedCount: results.filter((item) => item.ok).length,
            failedCount: results.filter((item) => !item.ok).length,
            remainingDueCount,
            results,
            state: {
                entries: latestEntries,
                runHistory: latestRunHistory,
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
