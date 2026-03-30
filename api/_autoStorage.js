const { DEFAULT_PROMPT_CONFIG, normalizePromptConfig } = require('./_autoPrompt');
const { getJson, setJson } = require('./_redis');

const ENTRIES_KEY = 'auto:entries';
const RUN_HISTORY_KEY = 'auto:runs';
const AUTO_REFRESH_MS = 48 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECENT_RUNS = 8;
const MAX_RUN_HISTORY = 50;

function createId(prefix = 'auto') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRecentRun(item) {
  return {
    timestamp: Number(item?.timestamp) || Date.now(),
    status: item?.status === 'error' ? 'error' : 'success',
    error: item?.status === 'error' ? String(item?.error || '') : '',
    autoRunId: item?.autoRunId || null,
    triggeredBy: item?.triggeredBy === 'cron' ? 'cron' : 'manual',
    modelUsed: String(item?.modelUsed || '').trim(),
    primaryModel: String(item?.primaryModel || '').trim(),
    fallbackUsed: Boolean(item?.fallbackUsed),
    attemptedModels: Array.isArray(item?.attemptedModels)
      ? item.attemptedModels.map((model) => String(model || '').trim()).filter(Boolean)
      : [],
  };
}

function normalizeEntry(entry) {
  const now = Date.now();
  const createdAt = Number(entry?.createdAt) || now;
  const updatedAt = Number(entry?.updatedAt) || createdAt;
  const scheduleAnchorAt = Number(entry?.scheduleAnchorAt) || updatedAt;

  return {
    id: entry?.id || createId('entry'),
    lessonPreview: String(entry?.lessonPreview || '').trim(),
    flowType: entry?.flowType === 'flow2' ? 'flow2' : 'flow1',
    lessonDescription: String(entry?.lessonDescription || '').trim(),
    promptConfig: normalizePromptConfig(entry?.promptConfig || DEFAULT_PROMPT_CONFIG),
    createdAt,
    updatedAt,
    scheduleAnchorAt,
    lastGeneratedAt: Number(entry?.lastGeneratedAt) || null,
    lastAttemptAt: Number(entry?.lastAttemptAt) || null,
    lastStatus: entry?.lastStatus || 'idle',
    lastError: entry?.lastError || '',
    retryAfterAt: Number(entry?.retryAfterAt) || 0,
    runCount: Number(entry?.runCount) || 0,
    recentRuns: Array.isArray(entry?.recentRuns)
      ? entry.recentRuns.slice(0, MAX_RECENT_RUNS).map(normalizeRecentRun)
      : [],
  };
}

function normalizeRunHistoryItem(item) {
  const timestamp = Number(item?.timestamp) || Date.now();

  return {
    id: item?.id || createId('run'),
    entryId: item?.entryId || null,
    lessonPreview: String(item?.lessonPreview || '').trim(),
    flowType: item?.flowType === 'flow2' ? 'flow2' : 'flow1',
    lessonDescription: String(item?.lessonDescription || '').trim(),
    comments: item?.comments ?? '',
    timestamp,
    source: 'auto-refresh',
    modelUsed: String(item?.modelUsed || '').trim(),
    primaryModel: String(item?.primaryModel || '').trim(),
    fallbackUsed: Boolean(item?.fallbackUsed),
    attemptedModels: Array.isArray(item?.attemptedModels)
      ? item.attemptedModels.map((model) => String(model || '').trim()).filter(Boolean)
      : [],
  };
}

function getNextRunAt(entry) {
  return (entry.scheduleAnchorAt || entry.updatedAt || entry.createdAt) + AUTO_REFRESH_MS;
}

function isEntryDue(entry, now = Date.now()) {
  if (entry.lastStatus === 'running') {
    return false;
  }

  return now >= getNextRunAt(entry) && now >= (Number(entry.retryAfterAt) || 0);
}

async function getEntries() {
  const entries = (await getJson(ENTRIES_KEY, [])).map(normalizeEntry);
  return entries.sort((left, right) => right.updatedAt - left.updatedAt);
}

async function saveEntries(entries) {
  const normalizedEntries = entries.map(normalizeEntry).sort((left, right) => right.updatedAt - left.updatedAt);
  await setJson(ENTRIES_KEY, normalizedEntries);
  return normalizedEntries;
}

async function getRunHistory() {
  const now = Date.now();
  const rawRunHistory = await getJson(RUN_HISTORY_KEY, []);
  const runHistory = rawRunHistory
    .map(normalizeRunHistoryItem)
    .filter((item) => now - item.timestamp < ONE_MONTH_MS)
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, MAX_RUN_HISTORY);

  if (JSON.stringify(rawRunHistory) !== JSON.stringify(runHistory)) {
    await setJson(RUN_HISTORY_KEY, runHistory);
  }

  return runHistory;
}

