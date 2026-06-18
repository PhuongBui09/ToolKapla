import { buildPrompt, buildPromptWithUserConfig } from './aiPrompt.js';

const API_BASE = window.BACKEND_URL || ''; // set window.BACKEND_URL to your Vercel URL when hosting frontend on GitHub
const STORAGE_KEY = 'toolkapla_comments_history';
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_COMMENT_HISTORY = 200;

// Cache để lưu comments khi lesson trùng nhau
const commentCache = new Map();

/**
 * Flag để xác định có dùng user config hay không
 * Mặc định: false (dùng prompt mặc định)
 */
let useUserConfig = false;

/**
 * Set flag để dùng user config
 */
export function setUseUserConfig(value) {
    useUserConfig = value;
}

/**
 * Lấy preview (câu đầu) từ lesson description
 */
export function getLessonPreview(lessonText) {
    return lessonText
        .split('\n')[0]
        .trim()
        .substring(0, 100)
        .concat(lessonText.length > 100 ? '...' : '');
}

/**
 * Lấy lịch sử nhận xét từ localStorage
 */
export function getCommentHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const history = JSON.parse(data);
        // Lọc bỏ các item cũ hơn 1 tháng
        const now = Date.now();
        return history.filter((item) => now - item.timestamp < ONE_MONTH_MS);
    } catch (e) {
        console.error('Lỗi khi đọc history:', e);
        return [];
    }
}

/**
 * Lưu nhận xét vào localStorage
 */
