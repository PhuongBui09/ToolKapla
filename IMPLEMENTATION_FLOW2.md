# 🎯 Flow 2: Sinh Nhận Xét Theo Điểm - Tài Liệu Triển Khai

## 📋 Tóm Tắt Triển Khai

Đây là tài liệu chi tiết về triển khai **Flow 2: Sinh Nhận Xét Theo Điểm** cho tool ToolKapla.

---

## 🏗️ Cấu Trúc File Được Thêm/Cập Nhật

### File Mới Tạo

1. **[Js/promptFlow2.js](Js/promptFlow2.js)** (NEW)
    - Định nghĩa AI system prompt cho Flow 2
    - Hàm `buildFlow2Prompt(scoreRange)` để xây dựng prompt cải tiến
    - Yêu cầu AI sinh 21 nhận xét JSON: {high: 8, mid: 8, neutral: 5}

2. **[Js/scriptGenerator2.js](Js/scriptGenerator2.js)** (REFACTORED)
    - Class `ScriptGeneratorFlow2` để sinh script
    - Sinh script JS hoàn chỉnh chạy trong console
    - Script độc lập với UI, chỉ đọc điểm hiện có
    - **NEW:** Method `setCommentBank(bank)` - nhận COMMENT_BANK từ AI

3. **[FLOW2_GUIDE.md](FLOW2_GUIDE.md)**
    - Hướng dẫn đầy đủ cho giáo viên
    - Các bước từng bước
    - Xử lý sự cố
    - Lời khuyên sử dụng

4. **[FLOW2_COMMENT_BANK.html](FLOW2_COMMENT_BANK.html)** (DEPRECATED)
    - Demo hiển thị kho nhận xét mẫu (cho giáo viên xem)
    - **Note:** Khoá không còn cần do AI sinh sẵn

### File Được Cập Nhật

1. **[Js/gemini.js](Js/gemini.js)**
    - Hàm `generateCommentsFromGemini(prompt, callback, isJSONMode)`
    - **NEW:** Parameter `isJSONMode = false`
    - Khi `isJSONMode = true`: trả về JSON trực tiếp, không cache

2. **[Js/main.js](Js/main.js)**
    - Import `buildFlow2Prompt` từ promptFlow2.js
    - Cập nhật `generateScriptsUI()` thành **async**
    - **NEW:** Gọi AI với buildFlow2Prompt() khi Flow 2
    - Chuyển COMMENT_BANK từ AI sang scriptGenerator2

3. **[index.html](index.html)** (5 section mới)
    - Chọn Flow (Flow 1 / Flow 2)
    - Nếu Flow 2, chọn khoảng điểm (8-9, 7-9, 6-8, custom)
    - Nếu custom, nhập min/max

4. **[styles.css](styles.css)** (thêm CSS cho radio-label)
    - Style cho radio buttons
    - Responsive design
    - Hover effects

5. **[QUICK_START.md](QUICK_START.md)**
    - Cập nhật: Flow 2 sử dụng AI sinh COMMENT_BANK 1 lần
    - Cập nhật: Script không gọi API, chỉ map & random

---

## 📊 Luồng Hoạt Động (Flow 2)

```
1. Giáo viên chọn Flow 2
   ↓
2. Chọn khoảng điểm chủ đạo (8-9 / 7-9 / 6-8 / custom)
   ↓
3. Bấm "Tạo Script"
   ↓
4. [AI CHẠY 1 LẦN] → Sinh COMMENT_BANK dựa trên khoảng đã chọn
   ↓
5. Script được sinh sẵn (có chứa COMMENT_BANK) → Copy
   ↓
6. Dán script vào console
   ↓
7. Script chạy:
   - Đọc điểm từ form
   - Map điểm → mức (high/mid/neutral)
   - Random comment từ COMMENT_BANK (do AI sinh)
   - Nhập tự động vào form
   - Panel hiển thị progress
   ↓
8. Bấm "Gửi" để hoàn tất
```

**Note:** AI chỉ chạy ở bước 4, script không gọi API thêm.

---

## 🎓 Kho Nhận Xét (COMMENT_BANK) – Sinh Bởi AI

### Cấu Trúc