async function saveRunHistory(runHistory) {
  const normalizedRunHistory = runHistory
    .map(normalizeRunHistoryItem)
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, MAX_RUN_HISTORY);

  await setJson(RUN_HISTORY_KEY, normalizedRunHistory);
  return normalizedRunHistory;
}

async function getState() {
  const [entries, runHistory] = await Promise.all([getEntries(), getRunHistory()]);
  return { entries, runHistory };
}

async function upsertEntry(payload) {
  const lessonPreview = String(payload?.lessonPreview || '').trim();
  const lessonDescription = String(payload?.lessonDescription || '').trim();

  if (!lessonPreview || !lessonDescription) {
    throw new Error('Thiếu lessonPreview hoặc lessonDescription');
  }

  const flowType = payload?.flowType === 'flow2' ? 'flow2' : 'flow1';
  const promptConfig = normalizePromptConfig(payload?.promptConfig || DEFAULT_PROMPT_CONFIG);
  const now = Date.now();
  const existingId = String(payload?.id || '').trim();
  const entries = await getEntries();
  let savedEntry = null;
  let nextEntries;

  if (existingId) {
    nextEntries = entries.map((entry) => {
      if (entry.id !== existingId) {
        return entry;
      }

      savedEntry = normalizeEntry({
        ...entry,
        lessonPreview,
        flowType,
        lessonDescription,
        promptConfig,
        updatedAt: now,
        scheduleAnchorAt: now,
        lastError: '',
        retryAfterAt: 0,
        lastStatus: entry.lastStatus === 'running' ? 'running' : 'idle',
      });

      return savedEntry;
    });

    if (!savedEntry) {
      throw new Error('Không tìm thấy mẫu auto cần cập nhật');
    }
  } else {
    savedEntry = normalizeEntry({
      id: createId('entry'),
      lessonPreview,
      flowType,
      lessonDescription,
      promptConfig,
      createdAt: now,
      updatedAt: now,
      scheduleAnchorAt: now,
      lastStatus: 'idle',
    });
    nextEntries = [savedEntry, ...entries];
  }

  const persistedEntries = await saveEntries(nextEntries);
  return {
    entry: persistedEntries.find((item) => item.id === savedEntry.id) || savedEntry,
    state: {
      entries: persistedEntries,
      runHistory: await getRunHistory(),
    },
  };
}

async function deleteEntry(entryId) {
  const entries = await getEntries();
  const nextEntries = entries.filter((entry) => entry.id !== entryId);
  await saveEntries(nextEntries);
  return {
    state: {
      entries: nextEntries,
      runHistory: await getRunHistory(),
    },
  };
}

async function deleteRunHistoryItem(runId) {
  const runHistory = await getRunHistory();
  const nextRunHistory = runHistory.filter((item) => item.id !== runId);
  await saveRunHistory(nextRunHistory);
  return {
    state: {
      entries: await getEntries(),
      runHistory: nextRunHistory,
    },
  };
}

async function mergeLegacyState({ entries = [], runHistory = [] } = {}) {
  const existingEntries = await getEntries();
  const existingRunHistory = await getRunHistory();
  const entryMap = new Map(existingEntries.map((item) => [item.id, normalizeEntry(item)]));
  const runHistoryMap = new Map(existingRunHistory.map((item) => [item.id, normalizeRunHistoryItem(item)]));

  entries
    .map(normalizeEntry)
    .forEach((entry) => {
      const current = entryMap.get(entry.id);
      if (!current || entry.updatedAt > current.updatedAt) {
        entryMap.set(entry.id, entry);
      }
    });

  runHistory
    .map(normalizeRunHistoryItem)
    .forEach((item) => {
      const current = runHistoryMap.get(item.id);
      if (!current || item.timestamp > current.timestamp) {
        runHistoryMap.set(item.id, item);
      }
    });

  const mergedEntries = await saveEntries([...entryMap.values()]);
  const mergedRunHistory = await saveRunHistory([...runHistoryMap.values()]);

  return {
    importedEntries: Math.max(0, mergedEntries.length - existingEntries.length),
    importedRuns: Math.max(0, mergedRunHistory.length - existingRunHistory.length),
    state: {
      entries: mergedEntries,
      runHistory: mergedRunHistory,
    },
  };
}

module.exports = {
  AUTO_REFRESH_MS,
  MAX_RECENT_RUNS,
  MAX_RUN_HISTORY,
  createId,
  deleteEntry,
  deleteRunHistoryItem,
  getEntries,
  getNextRunAt,
  getRunHistory,
  getState,
  isEntryDue,
  mergeLegacyState,
  normalizeEntry,
  normalizeRunHistoryItem,
  saveEntries,
  saveRunHistory,
  upsertEntry,
};
