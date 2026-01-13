/\*\*

- TEST_PROMPT_CONFIG.md
- Hướng dẫn test hệ thống cấu hình prompt
  \*/

# 🧪 Hướng Dẫn Test Hệ Thống Cấu Hình Prompt

## Test 1: Load Trang Lần Đầu

**Bước:**

1. Mở DevTools (F12)
2. Xóa localStorage: `localStorage.clear()`
3. Reload trang (Ctrl+R)
4. Mở Tab ⚙️ Cấu Hình

**Kỳ Vọng:**

- ✅ Tất cả input phải có giá trị mặc định
- ✅ "Bắt buộc tất cả mục tiêu" phải checked
- ✅ "Cấm từ chung chung" phải checked
- ✅ "Cho phép emoji" phải unchecked

**Console Check:**

```javascript
// Mở DevTools Console, chạy:
import { loadConfig } from "./Js/promptConfig.js";
const config = loadConfig();
console.table(config);
```

Kỳ vọng: `numComments: 20`, `includeAllObjectives: true`, v.v.

---

## Test 2: Lưu & Tải Config

**Bước:**

1. Tab ⚙️ Cấu Hình
2. Thay đổi "Số lượng nhận xét" từ 20 → 30
3. Thay đổi "Mức độ khác biệt" → "Ít"
4. Uncheck "Bắt buộc tất cả mục tiêu"
5. Check "Cho phép emoji"

**Kỳ Vọng:**

- ✅ Thấy toast ✓ mỗi lần thay đổi
- ✅ Reload trang, config vẫn như vậy

**Console Check:**

```javascript
import { loadConfig } from "./Js/promptConfig.js";
const config = loadConfig();
console.log(config.numComments); // phải là 30
console.log(config.commentVariety); // phải là "low"
console.log(config.includeAllObjectives); // phải là false
console.log(config.allowEmoji); // phải là true
```

---

## Test 3: Khôi Phục Mặc Định

**Bước:**

1. Tab ⚙️ Cấu Hình
2. Bấm nút "🔄 Khôi phục mặc định"
3. Xác nhận confirm
4. Reload trang

**Kỳ Vọng:**

- ✅ Config reset về mặc định
- ✅ Tất cả input trở về giá trị ban đầu

---

## Test 4: Prompt Mặc Định vs Dynamic

**Bước:**

### 4a: Prompt Mặc Định

```javascript
// Console:
import { buildDefaultPrompt } from "./Js/promptBuilder.js";
const prompt = buildDefaultPrompt("Học Scratch");
console.log(prompt);
// Kiểm tra: phải có "20 nhận xét"
// Kiểm tra: phải có "1–2 câu"
// Kiểm tra: phải có "Không dùng emoji"
```

### 4b: Prompt Dynamic (Sau Thay Đổi Config)

```javascript
// Console:
// Đầu tiên, cập nhật config
import { updateConfig } from "./Js/promptConfig.js";
updateConfig({ numComments: 30, commentLength: "2-3" });

// Sau đó, build prompt
import {
  buildPromptWithConfig,
  buildPromptWithConfig,
} from "./Js/promptBuilder.js";
import { loadConfig } from "./Js/promptConfig.js";
const config = loadConfig();
const prompt = buildPromptWithConfig("Học Scratch", config);
console.log(prompt);
// Kiểm tra: phải có "30 nhận xét"
// Kiểm tra: phải có "2–3 câu"
```

---

## Test 5: Sinh Nhận Xét Với Config

**Bước:**

1. Tab ⚙️ Cấu Hình
2. Đặt "Số lượng nhận xét" → 5 (để test nhanh)
3. Tab 📝 Tạo Nhận Xét & Script
4. Nhập: "Học Scratch, mục tiêu: Hiểu cảm biến chuyển động"
5. Bấm ✨ Sinh nhận xét bằng AI

**Kỳ Vọng:**

- ✅ AI sinh 5 nhận xét (không phải 20)
- ✅ Prompt phải dùng config mới

**Console Check:**

```javascript
// Mở Network tab, tìm request tới `/api/gemini`
// Nhấp vào request, xem body
// Kiểm tra: có "CHÍNH XÁC 5 nhận xét" trong prompt không
```

---