```javascript
COMMENT_BANK = {
  high: [8 nhận xét do AI sinh],
  mid: [8 nhận xét do AI sinh],
  neutral: [5 nhận xét do AI sinh]
}
```

**Tổng cộng:** 21 nhận xét mỗi lần chọn khoảng

### Cách Hoạt Động

Khi giáo viên bấm **"Tạo Script"** với khoảng điểm cụ thể:

1. Hệ thống gọi **Gemini AI**
2. AI sinh **21 nhận xét mới** (không cố định) dựa trên khoảng điểm
3. COMMENT_BANK được **nhúng vào script** console
4. Script sau đó chỉ **map & random**, không gọi API thêm

### Phân Loại Theo Khoảng Điểm

- **8-9 (Lớp khá giỏi)**
    - high: 8.5–9 (lời khen cho giỏi)
    - mid: 8–8.4 (lời khen trung bình)
    - neutral: < 8 (lời động viên)

- **7-9 (Đa số khá)**
    - high: 8.5–9
    - mid: 7–8.4
    - neutral: < 7

- **6-8 (Trung bình–khá)**
    - high: 7.5–8
    - mid: 6–7.4
    - neutral: < 6

- **custom** (mặc định nếu chọn "Tự chọn")
    - high: (max-0.5)–10
    - mid: (min)–(max-0.5)
    - neutral: < min

### Đặc Điểm Nhận Xét (được AI sinh)

✅ **Sư phạm** - Chuyên nghiệp, tích cực
✅ **Tích cực** - Động viên, không phê bình
✅ **Không nhắc điểm** - Tập trung vào hành động
✅ **Sổ liên lạc** - Phù hợp với phụ huynh

---

## 🔧 Cấu Hình & Tùy Chọn

### Khoảng Điểm

- Có 4 option có sẵn: 8-9, 7-9, 6-8, custom
- Nếu chọn "Tự chọn", giáo viên nhập min (1-10) và max (1-10)
- Min phải ≤ Max

### Khoảng Phân Loại

Mỗi khoảng điểm được phân thành 3 mức:

- **High**: Mức cao nhất trong khoảng
- **Mid**: Mức giữa
- **Neutral**: Dưới khoảng (cần cố gắng)

---

## 💻 Script JS Sinh Ra

### Đặc Điểm

- Chạy trực tiếp trong console trình duyệt (F12)
- Không cần thư viện ngoài (pure JavaScript)
- Độc lập với UI tool
- Chỉ đọc dữ liệu, không ghi đè

### Chức Năng Chính

1. ✅ Kiểm tra học sinh có điểm (P/L)
2. ✅ Đọc điểm hiện có
3. ✅ Map điểm → mức → random comment
4. ✅ Nhập comment tự động
5. ✅ Hiển thị panel điều khiển
6. ✅ Kiểm tra thiếu dữ liệu
7. ✅ Gửi sau khi người dùng xác nhận

### Panel Điều Khiển

- 📊 Progress bar (%)
- ⏸ Nút Dừng/Tiếp tục (pause/resume)
- ✅ Nút Gửi (gửi tất cả)
- ⚠️ Cảnh báo nếu thiếu điểm

---

## 🛡️ Bảo Vệ Dữ Liệu

### Script KHÔNG làm:

- ❌ Ghi đè điểm hiện có
- ❌ Xóa nhận xét cũ
- ❌ Tự động gửi (chờ người dùng xác nhận)
- ❌ Sửa danh sách học sinh

### Script CHỈ làm:

- ✅ Đọc điểm từ form
- ✅ Nhập nhận xét
- ✅ Hiển thị progress & cảnh báo

---

## 📝 Ví Dụ Sử Dụng Flow 2

### Bước 1: Chọn Flow 2

```
☑ Flow 2 – Theo điểm (mới)
```

### Bước 2: Chọn Khoảng Điểm

```
☑ 7–9 (đa số khá)
```

### Bước 3: Bấm "Tạo Script"

→ Script được sinh sẵn

### Bước 4: Copy & Chạy Trong Console

