// script.js - Updated with human-like typing and delays
// -----------------------------------------------------

// Hiển thị toast thông báo
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.textContent = msg;

  // style cơ bản
  toast.style.position = "fixed";
  toast.style.top = "20px";
  toast.style.right = "20px";
  toast.style.padding = "12px 24px";
  toast.style.borderRadius = "10px";
  toast.style.fontFamily = "JetBrains Mono, monospace";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "700"; // chữ đậm hơn
  toast.style.color = "#fff";
  toast.style.textShadow = "1px 1px 2px rgba(0,0,0,0.4)"; // shadow cho chữ
  toast.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
  toast.style.opacity = 0;
  toast.style.transition = "opacity 0.3s, transform 0.3s";
  toast.style.zIndex = 9999;

  // màu theo type
  if (type === "success") {
    toast.style.background = "linear-gradient(135deg, #4ade80, #22c55e)"; // xanh sáng hơn
  } else if (type === "warning") {
    toast.style.background = "linear-gradient(135deg, #fcd34d, #fbbf24)"; // vàng sáng
  } else if (type === "error") {
    toast.style.background = "linear-gradient(135deg, #f87171, #ef4444)"; // đỏ sáng
  } else {
    toast.style.background = "rgba(0,0,0,0.85)"; // mặc định
  }

  document.body.appendChild(toast);

  // fade in + slide
  requestAnimationFrame(() => {
    toast.style.opacity = 1;
    toast.style.transform = "translateY(0)";
  });

  // tự động ẩn sau 2.5 giây
  setTimeout(() => {
    toast.style.opacity = 0;
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 2500);
}

