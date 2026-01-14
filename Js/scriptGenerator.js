// scriptGenerator.js
export class ScriptGenerator {
  constructor() {
    this.comments = [];

    this.scoreMode = "fixed"; // fixed | range
    this.scoreConfig = { fixed: 9, min: 7, max: 10 };
  }

  setComments(text) {
    this.comments = text
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  setScoreMode(mode, config) {
    this.scoreMode = mode;
    this.scoreConfig = config;
  }

  getScoreValue() {
    if (this.scoreMode === "fixed") {
      return this.scoreConfig.fixed;
    }
    const { min, max } = this.scoreConfig;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateScript() {
    return this.#generateScriptHuman();
  }

  // ---------- PRIVATE ----------
  #generateScriptHuman() {
    const scoreExpr =
      this.scoreMode === "fixed"
        ? this.scoreConfig.fixed
        : `(Math.floor(Math.random() * (${this.scoreConfig.max} - ${this.scoreConfig.min} + 1)) + ${this.scoreConfig.min})`;

    return `(async function () {
  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function typeTextAndSave(el, text, min = 20, max = 40) {
    el.focus();
    el.value = "";
    text = String(text);
    for (let c of text) {
      el.value += c;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(Math.random() * (max - min) + min);
    }
    try {
      saveAttendance($(el));
    } catch (e) {}
  }

  // ====== CONFIRM ======
  if (
    !confirm(
      "Script sẽ nhập nhận xét + điểm cho toàn bộ học sinh (P/L) nhưng CHƯA gửi. Bạn có muốn tiếp tục?"
    )
  ) {
    console.log("❗ Hủy thao tác");
    return;
  }

  // ====== CONTROL STATE ======
  let paused = false;
  let sendQueue = [];

  // ====== PANEL (Modern UI) ======
  (function createPanel() {
    // Tạo container chính
    const panel = document.createElement("div");
    let isCollapsed = false;

    // Inline styles cho panel
    panel.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      width: 280px;
      background: #ffffff;
      color: #1f2937;
      border-radius: 12px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
      border: 1px solid #e5e7eb;
      overflow: hidden;
      transition: all 0.3s ease;
    \`;

    // HTML cấu trúc panel
    panel.innerHTML = \`
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🎓</span>
          <span>Nhập Điểm & Nhận Xét</span>
        </div>
        <button id="btnCollapse" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 16px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">▼</button>
      </div>

      <div id="panelContent" style="padding: 14px; background: #f9fafb;">
        <!-- Status Badge -->
        <div id="status" style="background: #dbeafe; border: 1px solid #93c5fd; color: #1e40af; padding: 8px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; margin-bottom: 12px; text-align: center;">
          ⏱ Đang nhập...
        </div>

        <!-- Buttons Container -->
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button id="btnPause" style="flex: 1; padding: 8px 10px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;">
            ⏸ Tạm dừng
          </button>
          <button id="btnSendAll" disabled style="flex: 1.2; padding: 8px 10px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: not-allowed; transition: all 0.2s ease; opacity: 0.6;">
            ✅ GỬI TẤT CẢ
          </button>
        </div>

        <!-- Info Text -->
        <div style="font-size: 11px; color: #6b7280; line-height: 1.4; text-align: center;">
          Bấm "GỬI TẤT CẢ" sau khi hoàn tất nhập liệu
        </div>
      </div>
    \`;

    document.body.appendChild(panel);

    // Lấy các element quan trọng
    const panelContent = panel.querySelector("#panelContent");
    const btnPause = panel.querySelector("#btnPause");
    const btnSendAll = panel.querySelector("#btnSendAll");
    const btnCollapse = panel.querySelector("#btnCollapse");
    const status = panel.querySelector("#status");

    // Nút Thu gọn / Mở rộng
    btnCollapse.onclick = (e) => {
      e.stopPropagation();
      isCollapsed = !isCollapsed;
      if (isCollapsed) {
        panelContent.style.display = "none";
        btnCollapse.textContent = "▲";
        panel.style.width = "280px";
      } else {
        panelContent.style.display = "block";
        btnCollapse.textContent = "▼";
      }
    };

    // Nút Pause / Resume
    btnPause.onclick = () => {
      paused = !paused;
      if (paused) {
        btnPause.textContent = "▶ Tiếp tục";
        btnPause.style.background = "#fef3c7";
        btnPause.style.color = "#92400e";
        btnPause.style.borderColor = "#fcd34d";
        status.textContent = "⏸ Tạm dừng";
        status.style.background = "#fef3c7";
        status.style.borderColor = "#fcd34d";
        status.style.color = "#92400e";
      } else {
        btnPause.textContent = "⏸ Tạm dừng";
        btnPause.style.background = "#f3f4f6";
        btnPause.style.color = "#374151";
        btnPause.style.borderColor = "#d1d5db";
        status.textContent = "⏱ Đang nhập...";
        status.style.background = "#dbeafe";
        status.style.borderColor = "#93c5fd";
        status.style.color = "#1e40af";
      }
    };

    // Nút Gửi tất cả
    btnSendAll.onclick = async () => {
      if (!confirm(\`Gửi nhận xét cho \${sendQueue.length} học sinh?\`)) return;

      btnSendAll.disabled = true;
      btnSendAll.style.opacity = "0.6";

      status.textContent = "📤 Đang gửi (đang kiểm tra...)";
      status.style.background = "#ddd6fe";
      status.style.borderColor = "#c4b5fd";
      status.style.color = "#5b21b6";

      for (let i = 0; i < sendQueue.length; i++) {
        const btn = sendQueue[i];

        // 🧠 Dừng lâu hơn ở học sinh đầu tiên
        if (i === 0) {
          await wait(1500 + Math.random() * 2000); // 1.5s – 3.5s
        }

        // 👀 Scroll tới nút gửi
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        await wait(400 + Math.random() * 700);

        // 🖱 Focus → suy nghĩ → click
        btn.focus();
        await wait(300 + Math.random() * 600);

        btn.click();

        await wait(800 + Math.random() * 1400);
        btn.blur();

        // ⏳ Nghỉ giữa các học sinh
        await wait(1000 + Math.random() * 1800);
      }

      status.textContent = "✅ Đã gửi xong (an toàn)";
      status.style.background = "#d1fae5";
      status.style.borderColor = "#6ee7b7";
      status.style.color = "#065f46";
    };

    // Hover effect cho nút Pause
    btnPause.onmouseover = () => {
      if (!paused) {
        btnPause.style.background = "#e5e7eb";
        btnPause.style.borderColor = "#9ca3af";
      }
    };
    btnPause.onmouseout = () => {
      if (!paused) {
        btnPause.style.background = "#f3f4f6";
        btnPause.style.borderColor = "#d1d5db";
      }
    };

    // Hover effect cho nút Send All (khi enabled)
    btnSendAll.onmouseover = () => {
      if (!btnSendAll.disabled) {
        btnSendAll.style.background = "#059669";
        btnSendAll.style.opacity = "1";
      }
    };
    btnSendAll.onmouseout = () => {
      if (!btnSendAll.disabled) {
        btnSendAll.style.background = "#10b981";
      }
    };

    // Lưu reference để script chính có thể cập nhật
    window.__panel = { btnSendAll, status };
  })();

  async function waitIfPaused() {
    while (paused) {
      await wait(200);
    }
  }

  // ====== MAIN ======
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  const comments = ${JSON.stringify(this.comments)};
  let available = comments.slice();
  let duplicated = [];

  for (const row of rows) {
    const select = row.querySelector('select[name="attendance_type"]');
    const comment = row.querySelector(".description");
    const score = row.querySelector(".homework_score");
    const sendBtn = row.querySelector(".btn_send");
    const name = row.querySelector("td:nth-child(2)")?.innerText?.trim();

    if (!select || !comment || !score) continue;

    let att = select.value;
    if (!att) {
      select.value = "A";
      try {
        saveAttendance($(select));
      } catch (e) {}
      await wait(200 + Math.random() * 300);
      att = "A";
    }

    if (att === "P" || att === "L") {
      await waitIfPaused();

      let chosen;
      if (available.length) {
        chosen = available.splice(
          Math.floor(Math.random() * available.length),
          1
        )[0];
      } else {
        chosen = comments[Math.floor(Math.random() * comments.length)];
        duplicated.push(name || "Không rõ tên");
      }

      await typeTextAndSave(comment, chosen);
      await waitIfPaused();

      await typeTextAndSave(score, ${scoreExpr});
      await waitIfPaused();

      if (sendBtn) {
        sendQueue.push(sendBtn);
        sendBtn.style.outline = "2px solid #22c55e";
        sendBtn.title = "Sẵn sàng gửi";
      }
    }
  }

  window.__panel.status.textContent =
    "✔ Nhập xong – kiểm tra rồi bấm GỬI TẤT CẢ";
  window.__panel.btnSendAll.disabled = false;

  if (duplicated.length) {
    console.log("⚠ Nhận xét bị trùng cho:");
    duplicated.forEach((n) => console.log("- " + n));
  }
})();`;
  }
}
