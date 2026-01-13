import { Toast } from "./toast.js";
import { ScriptGenerator } from "./scriptGenerator.js";
import { TabManager } from "./tabManager.js";
import {
  generateCommentsFromGemini,
  getCommentHistory,
  deleteFromHistory,
} from "./gemini.js";

const generator = new ScriptGenerator();
let tabManager;

// Hàm để disable buttons khi đang sinh comments
function disableButtons() {
  document.querySelectorAll("button").forEach((btn) => (btn.disabled = true));
  document.getElementById("commentsInput").disabled = true;
}

// Hàm để enable buttons khi hoàn thành
function enableButtons() {
  document.querySelectorAll("button").forEach((btn) => (btn.disabled = false));
  document.getElementById("commentsInput").disabled = false;
}

/**
 * Cập nhật thông tin ở tab "Tạo Script"
 */
function updateScriptTabInfo() {
  // Không cần cập nhật tab này nữa vì đã gộp vào tab 1
}

/**
 * Hiển thị lịch sử nhận xét
 */
function renderHistory() {
  const history = getCommentHistory();
  const container = document.getElementById("historyContainer");
  const emptyMsg = document.getElementById("historyEmpty");

  container.innerHTML = "";

  if (history.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }

  emptyMsg.style.display = "none";

  history.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.style.cssText =
      "padding: 12px; margin: 8px 0; background: rgba(0, 212, 255, 0.1); border: 1.5px solid rgba(0, 212, 255, 0.3); border-radius: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; backdrop-filter: blur(5px);";

    const textDiv = document.createElement("div");
    textDiv.style.cssText = "flex: 1; cursor: pointer;";
    textDiv.innerHTML = `
      <div style="font-weight: 600; color: #00d4ff; font-size: 13px;">${
        item.lessonPreview
      }</div>
      <div style="color: #999; font-size: 12px; margin-top: 4px;">${new Date(
        item.timestamp
      ).toLocaleString("vi-VN")}</div>
    `;

    // Click để load nhận xét và mô tả
    textDiv.addEventListener("click", () => {
      document.getElementById("lessonDescription").value =
        item.lessonDescription || item.lessonPreview;
      document.getElementById("commentsInput").value = item.comments.join("\n");
      Toast.show("✓ Đã tải mô tả và nhận xét từ lịch sử!", "success");
      updateScriptTabInfo();
    });

    // Button xóa
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.style.cssText =
      "background: rgba(220, 53, 69, 0.2); color: #ff6b7a; border: 1px solid rgba(220, 53, 69, 0.3); padding: 6px 10px; border-radius: 8px; cursor: pointer; margin-left: 10px; font-size: 14px; transition: all 0.3s;";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFromHistory(item.id);
      renderHistory();
      Toast.show("✓ Đã xóa khỏi lịch sử!", "info");
    });

    itemDiv.addEventListener("mouseenter", () => {
      itemDiv.style.background = "rgba(0, 212, 255, 0.2)";
      itemDiv.style.borderColor = "rgba(0, 212, 255, 0.6)";
      deleteBtn.style.background = "rgba(220, 53, 69, 0.4)";
    });
    itemDiv.addEventListener("mouseleave", () => {
      itemDiv.style.background = "rgba(0, 212, 255, 0.1)";
      itemDiv.style.borderColor = "rgba(0, 212, 255, 0.3)";
      deleteBtn.style.background = "rgba(220, 53, 69, 0.2)";
    });

    itemDiv.appendChild(textDiv);
    itemDiv.appendChild(deleteBtn);
    container.appendChild(itemDiv);
  });
}

