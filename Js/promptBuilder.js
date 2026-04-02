/**
 * promptBuilder.js
 * Xây dựng prompt động dựa theo yêu cầu sinh nhận xét ngắn gọn, tự nhiên
 */

// Phần prompt mặc định (core)
const BASE_PROMPT = `
Bạn là giáo viên trực tiếp đứng lớp và đang viết nhận xét gửi cho phụ huynh SAU BUỔI HỌC.

Dựa trên phần mô tả buổi học dưới đây, hãy viết nhận xét mô tả CỤ THỂ học sinh đã làm gì trong buổi học, đồng thời nêu ngắn gọn thái độ học tập.

NGUYÊN TẮC BẮT BUỘC:
- Mỗi nhận xét chỉ mô tả 1 mục tiêu hoặc 1 hoạt động cụ thể
- Không gộp nhiều mục tiêu trong một nhận xét
- Các nhận xét phải phân bổ đều các mục tiêu, giống như mỗi nhận xét là một học sinh khác nhau
- Hãy tưởng tượng mỗi nhận xét dành cho một học sinh khác nhau

YÊU CẦU DIỄN ĐẠT:
- Văn phong giống giáo viên thật, không học thuật, không báo cáo
- Câu ngắn, rõ, mỗi câu chỉ 1-2 ý
- Tránh từ: "vận dụng", "thông qua", "qua đó", "rèn luyện", "giúp học sinh"
- Ưu tiên dùng động từ cụ thể: "thêm", "tạo", "sử dụng", "chỉnh sửa"
- Chỉ dùng từ "học sinh", KHÔNG dùng từ "con"

ĐỊNH DẠNG:
- Mỗi nhận xét nằm trên MỘT DÒNG
- KHÔNG đánh số
- KHÔNG mở đầu, KHÔNG kết luận`;

/**
 * Build instruction dựa trên cấu hình
 */
function buildInstructions(config) {
    const instructions = [];

    instructions.push(`- Viết CHÍNH XÁC ${config.numComments} nhận xét (không nhiều hơn, không ít hơn)`);

    instructions.push(`- Mỗi nhận xét chỉ mô tả 1 mục tiêu hoặc 1 hoạt động`);
    instructions.push(`- Phân bổ đều mục tiêu/nội dung trên mỗi nhận xét`);
    instructions.push(`- Mỗi nhận xét giả định dành cho một học sinh khác nhau để tạo phong cách tự nhiên`);

    if (config.commentVariety === 'low') {
        instructions.push(`- Ví dụ khác nhau nhẹ, vẫn ưu tiên cấu trúc ngắn, tự nhiên`);
    } else {
        instructions.push(`- Thay đổi câu chữ, thứ tự, góc nhìn giữa các nhận xét`);
    }

    if (config.commentLength === '1-2') {
        instructions.push(`- Mỗi nhận xét dài 1–2 câu`);
        instructions.push(`- Câu 1: mô tả hành động cụ thể học sinh làm`);
        instructions.push(`- Câu 2: nêu thái độ học tập ngắn (1-2 từ hoặc cụm từ)`);
        instructions.push(`- Không trộn nội dung hành động và thái độ vào cùng một câu`);
    } else if (config.commentLength === '2-3') {
        instructions.push(`- Mỗi nhận xét dài 2–3 câu`);
        instructions.push(`- Câu 1: hành động cụ thể, Câu 2 (hoặc 3): thái độ học tập`);
    }

    if (config.tone === 'pedagogical') {
        instructions.push(`- Giọng văn: Tích cực, thân thiện, như lời giáo viên nhận xét`);
    } else if (config.tone === 'neutral') {
        instructions.push(`- Giọng văn: Trung tính, khách quan, giản dị`);
    } else if (config.tone === 'friendly') {
        instructions.push(`- Giọng văn: Thân thiện, gần gũi, đơn giản`);
    }

    if (!config.allowEmoji) {
        instructions.push(`- KHÔNG dùng emoji hoặc ký hiệu đặc biệt`);
    }

    if (config.banGenericWords) {
        instructions.push(`- KHÔNG dùng từ chung chung: "quy trình", "tổng thể", "hoàn chỉnh", "nền tảng", "tư duy"`);
    }

    return instructions.join('\n');
}

/**
 * Build prompt hoàn chỉnh
 */
export function buildPromptWithConfig(lessonContent, config) {
    const instructions = buildInstructions(config);

    return `${BASE_PROMPT}\n\n${instructions}\n\nPhần mô tả buổi học:\n${lessonContent}`.trim();
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
        commentVariety: 'medium',
        commentLength: '1-2',
        tone: 'pedagogical',
        allowEmoji: false,
        banGenericWords: true,
    };

    const instructions = buildInstructions(DEFAULT_CONFIG);

    return `${BASE_PROMPT}\n\n${instructions}\n\nPhần mô tả buổi học:\n${lessonContent}`.trim();
}
