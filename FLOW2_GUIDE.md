# 📊 Flow 2: Sinh Nhận Xét Theo Điểm

## 🎯 Tính Năng

**Flow 2** cho phép giáo viên **sinh nhận xét tự động dựa trên điểm số** mà học sinh đã có.

### So sánh Flow 1 vs Flow 2

| Tiêu Chí           | Flow 1 (Nhận Xét Chung)                    | Flow 2 (Theo Điểm)                          |
| ------------------ | ------------------------------------------ | ------------------------------------------- |
| **Nguồn nhận xét** | AI sinh động (mô tả buổi học)              | AI sinh kho nhận xét (dựa trên khoảng điểm) |
| **Yêu cầu input**  | Mô tả buổi học                             | Khoảng điểm chủ đạo                         |
| **Cách hoạt động** | Giáo viên chọn nhận xét, script nhập + gửi | AI chạy 1 lần → script map điểm → nhập+gửi  |
| **Linh hoạt**      | Cao (nhận xét độc nhất)                    | Cao (nhận xét được AI sinh cho từng range)  |
| **Tốc độ**         | Phụ thuộc vào AI                           | Nhanh (AI 1 lần, script chạy nhanh console) |

---

## 📋 Hướng Dẫn Sử Dụng Flow 2

### **Bước 1: Chọn Flow 2**

- Trên giao diện tool, chọn radio **"Flow 2 – Theo Điểm (mới)"**
- Phần chọn khoảng điểm sẽ hiển thị

### **Bước 2: Chọn Khoảng Điểm Chủ Đạo Của Lớp**

Chọn **một trong các option**:

- 📌 **8–9 (Lớp khá giỏi)** – Nếu đa số học sinh có điểm từ 8–9
- 📌 **7–9 (Đa số khá)** – Nếu lớp tập trung ở 7–9, khá balanced
- 📌 **6–8 (Trung bình–khá)** – Nếu lớp chủ yếu 6–8, ít học sinh điểm cao
- 📌 **Tự chọn** – Nhập min/max tùy ý (ví dụ: 5–8)

**💡 Lưu ý:** Khoảng điểm này dùng để **phân loại mức** nhận xét:

- **High** (cao): Cho điểm cao nhất trong khoảng
- **Mid** (trung bình): Cho điểm giữa khoảng
- **Neutral** (neutral): Cho điểm dưới khoảng (cần cố gắng hơn)

### **Bước 3: Tạo Script**

- Bấm nút **"🔨 Tạo Script"**
- **Hệ thống sẽ gọi AI 1 lần để sinh kho nhận xét** dựa trên khoảng điểm đã chọn
- AI sẽ sinh **21 nhận xét** (8 mức cao + 8 mức trung + 5 mức neutral)
- Script sẽ được sinh sẵn sàng copy

### **Bước 4: Nhập Điểm Trước**

**⚠️ QUAN TRỌNG:** Trước khi chạy script:

- Mở sổ liên lạc trên web kapla/dotb
- **Nhập đủ điểm** cho tất cả học sinh (field `.homework_score`)
- Script sẽ **ĐỌC** điểm hiện có, KHÔNG ghi đè

### **Bước 5: Chạy Script**

1. Copy script (bấm nút 📋 Copy)
2. Mở **DevTools** (F12) → Tab **Console**
3. Dán script vào console và bấm **Enter**
4. Chấp nhận thông báo confirm
5. Script chạy tự động:
    - ✅ Đọc điểm từ form
    - ✅ Map điểm → mức (high/mid/neutral) dựa trên khoảng chọn
    - ✅ Chọn ngẫu nhiên nhận xét từ kho (do AI đã sinh sẵn)
    - ✅ Nhập nhận xét vào field
    - ✅ Hiển thị panel điều khiển
    - **Note:** Script chỉ map và nhập, không gọi AI thêm

### **Bước 6: Kiểm Tra & Gửi**

- **Panel** hiển thị:
    - 📊 Progress bar
    - ⏸ Nút "Dừng" (pause/resume)
    - ✅ Nút "Gửi" (gửi tất cả)
    - ⚠️ Cảnh báo nếu có học sinh chưa có điểm

**Nếu có lỗi hoặc nhận xét không phù hợp:**

- Bấm ⏸ **"Dừng"** để tạm dừng
- Sửa nhận xét trực tiếp trong form
- Bấm ▶ **"Tiếp tục"** hoặc ✅ **"Gửi"**

---

## 📚 Kho Nhận Xét (COMMENT_BANK) – Sinh Bởi AI

Khi bấm **"Tạo Script"**, hệ thống gọi AI để sinh **21 nhận xét** dựa trên **khoảng điểm** bạn chọn.

### Cấu Trúc Kho Nhận Xét

Mỗi **khoảng điểm** có **3 mức nhận xét**:

