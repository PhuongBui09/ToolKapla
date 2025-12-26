import { Toast } from "./toast.js";
import { ScriptGenerator } from "./scriptGenerator.js";
import { generateCommentsFromGemini } from "./gemini.js";

const generator = new ScriptGenerator();

window.generateCommentsByAI = async function () {
  const lesson = document.getElementById("lessonDescription").value.trim();
  if (!lesson) {
    return Toast.show("Bạn chưa nhập mô tả buổi học!", "warning");
  }

  Toast.show("Đang sinh nhận xét bằng AI...", "info");

  try {
    const aiText = await generateCommentsFromGemini(lesson);

    document.getElementById("commentsInput").value = aiText.trim();

    Toast.show("Đã sinh 20 nhận xét. Bạn có thể chỉnh sửa!", "success");
  } catch (e) {
    console.error(e);
    Toast.show("Lỗi khi gọi AI!", "error");
  }
};

window.generateScriptsUI = function () {
  const text = document.getElementById("commentsInput").value.trim();
  if (!text) return Toast.show("Bạn chưa nhập nhận xét!", "warning");

  generator.setComments(text);

  const mode = document.querySelector('input[name="scoreMode"]:checked').value;

  if (mode === "fixed") {
    generator.setScoreMode("fixed", {
      fixed: Number(document.getElementById("fixedScore").value),
    });
  } else {
    generator.setScoreMode("range", {
      min: Number(document.getElementById("scoreMin").value),
      max: Number(document.getElementById("scoreMax").value),
    });
  }

  document.getElementById("scriptOutput").textContent =
    generator.generateScript();

  if (window.Prism) Prism.highlightAll();

  Toast.show("Đã tạo Script!", "success");
};

window.copyScript = function (id) {
  const el = document.getElementById(id);
  const content = el.textContent.trim();

  // Kiểm tra nếu chưa tạo script
  if (!content || content.startsWith("/* Chưa có script")) {
    Toast.show("Chưa có script để copy!", "warning");
    return;
  }

  const scriptName = "Script";

  navigator.clipboard
    .writeText(content)
    .then(() => Toast.show(`Đã copy ${scriptName}!`, "success"))
    .catch(() => Toast.show(`Copy ${scriptName} lỗi!`, "error"));
};
