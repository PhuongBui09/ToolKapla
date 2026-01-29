/**
 * promptFlow2.js (Prompt Chung cho Flow 1 & Flow 2)
 *
 * Dựa trên base prompt từ promptBuilder.js
 * Flow 1: Sinh 20 nhận xét chung (không chia mức)
 * Flow 2: Sinh 15 nhận xét chia theo HIGH/MID/LOW dựa trên khoảng điểm
 */

const BASE_PROMPT = `
Bạn là giáo viên trực tiếp đứng lớp và đang viết nhận xét gửi cho phụ huynh SAU BUỔI HỌC.

Dựa trên phần mô tả buổi học dưới đây, hãy viết nhận xét mô tả CỤ THỤ học sinh đã học và đã làm những gì trong buổi học, đồng thời nêu ngắn gọn thái độ học tập (ví dụ: tập trung, hợp tác, chủ động).

NGUYÊN TẮC BẮT BUỘC:
- MỖI nhận xét PHẢI đề cập ĐẦY ĐỦ TẤT CẢ các mục tiêu và hoạt động được nêu trong phần mô tả buổi học
- Không được bỏ sót bất kỳ mục tiêu hoặc hoạt động nào
- Không được gộp mục tiêu thành các khái niệm chung chung
- Mỗi mục tiêu phải được thể hiện bằng hành động cụ thể mà học sinh đã thực hiện
- Ngoài mô tả hành động, phải có thêm một ý ngắn gọn về thái độ học tập

YÊU CẦU DIỄN ĐẠT:
- Diễn đạt đơn giản, rõ ràng để phụ huynh KHÔNG biết lập trình vẫn hiểu buổi học
- Ưu tiên mô tả: công cụ sử dụng, thao tác học sinh làm, sản phẩm hoặc kết quả đạt được
- Chỉ dùng từ "học sinh", KHÔNG dùng từ "con"

ĐỊNH DẠNG:
- Mỗi nhận xét nằm trên MỘT DÒNG
- KHÔNG đánh số
- KHÔNG mở đầu, KHÔNG kết luận
`;

/**
 * Build instructions dựa trên config (giống promptBuilder.js)
 */
function buildInstructions(config) {
    let instructions = [];

    // Yêu cầu bao gồm tất cả mục tiêu
    if (config.includeAllObjectives) {
        instructions.push(`- Bắt buộc: Mỗi nhận xét phải bao gồm TẤT CẢ các mục tiêu/hoạt động`);
    } else {
        instructions.push(`- Được phép: Một số nhận xét có thể tập trung vào một vài mục tiêu`);
    }

    // Mức độ khác biệt
    if (config.commentVariety === 'low') {
        instructions.push(`- Các nhận xét có thể tương tự nhau (chỉ thay đổi cách dùng từ)`);
    } else {
        instructions.push(`- Thay đổi cách diễn đạt, thứ tự mô tả, và trọng tâm giữa các nhận xét`);
    }

    // Độ dài nhận xét + cấu trúc câu
    if (config.commentLength === '1-2') {
        instructions.push(`- Mỗi nhận xét dài 1–2 câu`);
        instructions.push(`- Một câu mô tả hành động cụ thể, một câu nêu thái độ học tập`);
        instructions.push(
            `- KHÔNG dùng các cụm: "qua đó", "qua bài học", "giúp học sinh", "rèn luyện"`,
        );
    } else if (config.commentLength === '2-3') {
        instructions.push(`- Mỗi nhận xét dài 2–3 câu`);
        instructions.push(
            `- Cấu trúc BẮT BUỘC: Câu 1 mô tả hành động, Câu 2 (hoặc 3) nêu thái độ học tập`,
        );
    }

    // Giọng văn
    if (config.tone === 'pedagogical') {
        instructions.push(`- Giọng văn: Tích cực, mang tính sư phạm, chuyên nghiệp`);
    } else if (config.tone === 'neutral') {
        instructions.push(`- Giọng văn: Trung tính, khách quan`);
    } else if (config.tone === 'friendly') {
        instructions.push(`- Giọng văn: Thân thiện, gần gũi`);
    }

    // Emoji
    if (!config.allowEmoji) {
        instructions.push(`- KHÔNG dùng emoji hoặc ký hiệu đặc biệt`);
    }

    // Từ chung chung
    if (config.banGenericWords) {
        instructions.push(
            `- KHÔNG dùng các từ chung chung như: "quy trình", "tổng thể", "hoàn chỉnh", "nền tảng", "tư duy"`,
        );
    }

    return instructions.join('\n');
}

/**
 * Build prompt cho Flow 1: Sinh 20 nhận xét chung với config
 * @param {string} lessonDescription - Mô tả buổi học
 * @param {object} config - Cấu hình (numComments, includeAllObjectives, commentVariety, commentLength, tone, allowEmoji, banGenericWords)
 * @returns {string} Prompt cho AI
 */
