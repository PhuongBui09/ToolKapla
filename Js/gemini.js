import { buildPrompt } from "./aiPrompt.js";

const API_BASE = window.BACKEND_URL || ""; // set window.BACKEND_URL to your Vercel URL when hosting frontend on GitHub
const STORAGE_KEY = "toolkapla_comments_history";
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Cache để lưu comments khi lesson trùng nhau
const commentCache = new Map();

/**
 * Lấy preview (câu đầu) từ lesson description
 */
export function getLessonPreview(lessonText) {
  return lessonText
    .split("\n")[0]
    .trim()
    .substring(0, 100)
    .concat(lessonText.length > 100 ? "..." : "");
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
    console.error("Lỗi khi đọc history:", e);
    return [];
  }
}

/**
 * Lưu nhận xét vào localStorage
 */
export function saveCommentToHistory(lessonText, comments) {
  try {
    const preview = getLessonPreview(lessonText);
    const history = getCommentHistory();

    // Thêm item mới lên đầu
    history.unshift({
      id: Date.now(),
      lessonPreview: preview,
      comments,
      timestamp: Date.now(),
    });

    // Giới hạn tối đa 50 items
    if (history.length > 50) {
      history.pop();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Lỗi khi lưu history:", e);
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
    console.error("Lỗi khi xóa history:", e);
    return [];
  }
}

export async function generateCommentsFromGemini(
  lessonText,
  onCommentReceived
) {
  // Kiểm tra cache
  const cacheKey = lessonText.trim();
  if (commentCache.has(cacheKey)) {
    const cachedComments = commentCache.get(cacheKey);
    if (onCommentReceived) {
      cachedComments.forEach((comment) => onCommentReceived(comment));
    }
    return cachedComments.join("\n");
  }

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
  const fullText = data.candidates[0].content.parts[0].text;

  // Tách nhận xét theo dòng và gọi callback cho mỗi cái (streaming effect)
  const comments = fullText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Cache kết quả
  commentCache.set(cacheKey, comments);

  // Lưu vào localStorage
  saveCommentToHistory(lessonText, comments);

  // Gọi callback để hiển thị từng nhận xét
  if (onCommentReceived) {
    comments.forEach((comment) => onCommentReceived(comment));
  }

  return fullText;
}
