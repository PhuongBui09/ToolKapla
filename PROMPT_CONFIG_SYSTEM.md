# 📚 Hệ Thống Cấu Hình Prompt AI Động

## 📋 Tóm Tắt

Hệ thống cho phép giáo viên cấu hình cách AI viết nhận xét thông qua giao diện trực quan ở Tab ⚙️ Cấu Hình, mà không cần chỉnh sửa prompt raw text.

## 🏗️ Cấu Trúc Hệ Thống

### File Mới Được Tạo:

1. **`Js/promptConfig.js`**

   - Quản lý cấu hình prompt
   - Lưu/tải config từ localStorage
   - Export `DEFAULT_CONFIG`, `loadConfig()`, `saveConfig()`, `resetConfig()`, `updateConfig()`

2. **`Js/promptBuilder.js`**

   - Xây dựng prompt động dựa trên config
   - `buildPromptWithConfig(lessonContent, config)` - Tạo prompt với config user
   - `buildDefaultPrompt(lessonContent)` - Tạo prompt mặc định (100% giống aiPrompt.js gốc)
   - `getDefaultPromptBase()` - Export BASE_PROMPT để reference

3. **`Js/promptConfigUI.js`**
   - Quản lý UI cấu hình prompt
   - `initPromptConfigUI()` - Khởi tạo UI
   - `populateConfigUI(config)` - Điền dữ liệu vào form
   - `setupEventListeners()` - Setup các listeners để lưu config khi thay đổi
   - `getConfigFromUI()` - Lấy config từ UI (không lưu)

### File Được Cập Nhật:

1. **`Js/aiPrompt.js`** (Viết lại)

   - `buildPrompt(lessonContent)` - Gọi buildDefaultPrompt
   - `buildPromptWithUserConfig(lessonContent)` - Gọi buildPromptWithConfig với loadConfig()

2. **`Js/gemini.js`**

   - Thêm `setUseUserConfig(value)` - Flag để chọn dùng config hay prompt mặc định
   - Cập nhật `generateCommentsFromGemini()` để dùng user config khi flag bật

3. **`Js/main.js`**

   - Import `initPromptConfigUI` từ promptConfigUI.js
   - Import `setUseUserConfig` từ gemini.js
   - Gọi `initPromptConfigUI()` trong DOMContentLoaded
   - Gọi `setUseUserConfig(true)` trong `generateCommentsByAI()`

4. **`index.html`** (Tab ⚙️ Cấu Hình)

   - Thêm section 🤖 Cấu Hình Prompt AI với các input:
     - Số lượng nhận xét (1-100)
     - Bắt buộc tất cả mục tiêu (checkbox)
     - Mức độ khác biệt (select: ít/vừa)
     - Độ dài nhận xét (select: 1-2 / 2-3 câu)
     - Giọng văn (select: sư phạm / trung tính / thân thiện)
     - Cho phép emoji (checkbox)
     - Cấm từ chung chung (checkbox)
     - Nút "🔄 Khôi phục mặc định"

5. **`styles.css`**
   - Thêm CSS cho:
     - `.config-group` - Nhóm cấu hình
     - `.config-group label`, `select`, `input`
     - `.checkbox-label` - Label cho checkbox
     - `.btn-secondary` - Style nút khôi phục
     - `.input-with-unit` - Input với đơn vị
     - `.unit` - Hiển thị đơn vị

## 🔄 Luồng Hoạt Động

### 1. Khởi Tạo (DOMContentLoaded)

```
→ initPromptConfigUI()
  → loadConfig() từ localStorage
  → populateConfigUI() điền vào form
  → setupEventListeners() lắng nghe thay đổi
```

### 2. Người dùng Thay Đổi Config

```
→ User chọn option/nhập giá trị
→ Event listener kích hoạt
→ updateConfig() lưu vào localStorage
→ Toast hiển thị thông báo
```

### 3. Người dùng Sinh Nhận Xét

```
→ generateCommentsByAI() được gọi
  → setUseUserConfig(true) - Bật flag dùng config
  → generateCommentsFromGemini() được gọi
    → useUserConfig = true → gọi buildPromptWithUserConfig()
    → loadConfig() từ localStorage
    → buildPromptWithConfig(lessonContent, config) tạo prompt
    → Gửi prompt tới Gemini API
```

### 4. Khôi Phục Mặc Định

