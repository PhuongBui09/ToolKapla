import { Toast } from "./toast.js";
import { ScriptGenerator } from "./scriptGenerator.js";

const generator = new ScriptGenerator();

window.generateScriptsUI = function () {
  const text = document.getElementById("commentsInput").value.trim();
  if (!text) return Toast.show("Bạn chưa nhập nhận xét!", "warning");

  generator.setComments(text);
  generator.setHumanMode(document.getElementById("humanModeCheckbox").checked);

  document.getElementById("script1Output").textContent =
    generator.generateScript1();
  document.getElementById("script2Output").textContent =
    generator.generateScript2();

  if (window.Prism) Prism.highlightAll();

  Toast.show("Đã tạo Script!", "success");
};

window.copyScript = function (id) {
  const content = document.getElementById(id).textContent;

  navigator.clipboard
    .writeText(content)
    .then(() => Toast.show("Đã copy thành công!", "success"))
    .catch(() => Toast.show("Copy lỗi!", "error"));
};
