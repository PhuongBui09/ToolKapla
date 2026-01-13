# 🎯 Hướng Dẫn: Cấu Hình Prompt AI Động

## 🚀 Cách Sử Dụng

### Bước 1: Mở Tab Cấu Hình

Bấm vào tab **⚙️ Cấu Hình** trong ứng dụng

### Bước 2: Điều Chỉnh Cấu Hình Prompt AI

Bạn sẽ thấy các tuỳ chọn sau:

| Tuỳ Chọn                    | Mô Tả                                               | Mặc Định |
| --------------------------- | --------------------------------------------------- | -------- |
| 📊 Số lượng nhận xét        | Có bao nhiêu nhận xét AI sẽ sinh                    | 20       |
| 🎯 Bắt buộc tất cả mục tiêu | Mỗi nhận xét phải bao gồm TẤT CẢ mục tiêu/hoạt động | ✅ Bật   |
| ✨ Mức độ khác biệt         | Nhận xét có giống nhau hay khác nhau                | Vừa      |
| 📄 Độ dài mỗi nhận xét      | Mỗi nhận xét dài bao nhiêu câu                      | 1–2 câu  |
| 🎤 Giọng văn                | Phong cách viết nhận xét                            | Sư phạm  |
| 😊 Cho phép emoji           | Có sử dụng emoji hay không                          | ❌ Tắt   |
| ⛔ Cấm từ chung chung       | Không dùng: quy trình, tổng thể, nền tảng...        | ✅ Bật   |

### Bước 3: Các Thay Đổi Được Lưu Tự Động

- Khi bạn thay đổi bất kỳ tuỳ chọn nào, tôi sẽ tự động lưu vào trình duyệt
- Bạn sẽ thấy thông báo ✓ xác nhận
- Khi reload trang, cấu hình sẽ được giữ nguyên

### Bước 4: Sinh Nhận Xét

1. Quay lại Tab 📝 **Tạo Nhận Xét & Script**
2. Nhập mô tả buổi học
3. Bấm **✨ Sinh nhận xét bằng AI**
4. AI sẽ sử dụng cấu hình mà bạn vừa đặt

### Bước 5: Khôi Phục Mặc Định (Tùy Chọn)

Nếu muốn quay lại cấu hình ban đầu:

- Bấm nút **🔄 Khôi phục mặc định**
- Xác nhận
- Tất cả cấu hình sẽ được reset

## 📝 Ví Dụ Cấu Hình

### Ví Dụ 1: Nhận Xét Chi Tiết & Đa Dạng

- 📊 30 nhận xét
- 🎯 Bắt buộc tất cả mục tiêu ✅
- ✨ Mức độ khác biệt: Vừa
- 📄 2–3 câu
- 🎤 Sư phạm
- ⛔ Cấm từ chung chung ✅

### Ví Dụ 2: Nhận Xét Ngắn Gọn & Chuẩn Mực

- 📊 20 nhận xét (mặc định)
- 🎯 Bắt buộc tất cả mục tiêu ✅
- ✨ Mức độ khác biệt: Ít (nhanh hơn)
- 📄 1–2 câu
- 🎤 Trung tính
- ⛔ Cấm từ chung chung ✅

### Ví Dụ 3: Nhận Xét Thân Thiện

- 📊 25 nhận xét
- 🎯 Bắt buộc tất cả mục tiêu ✅
- ✨ Mức độ khác biệt: Vừa
- 📄 1–2 câu
- 🎤 Thân thiện
- 😊 Cho phép emoji ✅

## ⚙️ Cách Thức Hoạt Động

### Prompt Được Xây Dựng Như Thế Nào?

```
Prompt = Prompt Gốc + Hướng Dẫn Từ Config + Mô Tả Buổi Học
```

**Prompt Gốc:** Luôn giữ nguyên

- Role: Giáo viên
- Mục đích: Viết nhận xét cho phụ huynh
- Nguyên tắc: Bao gồm tất cả mục tiêu

**Hướng Dẫn Từ Config:** Thay đổi tùy theo cấu hình của bạn

- Số lượng nhận xét
- Độ dài
- Giọng văn
- v.v.

### Dữ Liệu Được Lưu Ở Đâu?

Cấu hình được lưu trong **Local Storage** của trình duyệt:

- ✅ Dữ liệu chỉ lưu trên máy của bạn
- ✅ Không gửi lên server
- ✅ Sẽ được xóa nếu bạn xóa lịch sử trình duyệt
- ✅ Khác nhau cho mỗi trình duyệt/máy

## ❓ Câu Hỏi Thường Gặp

**Q: Cấu hình này ảnh hưởng gì đến chất lượng nhận xét?**

A: Cấu hình chỉ điều chỉnh cách AI viết nhận xét (số lượng, độ dài, giọng văn), không ảnh hưởng đến chất lượng nội dung. Prompt gốc vẫn bảo đảm nhận xét cụ thể và bao gồm tất cả mục tiêu.

**Q: Nếu tôi không thay đổi gì, AI viết tương tự như trước không?**

A: Có! Nếu bạn để mặc định, AI sẽ viết nhận xét 100% giống như trước đây. Bạn chỉ cần thay đổi những gì bạn muốn.

**Q: Tôi có thể xóa cấu hình không?**

A: Có, bấm **🔄 Khôi phục mặc định** sẽ xóa hết cấu hình của bạn và quay về mặc định.

**Q: Cấu hình có được lưu khi tôi đóng trình duyệt không?**

A: Có, cấu hình sẽ được giữ nguyên cho đến khi bạn xóa nó hoặc xóa lịch sử trình duyệt.

**Q: Tôi có thể dùng cấu hình khác nhau cho các buổi học khác nhau không?**

A: Hiện tại, bạn chỉ có thể có một cấu hình. Nếu muốn thay đổi, hãy điều chỉnh các tuỳ chọn rồi sinh nhận xét.

## 💡 Mẹo

1. **Thử nghiệm:** Hãy thử các cấu hình khác nhau để tìm phong cách phù hợp nhất
2. **Số lượng:** Nếu muốn nhận xét đa dạng hơn, tăng số lượng lên
3. **Giọng văn:** "Thân thiện" phù hợp với lớp nhỏ, "sư phạm" cho báo cáo chính thức
4. **Khôi phục:** Nếu không chắc, luôn có thể khôi phục mặc định

## 📞 Hỗ Trợ

Nếu gặp vấn đề:

1. Reload trang (F5)
2. Khôi phục cấu hình mặc định
3. Thử lại

Cấu hình không bao giờ làm hỏng ứng dụng - nó chỉ thay đổi cách AI viết!

---

**Chúc bạn sử dụng vui vẻ! 🎉**
