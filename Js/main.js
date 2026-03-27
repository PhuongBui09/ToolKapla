import { Toast } from './toast.js';
import { ScriptGenerator } from './scriptGenerator.js';
import { ScriptGeneratorFlow2 } from './scriptGenerator2.js';
import { TabManager } from './tabManager.js';
import {
    generateCommentsFromGemini,
    getCommentHistory,
    deleteFromHistory,
    updateHistoryPreview,
} from './gemini.js';
import { initPromptConfigUI } from './promptConfigUI.js';
import { buildPromptFlow1, buildPromptFlow2 } from './promptFlow2.js';

const generator = new ScriptGenerator();
let tabManager;

// Helper: Extract JSON từ response (xử lý markdown code blocks)
function extractJSON(jsonString) {
    let cleaned = jsonString.trim();
    // Remove markdown code blocks: ```json ... ``` hoặc ``` ... ```
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return cleaned;
}

// Hàm để disable buttons khi đang sinh comments
function disableButtons() {
    document.querySelectorAll('button').forEach((btn) => (btn.disabled = true));
    document.getElementById('commentsInput').disabled = true;
}

// Hàm để enable buttons khi hoàn thành
function enableButtons() {
    document.querySelectorAll('button').forEach((btn) => (btn.disabled = false));
    document.getElementById('commentsInput').disabled = false;
}

/**
 * Cập nhật thông tin ở tab "Tạo Script"
 */
function updateScriptTabInfo() {
    // Không cần cập nhật tab này nữa vì đã gộp vào tab 1
}

/**
 * Hiển thị lịch sử nhận xét
 */
function renderHistory() {
    const history = getCommentHistory();
    const container = document.getElementById('historyContainer');
    const emptyMsg = document.getElementById('historyEmpty');

    container.innerHTML = '';

    if (history.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';

    history.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText =
            'padding: 12px; margin: 8px 0; background: rgba(0, 212, 255, 0.1); border: 1.5px solid rgba(0, 212, 255, 0.3); border-radius: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; backdrop-filter: blur(5px);';

        const textDiv = document.createElement('div');
        textDiv.style.cssText = 'flex: 1; cursor: pointer;';

        // Thêm badge hiển thị Flow 1 hay Flow 2
        const flowBadge = item.flowType === 'flow2' ? ' 🔄' : ' ✍️';
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText =
            'font-weight: 600; color: #00d4ff; font-size: 13px; word-break: break-word;';
        titleDiv.textContent = `${item.lessonPreview}${flowBadge}`;

        const timeDiv = document.createElement('div');
        timeDiv.style.cssText = 'color: #999; font-size: 12px; margin-top: 4px;';
        timeDiv.textContent = new Date(item.timestamp).toLocaleString('vi-VN');

        textDiv.appendChild(titleDiv);
        textDiv.appendChild(timeDiv);

        // Click để load nhận xét và mô tả
        textDiv.addEventListener('click', () => {
            document.getElementById('lessonDescription').value =
                item.lessonDescription || item.lessonPreview;

            // Xác định flow type để load đúng cách
            if (item.flowType === 'flow2') {
                // Flow 2: comments là JSON string chứa COMMENT_BANK
                try {
                    const parsed = JSON.parse(item.comments);
                    window.flow2CommentBank = parsed.commentBank || parsed;
                    document.getElementById('commentsInput').value = formatCommentBankForDisplay(
                        window.flow2CommentBank,
                    );
                    // Chọn Flow 2 radio button
                    document.querySelector('input[name="flowType"][value="flow2"]').checked = true;
                } catch (e) {
                    console.error('Lỗi parse Flow 2 comments:', e);
                    Toast.show('❌ Lỗi khi tải dữ liệu Flow 2!', 'error');
                    return;
                }
            } else {
                // Flow 1: comments là array
                document.getElementById('commentsInput').value = Array.isArray(item.comments)
                    ? item.comments.join('\n')
                    : item.comments;
                // Chọn Flow 1 radio button
                document.querySelector('input[name="flowType"][value="flow1"]').checked = true;
            }

            Toast.show('✓ Đã tải mô tả và nhận xét từ lịch sử!', 'success');
            updateScriptTabInfo();
        });

        const actionDiv = document.createElement('div');
        actionDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-left: 12px;';

        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️';
        editBtn.title = 'Sửa tên lịch sử';
        editBtn.style.cssText =
            'background: rgba(255, 193, 7, 0.18); color: #ffd666; border: 1px solid rgba(255, 193, 7, 0.35); padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.3s;';
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
        deleteBtn.style.cssText =
            'background: rgba(220, 53, 69, 0.2); color: #ff6b7a; border: 1px solid rgba(220, 53, 69, 0.3); padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.3s;';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFromHistory(item.id);
            renderHistory();
            Toast.show('✓ Đã xóa khỏi lịch sử!', 'info');
        });

        itemDiv.addEventListener('mouseenter', () => {
            itemDiv.style.background = 'rgba(0, 212, 255, 0.2)';
            itemDiv.style.borderColor = 'rgba(0, 212, 255, 0.6)';
            editBtn.style.background = 'rgba(255, 193, 7, 0.32)';
            deleteBtn.style.background = 'rgba(220, 53, 69, 0.4)';
        });
        itemDiv.addEventListener('mouseleave', () => {
            itemDiv.style.background = 'rgba(0, 212, 255, 0.1)';
            itemDiv.style.borderColor = 'rgba(0, 212, 255, 0.3)';
            editBtn.style.background = 'rgba(255, 193, 7, 0.18)';
            deleteBtn.style.background = 'rgba(220, 53, 69, 0.2)';
        });

        itemDiv.appendChild(textDiv);
        actionDiv.appendChild(editBtn);
        actionDiv.appendChild(deleteBtn);
        itemDiv.appendChild(actionDiv);
        container.appendChild(itemDiv);
    });
}

