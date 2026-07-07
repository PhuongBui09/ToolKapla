/**
 * promptConfigUI.js
 * Quản lý UI cấu hình prompt
 */

import { loadConfig, saveConfig, resetConfig, DEFAULT_CONFIG } from './promptConfig.js';
import { Toast } from './toast.js';

/**
 * Khởi tạo UI cấu hình prompt
 */
export function initPromptConfigUI() {
    const config = loadConfig();
    populateConfigUI(config);
    setupEventListeners();
}

/**
 * Điền config vào UI
 */
function populateConfigUI(config) {
    // Bắt buộc mỗi nhận xét phải bao gồm tất cả mục tiêu
    document.getElementById('configIncludeAllObjectives').checked = config.includeAllObjectives;

    // Mức độ khác biệt
    document.getElementById('configCommentVariety').value = config.commentVariety;

    // Độ dài nhận xét
    document.getElementById('configCommentLength').value = config.commentLength;

    // Giọng văn
    document.getElementById('configTone').value = config.tone;

    // Cho phép emoji
    document.getElementById('configAllowEmoji').checked = config.allowEmoji;

    // Cấm từ chung chung
    document.getElementById('configBanGenericWords').checked = config.banGenericWords;

    // Base prompt tùy chỉnh
    document.getElementById('configCustomBasePrompt').value = config.customBasePrompt || '';

    // Cấu hình mức điểm Flow 2
    document.getElementById('configScorePrompt10').value = config.scoreRangePrompts?.DIEM_10 || '';
    document.getElementById('configScorePrompt9').value = config.scoreRangePrompts?.DIEM_9 || '';
    document.getElementById('configScorePrompt8').value = config.scoreRangePrompts?.DIEM_8 || '';
    document.getElementById('configScorePrompt7').value = config.scoreRangePrompts?.DIEM_7 || '';
    document.getElementById('configScorePrompt6').value = config.scoreRangePrompts?.DIEM_6 || '';
    document.getElementById('configScorePrompt5').value = config.scoreRangePrompts?.DIEM_5 || '';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Lưu khi thay đổi bắt buộc mục tiêu
    document.getElementById('configIncludeAllObjectives').addEventListener('change', (e) => {
        saveConfig({ includeAllObjectives: e.target.checked });
        Toast.show(
            e.target.checked
                ? '✓ Mỗi nhận xét phải bao gồm TẤT CẢ mục tiêu'
                : '✓ Cấu hình đã thay đổi',
            'success',
        );
    });

    // Lưu khi thay đổi mức độ khác biệt
    document.getElementById('configCommentVariety').addEventListener('change', (e) => {
        saveConfig({ commentVariety: e.target.value });
        Toast.show('✓ Đã lưu mức độ khác biệt', 'success');
    });

    // Lưu khi thay đổi độ dài
    document.getElementById('configCommentLength').addEventListener('change', (e) => {
        saveConfig({ commentLength: e.target.value });
        Toast.show('✓ Đã lưu độ dài nhận xét', 'success');
    });

    // Lưu khi thay đổi giọng văn
    document.getElementById('configTone').addEventListener('change', (e) => {
        saveConfig({ tone: e.target.value });
        Toast.show('✓ Đã lưu giọng văn', 'success');
    });

    // Lưu khi thay đổi cho phép emoji
    document.getElementById('configAllowEmoji').addEventListener('change', (e) => {
        saveConfig({ allowEmoji: e.target.checked });
        Toast.show(
            e.target.checked ? '✓ Cho phép sử dụng emoji' : '✓ Không sử dụng emoji',
            'success',
        );
    });

    // Lưu khi thay đổi cấm từ chung chung
    document.getElementById('configBanGenericWords').addEventListener('change', (e) => {
        saveConfig({ banGenericWords: e.target.checked });
        Toast.show(
            e.target.checked ? '✓ Cấm các từ chung chung' : '✓ Cho phép các từ chung chung',
            'success',
        );
    });

    // Lưu khi thay đổi Base Prompt tùy chỉnh
    document.getElementById('configCustomBasePrompt').addEventListener('change', (e) => {
        saveConfig({ customBasePrompt: e.target.value });
        Toast.show('✓ Đã lưu Base Prompt tùy chỉnh', 'success');
    });

    // Lưu khi thay đổi nội dung mức điểm Flow 2
    [
        { id: 'configScorePrompt10', key: 'DIEM_10', label: 'mức điểm 10' },
        { id: 'configScorePrompt9', key: 'DIEM_9', label: 'mức điểm 9' },
        { id: 'configScorePrompt8', key: 'DIEM_8', label: 'mức điểm 8' },
        { id: 'configScorePrompt7', key: 'DIEM_7', label: 'mức điểm 7' },
        { id: 'configScorePrompt6', key: 'DIEM_6', label: 'mức điểm 6' },
        { id: 'configScorePrompt5', key: 'DIEM_5', label: 'mức điểm 5' },
    ].forEach(({ id, key, label }) => {
        const element = document.getElementById(id);
        if (!element) {
            return;
        }
        element.addEventListener('change', (e) => {
            saveConfig({ scoreRangePrompts: { [key]: e.target.value } });
            Toast.show(`✓ Đã lưu cấu hình ${label}`, 'success');
        });
    });

    // Xuất / Nhập cấu hình prompt AI
    document.getElementById('exportPromptConfigBtn').addEventListener('click', () => {
        const config = loadConfig();
        const blob = new Blob([JSON.stringify(config, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'toolkapla-prompt-config.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        Toast.show('✓ Đã xuất cấu hình prompt AI', 'success');
    });

    document.getElementById('importPromptConfigBtn').addEventListener('click', () => {
        document.getElementById('importPromptConfigInput').click();
    });

    document.getElementById('importPromptConfigInput').addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        try {
            const text = await file.text();
            const importedConfig = JSON.parse(text);
            if (!importedConfig || typeof importedConfig !== 'object') {
                throw new Error('Cấu hình không hợp lệ');
            }
            saveConfig(importedConfig);
            populateConfigUI(loadConfig());
            Toast.show('✓ Đã nhập cấu hình thành công', 'success');
        } catch (err) {
            console.error(err);
            Toast.show('❌ Tập tin cấu hình không hợp lệ', 'error');
        } finally {
            e.target.value = '';
        }
    });

    // Nút khôi phục mặc định
    document.getElementById('resetConfigBtn').addEventListener('click', () => {
        if (confirm('Bạn chắc chắn muốn khôi phục cấu hình mặc định? Tất cả thay đổi sẽ bị xóa.')) {
            resetConfig();
            populateConfigUI(DEFAULT_CONFIG);
            Toast.show('✓ Đã khôi phục cấu hình mặc định!', 'success');
        }
    });
}

/**
 * Lấy cấu hình hiện tại từ UI (không lưu)
 */
export function getConfigFromUI() {
    return {
        includeAllObjectives: document.getElementById('configIncludeAllObjectives').checked,
        commentVariety: document.getElementById('configCommentVariety').value,
        commentLength: document.getElementById('configCommentLength').value,
        tone: document.getElementById('configTone').value,
        allowEmoji: document.getElementById('configAllowEmoji').checked,
        banGenericWords: document.getElementById('configBanGenericWords').checked,
        customBasePrompt: document.getElementById('configCustomBasePrompt').value,
        scoreRangePrompts: {
            DIEM_10: document.getElementById('configScorePrompt10').value,
            DIEM_9: document.getElementById('configScorePrompt9').value,
            DIEM_8: document.getElementById('configScorePrompt8').value,
            DIEM_7: document.getElementById('configScorePrompt7').value,
            DIEM_6: document.getElementById('configScorePrompt6').value,
            DIEM_5: document.getElementById('configScorePrompt5').value,
        },
    };
}