// =====================================================
// MAIN: Generate Script 1 & Script 2
// =====================================================
function generateScripts() {
  const commentsText = document.getElementById("commentsInput").value.trim();
  if (!commentsText) {
    showToast("Bạn chưa nhập nhận xét!", "warning");
    return;
  }

  const commentsArray = commentsText
    .split("\n")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const humanMode = document.getElementById("humanModeCheckbox").checked;

  // =====================================================
  // SCRIPT 1 (attendance + comment + score)
  // =====================================================
  const script1 = humanMode
    ? `(async function() {
  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function typeTextAndSave(element, text, minDelay = 30, maxDelay = 80){
    element.focus();
    element.value = "";

    for (let i = 0; i < text.length; i++){
      element.value += text[i];
      element.dispatchEvent(new Event('input', { bubbles: true }));
      const d = Math.random() * (maxDelay - minDelay) + minDelay;
      await wait(d);
    }

    element.blur();

    try { 
      saveAttendance($(element)); 
    } catch(e){ 
      console.warn('saveAttendance failed', e); 
    }
  }

  const rows = document.querySelectorAll("#tbl_student tbody tr");
  const comments = ${JSON.stringify(commentsArray, null, 2)};
  let availableComments = comments.slice();
  let savedCount = 0;
  let duplicatedStudents = [];

  for (const row of rows) {
    const nameCell = row.querySelector(".student_name");
    const studentName = nameCell ? nameCell.textContent.trim() : "Không rõ";

    const select = row.querySelector('select[name="attendance_type"]');
    const commentInput = row.querySelector(".description");
    const scoreInput = row.querySelector(".homework_score");
    if (!select || !commentInput || !scoreInput) continue;

    let attendance = select.value;

    if (!attendance || attendance.trim() === "") {
      select.value = "A";
      attendance = "A";

      try { saveAttendance($(select)); } 
      catch(e){ console.warn('saveAttendance(select) failed', e); }

      await wait(Math.random() * 300 + 200);
    }

    if (attendance === "P" || attendance === "L") {

      await typeTextAndSave(scoreInput, "9", 20, 40);

      let chosenComment;
      if (availableComments.length > 0) {
        const idx = Math.floor(Math.random() * availableComments.length);
        chosenComment = availableComments[idx];
        availableComments.splice(idx, 1);
      } else {
        chosenComment = comments[Math.floor(Math.random() * comments.length)];
        duplicatedStudents.push(studentName);
      }

      await typeTextAndSave(commentInput, chosenComment, 20, 40);

      savedCount++;
      await wait(Math.random() * 160 + 60);
    }
  }

  console.log("===== KẾT QUẢ =====");
  console.log("Đã lưu cho " + savedCount + " học sinh.");

  if (duplicatedStudents.length > 0) {
    console.log("Học sinh bị trùng nhận xét:");
    duplicatedStudents.forEach(n => console.log("- " + n));
  } else {
    console.log("Không có học sinh nào bị nhận xét trùng.");
  }
})();`
    : `(async function() {
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  const comments = ${JSON.stringify(commentsArray, null, 2)};
  let availableComments = [...comments];
  let savedCount = 0;
  let duplicatedStudents = [];

  for (const row of rows) {
    const nameCell = row.querySelector(".student_name");
    const studentName = nameCell ? nameCell.textContent.trim() : "Không rõ";

    const select = row.querySelector('select[name="attendance_type"]');
    const commentInput = row.querySelector(".description");
    const scoreInput = row.querySelector(".homework_score");
    if (!select || !commentInput || !scoreInput) continue;

    let attendance = select.value;

    if (!attendance || attendance.trim() === "") {
      select.value = "A";
      attendance = "A";

      try { saveAttendance($(select)); } 
      catch(e){ console.warn('saveAttendance(select) failed', e); }
    }

    if (attendance === "P" || attendance === "L") {

      scoreInput.value = "9";
      saveAttendance($(scoreInput));

      let chosenComment;
      if (availableComments.length > 0) {
        const idx = Math.floor(Math.random() * availableComments.length);
        chosenComment = availableComments[idx];
        availableComments.splice(idx, 1);
      } else {
        chosenComment = comments[Math.floor(Math.random() * comments.length)];
        duplicatedStudents.push(studentName);
      }

      commentInput.value = chosenComment;

      try { saveAttendance($(commentInput)); } 
      catch(e){ console.warn('saveAttendance(comment) failed', e); }

      savedCount++;
    }
  }

  console.log("===== KẾT QUẢ =====");
  console.log("Đã lưu cho " + savedCount + " học sinh.");

  if (duplicatedStudents.length > 0) {
    console.log("Học sinh bị trùng nhận xét:");
    duplicatedStudents.forEach(n => console.log("- " + n));
  } else {
    console.log("Không có học sinh nào bị nhận xét trùng.");
  }
})();`;

  // =====================================================
  // SCRIPT 2 (send messages)
  // =====================================================
  const script2 = humanMode
    ? `(async function() {
  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  const rows = document.querySelectorAll("#tbl_student tbody tr");
  let sent = 0;
  let sentList = [];

  for (const row of rows) {
    const select = row.querySelector('select[name="attendance_type"]');
    const sendButton = row.querySelector('input.btn_send');
    if (!select || !sendButton) continue;

    const attendance = select.value;
    if (attendance === "P" || attendance === "L") {

      try { sendButton.focus(); } catch(e){}

      await wait(Math.random() * 90 + 60);

      try { sendButton.click(); } 
      catch(e){ console.warn('click failed', e); }

      await wait(Math.random() * 150 + 100);

      try { sendButton.blur(); } catch(e){}

      const nameEl = row.querySelector(".student_name");
      const name = nameEl ? nameEl.innerText.trim() : "Không rõ tên";
      sentList.push(name);
      sent++;

      await wait(Math.random() * 300 + 150);
    }
  }

  console.log("ĐÃ GỬI CHO " + sent + " HỌC SINH (P + L).");
  console.log("Danh sách đã gửi:", sentList);
})();`
    : `(function () {
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  let sent = 0;
  let sentList = [];

  rows.forEach(row => {
    const select = row.querySelector('select[name="attendance_type"]');
    const sendButton = row.querySelector('input.btn_send');

    if (!select || !sendButton) return;

    const attendance = select.value;

    if (attendance === "P" || attendance === "L") {
      try { sendButton.click(); }
      catch(e){ console.warn('click failed', e); }

      const nameEl = row.querySelector(".student_name");
      const name = nameEl ? nameEl.innerText.trim() : "Không rõ tên";

      sentList.push(name);
      sent++;
    }
  });

  console.log("ĐÃ GỬI CHO " + sent + " HỌC SINH (P + L).");
  console.log("Danh sách đã gửi:", sentList);
})();`;

  // =====================================================
  // Put results vào UI
  // =====================================================
  document.getElementById("script1Output").textContent = script1;
  document.getElementById("script2Output").textContent = script2;

  if (window.Prism) Prism.highlightAll();
}

// Copy script và hiển thị thông báo theo script
function copyScript(id) {
  const content = document.getElementById(id).textContent;

  navigator.clipboard
    .writeText(content)
    .then(() => {
      if (id === "script1Output") showToast("Đã copy Script 1!");
      else if (id === "script2Output") showToast("Đã copy Script 2!");
      else showToast("Đã copy!");
    })
    .catch((err) => {
      console.error("Copy failed", err);
      showToast("Copy thất bại — xem console.", "error");
    });
}