## Test 6: Flag useUserConfig

**Bước:**

```javascript
// Console:
import { setUseUserConfig } from "./Js/gemini.js";

// Trước:
setUseUserConfig(false);
// Sinh nhận xét → dùng prompt mặc định (20 nhận xét)

// Sau:
setUseUserConfig(true);
import { updateConfig } from "./Js/promptConfig.js";
updateConfig({ numComments: 15 });
// Sinh nhận xét → dùng prompt dynamic (15 nhận xét)
```

---

## Test 7: UI Elements

**Bước:**

1. Tab ⚙️ Cấu Hình
2. Kiểm tra tất cả input tồn tại:
   - `#configNumComments` ✅
   - `#configIncludeAllObjectives` ✅
   - `#configCommentVariety` ✅
   - `#configCommentLength` ✅
   - `#configTone` ✅
   - `#configAllowEmoji` ✅
   - `#configBanGenericWords` ✅
   - `#resetConfigBtn` ✅

**Console Check:**

```javascript
const elements = [
  "configNumComments",
  "configIncludeAllObjectives",
  "configCommentVariety",
  "configCommentLength",
  "configTone",
  "configAllowEmoji",
  "configBanGenericWords",
  "resetConfigBtn",
];

elements.forEach((id) => {
  const elem = document.getElementById(id);
  console.log(`${id}: ${elem ? "✓" : "✗"}`);
});
```

---

## Test 8: localStorage

**Bước:**

```javascript
// Console:
// Check localStorage key
const stored = localStorage.getItem("toolkapla_prompt_config");
console.log(stored);
// Kỳ vọng: JSON object

// Parse và check:
const config = JSON.parse(stored);
console.table(config);
```

---

## Test 9: Backward Compatibility

**Bước:**

1. Cấu hình gốc (chưa thay đổi gì)
2. Sinh nhận xét
3. Kiểm tra có nhận xét không

**Kỳ Vọng:**

- ✅ Hoạt động y hệt như trước
- ✅ Sinh được nhận xét bình thường

---

## Test 10: Reset Sau Mỗi Test

**Bước:**

```javascript
// Console:
localStorage.clear();
location.reload();
```

---

## Debugging Tips

### 1. Kiểm tra Config Được Load

```javascript
import { loadConfig, DEFAULT_CONFIG } from "./Js/promptConfig.js";
console.log("Current:", loadConfig());
console.log("Default:", DEFAULT_CONFIG);
```

### 2. Kiểm tra Prompt Được Build

```javascript
import {
  buildDefaultPrompt,
  buildPromptWithConfig,
} from "./Js/promptBuilder.js";
const lesson = "Học Scratch";
console.log(buildDefaultPrompt(lesson));
```

### 3. Kiểm tra UI Listeners

```javascript
// Mở DevTools Sources
// Breakpoint ở trong setupEventListeners()
// Thay đổi input, kiểm tra breakpoint được hit
```

### 4. Kiểm tra API Call

```javascript
// Network tab → Filter "gemini"
// Thay đổi config
// Sinh nhận xét
// Xem request body có chứa config không
```

---

## Checklist Hoàn Thiện

- [ ] Test 1: Load trang lần đầu
- [ ] Test 2: Lưu & tải config
- [ ] Test 3: Khôi phục mặc định
- [ ] Test 4: Prompt mặc định vs dynamic
- [ ] Test 5: Sinh nhận xét với config
- [ ] Test 6: Flag useUserConfig
- [ ] Test 7: UI elements tồn tại
- [ ] Test 8: localStorage hoạt động
- [ ] Test 9: Backward compatibility
- [ ] Test 10: Reset sau test

---

## Common Issues

| Vấn Đề                | Nguyên Nhân           | Giải Pháp                        |
| --------------------- | --------------------- | -------------------------------- |
| Config không lưu      | localStorage disabled | Kiểm tra settings trình duyệt    |
| Config reset          | localStorage cleared  | Normal, bấm "Khôi phục mặc định" |
| Prompt không thay đổi | useUserConfig = false | Bấm "Sinh nhận xét" để activate  |
| UI không hiển thị     | ID không trùng        | Kiểm tra id trong HTML vs JS     |
| Error import          | Path sai              | Kiểm tra relative path           |
