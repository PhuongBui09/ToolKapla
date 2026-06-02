/**
 * promptFlow2.js (Prompt Chung cho Flow 1 & Flow 2)
 *
 * Dựa trên base prompt từ promptBuilder.js
 * Flow 1: Sinh 20 nhận xét chung (không chia mức)
 * Flow 2: Sinh 15 nhận xét chia theo HIGH/MID/LOW dựa trên khoảng điểm
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
 * Build prompt cho Flow 2: Sinh nhận xét chia theo 5 mức điểm (5, 6, 7-8, 9, 10)
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

    // Determine counts per category. Default ratios favor 9 and 7-8; 10, 6, and 5 are smaller.
    // Default distribution (sum 25): DIEM_10:3, DIEM_9:10, DIEM_7_8:8, DIEM_6:2, DIEM_5:2
    const defaultRatios = { DIEM_10: 3, DIEM_9: 10, DIEM_7_8: 8, DIEM_6: 2, DIEM_5: 2 };
    const ratioSum = Object.values(defaultRatios).reduce((s, v) => s + v, 0);

    // total comments: use config.numComments if provided, otherwise fall back to ratioSum (25)
    const total = config && typeof config.numComments === 'number' ? config.numComments : ratioSum;

    // support explicit distribution in config (counts or percentages)
    let counts = { DIEM_10: 0, DIEM_9: 0, DIEM_7_8: 0, DIEM_6: 0, DIEM_5: 0 };
    if (config && config.distribution && typeof config.distribution === 'object') {
        const dist = config.distribution;
        const keys = Object.keys(counts);
        const numericValues = keys.map((k) => Number(dist[k] || 0));
        const sumNumeric = numericValues.reduce((s, v) => s + v, 0);

        if (sumNumeric === 0) {
            // maybe distribution provided as percentages (sum to 100)
            const percentSum = keys.map((k) => Number(dist[k] || 0)).reduce((s, v) => s + v, 0);
            if (percentSum > 0) {
                keys.forEach((k, i) => {
                    counts[k] = Math.round((Number(dist[k] || 0) / percentSum) * total);
                });
            }
        } else {
            // distribution provided as raw counts -> scale to `total` if sums differ
            if (sumNumeric === total) {
                keys.forEach((k, i) => {
                    counts[k] = Math.round(Number(dist[k] || 0));
                });
            } else {
                keys.forEach((k, i) => {
                    counts[k] = Math.round((Number(dist[k] || 0) / sumNumeric) * total);
                });
            }
        }
    } else {
        // compute from default ratios
        Object.keys(defaultRatios).forEach((k) => {
            counts[k] = Math.round((defaultRatios[k] / ratioSum) * total);
        });
    }

    // adjust rounding errors so sum(counts) === total
    const sumCounts = Object.values(counts).reduce((s, v) => s + v, 0);
    if (sumCounts !== total) {
        // add the difference to the largest ratio bucket (DIEM_9 by default)
        const primary = Object.keys(defaultRatios).reduce((a, b) =>
            defaultRatios[a] >= defaultRatios[b] ? a : b,
        );
        counts[primary] += total - sumCounts;
    }

    return `${BASE_PROMPT}

${baseInstructions}

HÃY CHIA NHẬN XÉT THÀNH 5 NHÓM THEO MỨC ĐIỂM (CỐ ĐỊNH):

1️⃣ Điểm 10
     • Học sinh tham gia phát biểu, tập trung học trong lớp, ngoan ngoãn
     • Có khả năng sáng tạo, hoàn thành được dự án và có thể tự làm được dự án đơn giản
     • Viết CHÍNH XÁC ${counts.DIEM_10} nhận xét
     • Nhận xét phải thể hiện rõ học sinh vượt mong đợi, có sản phẩm hoặc kết quả nổi bật

2️⃣ Điểm 9
     • Học sinh tham gia phát biểu, tập trung học trong lớp, ngoan ngoãn
     • Viết CHÍNH XÁC ${counts.DIEM_9} nhận xét
     • Nhận xét phải cho thấy học sinh hiểu bài, thực hiện đúng yêu cầu và học tập nghiêm túc

3️⃣ Điểm 7-8
     • Học sinh ngoan ngoãn, có tham gia phát biểu và phát biểu đúng
     • Đôi khi vẫn còn một vài câu sai hoặc cần chỉnh lại cách làm
     • Viết CHÍNH XÁC ${counts.DIEM_7_8} nhận xét
     • Nhận xét phải nêu rõ học sinh đã tham gia tương tác nhưng còn vài chỗ chưa thật chính xác

4️⃣ Điểm 6
     • Học sinh ngoan xuyên suốt buổi học, giữ trật tự và làm theo hướng dẫn
     • Chưa tham gia phát biểu và chưa tương tác nhiều với giáo viên
     • Viết CHÍNH XÁC ${counts.DIEM_6} nhận xét
     • Nhận xét phải nhấn mạnh sự ngoan ngoãn, chăm chú, nhưng còn ít chủ động trao đổi

5️⃣ Điểm 5
     • Học sinh không chú ý, có thể quậy phá hoặc chưa giữ được sự tập trung trong buổi học
     • Viết CHÍNH XÁC ${counts.DIEM_5} nhận xét
     • Nhận xét phải mang nghĩa "Chưa tập trung học", nêu rõ học sinh cần rèn lại sự tập trung và nề nếp
     • KHÔNG dùng giọng nặng nề, chỉ mô tả thực tế theo hướng nhắc nhở

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
        "DIEM_7_8": {
            "range": "7-8",
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
