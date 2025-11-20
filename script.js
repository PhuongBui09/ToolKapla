// script.js - Updated with human-like typing and delays

// Utility to pretty-print in the UI (optional)
function showAlert(msg) {
  // simple alert for now — you can replace with a nicer UI later
  alert(msg);
}

// Main: generate script strings (human-like or normal)
function generateScripts() {
  const commentsText = document.getElementById("commentsInput").value.trim();
  if (!commentsText) {
    showAlert("Bạn chưa nhập nhận xét!");
    return;
  }

  const commentsArray = commentsText
    .split("\n")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const humanMode = document.getElementById("humanModeCheckbox").checked;

  // -----------------------
  // Script 1 (comment & attendance)
  // -----------------------
  const script1 = humanMode
    ? `(async function() {
  // human-like helpers
  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  // typing effect: types into element.value, dispatches input events, then calls saveAttendance
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
    // call save (the page's existing function)
    try { saveAttendance($(element)); } catch(e){ console.warn('saveAttendance failed', e); }
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
    if (!select || !commentInput) continue;

    let attendance = select.value;
    if (!attendance || attendance.trim() === "") {
      select.value = "A";
      attendance = "A";
      try { saveAttendance($(select)); } catch(e){ console.warn('saveAttendance(select) failed', e); }
      await wait(Math.random() * 300 + 200);
    }

    if ((attendance === "P" || attendance === "L") && commentInput) {
      let chosenComment;
      if (availableComments.length > 0) {
        const idx = Math.floor(Math.random() * availableComments.length);
        chosenComment = availableComments[idx];
        availableComments.splice(idx, 1);
      } else {
        chosenComment = comments[Math.floor(Math.random() * comments.length)];
        duplicatedStudents.push(studentName);
      }

      // Simulate human typing + save
      await typeTextAndSave(commentInput, chosenComment, 80, 120);

      savedCount++;
      // small pause between students
      await wait(Math.random() * 700 + 300);
    }
  }

  console.log("===== KẾT QUẢ =====");
  console.log("Đã lưu cho " + savedCount + " học sinh.");
  if (duplicatedStudents.length > 0) {
    console.log("Học sinh bị trùng nhận xét:");
    duplicatedStudents.forEach(function(n){ console.log("- " + n); });
  } else {
    console.log("Không có học sinh nào bị nhận xét trùng.");
  }
})();`
    : `(function() {
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  const comments = ${JSON.stringify(commentsArray, null, 2)};
  let availableComments = [...comments];
  let savedCount = 0;
  let duplicatedStudents = [];

  rows.forEach(row => {
    const nameCell = row.querySelector(".student_name");
    const studentName = nameCell ? nameCell.textContent.trim() : "Không rõ";

    const select = row.querySelector('select[name="attendance_type"]');
    const commentInput = row.querySelector(".description");
    if (!select || !commentInput) return;

    let attendance = select.value;
    if (!attendance || attendance.trim() === "") {
      select.value = "A";
      attendance = "A";
      try { saveAttendance($(select)); } catch(e){ console.warn('saveAttendance(select) failed', e); }
    }

    if ((attendance === "P" || attendance === "L") && commentInput) {
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
      try { saveAttendance($(commentInput)); } catch(e){ console.warn('saveAttendance(comment) failed', e); }
      savedCount++;
    }
  });

  console.log("===== KẾT QUẢ =====");
  console.log("Đã lưu cho " + savedCount + " học sinh.");
  if (duplicatedStudents.length > 0) {
    console.log("Học sinh bị trùng nhận xét:");
    duplicatedStudents.forEach(n => console.log("- " + n));
  } else {
    console.log("Không có học sinh nào bị nhận xét trùng.");
  }
})();`;

  // -----------------------
  // Script 2 (send messages)
  // -----------------------
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
      // human-like click
      try { sendButton.focus(); } catch(e){}
      await wait(Math.random() * 250 + 150);
      try { sendButton.click(); } catch(e){ console.warn('click failed', e); }
      await wait(Math.random() * 300 + 200);
      try { sendButton.blur(); } catch(e){}

      const nameEl = row.querySelector(".student_name");
      const name = nameEl ? nameEl.innerText.trim() : "Không rõ tên";
      sentList.push(name);
      sent++;

      // pause between sends
      await wait(Math.random() * 900 + 400);
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
      try { sendButton.click(); } catch(e){ console.warn('click failed', e); }
      const nameEl = row.querySelector(".student_name");
      const name = nameEl ? nameEl.innerText.trim() : "Không rõ tên";
      sentList.push(name);
      sent++;
    }
  });

  console.log("ĐÃ GỬI CHO " + sent + " HỌC SINH (P + L).");
  console.log("Danh sách đã gửi:", sentList);
})();`;

  // Put results into UI blocks
  document.getElementById("script1Output").textContent = script1;
  document.getElementById("script2Output").textContent = script2;

  // re-highlight code blocks
  if (window.Prism) {
    Prism.highlightAll();
  }
}

// copy button
function copyScript(id) {
  const scriptContent = document.getElementById(id).textContent;
  navigator.clipboard
    .writeText(scriptContent)
    .then(() => {
      showAlert("Đã copy script!");
    })
    .catch((err) => {
      console.error("Copy failed", err);
      showAlert("Copy failed - check console for details.");
    });
}
