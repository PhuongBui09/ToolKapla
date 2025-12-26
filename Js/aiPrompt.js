export function buildPrompt(lessonContent) {
  return `
Bạn là giáo viên giảng dạy công nghệ cho học sinh.

Dựa trên phần mô tả buổi học dưới đây, hãy viết 20 nhận xét khác nhau để gửi cho phụ huynh, giúp phụ huynh hiểu rõ học sinh đã học được gì và đã thực hiện những hoạt động cụ thể nào trong buổi học.

Yêu cầu:
- Viết bằng tiếng Việt
- Mỗi nhận xét thể hiện một ý khác nhau, không trùng lặp
- Diễn đạt rõ ràng để phụ huynh không cần biết lập trình vẫn hiểu nội dung buổi học
- Nội dung bám sát các hoạt động cụ thể được mô tả (công cụ, sản phẩm, thao tác chính)
- Nội dung phản ánh kiến thức lý thuyết và kỹ năng thực hành (nếu có)
- Chỉ dùng từ “học sinh”, KHÔNG dùng từ “con”
- Giọng văn tích cực, rõ ràng, mang tính sư phạm
- Mỗi nhận xét dài 1–2 câu
- Mỗi nhận xét nằm trên MỘT DÒNG
- KHÔNG đánh số thứ tự
- KHÔNG thêm mở đầu hoặc kết luận

Phần mô tả buổi học:
${lessonContent}
`.trim();
}
