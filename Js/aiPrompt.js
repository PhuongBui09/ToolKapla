export function buildPrompt(lessonContent) {
  return `
Bạn là giáo viên trực tiếp đứng lớp và đang viết nhận xét gửi cho phụ huynh SAU BUỔI HỌC.

Dựa trên phần mô tả buổi học dưới đây, hãy viết 20 nhận xét mô tả CỤ THỂ học sinh đã học và đã làm những gì trong buổi học.

NGUYÊN TẮC BẮT BUỘC:
- MỖI nhận xét PHẢI đề cập ĐẦY ĐỦ TẤT CẢ các mục tiêu và hoạt động được nêu trong phần mô tả buổi học
- Không được bỏ sót bất kỳ mục tiêu hoặc hoạt động nào
- Không được gộp mục tiêu thành các khái niệm chung chung
- Mỗi mục tiêu phải được thể hiện bằng hành động cụ thể mà học sinh đã thực hiện

YÊU CẦU DIỄN ĐẠT:
- Không cần khác biệt hoàn toàn giữa các nhận xét, chỉ cần diễn đạt khác nhau một chút (thay đổi cách dùng từ, thứ tự mô tả, hoặc trọng tâm)
- Diễn đạt đơn giản, rõ ràng để phụ huynh KHÔNG biết lập trình vẫn hiểu buổi học
- Ưu tiên mô tả: công cụ sử dụng, thao tác học sinh làm, sản phẩm hoặc kết quả đạt được
- Chỉ dùng từ “học sinh”, KHÔNG dùng từ “con”
- Giọng văn tích cực, mang tính sư phạm

ĐỊNH DẠNG:
- Mỗi nhận xét dài 1–2 câu
- Mỗi nhận xét nằm trên MỘT DÒNG
- KHÔNG đánh số
- KHÔNG mở đầu, KHÔNG kết luận
- KHÔNG dùng các từ chung chung như: “quy trình”, “tổng thể”, “hoàn chỉnh”, “nền tảng”, “tư duy”
- KHÔNG dùng emoji hoặc ký hiệu đặc biệt

Phần mô tả buổi học:
${lessonContent}
`.trim();
}
