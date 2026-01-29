/**
 * promptBuilder.js
 * Xây dựng prompt động dựa trên cấu hình người dùng
 */

// Phần prompt mặc định (core)
const BASE_PROMPT = `
Bạn là giáo viên trực tiếp đứng lớp và đang viết nhận xét gửi cho phụ huynh SAU BUỔI HỌC.

Dựa trên phần mô tả buổi học dưới đây, hãy viết nhận xét mô tả CỤ THỂ học sinh đã học và đã làm những gì trong buổi học, đồng thời nêu ngắn gọn thái độ học tập (ví dụ: tập trung, hợp tác, chủ động).

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
- KHÔNG mở đầu, KHÔNG kết luận`;

/**
 * Build instruction dựa trên cấu hình
 */
function buildInstructions(config) {
    let instructions = [];

    // Số lượng nhận xét
    instructions.push(
        `- Viết CHÍNH XÁC ${config.numComments} nhận xét (không nhiều hơn, không ít hơn)`,
    );

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
        instructions.push(`- Một câu mô tả hành động cụ thể, một câu nêu thái độ học tập tốt trong buổi học`);
        instructions.push(
            `- KHÔNG dùng các cụm: "qua đó", "qua bài học", "giúp học sinh", "rèn luyện"`,
        );
    } else if (config.commentLength === '2-3') {
        instructions.push(`- Mỗi nhận xét dài 2–3 câu`);
        instructions.push(
            `- Cấu trúc BẮT BUỘC: Câu 1 mô tả hành động, Câu 2 (hoặc 3) nêu thái độ học tập tốt trong buổi học`,
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
 * Build prompt hoàn chỉnh
 */
export function buildPromptWithConfig(lessonContent, config) {
    const instructions = buildInstructions(config);

    return `${BASE_PROMPT}

${instructions}

Phần mô tả buổi học:
${lessonContent}`.trim();
}

/**
 * Export BASE_PROMPT để reference
 */
export function getDefaultPromptBase() {
    return BASE_PROMPT.trim();
}

/**
 * Xây dựng prompt với config mặc định (giống aiPrompt.js gốc)
 */
export function buildDefaultPrompt(lessonContent) {
    const DEFAULT_CONFIG = {
        numComments: 20,
        includeAllObjectives: true,
        commentVariety: 'medium',
        commentLength: '1-2',
        tone: 'pedagogical',
        allowEmoji: false,
        banGenericWords: true,
    };

    const instructions = buildInstructions(DEFAULT_CONFIG);

    return `${BASE_PROMPT}

${instructions}

Phần mô tả buổi học:
${lessonContent}`.trim();
}