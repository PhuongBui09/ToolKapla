/**
 * Tab Manager - Quản lý hệ thống tab
 * Cung cấp chức năng:
 * - Chuyển đổi giữa các tab
 * - Lưu tab cuối cùng vào localStorage
 * - Khôi phục tab khi reload trang
 */

export class TabManager {
  constructor() {
    this.currentTab = null;
    this.storageKey = "toolkapla_active_tab";
    this.initTabs();
    this.attachEventListeners();
    this.restoreLastTab();
  }

  /**
   * Khởi tạo các tab buttons
   */
  initTabs() {
    this.tabButtons = document.querySelectorAll(".tab-btn");
    this.tabContents = document.querySelectorAll(".tab-content");
  }

  /**
   * Gắn event listeners cho tab buttons
   */
  attachEventListeners() {
    this.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-tab");
        this.switchTab(tabName);
      });
    });
  }

  /**
   * Chuyển đến một tab cụ thể
   * @param {string} tabName - Tên của tab (id mà không có 'tab-' prefix)
   */
  switchTab(tabName) {
    // Deactivate tất cả tabs
    this.tabButtons.forEach((btn) => btn.classList.remove("active"));
    this.tabContents.forEach((content) => content.classList.remove("active"));

    // Activate tab được chọn
    const targetButton = document.querySelector(
      `.tab-btn[data-tab="${tabName}"]`
    );
    const targetContent = document.getElementById(`tab-${tabName}`);

    if (targetButton && targetContent) {
      targetButton.classList.add("active");
      targetContent.classList.add("active");
      this.currentTab = tabName;

      // Lưu tab hiện tại vào localStorage
      this.saveCurrentTab();

      // Trigger custom event để các module khác biết tab đã thay đổi
      window.dispatchEvent(
        new CustomEvent("tabChanged", { detail: { tab: tabName } })
      );
    }
  }

  /**
   * Lưu tab hiện tại vào localStorage
   */
  saveCurrentTab() {
    localStorage.setItem(this.storageKey, this.currentTab);
  }

  /**
   * Khôi phục tab cuối cùng từ localStorage
   */
  restoreLastTab() {
    const lastTab = localStorage.getItem(this.storageKey);
    if (lastTab) {
      this.switchTab(lastTab);
    } else {
      // Mặc định tab đầu tiên
      const firstTab = this.tabButtons[0]?.getAttribute("data-tab");
      if (firstTab) this.switchTab(firstTab);
    }
  }

  /**
   * Lấy tab hiện tại
   */
  getCurrentTab() {
    return this.currentTab;
  }

  /**
   * Chuyển đến tab tiếp theo
   */
  nextTab() {
    const tabs = Array.from(this.tabButtons).map((btn) =>
      btn.getAttribute("data-tab")
    );
    const currentIndex = tabs.indexOf(this.currentTab);
    if (currentIndex < tabs.length - 1) {
      this.switchTab(tabs[currentIndex + 1]);
    }
  }

  /**
   * Chuyển đến tab trước
   */
  prevTab() {
    const tabs = Array.from(this.tabButtons).map((btn) =>
      btn.getAttribute("data-tab")
    );
    const currentIndex = tabs.indexOf(this.currentTab);
    if (currentIndex > 0) {
      this.switchTab(tabs[currentIndex - 1]);
    }
  }
}

// Export như function builder để dễ sử dụng
export function createTabManager() {
  return new TabManager();
}
