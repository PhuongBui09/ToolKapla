import { Toast } from './toast.js';
import { ScriptGeneratorFlow2 } from './scriptGenerator2.js';
import { TabManager } from './tabManager.js';
import {
    generateCommentsFromGemini,
    getCommentHistory,
    deleteFromHistory,
    updateHistoryPreview,
} from './gemini.js';
import { initPromptConfigUI } from './promptConfigUI.js';
import { initScoreConfigUI } from './scoreConfigUI.js';
import { buildPromptFlow2 } from './promptFlow2.js';
import { initAutoCommentManager } from './autoCommentManager.js';
import { loadScoreConfig } from './scoreConfig.js';

let tabManager;
window.toolkaplaAiBusy = false;

// Helper: Extract JSON từ response (xử lý markdown code blocks)
function extractJSON(jsonString) {
    let cleaned = String(jsonString || '').trim();
    // Remove markdown code blocks: ```json ... ``` hoặc ``` ... ```
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    }
    return cleaned;
}

function parseStoredFlow2CommentBank(rawComments) {
    const parsed = JSON.parse(extractJSON(rawComments));
    return parsed.commentBank || parsed;
}

// Hàm để disable buttons khi đang sinh comments
function disableButtons() {
    window.toolkaplaAiBusy = true;
    const activeArea = document.getElementById('tab-generate-comments');
    if (activeArea) {
        activeArea.querySelectorAll('button, input, textarea, select').forEach((el) => {
            el.disabled = true;
        });
    }
}

// Hàm để enable buttons khi hoàn thành
function enableButtons() {
    const activeArea = document.getElementById('tab-generate-comments');
    if (activeArea) {
        activeArea.querySelectorAll('button, input, textarea, select').forEach((el) => {
            el.disabled = false;
        });
    }
    window.toolkaplaAiBusy = false;
}

/**
 * Cập nhật thông tin ở tab "Tạo Script"
 */
function updateScriptTabInfo() {
    // Không cần cập nhật tab này nữa vì đã gộp vào tab 1
}

function normalizeSearchTerm(value) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function getSearchableHistoryContent(item) {
    const commentsText = Array.isArray(item?.comments)
        ? item.comments.join('\n')
        : typeof item?.comments === 'string'
          ? item.comments
          : JSON.stringify(item?.comments || '');

    return [item?.lessonPreview, item?.lessonDescription, commentsText]
        .map((value) => String(value || ''))
        .join('\n')
        .toLowerCase();
}

/**
 * Hiển thị lịch sử nhận xét
 */
function renderHistory() {
    const history = getCommentHistory();
    const container = document.getElementById('historyContainer');
    const emptyMsg = document.getElementById('historyEmpty');
    const searchInput = document.getElementById('historySearchInput');
    const searchTerm = normalizeSearchTerm(searchInput?.value);
    const filteredHistory = searchTerm
        ? history.filter((item) => getSearchableHistoryContent(item).includes(searchTerm))
        : history;

    container.innerHTML = '';

    if (filteredHistory.length === 0) {
        emptyMsg.style.display = 'block';
        emptyMsg.textContent =
            history.length === 0
                ? 'Chưa có nhận xét nào'
                : 'Không tìm thấy mục lịch sử nào khớp với từ khóa.';
        return;
    }

    emptyMsg.style.display = 'none';
    emptyMsg.textContent = 'Chưa có nhận xét nào';

    filteredHistory.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-card';

        const textDiv = document.createElement('div');
        textDiv.className = 'history-card__body';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'history-card__title';
        titleDiv.textContent = item.lessonPreview;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'history-card__meta';
        timeDiv.textContent = new Date(item.timestamp).toLocaleString('vi-VN');

        textDiv.appendChild(titleDiv);
        textDiv.appendChild(timeDiv);

        // Click để load nhận xét và mô tả
        textDiv.addEventListener('click', () => {
            document.getElementById('lessonDescription').value =
                item.lessonDescription || item.lessonPreview;

            // Nạp lại nhận xét cũ theo đúng định dạng lưu trữ
            if (item.flowType === 'flow2') {
                try {
                    window.flow2CommentBank = parseStoredFlow2CommentBank(item.comments);
                    window.generatedCommentBank = window.flow2CommentBank;
                    document.getElementById('commentsInput').value = formatCommentBankForDisplay(
                        window.flow2CommentBank,
                    );
                } catch (e) {
                    console.error('Lỗi parse Flow 2 comments:', e);
                    Toast.show('❌ Lỗi khi tải dữ liệu Flow 2!', 'error');
                    return;
                }
            } else {
                window.flow2CommentBank = null;
                window.generatedCommentBank = null;
                document.getElementById('commentsInput').value = Array.isArray(item.comments)
                    ? item.comments.join('\n')
                    : item.comments;
            }

            Toast.show('✓ Đã tải mô tả và nhận xét từ lịch sử!', 'success');
            updateScriptTabInfo();
        });

        const actionDiv = document.createElement('div');
        actionDiv.className = 'history-card__actions';

        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️';
        editBtn.title = 'Sửa tên lịch sử';
        editBtn.className = 'history-action-btn history-action-btn--edit';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            const nextPreview = window.prompt(
                'Nhập tên mới cho mục lịch sử:',
                item.lessonPreview || '',
            );

            if (nextPreview === null) {
                return;
            }

            const trimmedPreview = nextPreview.trim();
            if (!trimmedPreview) {
                Toast.show('⚠️ Tên lịch sử không được để trống!', 'warning');
                return;
            }

            updateHistoryPreview(item.id, trimmedPreview);
            renderHistory();
            Toast.show('✓ Đã cập nhật tên lịch sử!', 'success');
        });

        // Button xóa
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Xóa khỏi lịch sử';
        deleteBtn.className = 'history-action-btn history-action-btn--delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFromHistory(item.id);
            renderHistory();
            Toast.show('✓ Đã xóa khỏi lịch sử!', 'info');
        });

        itemDiv.appendChild(textDiv);
        actionDiv.appendChild(editBtn);
        actionDiv.appendChild(deleteBtn);
        itemDiv.appendChild(actionDiv);
        container.appendChild(itemDiv);
    });
}

