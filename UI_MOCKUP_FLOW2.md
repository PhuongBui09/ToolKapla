# 🎯 Flow 2 – Mô Tả Giao Diện & Cách Dùng (Với Hình Ảnh Miêu Tả)

## 📸 Giao Diện Sau Khi Cập Nhật

### **Phần 1: Chọn Flow**

```
┌─────────────────────────────────────────────────────┐
│ 🎯 Chọn cách sinh nhận xét                          │
├─────────────────────────────────────────────────────┤
│ ⭕ Flow 1 – Nhận xét chung                          │
│ ⭕ Flow 2 – Theo điểm (mới)                         │
└─────────────────────────────────────────────────────┘
```

**Khi chọn Flow 1** (mặc định):

- Ẩn phần Flow 2 (khoảng điểm)
- Hiển thị phần nhập mô tả buổi học (cũ)
- Bấm "✨ Sinh nhận xét bằng AI" để gọi AI

**Khi chọn Flow 2**:

- Hiển thị phần chọn khoảng điểm (phía dưới)
- Ẩn phần "✨ Sinh nhận xét bằng AI"
- Hiển thị "🔨 Tạo Script" → sẽ gọi AI sinh COMMENT_BANK
- Giáo viên chọn khoảng điểm

---

### **Phần 2: Chọn Khoảng Điểm (Khi Chọn Flow 2)**

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Khoảng điểm chủ đạo của lớp                                  │
├─────────────────────────────────────────────────────────────────┤
│ ⭕ 8–9 (lớp khá giỏi)                                           │
│ ⭕ 7–9 (đa số khá)                                              │
│ ⭕ 6–8 (trung bình–khá)                                         │
│ ⭕ Tự chọn                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### **Phần 3: Tự Chọn Min/Max (Khi Chọn "Tự Chọn")**

```
┌─────────────────────────────────────────────────────────────────┐
│ Từ [ 6 ] đến [ 8 ]                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

### **Phần 4: Mô Tả Buổi Học & Kết Quả (Cập Nhật)**

```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 Mô Tả Buổi Học (Không cần cho Flow 2)                        │
├─────────────────────────────────────────────────────────────────┤
│ Ví dụ: Học Scratch, cảm biến chuyển động...                    │
│ (Để trống khi chọn Flow 2)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

[✨ Sinh nhận xét bằng AI] ← Chỉ cho Flow 1

[🔨 Tạo Script] ← Cho Flow 2 (gọi AI sinh COMMENT_BANK)

┌─────────────────────────────────────────────────────────────────┐
│ 📄 Script Console (Kết Quả)                                     │
├─────────────────────────────────────────────────────────────────┤
│ ⏳ Đang sinh script từ AI...                                    │
│                                                                 │
│ (Sau khi AI trả về COMMENT_BANK):                               │
│ [📋 Copy]                                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Luồng Sử Dụng Flow 2 (Bước Thực Thi)

### **Bước 1: Giao Diện Tool**

```
┌───────────────────────────────────────────────┐
│ 🤖 Tạo Script Nhận Xét & Gửi Tự Động         │
├───────────────────────────────────────────────┤
│ [📝 Tạo Nhận Xét] [📋 Script] [⚙️ Cấu Hình] │
│                                               │
│ 🎯 Chọn cách sinh nhận xét                    │
│ ⭕ Flow 1 – Nhận xét chung                    │
│ ◉ Flow 2 – Theo điểm (mới) ← CHỌN            │
│                                               │
│ 📊 Khoảng điểm chủ đạo                        │
│ ◉ 7–9 (đa số khá) ← CHỌN                     │
│                                               │
│ [🔨 Tạo Script]                              │
│ ↓ Hệ thống gọi AI → sinh COMMENT_BANK        │
└───────────────────────────────────────────────┘
```

### **Bước 2: AI Sinh COMMENT_BANK (Đằng Sau)**

