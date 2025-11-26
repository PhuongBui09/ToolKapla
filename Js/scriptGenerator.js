// scriptGenerator.js
export class ScriptGenerator {
  constructor() {
    this.humanMode = false;
    this.comments = [];

    this.scoreMode = "fixed"; // fixed | range
    this.scoreConfig = { fixed: 9, min: 7, max: 10 };
  }

  setHumanMode(value) {
    this.humanMode = value;
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

  generateScript1() {
    return this.humanMode
      ? this.#generateScript1Human()
      : this.#generateScript1Fast();
  }

  generateScript2() {
    return this.humanMode
      ? this.#generateScript2Human()
      : this.#generateScript2Fast();
  }

  // ---------- PRIVATE METHODS ----------
  #generateScript1Human() {
    const scoreExpr =
      this.scoreMode === "fixed"
        ? this.scoreConfig.fixed
        : `(Math.floor(Math.random() * (${this.scoreConfig.max} - ${this.scoreConfig.min} + 1)) + ${this.scoreConfig.min})`;

    return `(async function() {
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

  const rows = document.querySelectorAll("#tbl_student tbody tr");
  const comments = ${JSON.stringify(this.comments)};
  let available = comments.slice();
  let duplicated = [];
  let count = 0;

  for (const row of rows){
    const select = row.querySelector('select[name="attendance_type"]');
    const comment = row.querySelector(".description");
    const score   = row.querySelector(".homework_score");
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
      await typeTextAndSave(score, ${scoreExpr});

      let chosen;
      if (available.length){
        chosen = available.splice(Math.floor(Math.random()*available.length), 1)[0];
      } else {
        chosen = comments[Math.floor(Math.random()*comments.length)];
        duplicated.push(name || "Không rõ tên");
      }

      await typeTextAndSave(comment, chosen);
      count++;
      await wait(60 + Math.random()*160);
    }
  }

  console.log("✔ Lưu xong " + count + " học sinh.");
  if (duplicated.length){
    console.log("⚠ Các học sinh bị trùng nhận xét:");
    duplicated.forEach(n => console.log("- " + n));
  }
})();`;
  }

  #generateScript1Fast() {
    const scoreExpr =
      this.scoreMode === "fixed"
        ? this.scoreConfig.fixed
        : `(Math.floor(Math.random() * (${this.scoreConfig.max} - ${this.scoreConfig.min} + 1)) + ${this.scoreConfig.min})`;

    return `(async function() {
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  const comments = ${JSON.stringify(this.comments)};
  let available = comments.slice();
  let duplicated = [];
  let count = 0;

  for (const row of rows){
    const select = row.querySelector('select[name="attendance_type"]');
    const comment = row.querySelector(".description");
    const score   = row.querySelector(".homework_score");
    const name    = row.querySelector("td:nth-child(2)")?.innerText?.trim();

    if (!select || !comment || !score) continue;

    let att = select.value;
    if (!att){
      select.value = "A";
      try { saveAttendance($(select)); } catch(e){}
      att = "A";
    }

    if (att === "P" || att === "L"){
      score.value = ${scoreExpr};
      try { saveAttendance($(score)); } catch(e){}

      let chosen;
      if (available.length){
        chosen = available.splice(Math.floor(Math.random()*available.length), 1)[0];
      } else {
        chosen = comments[Math.floor(Math.random()*comments.length)];
        duplicated.push(name || "Không rõ tên");
      }

      comment.value = chosen;
      try { saveAttendance($(comment)); } catch(e){}
      count++;
    }
  }

  console.log("✔ Lưu xong " + count + " học sinh.");
  if (duplicated.length){
    console.log("⚠ Các học sinh bị trùng nhận xét:");
    duplicated.forEach(n => console.log("- " + n));
  }
})();`;
  }

  #generateScript2Human() {
    return `(async function(){
  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  const rows = document.querySelectorAll("#tbl_student tbody tr");
  let sentList = [];

  for (const row of rows){
    const select = row.querySelector('select[name="attendance_type"]');
    const btn    = row.querySelector('.btn_send');

    if (!select || !btn) continue;
    if (select.value !== "P" && select.value !== "L") continue;

    btn.focus();
    await wait(60 + Math.random()*90);
    btn.click();
    await wait(100 + Math.random()*150);
    btn.blur();

    sentList.push(row.querySelector(".student_name")?.innerText.trim());
    await wait(150 + Math.random()*300);
  }

  console.log("✔ Đã gửi:", sentList);
})();`;
  }

  #generateScript2Fast() {
    return `(function(){
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  let sent = [];

  rows.forEach(row => {
    const select = row.querySelector('select[name="attendance_type"]');
    const btn    = row.querySelector('.btn_send');
    if (!select || !btn) return;
    if (select.value === "P" || select.value === "L"){
      btn.click();
      sent.push(row.querySelector(".student_name")?.innerText.trim());
    }
  });

  console.log("✔ Đã gửi:", sent);
})();`;
  }
}
