import { buildPromptWithConfig, buildDefaultPrompt } from "./promptBuilder.js";
import { loadConfig } from "./promptConfig.js";

/**
 * Build prompt mặc định (giữ nguyên for backward compatibility)
 * Dùng khi chưa có config từ user
 */
export function buildPrompt(lessonContent) {
  return buildDefaultPrompt(lessonContent);
}

/**
 * Build prompt với cấu hình từ user
 */
export function buildPromptWithUserConfig(lessonContent) {
  const config = loadConfig();
  return buildPromptWithConfig(lessonContent, config);
}
