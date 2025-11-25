// toast.js
export class Toast {
  static show(msg, type = "success") {
    const toast = document.createElement("div");
    toast.textContent = msg;

    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.padding = "12px 24px";
    toast.style.borderRadius = "10px";
    toast.style.fontFamily = "JetBrains Mono, monospace";
    toast.style.fontWeight = "700";
    toast.style.fontSize = "14px";
    toast.style.color = "#fff";
    toast.style.textShadow = "1px 1px 2px rgba(0,0,0,0.4)";
    toast.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
    toast.style.opacity = 0;
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    toast.style.zIndex = 9999;

    // màu
    const colors = {
      success: "linear-gradient(135deg, #4ade80, #22c55e)",
      warning: "linear-gradient(135deg, #fcd34d, #fbbf24)",
      error: "linear-gradient(135deg, #f87171, #ef4444)",
      default: "rgba(0,0,0,0.85)",
    };
    toast.style.background = colors[type] || colors.default;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = 1;
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = 0;
      toast.style.transform = "translateY(-10px)";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}
