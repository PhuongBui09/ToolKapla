/**
 * promptFlow2.js (Prompt Chung cho Flow 1 & Flow 2)
 *
 * Dựa trên base prompt từ promptBuilder.js
 * Flow 1: Sinh 20 nhận xét chung (không chia mức)
 * Flow 2: Sinh nhận xét chia theo từng mức điểm
 */

const STUDENT_NAME_PLACEHOLDER = '{{student_name}}';

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
- MỖI nhận xét PHẢI chứa đúng placeholder "${STUDENT_NAME_PLACEHOLDER}" ở vị trí tự nhiên trong câu
- Giữ nguyên placeholder "${STUDENT_NAME_PLACEHOLDER}", KHÔNG được đổi thành tên thật hoặc placeholder khác
- Ví dụ hợp lệ: "${STUDENT_NAME_PLACEHOLDER} đã ...", hoặc "Trong buổi học này, ${STUDENT_NAME_PLACEHOLDER} đã ..."

CẤM TUYỆT ĐỐI:
- KHÔNG mô tả học sinh hỗ trợ, giúp đỡ, hướng dẫn, kèm cặp hoặc ảnh hưởng đến các bạn khác
- KHÔNG đề cập đến vai trò dẫn dắt, làm gương, hỗ trợ nhóm, giúp lớp học
- Mọi nhận xét CHỈ tập trung vào hành động và kết quả học tập CỦA CHÍNH học sinh đó

KHÔNG dùng các cụm từ:
"giúp đỡ bạn bè", "hỗ trợ các bạn", "làm gương cho lớp", 
"dẫn dắt nhóm", "chia sẻ với các bạn", "phối hợp với bạn"

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
 * Build prompt cho Flow 2: Sinh nhận xét chia theo 6 mức điểm (5, 6, 7, 8, 9, 10)
 * Dựa trên BASE_PROMPT + thêm logic thái độ theo mức điểm
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

    const counts = {
        DIEM_10: 4,
        DIEM_9: 10,
        DIEM_8: 5,
        DIEM_7: 5,
        DIEM_6: 4,
        DIEM_5: 5,
    };

    return `${BASE_PROMPT}

${baseInstructions}

HÃY CHIA NHẬN XÉT THÀNH 6 NHÓM THEO MỨC ĐIỂM (CỐ ĐỊNH):

1️⃣ Điểm 10
     • Học sinh chủ động phát biểu, tập trung xuyên suốt buổi học.
     • Hiểu bài rất tốt, có khả năng sáng tạo, hoàn thành dự án đầy đủ và có thể tự thực hiện các dự án đơn giản.
     • Có sản phẩm hoặc kết quả nổi bật, vượt mong đợi.
     • Viết CHÍNH XÁC ${counts.DIEM_10} nhận xét.

2️⃣ Điểm 9
     • Học sinh tập trung học, chủ động phát biểu và tương tác với giáo viên.
     • Hiểu bài đầy đủ, hoàn thành đúng yêu cầu của bài học.
     • Chỉ còn một vài lỗi nhỏ hoặc cần nhắc ở một số chi tiết.
     • Viết CHÍNH XÁC ${counts.DIEM_9} nhận xét.

3️⃣ Điểm 8
     • Học sinh ngoan, có theo dõi bài học và tham gia phát biểu.
     • Hiểu phần lớn nội dung bài học.
     • Đôi lúc cần giáo viên gợi ý và hỗ trợ để hoàn thành nhiệm vụ.
     • Viết CHÍNH XÁC ${counts.DIEM_8} nhận xét.

4️⃣ Điểm 7
     • Học sinh ngoan, có theo dõi bài học nhưng rất ít chủ động phát biểu hoặc tương tác.
     • Tiếp thu còn hạn chế, cần thêm sự hướng dẫn của giáo viên.
     • Hoàn thành được các yêu cầu cơ bản của bài học.
     • Viết CHÍNH XÁC ${counts.DIEM_7} nhận xét.

5️⃣ Điểm 6
     • Học sinh chưa tập trung trong buổi học, còn dễ mất tập trung hoặc sao nhãng.
     • Cần cải thiện sự chủ động và thái độ học tập.
     • Vẫn hợp tác khi giáo viên nhắc nhở hoặc hướng dẫn.
     • Viết CHÍNH XÁC ${counts.DIEM_6} nhận xét.

6️⃣ Điểm 5
     • Học sinh chưa hợp tác với giáo viên trong buổi học.
     • Rất ít hoặc không tham gia các hoạt động của lớp, ảnh hưởng đến việc tiếp thu bài.
     • Nhận xét mang tính khách quan, không dùng từ ngữ nặng nề hay phê bình gay gắt.
     • Viết CHÍNH XÁC ${counts.DIEM_5} nhận xét.

ĐỊNH DẠNG TRẢ VỀ (CHỈ JSON, không giải thích):

{
    "lessonSummary": "Tóm tắt 1 câu nội dung buổi học",
    "commentBank": {
        "DIEM_10": {
            "range": "10",
            "comments": []
        },
        "DIEM_9": {
            "range": "9",
            "comments": []
        },
        "DIEM_8": {
            "range": "8",
            "comments": []
        },
        "DIEM_7": {
            "range": "7",
            "comments": []
        },
        "DIEM_6": {
            "range": "6",
            "comments": []
        },
        "DIEM_5": {
            "range": "5",
            "comments": []
        }
    }
}

Phần mô tả buổi học:
${lessonDescription}`;
}