// Global variable để lưu COMMENT_BANK
window.flow2CommentBank = null;
window.generatedCommentBank = null;

// Helper: Format COMMENT_BANK để hiển thị trong textarea
function formatCommentBankForDisplay(bank) {
    let result = '';

    if (bank.XUATSAR && bank.XUATSAR.comments) {
        result += '=== NHẬN XÉT MỨC XUẤT SẮC (Điểm 10) ===\n';
        bank.XUATSAR.comments.forEach((c, i) => {
            result += `${i + 1}. ${c}\n`;
        });
        result += '\n';
    }

    if (bank.GIOI && bank.GIOI.comments) {
        result += '=== NHẬN XÉT MỨC GIỎI (Điểm 9) ===\n';
        bank.GIOI.comments.forEach((c, i) => {
            result += `${i + 1}. ${c}\n`;
        });
        result += '\n';
    }

    if (bank.KHA && bank.KHA.comments) {
        result += '=== NHẬN XÉT MỨC KHÁ (Điểm 7-8) ===\n';
        bank.KHA.comments.forEach((c, i) => {
            result += `${i + 1}. ${c}\n`;
        });
        result += '\n';
    }

    if (bank.YEU && bank.YEU.comments) {
        result += '=== NHẬN XÉT MỨC YẾU (Điểm 0-6) ===\n';
        bank.YEU.comments.forEach((c, i) => {
            result += `${i + 1}. ${c}\n`;
        });
    }

    return result;
}

// Helper: Get config từ HTML (Cấu Hình tab)
function getConfigFromUI() {
    return {
        numComments: Number(document.getElementById('configNumComments').value) || 20,
        includeAllObjectives: document.getElementById('configIncludeAllObjectives').checked,
        commentVariety: document.getElementById('configCommentVariety').value || 'medium',
        commentLength: document.getElementById('configCommentLength').value || '1-2',
        tone: document.getElementById('configTone').value || 'pedagogical',
        allowEmoji: document.getElementById('configAllowEmoji').checked,
        banGenericWords: document.getElementById('configBanGenericWords').checked,
    };
}

function notifyFallbackModel(meta) {
    if (!meta?.fallbackUsed || !meta?.modelUsed) {
        return;
    }

    const primaryModel = meta.primaryModel || 'model chính';
    Toast.show(`Đang dùng model dự phòng: ${meta.modelUsed} (thay cho ${primaryModel})`, 'warning');
}