```javascript
// Dán script vào console (F12)
// Script tự động:
// - Tìm 30 học sinh có P/L
// - Đọc điểm từ form
// - Map: 8.5+ → high, 7+ → mid, <7 → neutral
// - Nhập 30 nhận xét khác nhau (random)
// - Hiển thị: 30/30 hoàn thành ✅
```

### Bước 5: Kiểm Tra & Gửi

```
⏸ Dừng  |  ✅ Gửi

Hoàn thành! 30 nhận xét đã được nhập.
Hãy kiểm tra trước khi bấm "Gửi".
```

---

## 🐛 Xử Lý Sự Cố Thường Gặp

| Vấn Đề                               | Nguyên Nhân                      | Cách Xử Lý                       |
| ------------------------------------ | -------------------------------- | -------------------------------- |
| Script báo "Không tìm thấy học sinh" | Chưa nhập điểm hoặc không có P/L | Quay lại, nhập điểm, chạy lại    |
| Nhận xét không phù hợp               | Khoảng điểm sai                  | Chọn khoảng khác, tạo script mới |
| Một vài học sinh chưa có comment     | Học sinh không có điểm           | Bấm Dừng, nhập điểm, tiếp tục    |
| Script bị lỗi                        | Lỗi kết nối web                  | Refresh trang (F5), thử lại      |

---

## 🎯 Tiêu Chí Thành Công

✅ **Giáo viên không cần học lại** - UI quen thuộc, chỉ thêm chọn Flow
✅ **Không sợ ghi đè điểm** - Script chỉ đọc điểm
✅ **Nhận xét hợp lý** - AI sinh động, 21 nhận xét/khoảng
✅ **Script ổn định** - Chạy trong console, ít bug
✅ **AI không lộ** - Giáo viên không thấy/tương tác với AI, script tự chứa COMMENT_BANK

---

## 📂 Danh Sách File Đầy Đủ

```
ToolKapla/
├── index.html                      (cập nhật: +UI chọn Flow)
├── styles.css                      (cập nhật: +CSS radio-label)
├── Js/
│   ├── main.js                     (cập nhật: +logic Flow)
│   ├── promptConfig2.js            (MỚI: COMMENT_BANK)
│   ├── scriptGenerator2.js         (MỚI: sinh script Flow 2)
│   ├── promptBuilder.js            (không thay đổi)
│   ├── scriptGenerator.js          (không thay đổi)
│   ├── gemini.js                   (không thay đổi)
│   ├── toast.js                    (không thay đổi)
│   ├── tabManager.js               (không thay đổi)
│   ├── aiPrompt.js                 (không thay đổi)
│   └── promptConfigUI.js           (không thay đổi)
├── api/
│   └── gemini.js                   (không thay đổi)
├── FLOW2_GUIDE.md                  (MỚI: hướng dẫn cho giáo viên)
├── FLOW2_COMMENT_BANK.html         (MỚI: demo kho nhận xét)
└── README.md                       (hiện tại)
```

---

## 📞 Hỗ Trợ & Phát Triển

### Để thêm khoảng điểm mới:

1. Mở `Js/promptConfig2.js`
2. Thêm vào `COMMENT_BANKS` object
3. Mỗi mức 5 nhận xét
4. Cập nhật range mapping trong `mapScoreToLevel()`

### Để sửa nhận xét:

1. Mở `Js/promptConfig2.js`
2. Tìm khoảng điểm muốn sửa
3. Chỉnh sửa nhận xét trực tiếp
4. Script sẽ sử dụng nhận xét mới

### Để test:

1. Mở tool trên browser
2. Chọn Flow 2
3. Chọn khoảng điểm
4. Bấm "Tạo Script"
5. Copy & test trong console

---

## ✨ Lợi Ích Của Flow 2

1. **Nhanh** - Sinh nhận xét tức thì từ kho
2. **An toàn** - Không liên quan AI, dữ liệu cố định
3. **Linh hoạt** - Có 4 khoảng có sẵn + tự chọn
4. **Không phức tạp** - UI giao diện cũ, chỉ thêm chọn
5. **Tiết kiệm** - Không phụ thuộc API AI, không tính tiền

---

**🎉 Triển khai thành công! Giáo viên có thể bắt đầu dùng Flow 2 ngay!**
