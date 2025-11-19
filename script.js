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

  const script1 = `(function() {
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
    if (!select) return;

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
})();`;

  const script2 = `(function () {
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