```
[HỆ THỐNG CHẠY]:
1. buildFlow2Prompt("7-9") → Xây dựng prompt
2. Gọi Gemini AI → Sinh 21 nhận xét
3. Nhận JSON {high: [...], mid: [...], neutral: [...]}
4. Nhúng vào script
5. Hiển thị script sẵn sàng

[GIÁO VIÊN CHỈ THẤY]:
⏳ Đang sinh script...
(Sau 2-3 giây) → Script sẵn sàng!
```

### **Bước 3: Script Được Sinh**

```
┌───────────────────────────────────────────────┐
│ 📋 Script: Thêm nhận xét, điểm danh, gửi      │
├───────────────────────────────────────────────┤
│ [📋 Copy]                                     │
│                                               │
│ (async function () {                         │
│   // Flow 2: Map điểm → nhận xét              │
│   const COMMENT_BANK = { ... }    ← AI sinh  │
│   const SCORE_RANGE = "7-9"                  │
│   // Script map & random, không gọi AI       │
│   // ...                                      │
│ })();                                         │
└───────────────────────────────────────────────┘
```

### **Bước 4: Nhập Điểm (Sổ Liên Lạc)**

```
Sổ liên lạc web (kapla.vn / dotb.vn):
┌────────────┬────────┬──────────────┐
│ Học Sinh   │ Điểm   │ Nhận Xét     │
├────────────┼────────┼──────────────┤
│ Nguyễn A   │   8.5  │ (chưa nhập)  │
│ Trần B     │   7.2  │ (chưa nhập)  │
│ Phạm C     │   8.0  │ (chưa nhập)  │
│ ...        │   ...  │ (chưa nhập)  │
└────────────┴────────┴──────────────┘

✅ Tất cả học sinh đã có điểm!
```

### **Bước 5: Mở Console & Chạy Script**

```
1. Bấm F12 → Tab "Console"
2. Dán script
3. Bấm Enter

┌──────────────────────────────────────────────┐
│ > (async function () { ... })();            │
│                                              │
│ ✓ Script nhập nhận xét + điểm danh + điểm   │
│   & gửi. Tiếp tục?                          │
│ [OK]                                        │
└──────────────────────────────────────────────┘
```

### **Bước 5: Panel Điều Khiển Xuất Hiện**

```
┌──────────────────────────────┐
│ 🎓 Flow 2 - Theo Điểm        │ ▼
├──────────────────────────────┤
│ ⏱ PHASE 1: Kiểm tra điểm...  │
│                              │
│ ████████░░░░ 65%             │
│                              │
│ [⏸ Dừng] [✅ Gửi] (disabled)│
│                              │
│ ⚠ 2 học sinh chưa có điểm    │
└──────────────────────────────┘
```

### **Bước 6: Script Đang Chạy**

```
PHASE 1: Kiểm tra điểm ✓
         → Tìm 30 học sinh có P/L

PHASE 2: Đọc điểm & sinh nhận xét
         → Nguyễn A: 8.5 → high → Comment #3
         → Trần B: 7.2 → mid → Comment #1
         → Phạm C: 8.0 → mid → Comment #5
         → ...

Panel Update:
📝 30/30 - "Học sinh tập trung cao, hoàn thành..."
```

### **Bước 7: Script Hoàn Thành**

```
┌──────────────────────────────┐
│ 🎓 Flow 2 - Theo Điểm        │
├──────────────────────────────┤
│ ✅ Hoàn thành! Đã sinh 30    │
│    nhận xét. Bấm "Gửi" để    │
│    hoàn tất.                 │
│                              │
│ ████████████ 100%            │
│                              │
│ [⏸ Dừng] [✅ Gửi] (enabled) │
│                              │
│ ✓ Tất cả 30 học sinh có      │
│   nhận xét                   │
└──────────────────────────────┘
```

### **Bước 8: Kiểm Tra & Gửi**