// Global variable để lưu COMMENT_BANK của Flow 2
window.flow2CommentBank = null;

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
    const flowType = document.querySelector('input[name="flowType"]:checked').value;
    const lesson = document.getElementById('lessonDescription').value.trim();

    if (!lesson) {
        return Toast.show('Bạn chưa nhập mô tả buổi học!', 'warning');
    }

    // Lấy config từ UI
    const config = getConfigFromUI();

    // ===== FLOW 1: Sinh nhận xét chung =====
    if (flowType === 'flow1') {
        // Disable buttons khi đang sinh
        disableButtons();

        // Xóa comments cũ
        const commentsInput = document.getElementById('commentsInput');
        commentsInput.value = '';

        // Thêm progress indicator
        const progressDiv = document.createElement('div');
        progressDiv.style.cssText =
            'color: #00d4ff; font-size: 14px; margin-top: 12px; font-weight: 600; padding: 12px 16px; background: rgba(0, 212, 255, 0.15); border: 1.5px solid rgba(0, 212, 255, 0.4); border-radius: 10px; text-align: center; backdrop-filter: blur(5px); animation: slideIn 0.3s ease;';
        progressDiv.textContent = '⏳ Đang kết nối với AI...';
        commentsInput.parentNode.insertBefore(progressDiv, commentsInput.nextSibling);

        try {
            // Gọi AI với unified prompt Flow 1 + config
            const prompt = buildPromptFlow1(lesson, config);
            let commentCount = 0;

            const onTextUpdate = (fullText) => {
                commentsInput.value = fullText;

                const nextCount = fullText
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0).length;

                commentCount = nextCount;
                progressDiv.textContent =
                    commentCount > 0
                        ? `📥 Đã nhận ${commentCount} nhận xét...`
                        : '✍️ AI đang soạn nhận xét...';

                commentsInput.scrollTop = commentsInput.scrollHeight;
            };

            // Flow 1 đã build prompt sẵn ở đây, còn originalLesson được dùng để lưu history đúng mô tả gốc.
            await generateCommentsFromGemini(prompt, {
                onTextUpdate,
                onResponseMeta: notifyFallbackModel,
                isJSONMode: false,
                originalLesson: lesson,
                isPromptReady: true,
            });

            progressDiv.style.background = 'rgba(76, 175, 80, 0.15)';
            progressDiv.style.borderColor = 'rgba(76, 175, 80, 0.4)';
            progressDiv.style.color = '#4caf50';
            progressDiv.textContent = '✅ Hoàn thành! Bạn có thể chỉnh sửa nhận xét';
            setTimeout(() => progressDiv.remove(), 3000);

            Toast.show(`✨ Đã sinh ${commentCount || config.numComments} nhận xét!`, 'success');

            // Reload lịch sử
            renderHistory();
            updateScriptTabInfo();
        } catch (e) {
            console.error(e);
            progressDiv.style.background = 'rgba(220, 53, 69, 0.15)';
            progressDiv.style.borderColor = 'rgba(220, 53, 69, 0.4)';
            progressDiv.style.color = '#ff6b7a';
            progressDiv.textContent = '❌ Lỗi khi gọi AI!';
            setTimeout(() => progressDiv.remove(), 4000);
            Toast.show('❌ Lỗi khi gọi AI: ' + e.message, 'error');
        } finally {
            // Enable buttons khi xong
            enableButtons();
        }
    } else {
        // ===== FLOW 2: Sinh COMMENT_BANK dựa trên mô tả (CỐ ĐỊNH 3 level: YEU/KHA/GIOI) =====
        // Không cần chọn khoảng điểm nữa - cố định

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
            // GỌI AI để sinh COMMENT_BANK với unified prompt Flow 2 + config (CỐ ĐỊNH 3 level)
            const prompt = buildPromptFlow2(lesson, config);
            let commentBank = null;

            const onCommentBankReceived = (result) => {
                try {
                    // Extract JSON (strip markdown code blocks nếu có)
                    const jsonStr = extractJSON(result);

                    // Parse JSON từ AI
                    commentBank = JSON.parse(jsonStr);
                } catch (e) {
                    console.error('Lỗi parse JSON:', e);
                    console.error('Raw response:', result);
                    throw new Error('AI trả về không hợp lệ: ' + e.message);
                }
            };

            // Gọi Gemini API với unified prompt Flow 2
            // Truyền lesson (mô tả gốc) làm originalLesson để lưu vào lịch sử đúng cách
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

            // Lưu COMMENT_BANK vào global variable
            window.flow2CommentBank = commentBank.commentBank;

            // Hiển thị 20 nhận xét trong textarea
            commentsInput.value = formatCommentBankForDisplay(commentBank.commentBank);

            progressDiv.style.background = 'rgba(76, 175, 80, 0.15)';
            progressDiv.style.borderColor = 'rgba(76, 175, 80, 0.4)';
            progressDiv.style.color = '#4caf50';
            progressDiv.textContent =
                '✅ Hoàn thành! Bạn có thể chỉnh sửa nhận xét rồi bấm "Tạo Script"';
            setTimeout(() => progressDiv.remove(), 3000);

            Toast.show(
                '✅ Đã sinh 20 nhận xét (5 XUATSAR + 5 GIOI + 5 KHA + 5 YEU)! Có thể chỉnh sửa rồi bấm "Tạo Script"',
                'success',
            );
        } catch (e) {
            console.error(e);
            progressDiv.style.background = 'rgba(220, 53, 69, 0.15)';
            progressDiv.style.borderColor = 'rgba(220, 53, 69, 0.4)';
            progressDiv.style.color = '#ff6b7a';
            progressDiv.textContent = '❌ Lỗi khi gọi AI!';
            setTimeout(() => progressDiv.remove(), 4000);
            Toast.show('❌ Lỗi khi gọi AI: ' + e.message, 'error');
        } finally {
            // Enable buttons khi xong
            enableButtons();
        }
    }
};

