import { buildPrompt, buildPromptWithUserConfig } from './aiPrompt.js';

const API_BASE = window.BACKEND_URL || ''; // set window.BACKEND_URL to your Vercel URL when hosting frontend on GitHub
const STORAGE_KEY = 'toolkapla_comments_history';
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

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
export function saveCommentToHistory(lessonText, comments, originalLesson = null) {
    try {
        // Nếu là Flow 2 (có originalLesson), dùng originalLesson để lưu mô tả
        // Nếu là Flow 1 (không có originalLesson), dùng lessonText
        const descriptionToSave = originalLesson || lessonText;
        const preview = getLessonPreview(descriptionToSave);
        const history = getCommentHistory();

        // Xác định flow type: Flow 2 nếu comments là string, Flow 1 nếu array
        const flowType = typeof comments === 'string' ? 'flow2' : 'flow1';

        // Thêm item mới lên đầu
        history.unshift({
            id: Date.now(),
            flowType,
            lessonPreview: preview,
            lessonDescription: descriptionToSave,
            comments,
            timestamp: Date.now(),
        });

        // Giới hạn tối đa 50 items
        if (history.length > 50) {
            history.pop();
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Lỗi khi lưu history:', e);
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

export async function generateCommentsFromGemini(
    lessonText,
    onCommentReceived,
    isJSONMode = false,
    originalLesson = null,
) {
    // Kiểm tra cache (chỉ cho mode normal, không cache JSON mode)
    if (!isJSONMode) {
        const cacheKey = lessonText.trim();
        if (commentCache.has(cacheKey)) {
            const cachedComments = commentCache.get(cacheKey);
            if (onCommentReceived) {
                cachedComments.forEach((comment) => onCommentReceived(comment));
            }
            return cachedComments.join('\n');
        }
    }

    // Chọn hàm build prompt phù hợp
    // Nếu isJSONMode, lessonText là prompt hoàn chỉnh (từ promptFlow2.js)
    // Nếu không, lessonText là lesson description
    let prompt;
    if (isJSONMode) {
        prompt = lessonText; // Đã là prompt hoàn chỉnh từ buildFlow2Prompt()
    } else {
        prompt = useUserConfig ? buildPromptWithUserConfig(lessonText) : buildPrompt(lessonText);
    }

    const res = await fetch(`${API_BASE}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                {
                    parts: [{ text: prompt }],
                },
            ],
        }),
    });

    if (!res.ok) {
        throw new Error('Gọi Gemini thất bại');
    }

    const data = await res.json();
    const fullText = data.candidates[0].content.parts[0].text;

    // Nếu là JSON mode, trả về JSON string, gọi callback 1 lần với toàn bộ kết quả
    if (isJSONMode) {
        // Lưu vào localStorage cho Flow 2 (lưu fullText là chuỗi JSON chứa COMMENT_BANK)
        saveCommentToHistory(lessonText, fullText, originalLesson);
        if (onCommentReceived) {
            onCommentReceived(fullText);
        }
        return fullText;
    }

    // Tách nhận xét theo dòng và gọi callback cho mỗi cái (streaming effect)
    const comments = fullText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    // Cache kết quả (chỉ mode normal)
    const cacheKey = lessonText.trim();
    commentCache.set(cacheKey, comments);

    // Lưu vào localStorage (truyền originalLesson nếu có)
    saveCommentToHistory(lessonText, comments, originalLesson);

    // Gọi callback để hiển thị từng nhận xét
    if (onCommentReceived) {
        comments.forEach((comment) => onCommentReceived(comment));
    }

    return fullText;
}