```
Sổ liên lạc (sau khi script chạy):
┌────────────┬────────┬───────────────────────┐
│ Học Sinh   │ Điểm   │ Nhận Xét              │
├────────────┼────────┼───────────────────────┤
│ Nguyễn A   │   8.5  │ Học sinh tập trung... │
│ Trần B     │   7.2  │ Học sinh nắm chắc... │
│ Phạm C     │   8.0  │ Học sinh hợp tác...  │
│ ...        │   ...  │ ...                   │
└────────────┴────────┴───────────────────────┘

✅ Nhận xét đã được nhập!

Giáo viên kiểm tra:
- ✓ Nhận xét phù hợp?
- ✓ Có lỗi gì?
- ✓ Sẵn sàng gửi?

→ Bấm nút "Gửi" trên sổ hoặc panel
```

---

## 🎨 CSS Style

### **Radio Label Hover Effect**

```css
.radio-label:hover {
  background: rgba(0, 212, 255, 0.1);
}

.radio-label input[type="radio"]:checked ~ span {
  color: #00d4ff;
  font-weight: 600;
}
```

### **Section Flow 2 (Ẩn/Hiển Thị)**

```javascript
// Khi chọn Flow 2:
document.getElementById("flow2ScoreRangeSection").style.display = "block";

// Khi chọn Flow 1:
document.getElementById("flow2ScoreRangeSection").style.display = "none";
```

---

## 🔄 Hành Động & Phản Ứng

| Hành Động         | Phản Ứng                       |
| ----------------- | ------------------------------ |
| Chọn Flow 2       | Hiển thị "Khoảng điểm chủ đạo" |
| Chọn "8-9"        | Ẩn section "Tự chọn"           |
| Chọn "Tự chọn"    | Hiển thị input min/max         |
| Nhập min=5, max=3 | Lỗi: "min > max, không hợp lệ" |
| Bấm "Tạo Script"  | Sinh script cho Flow 2         |
| Copy script       | Toast: "Đã copy script!"       |
| Dán vào console   | Script chạy + panel xuất hiện  |
| Panel: "Dừng"     | Script tạm dừng                |
| Panel: "Tiếp tục" | Script tiếp tục chạy           |
| Panel: "Gửi"      | Gửi tất cả nhận xét            |

---

## 💾 Trạng Thái UI

### **State 1: Flow 1 (Mặc định)**

```
☑ Flow 1 – Nhận xét chung
☐ Flow 2 – Theo điểm

[Ẩn] Khoảng điểm chủ đạo
[Hiển thị] Mô tả buổi học
[Hiển thị] ✨ Sinh nhận xét bằng AI
```

### **State 2: Flow 2**

```
☐ Flow 1 – Nhận xét chung
☑ Flow 2 – Theo điểm

[Hiển thị] Khoảng điểm chủ đạo
         ☑ 8-9
         ☐ 7-9
         ☐ 6-8
         ☐ Tự chọn
[Ẩn] Mô tả buổi học
[Ẩn] ✨ Sinh nhận xét bằng AI
```

### **State 3: Flow 2 + Tự Chọn**

```
[Hiển thị] Khoảng điểm chủ đạo
         ☐ 8-9
         ☐ 7-9
         ☐ 6-8
         ☑ Tự chọn
            [Input: Từ 6 đến 8]
```

---

## ✅ Checklist Triển Khai Hoàn Thành

- ✅ UI: Chọn Flow, chọn khoảng
- ✅ Logic: Flow detection, range validation
- ✅ Script: Sinh Flow 2 script
- ✅ COMMENT_BANK: 60 nhận xét
- ✅ Panel: Progress, pause, send
- ✅ Event Listeners: Toggle, validation
- ✅ CSS: Radio label styling
- ✅ Toast notifications: Success, error, info
- ✅ Documentation: Hướng dẫn đầy đủ

---

**🎉 Flow 2 UI/UX hoàn thành! Sẵn sàng cho giáo viên! 🚀**
