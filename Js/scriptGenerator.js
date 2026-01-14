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
  // ===== UTILITIES =====
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function typeTextAndSave(el, text, min = 20, max = 40) {
    el.focus();
    el.value = "";
    for (let c of String(text)) {
      el.value += c;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(Math.random() * (max - min) + min);
    }
    try { saveAttendance($(el)); } catch (e) {}
  }

  const css = (el, obj) => Object.assign(el.style, obj);

  // ===== STATE & CONSTANTS =====
  if (!confirm("Script sẽ nhập nhận xét + điểm cho toàn bộ học sinh (P/L), sau đó tự kiểm tra và gửi. Tiếp tục?")) {
    console.log("❗ Hủy thao tác");
    return;
  }

  let paused = false, sendQueue = [], missingStudents = [];
  const comments = ${JSON.stringify(this.comments)};
  const COLORS = {
    default: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
    pause: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
    send: { bg: "#ddd6fe", color: "#5b21b6", border: "#c4b5fd" },
    error: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
    success: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" }
  };

  // ===== PANEL UI =====
  (function createPanel() {
    const panel = document.createElement("div");
    let isCollapsed = false;

    css(panel, {
      position: "fixed", top: "20px", right: "20px", width: "280px",
      background: "#ffffff", color: "#1f2937", borderRadius: "12px",
      zIndex: "99999", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb",
      overflow: "hidden", transition: "all 0.3s ease"
    });

    panel.innerHTML = \`
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 18px;">🎓</span><span>Nhập Điểm & Nhận Xét</span></div>
        <button id="btnCollapse" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 16px; padding: 0; width: 24px; height: 24px;">▼</button>
      </div>
      <div id="panelContent" style="padding: 14px; background: #f9fafb;">
        <div id="status" style="background: #dbeafe; border: 1px solid #93c5fd; color: #1e40af; padding: 8px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; margin-bottom: 12px; text-align: center;">⏱ PHASE 1: Đang nhập...</div>
        <div id="missingInfo" style="display: none; background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 8px 10px; border-radius: 6px; font-size: 11px; margin-bottom: 12px;">⚠ Còn thiếu dữ liệu. Đang sửa lại...</div>
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button id="btnPause" style="flex: 1; padding: 8px 10px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;">⏸ Tạm dừng</button>
          <button id="btnSendAll" disabled style="flex: 1.2; padding: 8px 10px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: not-allowed; transition: all 0.2s ease; opacity: 0.6;">✅ GỬI TẤT CẢ</button>
        </div>
        <div style="font-size: 11px; color: #6b7280; text-align: center;">Script tự động kiểm tra và gửi sau khi nhập xong</div>
      </div>
    \`;

    document.body.appendChild(panel);

    const panelContent = panel.querySelector("#panelContent");
    const btnPause = panel.querySelector("#btnPause");
    const btnSendAll = panel.querySelector("#btnSendAll");
    const btnCollapse = panel.querySelector("#btnCollapse");
    const status = panel.querySelector("#status");
    const missingInfo = panel.querySelector("#missingInfo");

    btnCollapse.onclick = () => {
      isCollapsed = !isCollapsed;
      panelContent.style.display = isCollapsed ? "none" : "block";
      btnCollapse.textContent = isCollapsed ? "▲" : "▼";
    };

    btnPause.onclick = () => {
      paused = !paused;
      const c = paused ? COLORS.pause : COLORS.default;
      css(btnPause, c);
      btnPause.textContent = paused ? "▶ Tiếp tục" : "⏸ Tạm dừng";
    };

    btnPause.onmouseover = () => !paused && css(btnPause, { background: "#e5e7eb", borderColor: "#9ca3af" });
    btnPause.onmouseout = () => !paused && css(btnPause, COLORS.default);

    btnSendAll.onclick = async () => {
      if (!confirm(\`Gửi nhận xét cho \${sendQueue.length} học sinh?\`)) return;
      btnSendAll.disabled = true;
      css(btnSendAll, { opacity: "0.6" });
      css(status, { ...COLORS.send, background: COLORS.send.bg, borderColor: COLORS.send.border });
      status.textContent = "📤 PHASE 3: Đang gửi...";

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

      css(status, { ...COLORS.success, background: COLORS.success.bg, borderColor: COLORS.success.border });
      status.textContent = "✅ Đã gửi xong (an toàn)";
    };

    btnSendAll.onmouseover = () => !btnSendAll.disabled && css(btnSendAll, { background: "#059669" });
    btnSendAll.onmouseout = () => !btnSendAll.disabled && css(btnSendAll, { background: "#10b981" });

    window.__panel = { btnSendAll, status, missingInfo };
  })();

  async function waitIfPaused() { while (paused) await wait(200); }

  // ===== PHASE 1: INPUT =====
  console.log("🔄 PHASE 1: Nhập nhận xét + điểm...");
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  let available = comments.slice(), duplicated = [], studentMap = new Map();

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const select = row.querySelector('select[name="attendance_type"]');
    const comment = row.querySelector(".description");
    const score = row.querySelector(".homework_score");
    const sendBtn = row.querySelector(".btn_send");
    const name = row.querySelector("td:nth-child(2)")?.innerText?.trim() || "Học sinh #" + idx;

    if (!select || !comment || !score) continue;

    let att = select.value || (select.value = "A", saveAttendance($(select)), await wait(300), "A");
    if (att !== "P" && att !== "L") continue;

    await waitIfPaused();

    const chosen = available.length
      ? available.splice(Math.floor(Math.random() * available.length), 1)[0]
      : (duplicated.push(name), comments[Math.floor(Math.random() * comments.length)]);

    await typeTextAndSave(comment, chosen);
    await waitIfPaused();
    await typeTextAndSave(score, ${scoreExpr});
    await waitIfPaused();

    studentMap.set(idx, { comment, score, sendBtn, name, valueComment: chosen, valueScore: ${scoreExpr} });
    if (sendBtn) {
      sendQueue.push(sendBtn);
      sendBtn.style.outline = "2px solid #22c55e";
      sendBtn.title = "Sẵn sàng gửi";
    }
  }

  console.log("✅ PHASE 1: Nhập xong " + sendQueue.length + " học sinh");

  // ===== PHASE 2: CHECK & RETRY =====
  console.log("🔄 PHASE 2: Kiểm tra dữ liệu...");
  css(window.__panel.status, { ...COLORS.pause, background: COLORS.pause.bg, borderColor: COLORS.pause.border });
  window.__panel.status.textContent = "⏳ PHASE 2: Đang kiểm tra...";

  let retryCount = 0, maxRetry = 2;

  async function checkAndRetry() {
    missingStudents = [];
    const refreshBtn = document.querySelector("#refresh_sms");
    if (refreshBtn) {
      console.log("📤 Reload dữ liệu...");
      refreshBtn.click();
      await wait(3000 + Math.random() * 2000);
    }

    const currentRows = document.querySelectorAll("#tbl_student tbody tr");
    for (const [idx, student] of studentMap) {
      if (idx >= currentRows.length) continue;
      const row = currentRows[idx], select = row.querySelector('select[name="attendance_type"]');
      if (select?.value !== "P" && select?.value !== "L") continue;

      const comment = row.querySelector(".description"), score = row.querySelector(".homework_score");
      const cmtMissing = !comment?.value?.trim(), scoreMissing = !score?.value?.trim();

      if (cmtMissing || scoreMissing) {
        missingStudents.push({ idx, name: student.name, commentMissing: cmtMissing, scoreMissing, comment, score, valueComment: student.valueComment, valueScore: student.valueScore });
      }
    }

    console.log(\`📋 Thiếu: \${missingStudents.length} học sinh\`);

    if (missingStudents.length && retryCount < maxRetry) {
      window.__panel.missingInfo.style.display = "block";
      console.log(\`⚠️ Retry \${retryCount + 1}/\${maxRetry}...\`);
      for (const s of missingStudents) {
        await waitIfPaused();
        if (s.commentMissing && s.comment) {
          console.log(\`📝 Sửa nhận xét: \${s.name}\`);
          await typeTextAndSave(s.comment, s.valueComment);
          await wait(300);
        }
        if (s.scoreMissing && s.score) {
          console.log(\`📝 Sửa điểm: \${s.name}\`);
          await typeTextAndSave(s.score, s.valueScore);
          await wait(300);
        }
      }
      retryCount++;
      await wait(1500);
      await checkAndRetry();
    } else if (!missingStudents.length) {
      console.log("✅ PHASE 2: Toàn bộ sẵn sàng!");
      window.__panel.missingInfo.style.display = "none";
      css(window.__panel.status, { ...COLORS.success, background: COLORS.success.bg, borderColor: COLORS.success.border });
      window.__panel.status.textContent = "✅ PHASE 2: Sẵn sàng gửi";
      window.__panel.btnSendAll.disabled = false;
      css(window.__panel.btnSendAll, { opacity: "1", cursor: "pointer" });
    } else {
      console.log("❌ PHASE 2: Lỗi sau " + maxRetry + " lần thử");
      css(window.__panel.status, { ...COLORS.error, background: COLORS.error.bg, borderColor: COLORS.error.border });
      window.__panel.status.textContent = "❌ Thiếu dữ liệu";
      window.__panel.missingInfo.style.display = "block";
    }
  }

  await checkAndRetry();

  if (duplicated.length) {
    console.log("⚠ Nhận xét trùng:");
    duplicated.forEach((n) => console.log("- " + n));
  }
})();`;
  }
}
