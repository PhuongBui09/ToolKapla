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
  // ============ UTILITIES ============
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
      "Script sẽ nhập nhận xét + điểm cho toàn bộ học sinh (P/L), sau đó tự kiểm tra và gửi. Bạn có muốn tiếp tục?"
    )
  ) {
    console.log("❗ Hủy thao tác");
    return;
  }

  // ====== CONTROL STATE ======
  let paused = false;
  let sendQueue = [];
  let missingStudents = [];

  // ====== PANEL (Modern UI) ======
  (function createPanel() {
    const panel = document.createElement("div");
    let isCollapsed = false;

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
          ⏱ PHASE 1: Đang nhập...
        </div>

        <!-- Missing Info -->
        <div id="missingInfo" style="display: none; background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 8px 10px; border-radius: 6px; font-size: 11px; margin-bottom: 12px; line-height: 1.4;">
          ⚠ Còn thiếu dữ liệu cho một số học sinh. Đang sửa lại...
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
          Script tự động kiểm tra và gửi sau khi nhập xong
        </div>
      </div>
    \`;

    document.body.appendChild(panel);

    const panelContent = panel.querySelector("#panelContent");
    const btnPause = panel.querySelector("#btnPause");
    const btnSendAll = panel.querySelector("#btnSendAll");
    const btnCollapse = panel.querySelector("#btnCollapse");
    const status = panel.querySelector("#status");
    const missingInfo = panel.querySelector("#missingInfo");

    // Nút Thu gọn / Mở rộng
    btnCollapse.onclick = (e) => {
      e.stopPropagation();
      isCollapsed = !isCollapsed;
      panelContent.style.display = isCollapsed ? "none" : "block";
      btnCollapse.textContent = isCollapsed ? "▲" : "▼";
    };

    // Nút Pause / Resume
    btnPause.onclick = () => {
      paused = !paused;
      if (paused) {
        btnPause.textContent = "▶ Tiếp tục";
        btnPause.style.background = "#fef3c7";
        btnPause.style.color = "#92400e";
        btnPause.style.borderColor = "#fcd34d";
      } else {
        btnPause.textContent = "⏸ Tạm dừng";
        btnPause.style.background = "#f3f4f6";
        btnPause.style.color = "#374151";
        btnPause.style.borderColor = "#d1d5db";
      }
    };

    // Nút Gửi tất cả
    btnSendAll.onclick = async () => {
      if (!confirm(\`Gửi nhận xét cho \${sendQueue.length} học sinh?\`)) return;

      btnSendAll.disabled = true;
      btnSendAll.style.opacity = "0.6";
      status.textContent = "📤 PHASE 3: Đang gửi...";
      status.style.background = "#ddd6fe";
      status.style.borderColor = "#c4b5fd";
      status.style.color = "#5b21b6";

      for (let i = 0; i < sendQueue.length; i++) {
        const btn = sendQueue[i];
        if (i === 0) await wait(1500 + Math.random() * 2000);
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        await wait(400 + Math.random() * 700);
        btn.focus();
        await wait(300 + Math.random() * 600);
        btn.click();
        await wait(800 + Math.random() * 1400);
        btn.blur();
        await wait(1000 + Math.random() * 1800);
      }

      status.textContent = "✅ Đã gửi xong (an toàn)";
      status.style.background = "#d1fae5";
      status.style.borderColor = "#6ee7b7";
      status.style.color = "#065f46";
    };

    // Hover effects
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

    btnSendAll.onmouseover = () => {
      if (!btnSendAll.disabled) {
        btnSendAll.style.background = "#059669";
      }
    };
    btnSendAll.onmouseout = () => {
      if (!btnSendAll.disabled) {
        btnSendAll.style.background = "#10b981";
      }
    };

    window.__panel = { btnSendAll, status, missingInfo };
  })();

  async function waitIfPaused() {
    while (paused) {
      await wait(200);
    }
  }

  // ============ PHASE 1: NHẬP ============
  console.log("🔄 PHASE 1: Bắt đầu nhập nhận xét + điểm...");
  
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  const comments = ${JSON.stringify(this.comments)};
  let available = comments.slice();
  let duplicated = [];
  
  // Map để theo dõi dữ liệu nhập: { rowIndex: { commentInput, scoreInput, name, sendBtn } }
  const studentMap = new Map();

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
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

      // Lưu thông tin học sinh để kiểm tra sau
      studentMap.set(idx, {
        comment,
        score,
        sendBtn,
        name: name || "Học sinh #" + idx,
        valueComment: chosen,
        valueScore: ${scoreExpr}
      });

      if (sendBtn) {
        sendQueue.push(sendBtn);
        sendBtn.style.outline = "2px solid #22c55e";
        sendBtn.title = "Sẵn sàng gửi";
      }
    }
  }

  console.log("✅ PHASE 1 hoàn tất: Nhập xong " + sendQueue.length + " học sinh");

  // ============ PHASE 2: KIỂM TRA TỰ ĐỘNG ============
  console.log("🔄 PHASE 2: Bắt đầu kiểm tra tự động...");
  window.__panel.status.textContent = "⏳ PHASE 2: Đang kiểm tra dữ liệu...";
  window.__panel.status.style.background = "#fef3c7";
  window.__panel.status.style.borderColor = "#fcd34d";
  window.__panel.status.style.color = "#92400e";

  let retryCount = 0;
  const maxRetry = 2;

  async function checkAndRetry() {
    missingStudents = [];

    // Reload dữ liệu bằng cách click nút refresh
    const refreshBtn = document.querySelector("#refresh_sms");
    if (refreshBtn) {
      console.log("📤 Click nút tải lại dữ liệu...");
      refreshBtn.click();
      
      // Chờ dữ liệu load
      await wait(3000 + Math.random() * 2000);
    }

    // Kiểm tra lại từng học sinh
    const currentRows = document.querySelectorAll("#tbl_student tbody tr");
    
    for (const [idx, student] of studentMap) {
      if (idx >= currentRows.length) continue;
      
      const row = currentRows[idx];
      const select = row.querySelector('select[name="attendance_type"]');
      let att = select?.value;

      if (att !== "P" && att !== "L") continue;

      const comment = row.querySelector(".description");
      const score = row.querySelector(".homework_score");

      const commentMissing = !comment || !comment.value || comment.value.trim() === "";
      const scoreMissing = !score || !score.value || score.value.trim() === "";

      if (commentMissing || scoreMissing) {
        missingStudents.push({
          idx,
          name: student.name,
          commentMissing,
          scoreMissing,
          comment,
          score,
          valueComment: student.valueComment,
          valueScore: student.valueScore
        });
      }
    }

    console.log(\`📋 Kiểm tra: Còn \${missingStudents.length} học sinh thiếu dữ liệu\`);

    // Nếu còn thiếu và chưa hết retry
    if (missingStudents.length > 0 && retryCount < maxRetry) {
      window.__panel.missingInfo.style.display = "block";
      console.log(\`⚠️  Lần retry \${retryCount + 1}/\${maxRetry}: Sửa \${missingStudents.length} học sinh bị thiếu...\`);
      
      for (const student of missingStudents) {
        await waitIfPaused();
        
        if (student.commentMissing && student.comment) {
          console.log(\`📝 Sửa nhận xét cho: \${student.name}\`);
          await typeTextAndSave(student.comment, student.valueComment);
          await wait(300);
        }

        if (student.scoreMissing && student.score) {
          console.log(\`📝 Sửa điểm cho: \${student.name}\`);
          await typeTextAndSave(student.score, student.valueScore);
          await wait(300);
        }
      }

      retryCount++;
      await wait(1500);
      
      // Kiểm tra lại
      await checkAndRetry();
    } else if (missingStudents.length === 0) {
      console.log("✅ PHASE 2 hoàn tất: Toàn bộ dữ liệu đã sẵn sàng!");
      window.__panel.missingInfo.style.display = "none";
      
      window.__panel.status.textContent = "✅ PHASE 2: Sẵn sàng gửi";
      window.__panel.status.style.background = "#d1fae5";
      window.__panel.status.style.borderColor = "#6ee7b7";
      window.__panel.status.style.color = "#065f46";
      
      // Enable nút gửi
      window.__panel.btnSendAll.disabled = false;
      window.__panel.btnSendAll.style.opacity = "1";
      window.__panel.btnSendAll.style.cursor = "pointer";
    } else {
      console.log("❌ PHASE 2 thất bại: Còn thiếu sau " + maxRetry + " lần thử");
      window.__panel.status.textContent = "❌ Thiếu dữ liệu (sửa thủ công)";
      window.__panel.status.style.background = "#fee2e2";
      window.__panel.status.style.borderColor = "#fca5a5";
      window.__panel.status.style.color = "#991b1b";
      window.__panel.missingInfo.style.display = "block";
    }
  }

  // Bắt đầu kiểm tra
  await checkAndRetry();

  if (duplicated.length) {
    console.log("⚠ Nhận xét bị trùng cho:");
    duplicated.forEach((n) => console.log("- " + n));
  }
})();`;
  }
}