window.generateCommentsByAI = async function () {
    if (window.toolkaplaAiBusy) {
        return Toast.show('Đang có tiến trình AI khác, vui lòng đợi hoàn thành.', 'warning');
    }

    const lesson = document.getElementById('lessonDescription').value.trim();

    if (!lesson) {
        return Toast.show('Bạn chưa nhập mô tả buổi học!', 'warning');
    }

    // Lấy config từ UI
    const config = getConfigFromUI();

    // Disable buttons khi đang sinh
    disableButtons();

    // Xóa comments cũ
    const commentsInput = document.getElementById('commentsInput');
    commentsInput.value = '';

    // Thêm progress indicator
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText =
        'color: #00d4ff; font-size: 14px; margin-top: 12px; font-weight: 600; padding: 12px 16px; background: rgba(0, 212, 255, 0.15); border: 1.5px solid rgba(0, 212, 255, 0.4); border-radius: 10px; text-align: center; backdrop-filter: blur(5px); animation: slideIn 0.3s ease;';
    progressDiv.textContent = '⏳ Đang gọi AI để sinh kho nhận xét...';
    commentsInput.parentNode.insertBefore(progressDiv, commentsInput.nextSibling);

    try {
        const prompt = buildPromptFlow2(lesson, config);
        let commentBank = null;

        const onCommentBankReceived = (result) => {
            try {
                const jsonStr = extractJSON(result);
                commentBank = JSON.parse(jsonStr);
            } catch (e) {
                console.error('Lỗi parse JSON:', e);
                console.error('Raw response:', result);
                throw new Error('AI trả về không hợp lệ: ' + e.message);
            }
        };

        await generateCommentsFromGemini(prompt, {
            onCommentReceived: onCommentBankReceived,
            onResponseMeta: notifyFallbackModel,
            isJSONMode: true,
            originalLesson: lesson,
        });

        if (
            !commentBank ||
            !commentBank.commentBank ||
            !commentBank.commentBank.XUATSAR ||
            !commentBank.commentBank.GIOI ||
            !commentBank.commentBank.KHA ||
            !commentBank.commentBank.YEU
        ) {
            throw new Error('COMMENT_BANK không hợp lệ');
        }

        window.flow2CommentBank = commentBank.commentBank;
        window.generatedCommentBank = commentBank.commentBank;
        commentsInput.value = formatCommentBankForDisplay(commentBank.commentBank);

        progressDiv.style.background = 'rgba(76, 175, 80, 0.15)';
        progressDiv.style.borderColor = 'rgba(76, 175, 80, 0.4)';
        progressDiv.style.color = '#4caf50';
        progressDiv.textContent = '✅ Hoàn thành! Bạn có thể chỉnh sửa nhận xét rồi bấm "Tạo Script"';
        setTimeout(() => progressDiv.remove(), 3000);

        Toast.show('✅ Đã sinh nhận xét theo điểm (XUATSAR + GIOI + KHA + YEU)!', 'success');
    } catch (e) {
        console.error(e);
        progressDiv.style.background = 'rgba(220, 53, 69, 0.15)';
        progressDiv.style.borderColor = 'rgba(220, 53, 69, 0.4)';
        progressDiv.style.color = '#ff6b7a';
        progressDiv.textContent = '❌ Lỗi khi gọi AI!';
        setTimeout(() => progressDiv.remove(), 4000);
        Toast.show('❌ Lỗi khi gọi AI: ' + e.message, 'error');
    } finally {
        enableButtons();
        renderHistory();
        updateScriptTabInfo();
    }
};

window.generateScriptsUI = async function () {
    if (!window.flow2CommentBank) {
        return Toast.show('Vui lòng bấm "✨ Sinh nhận xét bằng AI" trước!', 'warning');
    }

    try {
        const generator = new ScriptGeneratorFlow2();
        const scoreConfig = loadScoreConfig();
        generator.setCommentBank(window.flow2CommentBank);
        generator.setDefaultScore(scoreConfig.fixedScore);

        const scriptOutput = document.getElementById('scriptOutput');
        scriptOutput.textContent = generator.generateScript();

        if (window.Prism) Prism.highlightAll();

        tabManager.switchTab('script-output');
        Toast.show('✅ Đã tạo Script!', 'success');
    } catch (e) {
        console.error(e);
        Toast.show('❌ Lỗi khi tạo script: ' + e.message, 'error');
    }
};

window.copyScript = function (id) {
    const el = document.getElementById(id);
    const content = el.textContent.trim();

    // Kiểm tra nếu chưa tạo script
    if (!content || content.startsWith('/* Chưa có script')) {
        Toast.show('Chưa có script để copy!', 'warning');
        return;
    }

    const scriptName = 'Script';

    navigator.clipboard
        .writeText(content)
        .then(() => Toast.show(`Đã copy ${scriptName}!`, 'success'))
        .catch(() => Toast.show(`Copy ${scriptName} lỗi!`, 'error'));
};

// Load lịch sử khi trang load
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo tab manager
    tabManager = new TabManager();

    // Khởi tạo UI cấu hình prompt
    initPromptConfigUI();
    initScoreConfigUI();

    initAutoCommentManager({
        switchTab: (tabName) => tabManager.switchTab(tabName),
    });

    const historySearchInput = document.getElementById('historySearchInput');
    if (historySearchInput) {
        historySearchInput.addEventListener('input', renderHistory);
    }

    // Load lịch sử
    renderHistory();

    // Cập nhật thông tin tab script
    updateScriptTabInfo();

    // Đảm bảo tab navigation luôn mở, kể cả nếu phiên trước đang chạy dở
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.disabled = false;
    });

    // Listen for score input changes
    document.getElementById('fixedScore').addEventListener('change', updateScriptTabInfo);

    // Listen for comments changes
    document.getElementById('commentsInput').addEventListener('input', updateScriptTabInfo);
});