export function buildPromptFlow1(lessonDescription, config = null) {
    let instructions = '';

    if (config) {
        instructions = buildInstructions(config);
        instructions = `- Viết CHÍNH XÁC ${config.numComments} nhận xét (không nhiều hơn, không ít hơn)\n${instructions}`;
    } else {
        // Fallback (nếu không có config)
        instructions = `- Viết CHÍNH XÁC 20 nhận xét (không nhiều hơn, không ít hơn)
- Bắt buộc: Mỗi nhận xét phải bao gồm TẤT CẢ các mục tiêu/hoạt động
- Thay đổi cách diễn đạt, thứ tự mô tả, và trọng tâm giữa các nhận xét
- Mỗi nhận xét dài 1–2 câu
- Một câu mô tả hành động cụ thể, một câu nêu thái độ học tập
- KHÔNG dùng các cụm: "qua đó", "qua bài học", "giúp học sinh", "rèn luyện"
- Giọng văn: Tích cực, mang tính sư phạm, chuyên nghiệp
- KHÔNG dùng emoji hoặc ký hiệu đặc biệt
- KHÔNG dùng các từ chung chung như: "quy trình", "tổng thể", "hoàn chỉnh", "nền tảng", "tư duy"`;
    }

    return `${BASE_PROMPT}

${instructions}

Phần mô tả buổi học:
${lessonDescription}`;
}

/**
 * Build prompt cho Flow 2: Sinh 20 nhận xét chia XUATSAR/GIOI/KHA/YEU (CỐ ĐỊNH)
 * Dựa trên BASE_PROMPT + thêm logic thái độ theo mức điểm cố định
 * @param {string} lessonDescription - Mô tả buổi học
 * @param {object} config - Cấu hình (tương tự Flow 1)
 * @returns {string} Prompt cho AI
 */
export function buildPromptFlow2(lessonDescription, config = null) {
    let baseInstructions = '';
    if (config) {
        baseInstructions = buildInstructions(config);
    } else {
        // Fallback
        baseInstructions = `- Bắt buộc: Mỗi nhận xét phải bao gồm TẤT CẢ các mục tiêu/hoạt động
- Thay đổi cách diễn đạt, thứ tự mô tả, và trọng tâm giữa các nhận xét
- Mỗi nhận xét dài 1–2 câu
- Một câu mô tả hành động cụ thể, một câu nêu thái độ học tập
- KHÔNG dùng các cụm: "qua đó", "qua bài học", "giúp học sinh", "rèn luyện"
- Giọng văn: Tích cực, mang tính sư phạm, chuyên nghiệp
- KHÔNG dùng emoji hoặc ký hiệu đặc biệt
- KHÔNG dùng các từ chung chung như: "quy trình", "tổng thể", "hoàn chỉnh", "nền tảng", "tư duy"`;
    }

    return `${BASE_PROMPT}

${baseInstructions}

HÃY CHIA NHẬN XÉT THÀNH 4 NHÓM THEO MỨC ĐIỂM (CỐ ĐỊNH):

1️⃣ Xuất sắc (Điểm 10 - Hoàn hảo, vượt mong đợi)
   • Thái độ học tập: chủ động, sáng tạo, vượt mong đợi, thể hiện năng lực nổi bật trong buổi học
   • Viết CHÍNH XÁC 5 nhận xét

2️⃣ Giỏi (Điểm 9 - Giỏi)
   • Thái độ học tập: chủ động, tập trung, hiểu rõ nội dung, thực hiện đúng yêu cầu, phối hợp tốt trong quá trình học
   • Viết CHÍNH XÁC 10 nhận xét

3️⃣ Khá (Điểm 7–8 – Đạt yêu cầu)
   • Thái độ học tập: BẮT BUỘC phải đề cập rõ ràng rằng học sinh cần tập trung hơn trong quá trình học hoặc thực hành (ví dụ: chưa tập trung ổn định, đôi lúc sao nhãng, cần chú ý hơn khi làm bài)
   • Nội dung học tập: học sinh nắm được nội dung chính và hoàn thành các yêu cầu cơ bản của buổi học
   • Viết CHÍNH XÁC 5 nhận xét
   • MỖI nhận xét PHẢI có ít nhất 1 cụm từ liên quan đến “tập trung” hoặc “chú ý”

4️⃣ Yếu (Điểm 0-6 - Yếu, cần hỗ trợ)
   • Thái độ học tập: tham gia, cần thêm thời gian/luyện tập, động viên cố gắng hơn
   • Giọng văn: Động viên, ghi nhận sự tham gia, KHÔNG phê bình tiêu cực, tích cực hướng
   • Viết CHÍNH XÁC 5 nhận xét

ĐỊNH DẠNG TRẢ VỀ (CHỈ JSON, không giải thích):

{
  "lessonSummary": "Tóm tắt 1 câu nội dung buổi học",
  "commentBank": {
    "XUATSAR": {
      "range": "10",
      "comments": ["...", "...", "...", "...", "..."]
    },
    "GIOI": {
      "range": "9",
      "comments": ["...", "...", "...", "...", "..."]
    },
    "KHA": {
      "range": "7-8",
      "comments": ["...", "...", "...", "...", "..."]
    },
    "YEU": {
      "range": "0-6",
      "comments": ["...", "...", "...", "...", "..."]
    }
  }
}

Phần mô tả buổi học:
${lessonDescription}`;
}
