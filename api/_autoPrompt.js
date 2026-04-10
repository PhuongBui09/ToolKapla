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

function buildInstructions(config) {
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

  return `- Viết CHÍNH XÁC ${normalizedConfig.numComments} nhận xét (không nhiều hơn, không ít hơn)\n${instructions.join('\n')}`;
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
  const baseInstructions = buildInstructions(normalizedConfig);
  const defaultRatios = { XUATSAR: 3, GIOI: 13, KHA: 7, YEU: 2 };
  const ratioSum = Object.values(defaultRatios).reduce((sum, value) => sum + value, 0);
  const total = normalizedConfig.numComments;
  const counts = {};

  Object.keys(defaultRatios).forEach((key) => {
    counts[key] = Math.round((defaultRatios[key] / ratioSum) * total);
  });

  const countedTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (countedTotal !== total) {
    counts.GIOI += total - countedTotal;
  }

  return `${BASE_PROMPT}

${baseInstructions}

HÃY CHIA NHẬN XÉT THÀNH 4 NHÓM THEO MỨC ĐIỂM (CỐ ĐỊNH):

1️⃣ Xuất sắc (Điểm 10 - Hoàn hảo, vượt mong đợi)
     • Thái độ học tập: chủ động, sáng tạo, vượt mong đợi, thể hiện năng lực nổi bật trong buổi học
     • Viết CHÍNH XÁC ${counts.XUATSAR} nhận xét
     LƯU Ý BỔ SUNG:
     - KHÔNG mô tả học sinh hỗ trợ, hướng dẫn hoặc giúp đỡ các bạn khác
     - Chỉ mô tả năng lực cá nhân, mức độ hoàn thành và chất lượng sản phẩm

2️⃣ Giỏi (Điểm 9 - Giỏi)
     • Thái độ học tập: chủ động, tập trung, hiểu rõ nội dung, thực hiện đúng yêu cầu, phối hợp tốt trong quá trình học
     • Viết CHÍNH XÁC ${counts.GIOI} nhận xét

3️⃣ Khá (Điểm 7–8 – Đạt yêu cầu)
     • Thái độ học tập: BẮT BUỘC phải đề cập rõ ràng rằng học sinh cần tập trung hơn trong quá trình học hoặc thực hành (ví dụ: chưa tập trung ổn định, đôi lúc sao nhãng, cần chú ý hơn khi làm bài)
     • Nội dung học tập: học sinh nắm được nội dung chính và hoàn thành các yêu cầu cơ bản của buổi học
     • Viết CHÍNH XÁC ${counts.KHA} nhận xét
     • MỖI nhận xét PHẢI có ít nhất 1 cụm từ liên quan đến “tập trung” hoặc “chú ý”

4️⃣ Yếu (Điểm 0-6 - Yếu, cần hỗ trợ)
     • Thái độ học tập: tham gia, cần thêm thời gian/luyện tập, động viên cố gắng hơn
     • Giọng văn: Động viên, ghi nhận sự tham gia, KHÔNG phê bình tiêu cực, tích cực hướng
     • Viết CHÍNH XÁC ${counts.YEU} nhận xét

ĐỊNH DẠNG TRẢ VỀ (CHỈ JSON, không giải thích):

{
    "lessonSummary": "Tóm tắt 1 câu nội dung buổi học",
    "commentBank": {
        "XUATSAR": {
            "range": "10",
            "comments": []
        },
        "GIOI": {
            "range": "9",
            "comments": []
        },
        "KHA": {
            "range": "7-8",
            "comments": []
        },
        "YEU": {
            "range": "0-6",
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