- **High (Mức Cao)** – 8 nhận xét cho học sinh điểm cao nhất trong khoảng
- **Mid (Mức Trung)** – 8 nhận xét cho học sinh điểm giữa khoảng
- **Neutral (Mức Neutral)** – 5 nhận xét cho học sinh điểm dưới khoảng (cần cố gắng)

### Ví dụ: Khoảng 8–9 (AI sinh sẵn)

**🌟 High (8.5–9)** – Lời khen cho học sinh giỏi

- "Học sinh tập trung cao, hoàn thành tất cả nhiệm vụ với chất lượng tốt..."
- "Học sinh chủ động tìm tòi, giải quyết vấn đề một cách sáng tạo..."
- "Học sinh nắm vững kiến thức, tham gia tích cực vào các hoạt động lớp..."
- _(và 5 nhận xét khác do AI sinh)_

**📈 Mid (8–8.4)** – Lời khen trung bình cho học sinh khá

- "Học sinh nắm chắc các khái niệm chính, hoàn thành bài tập đúng tiến độ..."
- "Học sinh cộng tác tốt với bạn, hoàn thành các dự án nhóm..."
- _(và 6 nhận xét khác do AI sinh)_

**💪 Neutral (< 8)** – Lời động viên cho học sinh cần cố gắng

- "Học sinh tham dự buổi học, làm quen với nội dung bài, cần tăng cường luyện tập..."
- "Học sinh có thể cải thiện bằng cách ôn tập thêm và tham gia các hoạt động..."
- _(và 3 nhận xét khác do AI sinh)_

**Note:** Các nhận xét được AI sinh **động** dựa trên khoảng điểm. Mỗi lần chọn khoảng khác nhau có thể có nhận xét khác nhau.

---

## ⚙️ Cách Hoạt Động Của Script

### Luồng Xử Lý

1. **Kiểm tra điểm** → Tìm tất cả học sinh có điểm (P/L)
2. **Đọc điểm** → Lấy `.homework_score` từ form, KHÔNG chỉnh sửa
3. **Map điểm** → So sánh với khoảng được chọn:
    - Nếu score ≥ 8.5 → "high"
    - Nếu score ≥ 8.0 → "mid"
    - Nếu score < 8.0 → "neutral"
4. **Chọn nhận xét** → Random 1 nhận xét từ mức tương ứng
5. **Nhập tự động** → Đưa nhận xét vào field comment
6. **Kiểm tra** → Cảnh báo nếu học sinh chưa có điểm
7. **Gửi** → Click "Gửi" khi sẵn sàng

### Bảo Vệ Dữ Liệu

✅ **Script KHÔNG làm những điều này:**

- ❌ Không ghi đè điểm hiện có
- ❌ Không xóa nhận xét cũ
- ❌ Không tự gửi (chờ bấm nút "Gửi")

✅ **Script CHỈ làm:**

- ✅ Đọc điểm
- ✅ Nhập nhận xét
- ✅ Hiển thị cảnh báo

---

## 🔍 Xử Lý Sự Cố

### Vấn đề: Script báo lỗi "Không tìm thấy học sinh"

**Nguyên nhân:** Chưa nhập điểm hoặc không có điểm danh (P/L)
**Cách xử lý:**

1. Quay lại sổ liên lạc
2. Nhập điểm cho học sinh
3. Đảm bảo có điểm danh (P hoặc L)
4. Chạy lại script

### Vấn đề: Nhận xét không phù hợp

**Nguyên nhân:** Khoảng điểm không phù hợp với lớp
**Cách xử lý:**

1. Dừng script (⏸)
2. Bấm "Quay lại" hoặc F5 tải lại trang
3. Chọn khoảng điểm khác
4. Tạo script mới

### Vấn đề: Một vài học sinh chưa có nhận xét

**Nguyên nhân:** Script bỏ qua học sinh không có điểm
**Cách xử lý:**

1. Bấm "Dừng"
2. Nhập điểm cho học sinh
3. Nhập nhận xét thủ công hoặc chạy lại script

---

## 🎓 Lời Khuyên Để Dùng Flow 2 Hiệu Quả

1. **Lựa chọn đúng khoảng điểm** – Chọn khoảng "đại diện" nhất cho lớp
2. **Nhập đủ điểm trước** – Script không thể sinh nhận xét nếu không có điểm
3. **Kiểm tra nhận xét trước khi gửi** – Có thể sửa nếu không hợp lý
4. **Dùng pause khi cần** – Tạm dừng để chỉnh sửa chi tiết
5. **Gửi một lần** – Không nên gửi nhiều lần cùng một nhận xét

---

## 📞 Hỗ Trợ

Nếu có vấn đề:

- ✅ Kiểm tra lại bước nhập điểm
- ✅ Thử chọn khoảng điểm khác
- ✅ Reload trang (F5) và thử lại
- ✅ Kiểm tra console (F12) xem có lỗi gì

---

**Happy teaching! 🎉**