export function saveCommentToHistory(
    lessonText,
    comments,
    originalLesson = null,
    historyOptions = {},
) {
    try {
        // Nếu là Flow 2 (có originalLesson), dùng originalLesson để lưu mô tả
        // Nếu là Flow 1 (không có originalLesson), dùng lessonText
        const descriptionToSave = originalLesson || lessonText;
        const preview = historyOptions.lessonPreview?.trim() || getLessonPreview(descriptionToSave);
        const history = getCommentHistory();

        // Xác định flow type: Flow 2 nếu comments là string, Flow 1 nếu array
        const flowType = typeof comments === 'string' ? 'flow2' : 'flow1';
        const timestamp = Date.now();
        const historyItem = {
            id: timestamp,
            flowType,
            lessonPreview: preview,
            lessonDescription: descriptionToSave,
            comments: flowType === 'flow2' ? normalizeFlow2Comments(comments) : comments,
            timestamp,
            source: historyOptions.source || 'manual',
            automationId: historyOptions.automationId || null,
            automationLabel: historyOptions.automationLabel || null,
        };

        // Thêm item mới lên đầu
        history.unshift(historyItem);

        // Giới hạn tối đa số item đủ lớn cho kho tự động và lịch sử thủ công.
        if (history.length > MAX_COMMENT_HISTORY) {
            history.splice(MAX_COMMENT_HISTORY);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        return historyItem;
    } catch (e) {
        console.error('Lỗi khi lưu history:', e);
        return null;
    }
}

/**
 * Xóa nhận xét khỏi lịch sử
 */
export function deleteFromHistory(id) {
    try {
        const history = getCommentHistory();
        const filtered = history.filter((item) => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return filtered;
    } catch (e) {
        console.error('Lỗi khi xóa history:', e);
        return [];
    }
}

/**
 * Cập nhật tên hiển thị (lessonPreview) của item trong lịch sử
 */
export function updateHistoryPreview(id, lessonPreview) {
    try {
        const trimmedPreview = lessonPreview.trim();
        if (!trimmedPreview) {
            return getCommentHistory();
        }

        const history = getCommentHistory();
        const updated = history.map((item) =>
            item.id === id ? { ...item, lessonPreview: trimmedPreview } : item,
        );

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    } catch (e) {
        console.error('Lỗi khi cập nhật lessonPreview:', e);
        return getCommentHistory();
    }
}

function buildGeminiRequest(prompt) {
    return {
        contents: [
            {
                parts: [{ text: prompt }],
            },
        ],
    };
}

function extractTextFromGeminiPayload(payload) {
    if (!payload || !Array.isArray(payload.candidates)) {
        return '';
    }

    return payload.candidates
        .flatMap((candidate) => candidate?.content?.parts || [])
        .map((part) => part?.text || '')
        .join('');
}

function splitComments(fullText) {
    return fullText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

function extractJSON(jsonString) {
    let cleaned = String(jsonString || '').trim();

    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    }

    return cleaned;
}

function normalizeFlow2Comments(comments) {
    const rawText = String(comments || '').trim();

    if (!rawText) {
        return '';
    }

    try {
        return JSON.stringify(JSON.parse(extractJSON(rawText)));
    } catch {
        return rawText;
    }
}

function parseRetryDelayMs(retryDelay) {
    if (typeof retryDelay !== 'string') {
        return null;
    }

    const match = retryDelay.trim().match(/^([\d.]+)s$/i);
    if (!match) {
        return null;
    }

    const seconds = Number(match[1]);
    return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null;
}

function formatRetryDelay(retryDelayMs) {
    if (!Number.isFinite(retryDelayMs) || retryDelayMs <= 0) {
        return null;
    }

    const seconds = Math.ceil(retryDelayMs / 1000);
    if (seconds < 60) {
        return `${seconds} giây`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainSeconds = seconds % 60;
    return remainSeconds > 0 ? `${minutes} phút ${remainSeconds} giây` : `${minutes} phút`;
}

function parseGeminiErrorPayload(errorText) {
    if (!errorText) {
        return null;
    }

    try {
        return JSON.parse(errorText);
    } catch {
        return null;
    }
}

function createGeminiApiError(errorText, fallbackMessage, status = null) {
    const payload = parseGeminiErrorPayload(errorText);
    const apiError = payload?.error || null;
    const details = Array.isArray(apiError?.details) ? apiError.details : [];
    const quotaFailure = details.find(
        (detail) => detail?.['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure',
    );
    const retryInfo = details.find(
        (detail) => detail?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo',
    );
    const violation = quotaFailure?.violations?.[0] || null;
    const retryDelayMs = parseRetryDelayMs(retryInfo?.retryDelay);
    const retryDelayText = formatRetryDelay(retryDelayMs);
    const errorCode = apiError?.code || status || null;
    const apiStatus = apiError?.status || null;
    const quotaId = violation?.quotaId || '';
    const quotaValue = violation?.quotaValue || '';
    const quotaModel = violation?.quotaDimensions?.model || '';
    const isQuotaExceeded =
        errorCode === 429 ||
        apiStatus === 'RESOURCE_EXHAUSTED' ||
        quotaId.includes('FreeTier') ||
        quotaId.includes('PerDay');

    let message = apiError?.message?.trim() || errorText || fallbackMessage;

    if (isQuotaExceeded) {
        const quotaParts = [];

        if (quotaValue && quotaModel) {
            quotaParts.push(`Giới hạn hiện tại là ${quotaValue} request cho model ${quotaModel}.`);
        } else if (quotaValue) {
            quotaParts.push(`Giới hạn hiện tại là ${quotaValue} request.`);
        }

        if (quotaId.includes('FreeTier')) {
            quotaParts.push('Đây là quota free tier từ Gemini API.');
        }

        if (retryDelayText) {
            quotaParts.push(`Google gợi ý thử lại sau khoảng ${retryDelayText}.`);
        }

        quotaParts.push('Ứng dụng sẽ không tự gọi lại thêm để tránh tốn quota.');
        message = `Đã vượt quota Gemini hiện tại. ${quotaParts.join(' ')}`.trim();
    }

    const err = new Error(message);
    err.name = 'GeminiApiError';
    err.status = status || errorCode;
    err.errorCode = errorCode;
    err.apiStatus = apiStatus;
    err.retryDelayMs = retryDelayMs;
    err.isQuotaExceeded = isQuotaExceeded;
    err.shouldFallbackToOneShot = !isQuotaExceeded && Boolean(status >= 500);
    err.rawResponse = errorText;
    return err;
}

function createFallbackFriendlyError(message) {
    const err = new Error(message);
    err.shouldFallbackToOneShot = true;
    return err;
}

function shouldFallbackToOneShot(error) {
    return Boolean(error?.shouldFallbackToOneShot);
}

function extractResponseMeta(res) {
    const modelUsed = res.headers.get('X-Gemini-Model-Used') || '';
    const primaryModel = res.headers.get('X-Gemini-Primary-Model') || '';
    const fallbackUsed = res.headers.get('X-Gemini-Model-Fallback') === 'true';
    const attemptedModels = (res.headers.get('X-Gemini-Model-Attempts') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    return {
        modelUsed,
        primaryModel,
        fallbackUsed,
        attemptedModels,
    };
}

function getResponseMetaKey(meta) {
    return JSON.stringify({
        modelUsed: meta?.modelUsed || '',
        primaryModel: meta?.primaryModel || '',
        fallbackUsed: Boolean(meta?.fallbackUsed),
        attemptedModels: Array.isArray(meta?.attemptedModels) ? meta.attemptedModels : [],
    });
}

async function requestGeminiOnce(prompt, onResponseMeta = null) {
    const res = await fetch(`${API_BASE}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGeminiRequest(prompt)),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw createGeminiApiError(errorText, 'Gọi Gemini thất bại', res.status);
    }

    if (onResponseMeta) {
        onResponseMeta(extractResponseMeta(res));
    }

    const data = await res.json();
    return extractTextFromGeminiPayload(data);
}

async function requestGeminiStream(prompt, onTextUpdate, onResponseMeta = null) {
    const res = await fetch(`${API_BASE}/api/gemini?stream=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGeminiRequest(prompt)),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw createGeminiApiError(errorText, 'Gọi Gemini stream thất bại', res.status);
    }

    if (onResponseMeta) {
        onResponseMeta(extractResponseMeta(res));
    }

    if (!res.body) {
        throw createFallbackFriendlyError('Trình duyệt không hỗ trợ stream response');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';
    let fullText = '';

    const consumeSSEBuffer = (flush = false) => {
        const eventBlocks = sseBuffer.split('\n\n');
        if (!flush) {
            sseBuffer = eventBlocks.pop() || '';
        } else {
            sseBuffer = '';
        }

        eventBlocks.forEach((block) => {
            const dataPayload = block
                .split('\n')
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).trimStart())
                .join('\n')
                .trim();

            if (!dataPayload || dataPayload === '[DONE]') {
                return;
            }

            try {
                const parsed = JSON.parse(dataPayload);
                const textChunk = extractTextFromGeminiPayload(parsed);

                if (!textChunk) {
                    return;
                }

                fullText += textChunk;
                if (onTextUpdate) {
                    onTextUpdate(fullText, textChunk);
                }
            } catch (e) {
                console.warn('Bỏ qua 1 stream chunk không parse được:', e);
            }
        });
    };

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        sseBuffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
        consumeSSEBuffer(false);
    }

    sseBuffer += decoder.decode();
    consumeSSEBuffer(true);

    return fullText;
}

export async function generateCommentsFromGemini(
    lessonText,
    {
        onCommentReceived = null,
        onTextUpdate = null,
        onResponseMeta = null,
        onHistorySaved = null,
        isJSONMode = false,
        originalLesson = null,
        isPromptReady = false,
        historyOptions = null,
        persistHistory = true,
    } = {},
) {
    // Kiểm tra cache (chỉ cho mode normal, không cache JSON mode)
    if (!isJSONMode) {
        const cacheKey = lessonText.trim();
        if (commentCache.has(cacheKey)) {
            const cachedComments = commentCache.get(cacheKey);

            if (onTextUpdate) {
                onTextUpdate(cachedComments.join('\n'), cachedComments.join('\n'));
            } else if (onCommentReceived) {
                cachedComments.forEach((comment) => onCommentReceived(comment));
            }

            return cachedComments.join('\n');
        }
    }

    // Chọn hàm build prompt phù hợp
    // Nếu isJSONMode hoặc isPromptReady, lessonText đã là prompt hoàn chỉnh
    // Nếu không, lessonText là lesson description cần build prompt lại
    let prompt;
    if (isJSONMode || isPromptReady) {
        prompt = lessonText;
    } else {
        prompt = useUserConfig ? buildPromptWithUserConfig(lessonText) : buildPrompt(lessonText);
    }
    let fullText = '';

    // Nếu là JSON mode, trả về JSON string, gọi callback 1 lần với toàn bộ kết quả
    if (isJSONMode) {
        let lastResponseMetaKey = null;
        const reportResponseMeta = (meta) => {
            if (!onResponseMeta) {
                return;
            }

            const metaKey = getResponseMetaKey(meta);
            if (metaKey === lastResponseMetaKey) {
                return;
            }

            lastResponseMetaKey = metaKey;
            onResponseMeta(meta);
        };

        fullText = await requestGeminiOnce(prompt, reportResponseMeta);

        // Lưu vào localStorage cho Flow 2 (lưu fullText là chuỗi JSON chứa COMMENT_BANK)
        if (persistHistory) {
            const savedItem = saveCommentToHistory(
                lessonText,
                fullText,
                originalLesson,
                historyOptions || {},
            );
            if (onHistorySaved) {
                onHistorySaved(savedItem);
            }
        }
        if (onCommentReceived) {
            onCommentReceived(fullText);
        }
        return fullText;
    }

    let streamReceivedText = false;
    let lastResponseMetaKey = null;
    const reportResponseMeta = (meta) => {
        if (!onResponseMeta) {
            return;
        }

        const metaKey = getResponseMetaKey(meta);
        if (metaKey === lastResponseMetaKey) {
            return;
        }

        lastResponseMetaKey = metaKey;
        onResponseMeta(meta);
    };

    try {
        fullText = await requestGeminiStream(
            prompt,
            (nextText, textChunk) => {
                streamReceivedText = streamReceivedText || textChunk.length > 0;

                if (onTextUpdate) {
                    onTextUpdate(nextText, textChunk);
                }
            },
            reportResponseMeta,
        );

        if (!fullText.trim()) {
            throw createFallbackFriendlyError('Stream trả về rỗng');
        }
    } catch (e) {
        if (streamReceivedText) {
            throw e;
        }

        if (!shouldFallbackToOneShot(e)) {
            throw e;
        }

        console.warn('Stream không khả dụng, fallback sang one-shot:', e);
        fullText = await requestGeminiOnce(prompt, reportResponseMeta);

        if (onTextUpdate) {
            onTextUpdate(fullText, fullText);
        }
    }

    // Tách nhận xét theo dòng và gọi callback cho mỗi cái
    const comments = splitComments(fullText);

    // Cache kết quả (chỉ mode normal)
    const cacheKey = lessonText.trim();
    commentCache.set(cacheKey, comments);

    // Lưu vào localStorage (truyền originalLesson nếu có)
    if (persistHistory) {
        const savedItem = saveCommentToHistory(
            lessonText,
            comments,
            originalLesson,
            historyOptions || {},
        );
        if (onHistorySaved) {
            onHistorySaved(savedItem);
        }
    }

    // Gọi callback từng nhận xét nếu caller không dùng UI update trực tiếp từ stream
    if (onCommentReceived && !onTextUpdate) {
        comments.forEach((comment) => onCommentReceived(comment));
    }

    return fullText;
}
