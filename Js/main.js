import { Toast } from "./toast.js";
import { ScriptGenerator } from "./scriptGenerator.js";

const generator = new ScriptGenerator();

window.generateScriptsUI = function () {
  const text = document.getElementById("commentsInput").value.trim();
  if (!text) return Toast.show("Bạn chưa nhập nhận xét!", "warning");

  generator.setComments(text);
  generator.setHumanMode(document.getElementById("humanModeCheckbox").checked);

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
