function generateScripts() {
  const commentsText = document.getElementById("commentsInput").value.trim();
  if (!commentsText) {
    alert("Bạn chưa nhập nhận xét!");
    return;
  }

  const commentsArray = commentsText
    .split("\n")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const humanMode = document.getElementById("humanModeCheckbox").checked;

  // Script 1: Thêm nhận xét & điểm danh
  const script1 = humanMode
    ? `(async function() {
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
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
    if (!select || !commentInput) continue;

    let attendance = select.value;
    if (!attendance || attendance.trim() === "") {
      select.value = "A";
      attendance = "A";
      saveAttendance($(select));
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

      commentInput.focus();
      commentInput.value = chosenComment;
      commentInput.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(Math.random() * 500 + 300);
      commentInput.blur();

      saveAttendance($(commentInput));
      savedCount++;
      await wait(Math.random() * 500 + 300);
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
})()`
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
      saveAttendance($(select));
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
      saveAttendance($(commentInput));
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
})()`;

  // Script 2: Gửi tới học sinh P/L
  const script2 = humanMode
    ? `(async function() {
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  const rows = document.querySelectorAll("#tbl_student tbody tr");
  let sent = 0;
  let sentList = [];

  for (const row of rows) {
    const select = row.querySelector('select[name="attendance_type"]');
    const sendButton = row.querySelector('input.btn_send');
    if (!select || !sendButton) continue;

    const attendance = select.value;
    if (attendance === "P" || attendance === "L") {
      sendButton.focus();
      await wait(Math.random() * 300 + 200);
      sendButton.click();
      await wait(Math.random() * 300 + 200);
      sendButton.blur();

      const name = row.querySelector(".student_name")?.innerText.trim() || "Không rõ tên";
      sentList.push(name);
      sent++;

      await wait(Math.random() * 500 + 500); // delay giữa các học sinh
    }
  }

  console.log(\`ĐÃ GỬI CHO \${sent} HỌC SINH (P + L).\`);
  console.log("Danh sách đã gửi:", sentList);
})()`
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
      sendButton.click();
      const name = row.querySelector(".student_name")?.innerText.trim() || "Không rõ tên";
      sentList.push(name);
      sent++;
    }
  });

  console.log(\`ĐÃ GỬI CHO \${sent} HỌC SINH (P + L).\`);
  console.log("Danh sách đã gửi:", sentList);
})();`;

  document.getElementById("script1Output").textContent = script1;
  document.getElementById("script2Output").textContent = script2;

  Prism.highlightAll();
}

function copyScript(id) {
  const scriptContent = document.getElementById(id).textContent;
  navigator.clipboard.writeText(scriptContent).then(() => {
    alert("Đã copy script!");
  });
}
