/**
 * promptConfig.js
 * Quản lý cấu hình prompt và lưu vào localStorage
 */

const CONFIG_STORAGE_KEY = "toolkapla_prompt_config";

// Cấu hình mặc định
export const DEFAULT_CONFIG = {
  numComments: 20,
  includeAllObjectives: true, // Bắt buộc bao gồm tất cả mục tiêu
  commentVariety: "medium", // 'low' | 'medium'
  commentLength: "1-2", // '1-2' | '2-3'
  tone: "pedagogical", // 'pedagogical' | 'neutral' | 'friendly'
  allowEmoji: false,
  banGenericWords: true,
};

/**
 * Lấy cấu hình từ localStorage
 */
export function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const config = JSON.parse(saved);
      // Merge với default để đảm bảo không thiếu property
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (e) {
    console.error("Lỗi khi đọc config:", e);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Lưu cấu hình vào localStorage
 */
export function saveConfig(config) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error("Lỗi khi lưu config:", e);
    return false;
  }
}

/**
 * Reset cấu hình về mặc định
 */
export function resetConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  return { ...DEFAULT_CONFIG };
}

/**
 * Cập nhật một property trong config
 */
export function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = { ...config, ...updates };
  saveConfig(newConfig);
  return newConfig;
}
