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
  // ===== CORE HELPERS =====
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const css = (el, obj) => Object.assign(el.style, obj);

  function uiLog(text, colorKey = "default") {
    window.__panel.status.textContent = text;
    css(window.__panel.status, { ...COLORS[colorKey], background: COLORS[colorKey].bg, borderColor: COLORS[colorKey].border });
    console.log(text);
  }

  function uiSuccess(text) { uiLog(text, "success"); }
  function uiError(text) { uiLog(text, "error"); }

  async function typeTextSmart(el, text, fastMode = false) {
    el.focus();
    el.value = "";
    text = String(text);
    
    if (fastMode || text.length > 120) {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(100);
    } else {
      for (let c of text) {
        el.value += c;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        await wait(20 + Math.random() * 20);
      }
    }
    
    try { saveAttendance($(el)); await wait(500); } catch (e) {}
  }

  async function waitForReload(maxWait = 5000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      if (!document.querySelector(".loading") && !document.querySelector(".spinner")) {
        await wait(500);
        return true;
      }
      await wait(200);
    }
    return false;
  }

  function getPLRows() {
    const rows = document.querySelectorAll("#tbl_student tbody tr");
    const plRows = [];
    rows.forEach((row, idx) => {
      const select = row.querySelector('select[name="attendance_type"]');
      if (select && (select.value === "P" || select.value === "L")) {
        plRows.push({ idx, row, select });
      }
    });
    return plRows;
  }

  // ===== INIT =====
  if (!confirm("Script nhập nhận xét + điểm cho học sinh (P/L), kiểm tra tự động, rồi gửi. Tiếp tục?")) {
    console.log("❗ Hủy");
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

  // ===== PANEL =====
  (function createPanel() {
    const panel = document.createElement("div");
    let collapsed = false;

    css(panel, {
      position: "fixed", top: "20px", right: "20px", width: "280px",
      background: "#fff", color: "#1f2937", borderRadius: "12px",
      zIndex: "99999", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb",
      overflow: "hidden", transition: "all 0.3s ease"
    });

    panel.innerHTML = \`
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 14px;">
        <div style="display: flex; gap: 8px; align-items: center;"><span style="font-size: 18px;">🎓</span><span>Nhập Điểm</span></div>
        <button id="btnCollapse" style="background: none; border: none; color: #fff; font-size: 14px; cursor: pointer;">▼</button>
      </div>
      <div id="panelContent" style="padding: 12px; background: #f9fafb;">
        <div id="status" style="background: #dbeafe; border: 1px solid #93c5fd; color: #1e40af; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: 500; margin-bottom: 10px;">⏱ PHASE 1...</div>
        <div id="progress" style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; margin-bottom: 10px; overflow: hidden;">
          <div id="progressBar" style="height: 100%; background: #6366f1; width: 0%; transition: width 0.3s;"></div>
        </div>
        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
          <button id="btnPause" style="flex: 1; padding: 6px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.2s;">⏸ Dừng</button>
          <button id="btnSendAll" disabled style="flex: 1; padding: 6px; background: #10b981; color: #fff; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: not-allowed; opacity: 0.5; transition: all 0.2s;">✅ Gửi</button>
        </div>
        <div id="missingInfo" style="display: none; background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 6px; border-radius: 4px; font-size: 10px;">⚠ Sửa dữ liệu...</div>
      </div>
    \`;

    document.body.appendChild(panel);

    const panelContent = panel.querySelector("#panelContent");
    const progressBar = panel.querySelector("#progressBar");
    const btnCollapse = panel.querySelector("#btnCollapse");
    const btnPause = panel.querySelector("#btnPause");
    const btnSendAll = panel.querySelector("#btnSendAll");
    const status = panel.querySelector("#status");
    const missingInfo = panel.querySelector("#missingInfo");

    btnCollapse.onclick = () => {
      collapsed = !collapsed;
      panelContent.style.display = collapsed ? "none" : "block";
      btnCollapse.textContent = collapsed ? "▲" : "▼";
    };

    btnPause.onclick = () => {
      paused = !paused;
      if (paused) {
        btnPause.textContent = "▶ Tiếp";
        css(btnPause, COLORS.pause);
      } else {
        btnPause.textContent = "⏸ Dừng";
        css(btnPause, COLORS.default);
      }
    };

    btnPause.onmouseover = () => !paused && css(btnPause, { background: "#e5e7eb", borderColor: "#9ca3af" });
    btnPause.onmouseout = () => !paused && css(btnPause, COLORS.default);

    btnSendAll.onclick = async () => {
      if (!confirm(\`Gửi cho \${sendQueue.length} HS?\`)) return;
      btnSendAll.disabled = true;
      css(status, { ...COLORS.send, background: COLORS.send.bg, borderColor: COLORS.send.border });
      status.textContent = "📤 PHASE 3: Gửi...";
      progressBar.style.width = "0%";

      for (let i = 0; i < sendQueue.length; i++) {
        const btn = sendQueue[i];
        if (i === 0) await wait(1200 + Math.random() * 1800);
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        await wait(300 + Math.random() * 400);
        btn.focus();
        await wait(200 + Math.random() * 300);
        btn.click();
        await wait(600 + Math.random() * 800);
        btn.blur();
        await wait(700 + Math.random() * 1000);
        progressBar.style.width = ((i + 1) / sendQueue.length * 100) + "%";
      }

      css(status, { ...COLORS.success, background: COLORS.success.bg, borderColor: COLORS.success.border });
      status.textContent = "✅ Gửi xong";
      progressBar.style.width = "100%";
    };

    btnSendAll.onmouseover = () => !btnSendAll.disabled && css(btnSendAll, { background: "#059669" });
    btnSendAll.onmouseout = () => !btnSendAll.disabled && css(btnSendAll, { background: "#10b981" });

    window.__panel = { btnSendAll, status, missingInfo, progressBar };
  })();

  async function waitIfPaused() { while (paused) await wait(150); }

  // ===== PHASE 1: INPUT =====
  uiLog("🔄 PHASE 1: Nhập nhận xét + điểm...", "default");
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  let available = comments.slice(), duplicated = [], studentMap = new Map();
  let totalPL = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const select = row.querySelector('select[name="attendance_type"]');
    const comment = row.querySelector(".description");
    const score = row.querySelector(".homework_score");
    const sendBtn = row.querySelector(".btn_send");
    if (!select || !comment || !score) continue;

    let att = select.value || (select.value = "A", saveAttendance($(select)), await wait(250), "A");
    if (att !== "P" && att !== "L") continue;

    totalPL++;
    await waitIfPaused();

    const name = row.querySelector("td:nth-child(2)")?.innerText?.trim() || "HS#" + idx;
    const chosen = available.length
      ? available.splice(Math.floor(Math.random() * available.length), 1)[0]
      : (duplicated.push(name), comments[Math.floor(Math.random() * comments.length)]);

    await typeTextSmart(comment, chosen, chosen.length > 120);
    await waitIfPaused();
    await typeTextSmart(score, ${scoreExpr}, false);
    await waitIfPaused();

    studentMap.set(idx, { comment, score, sendBtn, name, chosen, scoreVal: ${scoreExpr} });
    if (sendBtn) {
      sendQueue.push(sendBtn);
      sendBtn.style.outline = "2px solid #22c55e";
    }

    window.__panel.progressBar.style.width = (totalPL / sendQueue.length * 100) + "%";
  }

  uiSuccess("✅ PHASE 1 hoàn tất: Nhập xong " + sendQueue.length + " HS");

  // ===== PHASE 2: CHECK & RETRY =====
  uiLog("🔄 PHASE 2: Kiểm tra dữ liệu...", "pause");

  let retryCount = 0, maxRetry = 3;

  async function checkAndRetry() {
    missingStudents = [];
    const refreshBtn = document.querySelector("#refresh_sms");
    if (refreshBtn) {
      uiLog("📤 Reloading dữ liệu...", "pause");
      refreshBtn.click();
      await waitForReload();
      await wait(1000); // Đợi thêm để server cập nhật
    }

    const currentRows = document.querySelectorAll("#tbl_student tbody tr");
    for (const [idx, student] of studentMap) {
      if (idx >= currentRows.length) continue;
      const row = currentRows[idx], select = row.querySelector('select[name="attendance_type"]');
      if (select?.value !== "P" && select?.value !== "L") continue;

      const c = row.querySelector(".description"), s = row.querySelector(".homework_score");
      const cmtMiss = !c?.value?.trim(), scoreMiss = !s?.value?.trim();

      if (cmtMiss || scoreMiss) {
        missingStudents.push({ idx, name: student.name, cmtMiss, scoreMiss, c, s, chosen: student.chosen, scoreVal: student.scoreVal });
      }
    }

    console.log(\`📋 Thiếu: \${missingStudents.length}\`);

    if (missingStudents.length && retryCount < maxRetry) {
      uiLog(\`⚠️ Retry \${retryCount + 1}/\${maxRetry}: Sửa \${missingStudents.length} HS...\`, "pause");
      window.__panel.missingInfo.style.display = "block";
      for (const x of missingStudents) {
        await waitIfPaused();
        if (x.cmtMiss && x.c) {
          await typeTextSmart(x.c, x.chosen, x.chosen.length > 120);
          await wait(200);
        }
        if (x.scoreMiss && x.s) {
          await typeTextSmart(x.s, x.scoreVal, false);
          await wait(200);
        }
      }
      retryCount++;
      await wait(1000);
      await checkAndRetry();
    } else if (!missingStudents.length) {
      uiSuccess("✅ PHASE 2: Toàn bộ dữ liệu sẵn sàng!");
      window.__panel.missingInfo.style.display = "none";
      window.__panel.btnSendAll.disabled = false;
      css(window.__panel.btnSendAll, { opacity: "1", cursor: "pointer" });
      window.__panel.progressBar.style.width = "66%";
    } else {
      uiError("❌ Thiếu dữ liệu sau " + maxRetry + " lần thử");
      console.warn("Danh sách HS thiếu:", missingStudents.map(x => x.name));
      window.__panel.progressBar.style.width = "50%";
    }
  }

  await checkAndRetry();

  if (duplicated.length) {
    console.log("⚠ Nhận xét bị trùng cho:", duplicated);
  }
})();`;
  }
}
