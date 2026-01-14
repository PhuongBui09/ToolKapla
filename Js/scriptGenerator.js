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

  // ---------- PRIVATE METHODS ----------
  #generateScriptHuman() {
    const scoreExpr =
      this.scoreMode === "fixed"
        ? this.scoreConfig.fixed
        : `(Math.floor(Math.random() * (${this.scoreConfig.max} - ${this.scoreConfig.min} + 1)) + ${this.scoreConfig.min})`;

    return `(async function(){
  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }
  async function typeTextAndSave(el, text, min=20, max=40){
    el.focus(); el.value = "";
    text = String(text);
    for (let c of text){
      el.value += c;
      el.dispatchEvent(new Event('input', {bubbles:true}));
      await wait(Math.random()*(max-min)+min);
    }
    try { saveAttendance($(el)); } catch(e){}
  }

  // Hỏi trước: đã nhập bài tập chưa?
  const ok = confirm("Bạn đã nhập bài tập chưa? Nếu đã nhập ấn Ok để tiếp tục, Hủy nếu chưa nhập.");
  if (!ok) {
    console.log("❗ Dừng: chưa nhập bài tập.");
    return;
  }

  const rows = document.querySelectorAll("#tbl_student tbody tr");
  const comments = ${JSON.stringify(this.comments)};
  let available = comments.slice();
  let duplicated = [];
  let count = 0;

  for (const row of rows){
    const select = row.querySelector('select[name="attendance_type"]');
    const comment = row.querySelector(".description");
    const score   = row.querySelector(".homework_score");
    const sendBtn = row.querySelector('.btn_send');
    const name    = row.querySelector("td:nth-child(2)")?.innerText?.trim(); // tên học sinh

    if (!select || !comment || !score) continue;

    let att = select.value;
    if (!att){
      select.value = "A";
      try { saveAttendance($(select)); } catch(e){}
      await wait(200 + Math.random()*300);
      att = "A";
    }

    if (att === "P" || att === "L"){
      // chọn nhận xét không trùng nếu có
      let chosen;
      if (available.length){
        chosen = available.splice(Math.floor(Math.random()*available.length), 1)[0];
      } else {
        chosen = comments[Math.floor(Math.random()*comments.length)];
        duplicated.push(name || "Không rõ tên");
      }

      await typeTextAndSave(comment, chosen);

      // gõ điểm
      await typeTextAndSave(score, ${scoreExpr});

      // gửi
      if (sendBtn) {
        sendBtn.focus();
        await wait(60 + Math.random()*120);
        sendBtn.click();
        await wait(80 + Math.random()*180);
        sendBtn.blur();
      }

      count++;
      await wait(60 + Math.random()*160);
    }
  }

  console.log("✔ Hoàn tất và đã gửi cho " + count + " học sinh.");
  if (duplicated.length){
    console.log("⚠ Các học sinh bị trùng nhận xét:");
    duplicated.forEach(n => console.log("- " + n));
  }
})();`;
  }
}
