/**
 * promptConfig.js
 * Quản lý cấu hình prompt và lưu vào localStorage
 */

const CONFIG_STORAGE_KEY = 'toolkapla_prompt_config';

// Cấu hình mặc định
export const DEFAULT_CONFIG = {
    numComments: 20,
    includeAllObjectives: true, // Bắt buộc bao gồm tất cả mục tiêu
    commentVariety: 'medium', // 'low' | 'medium'
    commentLength: '1-2', // '1-2' | '2-3'
    tone: 'pedagogical', // 'pedagogical' | 'neutral' | 'friendly'
    allowEmoji: false,
    banGenericWords: true,
    customBasePrompt: '',
    scoreRangePrompts: {
        DIEM_10: `     • Học sinh chủ động phát biểu, tập trung xuyên suốt buổi học.
     • Hiểu bài rất tốt, có khả năng sáng tạo, hoàn thành dự án đầy đủ và có thể tự thực hiện các dự án đơn giản.
     • Có sản phẩm hoặc kết quả nổi bật, vượt mong đợi.`,
        DIEM_9: `     • Học sinh tập trung học, chủ động phát biểu và tương tác với giáo viên.
     • Hiểu bài đầy đủ, hoàn thành đúng yêu cầu của bài học.
     • Chỉ còn một vài lỗi nhỏ hoặc cần nhắc ở một số chi tiết.`,
        DIEM_8: `     • Học sinh ngoan, có theo dõi bài học và tham gia phát biểu.
     • Hiểu phần lớn nội dung bài học.
     • Đôi lúc cần giáo viên gợi ý và hỗ trợ để hoàn thành nhiệm vụ.`,
        DIEM_7: `     • Học sinh ngoan, có theo dõi bài học nhưng rất ít chủ động phát biểu hoặc tương tác.
     • Tiếp thu còn hạn chế, cần thêm sự hướng dẫn của giáo viên.
     • Hoàn thành được các yêu cầu cơ bản của bài học.`,
        DIEM_6: `     • Học sinh chưa tập trung trong buổi học, còn dễ mất tập trung hoặc sao nhãng.
     • Cần cải thiện sự chủ động và thái độ học tập.
     • Vẫn hợp tác khi giáo viên nhắc nhở hoặc hướng dẫn.`,
        DIEM_5: `     • Học sinh chưa hợp tác với giáo viên trong buổi học.
     • Rất ít hoặc không tham gia các hoạt động của lớp, ảnh hưởng đến việc tiếp thu bài.
     • Nhận xét mang tính khách quan, không dùng từ ngữ nặng nề hay phê bình gay gắt.`,
    },
};

function deepMergeConfig(base, updates) {
    const merged = { ...base, ...updates };
    if (updates && typeof updates === 'object' && updates.scoreRangePrompts) {
        merged.scoreRangePrompts = {
            ...base.scoreRangePrompts,
            ...updates.scoreRangePrompts,
        };
    }
    return merged;
}

/**
 * Lấy cấu hình từ localStorage
 */
export function loadConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (saved) {
            const config = JSON.parse(saved);
            // Merge với default để đảm bảo không thiếu property
            return deepMergeConfig(DEFAULT_CONFIG, config);
        }
    } catch (e) {
        console.error('Lỗi khi đọc config:', e);
    }
    return { ...DEFAULT_CONFIG };
}

/**
 * Lưu cấu hình vào localStorage
 */
export function saveConfig(config) {
    try {
        const mergedConfig = deepMergeConfig(loadConfig(), config || {});
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(mergedConfig));
        return mergedConfig;
    } catch (e) {
        console.error('Lỗi khi lưu config:', e);
        return null;
    }
}

/**
 * Reset cấu hình về mặc định
 */
export function resetConfig() {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    return { ...DEFAULT_CONFIG };
}

/**
 * Cập nhật một property trong config
 */
export function updateConfig(updates) {
    const config = loadConfig();
    const newConfig = { ...config, ...updates };
    saveConfig(newConfig);
    return newConfig;
}