window.generateScriptsUI = async function () {
    // Xác định Flow được chọn
    const flowType = document.querySelector('input[name="flowType"]:checked').value;

    if (flowType === 'flow2') {
        // ===== FLOW 2: Dùng COMMENT_BANK đã sinh để tạo script =====

        // Kiểm tra COMMENT_BANK đã được sinh chưa
        if (!window.flow2CommentBank) {
            return Toast.show('Vui lòng bấm "✨ Sinh nhận xét bằng AI" trước!', 'warning');
        }

        try {
            // Sinh script với COMMENT_BANK đã lưu
            const generator2 = new ScriptGeneratorFlow2();
            generator2.setCommentBank(window.flow2CommentBank);

            const scriptOutput = document.getElementById('scriptOutput');
            scriptOutput.textContent = generator2.generateScript();

            if (window.Prism) Prism.highlightAll();

            tabManager.switchTab('script-output');
            Toast.show('✅ Đã tạo Script Flow 2!', 'success');
        } catch (e) {
            console.error(e);
            Toast.show('❌ Lỗi khi tạo script: ' + e.message, 'error');
        }
    } else {
        // ===== FLOW 1: Nhận xét chung (cũ) =====
        const text = document.getElementById('commentsInput').value.trim();
        if (!text) return Toast.show('Bạn chưa nhập nhận xét!', 'warning');

        generator.setComments(text);

        const mode = document.querySelector('input[name="scoreMode"]:checked').value;

        if (mode === 'fixed') {
            generator.setScoreMode('fixed', {
                fixed: Number(document.getElementById('fixedScore').value),
            });
        } else {
            generator.setScoreMode('range', {
                min: Number(document.getElementById('scoreMin').value),
                max: Number(document.getElementById('scoreMax').value),
            });
        }

        document.getElementById('scriptOutput').textContent = generator.generateScript();

        if (window.Prism) Prism.highlightAll();

        Toast.show('Đã tạo Script!', 'success');

        // Auto switch đến tab script output
        tabManager.switchTab('script-output');
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

    // Load lịch sử
    renderHistory();

    // Cập nhật thông tin tab script
    updateScriptTabInfo();

    // ===== FLOW SELECTION HANDLERS =====
    // Flow 2 giờ không cần chọn khoảng điểm nữa - cố định là YEU/KHA/GIOI

    // Listen for score mode changes
    document.querySelectorAll('input[name="scoreMode"]').forEach((radio) => {
        radio.addEventListener('change', updateScriptTabInfo);
    });

    // Listen for score input changes
    document.getElementById('fixedScore').addEventListener('change', updateScriptTabInfo);
    document.getElementById('scoreMin').addEventListener('change', updateScriptTabInfo);
    document.getElementById('scoreMax').addEventListener('change', updateScriptTabInfo);

    // Listen for comments changes
    document.getElementById('commentsInput').addEventListener('input', updateScriptTabInfo);
});