window.generateCommentsByAI = async function () {
  const lesson = document.getElementById("lessonDescription").value.trim();
  if (!lesson) {
    return Toast.show("Bạn chưa nhập mô tả buổi học!", "warning");
  }

  // Disable buttons khi đang sinh
  disableButtons();

  // Xóa comments cũ
  const commentsInput = document.getElementById("commentsInput");
  commentsInput.value = "";

  // Thêm progress indicator
  const progressDiv = document.createElement("div");
  progressDiv.style.cssText =
    "color: #00d4ff; font-size: 14px; margin-top: 12px; font-weight: 600; padding: 12px 16px; background: rgba(0, 212, 255, 0.15); border: 1.5px solid rgba(0, 212, 255, 0.4); border-radius: 10px; text-align: center; backdrop-filter: blur(5px); animation: slideIn 0.3s ease;";
  progressDiv.textContent = "⏳ Đang kết nối với AI...";
  commentsInput.parentNode.insertBefore(progressDiv, commentsInput.nextSibling);

  try {
    let commentCount = 0;
    const onCommentReceived = (comment) => {
      // Append từng comment vào textarea
      if (commentsInput.value) {
        commentsInput.value += "\n";
      }
      commentsInput.value += comment;
      commentCount++;
      progressDiv.textContent = `📥 Đã nhận ${commentCount}/20 nhận xét...`;
      // Scroll xuống dưới cùng
      commentsInput.scrollTop = commentsInput.scrollHeight;
    };

    await generateCommentsFromGemini(lesson, onCommentReceived);

    progressDiv.style.background = "rgba(76, 175, 80, 0.15)";
    progressDiv.style.borderColor = "rgba(76, 175, 80, 0.4)";
    progressDiv.style.color = "#4caf50";
    progressDiv.textContent = "✅ Hoàn thành! Bạn có thể chỉnh sửa nhận xét";
    setTimeout(() => progressDiv.remove(), 3000);

    Toast.show("✨ Đã sinh 20 nhận xét!", "success");

    // Reload lịch sử
    renderHistory();
    updateScriptTabInfo();
  } catch (e) {
    console.error(e);
    progressDiv.style.background = "rgba(220, 53, 69, 0.15)";
    progressDiv.style.borderColor = "rgba(220, 53, 69, 0.4)";
    progressDiv.style.color = "#ff6b7a";
    progressDiv.textContent = "❌ Lỗi khi gọi AI!";
    Toast.show("❌ Lỗi khi gọi AI!", "error");
  } finally {
    // Enable buttons khi xong
    enableButtons();
  }
};

window.generateScriptsUI = function () {
  const text = document.getElementById("commentsInput").value.trim();
  if (!text) return Toast.show("Bạn chưa nhập nhận xét!", "warning");

  generator.setComments(text);

  const mode = document.querySelector('input[name="scoreMode"]:checked').value;

  if (mode === "fixed") {
    generator.setScoreMode("fixed", {
      fixed: Number(document.getElementById("fixedScore").value),
    });
  } else {
    generator.setScoreMode("range", {
      min: Number(document.getElementById("scoreMin").value),
      max: Number(document.getElementById("scoreMax").value),
    });
  }

  document.getElementById("scriptOutput").textContent =
    generator.generateScript();

  if (window.Prism) Prism.highlightAll();

  Toast.show("Đã tạo Script!", "success");

  // Auto switch đến tab script output
  tabManager.switchTab("script-output");
};

window.copyScript = function (id) {
  const el = document.getElementById(id);
  const content = el.textContent.trim();

  // Kiểm tra nếu chưa tạo script
  if (!content || content.startsWith("/* Chưa có script")) {
    Toast.show("Chưa có script để copy!", "warning");
    return;
  }

  const scriptName = "Script";

  navigator.clipboard
    .writeText(content)
    .then(() => Toast.show(`Đã copy ${scriptName}!`, "success"))
    .catch(() => Toast.show(`Copy ${scriptName} lỗi!`, "error"));
};

// Load lịch sử khi trang load
document.addEventListener("DOMContentLoaded", () => {
  // Khởi tạo tab manager
  tabManager = new TabManager();

  // Load lịch sử
  renderHistory();

  // Cập nhật thông tin tab script
  updateScriptTabInfo();

  // Listen for score mode changes
  document.querySelectorAll('input[name="scoreMode"]').forEach((radio) => {
    radio.addEventListener("change", updateScriptTabInfo);
  });

  // Listen for score input changes
  document
    .getElementById("fixedScore")
    .addEventListener("change", updateScriptTabInfo);
  document
    .getElementById("scoreMin")
    .addEventListener("change", updateScriptTabInfo);
  document
    .getElementById("scoreMax")
    .addEventListener("change", updateScriptTabInfo);

  // Listen for comments changes
  document
    .getElementById("commentsInput")
    .addEventListener("input", updateScriptTabInfo);
});
