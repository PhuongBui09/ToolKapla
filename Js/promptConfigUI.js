/**
 * promptConfigUI.js
 * Quản lý UI cấu hình prompt
 */

import {
  loadConfig,
  saveConfig,
  resetConfig,
  DEFAULT_CONFIG,
} from "./promptConfig.js";
import { Toast } from "./toast.js";

/**
 * Khởi tạo UI cấu hình prompt
 */
export function initPromptConfigUI() {
  const config = loadConfig();
  populateConfigUI(config);
  setupEventListeners();
}

/**
 * Điền config vào UI
 */
function populateConfigUI(config) {
  // Bắt buộc mỗi nhận xét phải bao gồm tất cả mục tiêu
  document.getElementById("configIncludeAllObjectives").checked =
    config.includeAllObjectives;

  // Mức độ khác biệt
  document.getElementById("configCommentVariety").value = config.commentVariety;

  // Độ dài nhận xét
  document.getElementById("configCommentLength").value = config.commentLength;

  // Giọng văn
  document.getElementById("configTone").value = config.tone;

  // Cho phép emoji
  document.getElementById("configAllowEmoji").checked = config.allowEmoji;

  // Cấm từ chung chung
  document.getElementById("configBanGenericWords").checked =
    config.banGenericWords;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Lưu khi thay đổi bắt buộc mục tiêu
  document
    .getElementById("configIncludeAllObjectives")
    .addEventListener("change", (e) => {
      saveConfig({ includeAllObjectives: e.target.checked });
      Toast.show(
        e.target.checked
          ? "✓ Mỗi nhận xét phải bao gồm TẤT CẢ mục tiêu"
          : "✓ Cấu hình đã thay đổi",
        "success"
      );
    });

  // Lưu khi thay đổi mức độ khác biệt
  document
    .getElementById("configCommentVariety")
    .addEventListener("change", (e) => {
      saveConfig({ commentVariety: e.target.value });
      Toast.show("✓ Đã lưu mức độ khác biệt", "success");
    });

  // Lưu khi thay đổi độ dài
  document
    .getElementById("configCommentLength")
    .addEventListener("change", (e) => {
      saveConfig({ commentLength: e.target.value });
      Toast.show("✓ Đã lưu độ dài nhận xét", "success");
    });

  // Lưu khi thay đổi giọng văn
  document.getElementById("configTone").addEventListener("change", (e) => {
    saveConfig({ tone: e.target.value });
    Toast.show("✓ Đã lưu giọng văn", "success");
  });

  // Lưu khi thay đổi cho phép emoji
  document
    .getElementById("configAllowEmoji")
    .addEventListener("change", (e) => {
      saveConfig({ allowEmoji: e.target.checked });
      Toast.show(
        e.target.checked ? "✓ Cho phép sử dụng emoji" : "✓ Không sử dụng emoji",
        "success"
      );
    });

  // Lưu khi thay đổi cấm từ chung chung
  document
    .getElementById("configBanGenericWords")
    .addEventListener("change", (e) => {
      saveConfig({ banGenericWords: e.target.checked });
      Toast.show(
        e.target.checked
          ? "✓ Cấm các từ chung chung"
          : "✓ Cho phép các từ chung chung",
        "success"
      );
    });

  // Nút khôi phục mặc định
  document.getElementById("resetConfigBtn").addEventListener("click", () => {
    if (
      confirm(
        "Bạn chắc chắn muốn khôi phục cấu hình mặc định? Tất cả thay đổi sẽ bị xóa."
      )
    ) {
      resetConfig();
      populateConfigUI(DEFAULT_CONFIG);
      Toast.show("✓ Đã khôi phục cấu hình mặc định!", "success");
    }
  });
}

/**
 * Lấy cấu hình hiện tại từ UI (không lưu)
 */
export function getConfigFromUI() {
  return {
    includeAllObjectives: document.getElementById("configIncludeAllObjectives")
      .checked,
    commentVariety: document.getElementById("configCommentVariety").value,
    commentLength: document.getElementById("configCommentLength").value,
    tone: document.getElementById("configTone").value,
    allowEmoji: document.getElementById("configAllowEmoji").checked,
    banGenericWords: document.getElementById("configBanGenericWords").checked,
  };
}
