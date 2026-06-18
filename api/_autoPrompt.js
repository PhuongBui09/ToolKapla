const DEFAULT_PROMPT_CONFIG = {
  numComments: 20,
  includeAllObjectives: true,
  commentVariety: 'medium',
  commentLength: '1-2',
  tone: 'pedagogical',
  allowEmoji: false,
  banGenericWords: true,
};

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

function normalizePromptConfig(config = {}) {
  const merged = {
    ...DEFAULT_PROMPT_CONFIG,
    ...(config && typeof config === 'object' ? config : {}),
  };

  const numComments = Number(merged.numComments);

  return {
    numComments:
      Number.isFinite(numComments) && numComments >= 10 && numComments <= 25
        ? Math.round(numComments)
        : DEFAULT_PROMPT_CONFIG.numComments,
    includeAllObjectives: Boolean(merged.includeAllObjectives),
    commentVariety: merged.commentVariety === 'low' ? 'low' : 'medium',
    commentLength: merged.commentLength === '2-3' ? '2-3' : '1-2',
    tone: ['pedagogical', 'neutral', 'friendly'].includes(merged.tone)
      ? merged.tone
      : 'pedagogical',
    allowEmoji: Boolean(merged.allowEmoji),
    banGenericWords: Boolean(merged.banGenericWords),
  };
}

function buildInstructions(config, { includeCount = true } = {}) {
  const normalizedConfig = normalizePromptConfig(config);
  const instructions = [];

  if (normalizedConfig.includeAllObjectives) {
    instructions.push('- Bắt buộc: Mỗi nhận xét phải bao gồm TẤT CẢ các mục tiêu/hoạt động');
  } else {
    instructions.push('- Được phép: Một số nhận xét có thể tập trung vào một vài mục tiêu');
  }

  if (normalizedConfig.commentVariety === 'low') {
    instructions.push('- Các nhận xét có thể tương tự nhau (chỉ thay đổi cách dùng từ)');
  } else {
    instructions.push('- Thay đổi cách diễn đạt, thứ tự mô tả, và trọng tâm giữa các nhận xét');
  }

  if (normalizedConfig.commentLength === '1-2') {
    instructions.push('- Mỗi nhận xét dài 1–2 câu');
    instructions.push('- Một câu mô tả hành động cụ thể, một câu nêu thái độ học tập');
    instructions.push('- KHÔNG dùng các cụm: "qua đó", "qua bài học", "giúp học sinh", "rèn luyện"');
  } else {
    instructions.push('- Mỗi nhận xét dài 2–3 câu');
    instructions.push('- Cấu trúc BẮT BUỘC: Câu 1 mô tả hành động, Câu 2 (hoặc 3) nêu thái độ học tập');
  }

  if (normalizedConfig.tone === 'pedagogical') {
    instructions.push('- Giọng văn: Tích cực, mang tính sư phạm, chuyên nghiệp');
  } else if (normalizedConfig.tone === 'neutral') {
    instructions.push('- Giọng văn: Trung tính, khách quan');
  } else {
    instructions.push('- Giọng văn: Thân thiện, gần gũi');
  }

  if (!normalizedConfig.allowEmoji) {
    instructions.push('- KHÔNG dùng emoji hoặc ký hiệu đặc biệt');
  }

  if (normalizedConfig.banGenericWords) {
    instructions.push(
      '- KHÔNG dùng các từ chung chung như: "quy trình", "tổng thể", "hoàn chỉnh", "nền tảng", "tư duy"',
    );
  }

  if (includeCount) {
    instructions.unshift(
      `- Viết CHÍNH XÁC ${normalizedConfig.numComments} nhận xét (không nhiều hơn, không ít hơn)`,
    );
  }

  return instructions.join('\n');
}

function buildPromptFlow1(lessonDescription, config = null) {
  const instructions = buildInstructions(config || DEFAULT_PROMPT_CONFIG);

  return `${BASE_PROMPT}

${instructions}

Phần mô tả buổi học:
${lessonDescription}`;
}

function buildPromptFlow2(lessonDescription, config = null) {
  const normalizedConfig = normalizePromptConfig(config || DEFAULT_PROMPT_CONFIG);
  const baseInstructions = buildInstructions(normalizedConfig, { includeCount: false });
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

function buildRefreshPrompt(flowType, lessonDescription, config, runTimestamp) {
  const basePrompt =
    flowType === 'flow2'
      ? buildPromptFlow2(lessonDescription, config)
      : buildPromptFlow1(lessonDescription, config);

  return `YÊU CẦU LÀM MỚI ĐỊNH KỲ:
- Đây là lần làm mới nhận xét vào thời điểm ${new Date(runTimestamp).toISOString()}.
- Hãy tạo một bộ nhận xét mới, thay đổi cách diễn đạt rõ ràng so với những lần trước nhưng vẫn giữ đúng nội dung buổi học.
- Không nhắc đến việc đây là lần làm mới, không giải thích thêm.

${basePrompt}`;
}

module.exports = {
  DEFAULT_PROMPT_CONFIG,
  buildPromptFlow1,
  buildPromptFlow2,
  buildRefreshPrompt,
  normalizePromptConfig,
};
