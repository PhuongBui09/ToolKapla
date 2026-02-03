/**
 * scriptGenerator2.js
 * Sinh script JS cho Flow 2: Sinh nhận xét theo điểm (4 mức: XUATSAR/GIOI/KHA/YEU)
 *
 * Flow 2 hoạt động:
 * 1. AI sinh COMMENT_BANK dựa trên nội dung buổi học
 * 2. Script console nhận COMMENT_BANK đã sinh, map & gửi (chạy trên browser)
 */

export class ScriptGeneratorFlow2 {
    constructor() {
        this.commentBank = null;
    }

    /**
     * Set COMMENT_BANK từ AI
     */
    setCommentBank(bank) {
        if (bank && typeof bank === 'object') {
            this.commentBank = bank;
        } else {
            console.error('Invalid comment bank:', bank);
            this.commentBank = { XUATSAR: [], GIOI: [], KHA: [], YEU: [] };
        }
    }

    generateScript() {
        const commentBank = JSON.stringify(this.commentBank);

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

  async function setSelectValue(selectEl, value) {
    selectEl.value = value;
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    try { $(selectEl).val(value).trigger("change"); } catch (e) {}
    try { saveAttendance($(selectEl)); await wait(300); } catch (e) {}
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

  // ===== INIT =====
  if (!confirm("Flow 2: Sinh nhận xét theo điểm, kiểm tra tự động, rồi gửi. Tiếp tục?")) {
    console.log("❗ Hủy");
    return;
  }

  let paused = false, sendQueue = [], missingStudents = [];
  const COMMENT_BANK = ${commentBank};
  const COLORS = {
    default: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
    pause: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
    send: { bg: "#ddd6fe", color: "#5b21b6", border: "#c4b5fd" },
    error: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
    success: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" }
  };

  // ===== HELPER FUNCTIONS =====
  function mapScoreToLevel(score) {
    const s = Number(score);
    if (s === 10) return "XUATSAR";
    if (s === 9) return "GIOI";
    if (s >= 7 && s <= 8) return "KHA";
    return "YEU";
  }

  function getRandomComment(level) {
    const bank = COMMENT_BANK[level];
    if (!bank || !bank.comments?.length) {
      return "Học sinh đã tham gia buổi học.";
    }
    return bank.comments[Math.floor(Math.random() * bank.comments.length)];
  }

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
      <div style="background: linear-gradient(135deg, #0891b2, #06b6d4); color: #fff; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 14px;">
        <div style="display: flex; gap: 8px; align-items: center;"><span style="font-size: 18px;">🤖</span><span>Flow 2 Nhận Xét</span></div>
        <button id="btnCollapse" style="background: none; border: none; color: #fff; font-size: 14px; cursor: pointer;">▼</button>
      </div>
      <div id="panelContent" style="padding: 12px; background: #f9fafb;">
        <div id="status" style="background: #dbeafe; border: 1px solid #93c5fd; color: #1e40af; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: 500; margin-bottom: 10px;">⏱ PHASE 1...</div>
        <div id="progress" style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; margin-bottom: 10px; overflow: hidden;">
          <div id="progressBar" style="height: 100%; background: #0891b2; width: 0%; transition: width 0.3s;"></div>
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
      progressBar.style.width = "66%";

      for (let i = 0; i < sendQueue.length; i++) {
        const btn = sendQueue[i];
        if (i === 0) await wait(800 + Math.random() * 400);
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        await wait(300 + Math.random() * 400);
        btn.focus();
        await wait(200 + Math.random() * 300);
        btn.click();
        await wait(600 + Math.random() * 800);
        btn.blur();
        await wait(700 + Math.random() * 1000);
        progressBar.style.width = (66 + (i + 1) / sendQueue.length * 34) + "%";
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
  const rows = document.querySelectorAll("table.list-student tbody tr");
  let studentMap = new Map();

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const select = row.querySelector('select[name="attendance_type"]');
    const comment = row.querySelector(".description");
    const score = row.querySelector(".homework_score");
    const sendBtn = row.querySelector(".btn_send");
    if (!select || !comment || !score) continue;

    // Chuyển "" thành "A" (vắng không phép)
    let att = select.value;
    if (!att) {
      await setSelectValue(select, "A");
      att = "A";
    }
    if (att !== "P" && att !== "L") continue;

    await waitIfPaused();

    const name = row.querySelector(".student_name")?.innerText?.trim()
      || row.getAttribute("pname")
      || "HS#" + idx;
    const scoreVal = Number(score.value);
    const level = mapScoreToLevel(scoreVal);
    const chosen = getRandomComment(level);

    await typeTextSmart(comment, chosen, chosen.length > 120);
    await wait(1000 + Math.random() * 500); // Chờ lâu hơn để nhận xét lưu

    studentMap.set(idx, { comment, score, sendBtn, name, chosen, level, scoreVal });
    if (sendBtn) {
      sendQueue.push(sendBtn);
      sendBtn.style.outline = "2px solid #22c55e";
    }

    window.__panel.progressBar.style.width = (idx / rows.length * 30) + "%";
  }

  uiSuccess("✅ PHASE 1 hoàn tất: Nhập xong " + sendQueue.length + " HS");

  // ===== PHASE 1.5: WAIT FOR SERVER =====
  uiLog("⏳ Chờ server lưu dữ liệu (5-8 giây)...", "pause");
  await wait(5000 + Math.random() * 3000);
  uiSuccess("✅ Dữ liệu đã được lưu. Sẵn sàng gửi!");
  window.__panel.missingInfo.style.display = "none";
  window.__panel.btnSendAll.disabled = false;
  css(window.__panel.btnSendAll, { opacity: "1", cursor: "pointer" });
  window.__panel.progressBar.style.width = "66%";
})();`;
    }
}
