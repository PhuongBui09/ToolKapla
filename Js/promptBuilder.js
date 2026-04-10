/**
 * promptBuilder.js
 * Xây dựng prompt động: nhận xét ngắn gọn, tự nhiên, mỗi nhận xét 1 ý duy nhất
 */

const STUDENT_NAME_PLACEHOLDER = '{{student_name}}';

// Phần prompt mặc định (core)
const BASE_PROMPT = `
Bạn là giáo viên trực tiếp đứng lớp và đang viết nhận xét gửi cho phụ huynh SAU BUỔI HỌC.

Dựa trên phần mô tả buổi học dưới đây, hãy viết nhận xét CỤ THỂ học sinh đã làm gì trong buổi học và nêu ngắn gọn thái độ học tập.

NGUYÊN TẮC QUAN TRỌNG:
- Mỗi nhận xét CHỈ được phép mô tả DUY NHẤT 1 mục tiêu hoặc 1 hoạt động
- TUYỆT ĐỐI KHÔNG gộp nhiều mục tiêu trong một nhận xét
- Nếu một nhận xét chứa hơn 1 hành động → không hợp lệ
- Cấm dùng các từ nối: "và", "sau đó", "đồng thời", "kèm theo"
- Các nhận xét phải phân bổ đều các mục tiêu
- Hãy tưởng tượng mỗi nhận xét dành cho một học sinh khác nhau và mỗi học sinh chỉ nổi bật 1 kỹ năng

YÊU CẦU DIỄN ĐẠT:
- Văn phong giống giáo viên thật, không học thuật, không báo cáo
- Câu ngắn (< 20 từ), mỗi câu chỉ 1 ý
- Tránh từ học thuật: "vận dụng", "thông qua", "qua đó", "rèn luyện"
- Ưu tiên động từ cụ thể: "thêm", "tạo", "dùng", "chỉnh sửa"
- Chỉ dùng từ "học sinh", KHÔNG dùng từ "con"
- MỖI nhận xét PHẢI chứa đúng placeholder "${STUDENT_NAME_PLACEHOLDER}" ở vị trí tự nhiên trong câu
- Giữ nguyên placeholder "${STUDENT_NAME_PLACEHOLDER}", KHÔNG được đổi thành tên thật hoặc placeholder khác
- Ví dụ hợp lệ: "${STUDENT_NAME_PLACEHOLDER} đã ...", hoặc "Trong buổi học này, ${STUDENT_NAME_PLACEHOLDER} đã ..."

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
    instructions.push(`- Không lặp lại một mục tiêu quá nhiều`);
    instructions.push(`- Mỗi nhận xét giả định dành cho một học sinh khác nhau và chỉ nổi bật 1 kỹ năng`);

    if (config.commentVariety === 'low') {
        instructions.push(`- Ví dụ khác nhau nhẹ, vẫn ưu tiên câu ngắn, tự nhiên`);
    } else {
        instructions.push(`- Thay đổi câu chữ, góc nhìn, hành động và thái độ giữa các nhận xét`);
    }

    if (config.commentLength === '1-2') {
        instructions.push(`- Mỗi nhận xét dài 1–2 câu`);
        instructions.push(`- Câu 1: mô tả hành động cụ thể học sinh làm`);
        instructions.push(`- Câu 2: nêu thái độ học tập ngắn (1-2 từ/cụm từ)`);
        instructions.push(`- Không trộn hành động và thái độ trong cùng một câu`);
        instructions.push(`- Tuyệt đối không dùng: "và", "sau đó", "đồng thời", "kèm theo"`);
    } else if (config.commentLength === '2-3') {
        instructions.push(`- Mỗi nhận xét dài 2–3 câu`);
        instructions.push(`- Câu 1: hành động cụ thể; Câu 2 (hoặc 3): thái độ học tập`);
        instructions.push(`- Nội dung mỗi câu cần ngắn, không quá 20 từ`);
    }

    if (config.tone === 'pedagogical') {
        instructions.push(`- Giọng văn: Tích cực, thân thiện, như lời giáo viên nhận xét`);
    } else if (config.tone === 'neutral') {
        instructions.push(`- Giọng văn: Trung tính, khách quan, giản dị`);
    } else if (config.tone === 'friendly') {
        instructions.push(`- Giọng văn: Thân thiện, gần gũi`);
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