```
→ User bấm "🔄 Khôi phục mặc định"
→ Xác nhận
→ resetConfig() xóa localStorage
→ populateConfigUI(DEFAULT_CONFIG)
→ Toast thông báo
```

## 📝 Config Default

```javascript
{
  numComments: 20,                    // Số nhận xét
  includeAllObjectives: true,         // Bắt buộc tất cả mục tiêu
  commentVariety: "medium",           // "low" | "medium"
  commentLength: "1-2",               // "1-2" | "2-3"
  tone: "pedagogical",                // "pedagogical" | "neutral" | "friendly"
  allowEmoji: false,                  // true | false
  banGenericWords: true,              // true | false
}
```

## 🎯 Cách Prompt Được Xây Dựng

### BASE_PROMPT (Không đổi)

```
- Role: Giáo viên trực tiếp đứng lớp
- Mục đích: Viết nhận xét cho phụ huynh
- Nguyên tắc bắt buộc: Bao gồm tất cả mục tiêu, không bỏ sót
```

### INSTRUCTIONS DYNAMIC (Dựa trên Config)

```
- Số lượng nhận xét từ config.numComments
- Yêu cầu bao gồm tất cả mục tiêu (nếu config.includeAllObjectives)
- Mức độ khác biệt (ít/vừa)
- Độ dài câu (1-2 / 2-3)
- Giọng văn (sư phạm / trung tính / thân thiện)
- Cho phép/cấm emoji
- Cấm từ chung chung (nếu bật)
```

### FINAL PROMPT

```
= BASE_PROMPT + INSTRUCTIONS + LESSON_CONTENT
```

## 💾 LocalStorage

**Key:** `toolkapla_prompt_config`

**Giá trị:** JSON của config object

**Thời gian:** Vô hạn (cho đến khi user reset hoặc clear localStorage)

## ✅ Nguyên Tắc Bảo Toàn

✅ **Không làm hỏng chức năng hiện tại:**

- Logic gọi API Gemini vẫn giữ nguyên
- Các hàm cũ vẫn hoạt động
- Comment history vẫn hoạt động
- Script generator vẫn hoạt động

✅ **Backward Compatible:**

- Nếu không có config trong localStorage, sử dụng DEFAULT_CONFIG
- Nếu user không thay đổi gì, prompt giống 100% với aiPrompt.js gốc

✅ **Dễ Mở Rộng:**

- Muốn thêm option? Thêm vào DEFAULT_CONFIG + promptBuilder.js
- Muốn thay đổi UI? Chỉnh sửa index.html + promptConfigUI.js
- Muốn tùy chỉnh prompt? Sửa BASE_PROMPT trong promptBuilder.js

## 🧪 Testing

1. **Load trang lần đầu:**

   - Config phải là DEFAULT_CONFIG
   - Prompt phải giống aiPrompt.js gốc

2. **Thay đổi một config:**

   - Phải lưu vào localStorage
   - Toast phải hiển thị thông báo
   - Reload trang, config phải giữ nguyên

3. **Sinh nhận xét:**

   - Prompt phải bao gồm config mới
   - Số lượng nhận xét phải đúng

4. **Khôi phục mặc định:**
   - localStorage phải bị xóa
   - Config phải reset về DEFAULT
   - Reload trang, config phải là DEFAULT

## 🚀 Sử Dụng

### Cho Giáo Viên:

1. Mở Tab ⚙️ Cấu Hình
2. Điều chỉnh các tùy chọn muốn (hoặc bỏ qua để dùng mặc định)
3. Các thay đổi được lưu tự động
4. Khi sinh nhận xét, AI sẽ dùng cấu hình mới
5. Nếu muốn quay về mặc định, bấm "🔄 Khôi phục mặc định"

### Code Example:

```javascript
// Lấy config hiện tại
const config = loadConfig();
console.log(config.numComments); // 20

// Cập nhật một option
updateConfig({ numComments: 30 });

// Lấy config sau cập nhật
const newConfig = loadConfig();
console.log(newConfig.numComments); // 30
```

## 📖 Tham Khảo

- **Prompt Base:** promptBuilder.js - BASE_PROMPT constant
- **Config Mặc Định:** promptConfig.js - DEFAULT_CONFIG
- **localStorage Key:** gemini.js - CONFIG_STORAGE_KEY = "toolkapla_prompt_config"
