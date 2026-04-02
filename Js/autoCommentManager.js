import { Toast } from './toast.js';
import { loadConfig } from './promptConfig.js';

const API_BASE = window.BACKEND_URL || '';
const STORAGE_KEY = 'toolkapla_auto_comment_entries';
const RUN_HISTORY_KEY = 'toolkapla_auto_comment_run_history';
const MANUAL_HISTORY_KEY = 'toolkapla_comments_history';
const BACKEND_MIGRATION_KEY = 'toolkapla_auto_backend_migrated_v2';
const AUTO_REFRESH_MS = 48 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECENT_RUNS = 8;
const MAX_RUN_HISTORY = 50;
const STATE_REFRESH_INTERVAL_MS = 60 * 1000;

const FLOW_LABELS = {
    flow1: 'Flow 1 - Nhận xét chung',
    flow2: 'Flow 2 - Theo điểm',
};

const PANEL_TITLES = {
    form: 'Thêm form tự động',
    list: 'Danh sách mẫu đã lưu',
    history: 'Lịch sử chạy tự động',
};

function createId(prefix = 'auto') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(timestamp) {
    if (!timestamp) {
        return 'Chưa có';
    }

    return new Date(timestamp).toLocaleString('vi-VN');
}

function formatRelativeCountdown(targetTime) {
    if (!targetTime) {
        return 'Chưa xác định';
    }

    const diffMs = targetTime - Date.now();
    if (diffMs <= 0) {
        return 'Đến hạn';
    }

    const totalMinutes = Math.ceil(diffMs / (60 * 1000));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];

    if (days > 0) {
        parts.push(`${days} ngày`);
    }

    if (hours > 0) {
        parts.push(`${hours} giờ`);
    }

    if (minutes > 0 && days === 0) {
        parts.push(`${minutes} phút`);
    }

    return parts.join(' ') || 'Dưới 1 phút';
}

function normalizeModelMeta(item) {
    return {
        modelUsed: String(item?.modelUsed || '').trim(),
        primaryModel: String(item?.primaryModel || '').trim(),
        fallbackUsed: Boolean(item?.fallbackUsed),
        attemptedModels: Array.isArray(item?.attemptedModels)
            ? item.attemptedModels.map((model) => String(model || '').trim()).filter(Boolean)
            : [],
    };
}

function formatModelUsageLabel(item) {
    const meta = normalizeModelMeta(item);

    if (meta.fallbackUsed && meta.modelUsed) {
        const primaryLabel = meta.primaryModel || 'model chính';
        return `Model dự phòng: ${meta.modelUsed} (thay cho ${primaryLabel})`;
    }

    if (meta.attemptedModels.length > 1 && meta.modelUsed) {
        return `Đã thử ${meta.attemptedModels.length} model, dùng ${meta.modelUsed}`;
    }

    return '';
}

function summarizeRecentRuns(recentRuns, runCount = 0) {
    const items = Array.isArray(recentRuns) ? recentRuns : [];

    if (items.length === 0) {
        return runCount > 0 ? `Đã chạy ${runCount} lần` : 'Chưa có lần chạy nào';
    }

    const successCount = items.filter((item) => item.status === 'success').length;
    const errorCount = items.length - successCount;

    return `${items.length} lần gần nhất: ${successCount} thành công${
        errorCount > 0 ? `, ${errorCount} lỗi` : ''
    }`;
}

function normalizeSearchTerm(value) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function getSearchableCommentsText(comments) {
    if (Array.isArray(comments)) {
        return comments.join('\n');
    }

    if (typeof comments === 'string') {
        return comments;
    }

    return JSON.stringify(comments || '');
}

function getSearchableRunHistoryContent(item) {
    return [
        item?.lessonPreview,
        item?.lessonDescription,
        getSearchableCommentsText(item?.comments),
        formatModelUsageLabel(item),
    ]
        .map((value) => String(value || ''))
        .join('\n')
        .toLowerCase();
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function readStorageArray(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error(`Lỗi khi đọc storage ${storageKey}:`, error);
        return [];
    }
}

function writeStorageArray(storageKey, items) {
    localStorage.setItem(storageKey, JSON.stringify(items));
}

function normalizeEntry(entry) {
    const now = Date.now();
    const createdAt = Number(entry?.createdAt) || now;
    const updatedAt = Number(entry?.updatedAt) || createdAt;
    const scheduleAnchorAt = Number(entry?.scheduleAnchorAt) || updatedAt;

    return {
        id: entry?.id || createId('entry'),
        lessonPreview: String(entry?.lessonPreview || '').trim(),
        flowType: entry?.flowType === 'flow2' ? 'flow2' : 'flow1',
        lessonDescription: String(entry?.lessonDescription || '').trim(),
        createdAt,
        updatedAt,
        scheduleAnchorAt,
        lastGeneratedAt: Number(entry?.lastGeneratedAt) || null,
        lastAttemptAt: Number(entry?.lastAttemptAt) || null,
        lastStatus: entry?.lastStatus || 'idle',
        lastError: entry?.lastError || '',
        retryAfterAt: Number(entry?.retryAfterAt) || 0,
        runCount: Number(entry?.runCount) || 0,
        recentRuns: Array.isArray(entry?.recentRuns)
            ? entry.recentRuns.slice(0, MAX_RECENT_RUNS).map((run) => ({
                  timestamp: Number(run?.timestamp) || Date.now(),
                  status: run?.status === 'error' ? 'error' : 'success',
                  error: run?.status === 'error' ? String(run?.error || '') : '',
                  autoRunId: run?.autoRunId || null,
                  triggeredBy: run?.triggeredBy === 'cron' ? 'cron' : 'manual',
                  ...normalizeModelMeta(run),
              }))
            : [],
    };
}

function normalizeRunHistoryItem(item) {
    const timestamp = Number(item?.timestamp) || Date.now();

    return {
        id: item?.id || createId('run'),
        entryId: item?.entryId || null,
        lessonPreview: String(item?.lessonPreview || '').trim(),
        flowType: item?.flowType === 'flow2' ? 'flow2' : 'flow1',
        lessonDescription: String(item?.lessonDescription || '').trim(),
        comments: item?.comments ?? '',
        timestamp,
        source: 'auto-refresh',
        ...normalizeModelMeta(item),
    };
}

function parseStatePayload(payload) {
    const state = payload?.state || payload || {};

    return {
        entries: Array.isArray(state.entries) ? state.entries.map(normalizeEntry) : [],
        runHistory: Array.isArray(state.runHistory)
            ? state.runHistory.map(normalizeRunHistoryItem)
            : [],
    };
}

function migrateLegacyAutoHistoryLocally() {
    const manualHistory = readStorageArray(MANUAL_HISTORY_KEY);
    if (manualHistory.length === 0) {
        return false;
    }

    const autoItems = manualHistory.filter((item) => item?.source === 'auto-refresh');
    if (autoItems.length === 0) {
        return false;
    }

    const manualItems = manualHistory.filter((item) => item?.source !== 'auto-refresh');
    const existingRunHistory = readStorageArray(RUN_HISTORY_KEY).map(normalizeRunHistoryItem);
    const existingIds = new Set(existingRunHistory.map((item) => item.id));

    const migratedItems = autoItems
        .map((item) =>
            normalizeRunHistoryItem({
                id: item.id ? `legacy_${item.id}` : createId('legacy'),
                entryId: item.automationId || null,
                lessonPreview: item.lessonPreview || '',
                flowType: item.flowType || 'flow1',
                lessonDescription: item.lessonDescription || '',
                comments: item.comments,
                timestamp: item.timestamp || Date.now(),
            }),
        )
        .filter((item) => !existingIds.has(item.id));

    if (migratedItems.length > 0) {
        const merged = [...migratedItems, ...existingRunHistory]
            .sort((left, right) => right.timestamp - left.timestamp)
            .slice(0, MAX_RUN_HISTORY);
        writeStorageArray(RUN_HISTORY_KEY, merged);
    }

    writeStorageArray(MANUAL_HISTORY_KEY, manualItems);
    return true;
}

export class AutoCommentManager {
    constructor({ switchTab = null } = {}) {
        this.switchTab = switchTab;
        this.entries = [];
        this.runHistory = [];
        this.runHistorySearchTerm = '';
        this.activePanel = 'form';
        this.refreshIntervalId = null;
        this.loadingState = true;
        this.lastErrorMessage = '';
        this.submitInFlight = false;
    }

    init() {
        this.cacheDom();
        this.bindEvents();
        // this.render(); // Removed: no longer show list
        this.renderRunHistory();
        this.bootstrap();
    }

    async bootstrap() {
        try {
            const migrated = await this.migrateLegacyLocalData();
            await this.refreshState({ silent: false });
            await this.runDueEntriesIfAny();
            this.startPolling();

            if (migrated) {
                Toast.show('Đã chuyển dữ liệu auto cũ lên backend', 'info');
            }
        } catch (error) {
            console.error('Lỗi khi khởi tạo auto manager:', error);
        }
    }

    cacheDom() {
        this.form = document.getElementById('autoCommentForm');
        this.entryIdInput = document.getElementById('autoCommentEntryId');
        this.lessonPreviewInput = document.getElementById('autoLessonPreview');
        this.flowTypeInput = document.getElementById('autoFlowType');
        this.lessonDescriptionInput = document.getElementById('autoLessonDescription');
        this.saveBtn = document.getElementById('autoCommentSaveBtn');
        this.cancelBtn = document.getElementById('autoCommentCancelBtn');
        this.listContainer = document.getElementById('autoCommentList');
        this.emptyState = document.getElementById('autoCommentEmpty');
        this.summary = document.getElementById('autoCommentSummary');
        this.runHistoryContainer = document.getElementById('autoRunHistoryContainer');
        this.runHistoryEmpty = document.getElementById('autoRunHistoryEmpty');
        this.runHistorySearchInput = document.getElementById('autoRunHistorySearchInput');
        this.entriesCount = document.getElementById('autoEntriesCount');
        this.dueCount = document.getElementById('autoDueCount');
        this.runCount = document.getElementById('autoRunCount');
        this.latestRunLabel = document.getElementById('autoLatestRunLabel');
        this.formCardMeta = document.getElementById('autoFormCardMeta');
        this.listCardMeta = document.getElementById('autoListCardMeta');
        this.historyCardMeta = document.getElementById('autoHistoryCardMeta');
        this.modal = document.getElementById('autoCommentModal');
        this.modalTitle = document.getElementById('autoModalTitle');
        this.modalTabs = this.modal.querySelectorAll('.auto-modal-tab');
        this.modalPanels = this.modal.querySelectorAll('.auto-modal-panel');
        this.dashboardButtons = document.querySelectorAll(
            '#tab-auto-comments .auto-launch-card[data-open-panel]',
        );
        this.closeModalButtons = this.modal.querySelectorAll('[data-close-modal]');
    }

    bindEvents() {
        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            void this.handleSubmit();
        });

        this.cancelBtn.addEventListener('click', () => {
            this.resetForm();
            this.openPanel('list');
        });

        this.dashboardButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const panelName = button.dataset.openPanel || 'form';
                if (panelName === 'form') {
                    this.resetForm();
                }
                this.openPanel(panelName);
            });
        });

        this.modalTabs.forEach((button) => {
            button.addEventListener('click', () => {
                const panelName = button.dataset.openPanel || 'form';
                this.openPanel(panelName);
            });
        });

        this.closeModalButtons.forEach((button) => {
            button.addEventListener('click', () => {
                this.closeModal();
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.classList.contains('is-open')) {
                this.closeModal();
            }
        });

        this.listContainer.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-action]');
            if (!actionButton) {
                return;
            }

            const { action, entryId } = actionButton.dataset;
            if (!entryId) {
                return;
            }

            if (action === 'edit') {
                this.startEdit(entryId);
                return;
            }

            if (action === 'delete') {
                void this.deleteEntry(entryId);
                return;
            }
        });

        this.runHistoryContainer.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-run-action]');
            if (!actionButton) {
                return;
            }

            const { runAction, runId } = actionButton.dataset;
            if (!runId) {
                return;
            }

            if (runAction === 'load') {
                this.loadRunHistoryIntoMainForm(runId);
                return;
            }

            if (runAction === 'view-details') {
                const runItem = this.runHistory.find((item) => item.id === runId);
                if (runItem) {
                    const entry = this.entries.find((e) => e.id === runItem.entryId);
                    if (entry) {
                        this.showEntryDetails(entry);
                    }
                }
                return;
            }
        });

        if (this.runHistorySearchInput) {
            this.runHistorySearchInput.addEventListener('input', () => {
                this.runHistorySearchTerm = this.runHistorySearchInput.value;
                this.renderRunHistory();
            });
        }
    }

    startPolling() {
        window.clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = window.setInterval(() => {
            void this.refreshState({ silent: true });
        }, STATE_REFRESH_INTERVAL_MS);
    }

    async request(path, { method = 'GET', body = null } = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : {},
            body: body ? JSON.stringify(body) : undefined,
        });

        const rawText = await response.text();
        let payload = null;

        if (rawText) {
            try {
                payload = JSON.parse(rawText);
            } catch {
                payload = { ok: response.ok, error: rawText };
            }
        }

        if (!response.ok || payload?.ok === false) {
            const error = new Error(
                payload?.error || payload?.message || `Yêu cầu thất bại (${response.status})`,
            );
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return payload || { ok: true };
    }

    applyStatePayload(payload) {
        const { entries, runHistory } = parseStatePayload(payload);
        this.entries = entries.sort((left, right) => right.updatedAt - left.updatedAt);
        this.runHistory = runHistory.sort((left, right) => right.timestamp - left.timestamp);
        this.loadingState = false;
        this.lastErrorMessage = '';
        // this.render(); // Removed: no longer show list
        this.renderRunHistory();
    }

    async refreshState({ silent = false } = {}) {
        try {
            const payload = await this.request('/api/auto-state');
            this.applyStatePayload(payload);
            return true;
        } catch (error) {
            console.error('Không thể đồng bộ auto state:', error);
            this.loadingState = false;
            this.lastErrorMessage = error.message || 'Không thể tải dữ liệu auto từ server';
            // this.render(); // Removed: no longer show list
            this.renderRunHistory();

            if (!silent) {
                Toast.show(this.lastErrorMessage, 'error');
            }

            return false;
        }
    }

    async runDueEntriesIfAny() {
        try {
            const response = await this.request('/api/auto-run-due');
            if (response?.dueCount > 0) {
                Toast.show(`Đã cập nhật ${response.processedCount} mẫu auto đến hạn`, 'success');
                // Refresh state sau khi chạy
                await this.refreshState({ silent: true });
            }
        } catch (error) {
            console.error('Lỗi khi kiểm tra và chạy auto due:', error);
            // Không show toast để tránh spam
        }
    }

    async migrateLegacyLocalData() {
        const migratedLegacyHistory = migrateLegacyAutoHistoryLocally();
        const legacyEntries = readStorageArray(STORAGE_KEY).map(normalizeEntry);
        const legacyRunHistory = readStorageArray(RUN_HISTORY_KEY)
            .map(normalizeRunHistoryItem)
            .filter((item) => Date.now() - item.timestamp < ONE_MONTH_MS)
            .slice(0, MAX_RUN_HISTORY);

        if (legacyEntries.length === 0 && legacyRunHistory.length === 0) {
            localStorage.setItem(BACKEND_MIGRATION_KEY, 'done');
            return migratedLegacyHistory;
        }

        try {
            const payload = await this.request('/api/auto-migrate', {
                method: 'POST',
                body: {
                    entries: legacyEntries,
                    runHistory: legacyRunHistory,
                },
            });

            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(RUN_HISTORY_KEY);
            localStorage.setItem(BACKEND_MIGRATION_KEY, 'done');

            if (payload?.state) {
                this.applyStatePayload(payload);
            }

            return true;
        } catch (error) {
            console.error('Không thể migrate dữ liệu auto cũ:', error);

            if (localStorage.getItem(BACKEND_MIGRATION_KEY) !== 'done') {
                Toast.show(
                    'Dữ liệu auto cũ vẫn còn ở máy này vì backend chưa sẵn sàng để migrate.',
                    'warning',
                );
            }

            return migratedLegacyHistory;
        }
    }

    getEntryById(entryId) {
        return this.entries.find((entry) => entry.id === entryId) || null;
    }

    getRunHistoryItemById(runId) {
        return this.runHistory.find((item) => item.id === runId) || null;
    }

    getNextRunAt(entry) {
        return (entry.scheduleAnchorAt || entry.updatedAt || entry.createdAt) + AUTO_REFRESH_MS;
    }

    getNextActionAt(entry) {
        const retryAfterAt = Number(entry.retryAfterAt) || 0;
        return retryAfterAt > 0 ? retryAfterAt : this.getNextRunAt(entry);
    }

    isEntryDue(entry) {
        if (entry.lastStatus === 'running') {
            return false;
        }

        const now = Date.now();
        const retryAfterAt = Number(entry.retryAfterAt) || 0;

        if (retryAfterAt > 0) {
            return now >= retryAfterAt;
        }

        return now >= this.getNextRunAt(entry);
    }

    resetForm() {
        this.entryIdInput.value = '';
        this.lessonPreviewInput.value = '';
        this.flowTypeInput.value = 'flow1';
        this.lessonDescriptionInput.value = '';
        this.saveBtn.textContent = 'Lưu mẫu và chạy AI';
        this.saveBtn.disabled = false;
        this.cancelBtn.style.display = 'none';
    }

    startEdit(entryId) {
        const entry = this.getEntryById(entryId);
        if (!entry) {
            return;
        }

        this.entryIdInput.value = entry.id;
        this.lessonPreviewInput.value = entry.lessonPreview;
        this.flowTypeInput.value = entry.flowType;
        this.lessonDescriptionInput.value = entry.lessonDescription;
        this.saveBtn.textContent = 'Cập nhật và chạy AI';
        this.cancelBtn.style.display = 'inline-flex';
        this.openPanel('form');
        this.lessonPreviewInput.focus();
    }

    async handleSubmit() {
        if (this.submitInFlight) {
            return;
        }

        const lessonPreview = this.lessonPreviewInput.value.trim();
        const flowType = this.flowTypeInput.value === 'flow2' ? 'flow2' : 'flow1';
        const lessonDescription = this.lessonDescriptionInput.value.trim();

        if (!lessonPreview || !lessonDescription) {
            Toast.show('Vui lòng nhập đầy đủ tên ngắn và mô tả buổi học', 'warning');
            return;
        }

        this.submitInFlight = true;
        this.saveBtn.disabled = true;

        try {
            const existingId = this.entryIdInput.value.trim();
            const payload = await this.request('/api/auto-templates', {
                method: 'POST',
                body: {
                    id: existingId || undefined,
                    lessonPreview,
                    flowType,
                    lessonDescription,
                    promptConfig: loadConfig(),
                },
            });

            this.applyStatePayload(payload);
            this.resetForm();
            this.openPanel('list');
            Toast.show(
                payload?.message ||
                    (existingId
                        ? 'Đã cập nhật mẫu tự động và chạy AI.'
                        : 'Đã lưu mẫu tự động mới và chạy AI.'),
                payload?.autoRunOk === false ? 'warning' : 'success',
            );

            const fallbackLabel = formatModelUsageLabel(payload?.meta);
            if (payload?.meta?.fallbackUsed && fallbackLabel) {
                Toast.show(fallbackLabel, 'warning');
            }
        } catch (error) {
            console.error('Không thể lưu mẫu auto:', error);
            Toast.show(error.message || 'Không thể lưu mẫu tự động', 'error');
        } finally {
            this.submitInFlight = false;
            this.saveBtn.disabled = false;
        }
    }

    async deleteEntry(entryId) {
        const entry = this.getEntryById(entryId);
        if (!entry) {
            return;
        }

        if (
            !window.confirm(`Xóa mẫu "${entry.lessonPreview}" và toàn bộ lịch sử auto liên quan?`)
        ) {
            return;
        }

        try {
            const payload = await this.request(
                `/api/auto-templates?id=${encodeURIComponent(entryId)}`,
                {
                    method: 'DELETE',
                },
            );

            this.applyStatePayload(payload);

            if (this.entryIdInput.value === entryId) {
                this.resetForm();
            }

            Toast.show('Đã xóa mẫu tự động và lịch sử auto liên quan', 'info');
        } catch (error) {
            console.error('Không thể xóa mẫu auto:', error);
            Toast.show(error.message || 'Không thể xóa mẫu tự động', 'error');
        }
    }

    loadRunHistoryIntoMainForm(runId) {
        const runItem = this.getRunHistoryItemById(runId);
        if (!runItem) {
            return;
        }

        this.applyDataToMainForm(runItem);

        if (runItem.flowType === 'flow2') {
            try {
                const parsed = JSON.parse(runItem.comments);
                window.flow2CommentBank = parsed.commentBank || parsed;
                document.getElementById('commentsInput').value = this.formatCommentBankForDisplay(
                    window.flow2CommentBank,
                );
            } catch (error) {
                console.error('Lỗi parse auto Flow 2 comments:', error);
                Toast.show('Không tải được kết quả Flow 2 đã lưu', 'error');
                return;
            }
        } else {
            const text = Array.isArray(runItem.comments)
                ? runItem.comments.join('\n')
                : String(runItem.comments || '');
            document.getElementById('commentsInput').value = text;
        }

        Toast.show('Đã nạp kết quả từ lịch sử tự động', 'success');
    }

    applyDataToMainForm(item) {
        const lessonDescription = document.getElementById('lessonDescription');
        const flowRadio = document.querySelector(
            `input[name="flowType"][value="${item.flowType}"]`,
        );

        if (lessonDescription) {
            lessonDescription.value = item.lessonDescription;
        }

        if (flowRadio) {
            flowRadio.checked = true;
        }

        if (typeof this.switchTab === 'function') {
            this.switchTab('generate-comments');
        }

        this.closeModal();
    }

    openPanel(panelName = 'form') {
        this.activePanel = PANEL_TITLES[panelName] ? panelName : 'form';
        this.modal.classList.add('is-open');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('auto-modal-open');

        this.modalTitle.textContent = PANEL_TITLES[this.activePanel];

        this.modalTabs.forEach((button) => {
            button.classList.toggle('active', button.dataset.openPanel === this.activePanel);
        });

        this.modalPanels.forEach((panel) => {
            panel.classList.toggle('active', panel.dataset.panel === this.activePanel);
        });

        if (this.activePanel === 'form') {
            window.requestAnimationFrame(() => {
                this.lessonPreviewInput.focus();
            });
        }
    }

    showEntryDetails(entry) {
        this.modalTitle.textContent = 'Chi tiết mẫu tự động';
        this.modalTabs.forEach((tab) => (tab.style.display = 'none'));
        this.modalPanels.forEach((panel) => panel.classList.remove('active'));

        const detailsPanel = this.modal.querySelector('.auto-modal-panel[data-panel="form"]');
        if (detailsPanel) {
            detailsPanel.classList.add('active');
            detailsPanel.innerHTML = this.renderEntryDetailsHTML(entry);
        }

        this.modal.classList.add('is-open');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('auto-modal-open');
    }

    renderEntryDetailsHTML(entry) {
        const nextActionAt = this.getNextActionAt(entry);
        const flowLabel = FLOW_LABELS[entry.flowType] || FLOW_LABELS.flow1;
        const lastRunText =
            entry.lastStatus === 'running'
                ? 'Đang được server gọi AI...'
                : entry.lastGeneratedAt
                  ? `Lần cuối: ${formatDateTime(entry.lastGeneratedAt)}`
                  : 'Chưa có lần chạy thành công';
        const recentRunSummary = summarizeRecentRuns(entry.recentRuns, entry.runCount);
        const nextActionLabel =
            Number(entry.retryAfterAt) > 0 ? 'Lần thử lại' : 'Lần tự động kế tiếp';

        const statusText =
            entry.lastStatus === 'error'
                ? `Lần gần nhất bị lỗi. Hệ thống sẽ tự thử lại mỗi 5 phút cho tới khi thành công. ${recentRunSummary}`
                : entry.lastStatus === 'running'
                  ? 'Server đang xử lý mẫu này'
                  : entry.lastStatus === 'success'
                    ? recentRunSummary
                    : 'Đang chờ lần chạy đầu tiên ngay sau khi lưu mẫu.';

        return `
            <div class="auto-comment-card auto-comment-card--details">
                <div class="auto-comment-card__header">
                    <div>
                        <h3>${this.escapeHtml(entry.lessonPreview)}</h3>
                        <div class="auto-comment-meta">
                            <span>${this.escapeHtml(flowLabel)}</span>
                            <span>Tạo lúc ${this.escapeHtml(formatDateTime(entry.createdAt))}</span>
                            <span>${this.escapeHtml(lastRunText)}</span>
                        </div>
                    </div>
                    <div class="auto-comment-badge">${entry.runCount} lần</div>
                </div>
                <p class="auto-comment-description">${this.escapeHtml(entry.lessonDescription)}</p>
                <div class="auto-comment-status">
                    <span>${this.escapeHtml(statusText)}</span>
                    <span>${this.escapeHtml(nextActionLabel)}: ${this.escapeHtml(formatDateTime(nextActionAt))} (${this.escapeHtml(formatRelativeCountdown(nextActionAt))})</span>
                </div>
            </div>
        `;
    }

    closeModal() {
        this.modal.classList.remove('is-open');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('auto-modal-open');
        // Reset tabs display
        this.modalTabs.forEach((tab) => (tab.style.display = ''));
    }

    renderOverview() {
        const totalEntries = this.entries.length;
        const dueEntries = this.entries.filter((entry) => this.isEntryDue(entry)).length;
        const runCount = this.runHistory.length;
        const latestRun = this.runHistory[0];

        this.entriesCount.textContent = String(totalEntries);
        this.dueCount.textContent = String(dueEntries);
        this.runCount.textContent = String(runCount);
        this.latestRunLabel.textContent = latestRun
            ? formatDateTime(latestRun.timestamp)
            : 'Chưa có';

        this.formCardMeta.textContent =
            totalEntries === 0 ? 'Bắt đầu tạo mẫu đầu tiên' : 'Thêm mới hoặc cập nhật mẫu hiện có';
        this.listCardMeta.textContent =
            totalEntries === 0
                ? 'Chưa có mẫu nào'
                : `${totalEntries} mẫu đang lưu • ${dueEntries} mẫu đến hạn`;
        this.historyCardMeta.textContent =
            runCount === 0 ? 'Chưa có lần chạy nào' : `Đã lưu ${runCount} kết quả auto riêng biệt`;
    }

    render() {
        const entries = this.entries
            .slice()
            .sort((left, right) => right.updatedAt - left.updatedAt);
        this.listContainer.innerHTML = '';
        this.renderOverview();

        if (this.loadingState) {
            this.summary.textContent = 'Đang đồng bộ mẫu tự động từ server...';
            this.emptyState.style.display = 'block';
            this.emptyState.textContent = 'Đang tải dữ liệu auto...';
            return;
        }

        if (this.lastErrorMessage && entries.length === 0) {
            this.summary.textContent = this.lastErrorMessage;
            this.emptyState.style.display = 'block';
            this.emptyState.textContent = 'Không thể tải dữ liệu auto từ server.';
            return;
        }

        const totalEntries = entries.length;
        const dueEntries = entries.filter((entry) => this.isEntryDue(entry)).length;
        this.summary.textContent =
            totalEntries === 0
                ? 'Chưa có mẫu tự động nào. Lưu 1 mẫu để hệ thống chạy AI ngay rồi tự vận hành về sau.'
                : `${totalEntries} mẫu đang lưu, ${dueEntries} mẫu đến hạn hoặc đang chờ retry. Server sẽ tự chạy ngay khi lưu, tự thử lại mỗi 5 phút nếu lỗi và làm mới lại sau mỗi 48 giờ kể từ lần thành công gần nhất.`;

        if (entries.length === 0) {
            this.emptyState.style.display = 'block';
            this.emptyState.textContent = 'Chưa có mẫu tự động nào';
            return;
        }

        this.emptyState.style.display = 'none';

        entries.forEach((entry) => {
            const nextActionAt = this.getNextActionAt(entry);
            const item = document.createElement('article');
            item.className = 'auto-comment-card';

            const statusClass =
                entry.lastStatus === 'error'
                    ? 'is-error'
                    : entry.lastStatus === 'running'
                      ? 'is-running'
                      : entry.lastStatus === 'success'
                        ? 'is-success'
                        : '';

            if (statusClass) {
                item.classList.add(statusClass);
            }

            const flowLabel = FLOW_LABELS[entry.flowType] || FLOW_LABELS.flow1;
            const disabledAttr = entry.lastStatus === 'running' ? 'disabled' : '';
            const lastRunText =
                entry.lastStatus === 'running'
                    ? 'Đang được server gọi AI...'
                    : entry.lastGeneratedAt
                      ? `Lần cuối: ${formatDateTime(entry.lastGeneratedAt)}`
                      : 'Chưa có lần chạy thành công';
            const recentRunSummary = summarizeRecentRuns(entry.recentRuns, entry.runCount);
            const nextActionLabel =
                Number(entry.retryAfterAt) > 0 ? 'Lần thử lại' : 'Lần tự động kế tiếp';

            const statusText =
                entry.lastStatus === 'error'
                    ? `Lần gần nhất bị lỗi. Hệ thống sẽ tự thử lại mỗi 5 phút cho tới khi thành công. ${recentRunSummary}`
                    : entry.lastStatus === 'running'
                      ? 'Server đang xử lý mẫu này'
                      : entry.lastStatus === 'success'
                        ? recentRunSummary
                        : 'Đang chờ lần chạy đầu tiên ngay sau khi lưu mẫu.';

            item.innerHTML = `
                <div class="auto-comment-card__header">
                    <div>
                        <h3>${this.escapeHtml(entry.lessonPreview)}</h3>
                        <div class="auto-comment-meta">
                            <span>${this.escapeHtml(flowLabel)}</span>
                            <span>Tạo lúc ${this.escapeHtml(formatDateTime(entry.createdAt))}</span>
                            <span>${this.escapeHtml(lastRunText)}</span>
                        </div>
                    </div>
                    <div class="auto-comment-badge">${entry.runCount} lần</div>
                </div>
                <p class="auto-comment-description">${this.escapeHtml(entry.lessonDescription)}</p>
                <div class="auto-comment-status">
                    <span>${this.escapeHtml(statusText)}</span>
                    <span>${this.escapeHtml(nextActionLabel)}: ${this.escapeHtml(formatDateTime(nextActionAt))} (${this.escapeHtml(formatRelativeCountdown(nextActionAt))})</span>
                </div>
                <div class="auto-comment-actions">
                    <button type="button" class="btn-secondary auto-comment-edit-btn" data-action="edit" data-entry-id="${entry.id}" ${disabledAttr}>
                        Sửa
                    </button>
                    <button type="button" class="auto-comment-danger-btn" data-action="delete" data-entry-id="${entry.id}" ${disabledAttr}>
                        Xóa
                    </button>
                </div>
            `;

            this.listContainer.appendChild(item);
        });
    }

    renderRunHistory() {
        this.runHistoryContainer.innerHTML = '';
        this.renderOverview();
        const searchTerm = normalizeSearchTerm(
            this.runHistorySearchInput?.value || this.runHistorySearchTerm,
        );
        const filteredRunHistory = searchTerm
            ? this.runHistory.filter((item) =>
                  getSearchableRunHistoryContent(item).includes(searchTerm),
              )
            : this.runHistory;

        if (this.loadingState && filteredRunHistory.length === 0) {
            this.runHistoryEmpty.style.display = 'block';
            this.runHistoryEmpty.textContent = 'Đang tải lịch sử auto...';
            return;
        }

        if (this.lastErrorMessage && this.runHistory.length === 0) {
            this.runHistoryEmpty.style.display = 'block';
            this.runHistoryEmpty.textContent = 'Không thể tải lịch sử auto từ server.';
            return;
        }

        if (filteredRunHistory.length === 0) {
            this.runHistoryEmpty.style.display = 'block';
            this.runHistoryEmpty.textContent =
                this.runHistory.length === 0
                    ? 'Chưa có lần chạy auto nào'
                    : 'Không tìm thấy lần chạy tự động nào khớp với từ khóa.';
            return;
        }

        this.runHistoryEmpty.style.display = 'none';
        this.runHistoryEmpty.textContent = 'Chưa có lần chạy auto nào';

        filteredRunHistory.forEach((item) => {
            const flowBadge = item.flowType === 'flow2' ? ' 🔄' : ' ✍️';
            const modelLabel = formatModelUsageLabel(item);
            const card = document.createElement('div');
            card.className = 'auto-run-history-item';

            card.innerHTML = `
                <div class="auto-run-history-item__body">
                    <div class="auto-run-history-item__title">${this.escapeHtml(item.lessonPreview)}${flowBadge}</div>
                    <div class="auto-run-history-item__meta">
                        <span>${this.escapeHtml(formatDateTime(item.timestamp))}</span>
                        <span>${this.escapeHtml(FLOW_LABELS[item.flowType] || FLOW_LABELS.flow1)}</span>
                        ${modelLabel ? `<span>${this.escapeHtml(modelLabel)}</span>` : ''}
                    </div>
                </div>
                <div class="auto-run-history-item__actions">
                    <button type="button" class="btn-secondary" data-run-action="view-details" data-run-id="${item.id}">
                        Xem chi tiết
                    </button>
                    <button type="button" class="btn-secondary" data-run-action="load" data-run-id="${item.id}">
                        Nạp kết quả
                    </button>
                </div>
            `;

            this.runHistoryContainer.appendChild(card);
        });
    }

    formatCommentBankForDisplay(bank) {
        let result = '';

        if (bank.XUATSAR?.comments) {
            result += '=== NHẬN XÉT MỨC XUẤT SẮC (Điểm 10) ===\n';
            bank.XUATSAR.comments.forEach((comment, index) => {
                result += `${index + 1}. ${comment}\n`;
            });
            result += '\n';
        }

        if (bank.GIOI?.comments) {
            result += '=== NHẬN XÉT MỨC GIỎI (Điểm 9) ===\n';
            bank.GIOI.comments.forEach((comment, index) => {
                result += `${index + 1}. ${comment}\n`;
            });
            result += '\n';
        }

        if (bank.KHA?.comments) {
            result += '=== NHẬN XÉT MỨC KHÁ (Điểm 7-8) ===\n';
            bank.KHA.comments.forEach((comment, index) => {
                result += `${index + 1}. ${comment}\n`;
            });
            result += '\n';
        }

        if (bank.YEU?.comments) {
            result += '=== NHẬN XÉT MỨC YẾU (Điểm 0-6) ===\n';
            bank.YEU.comments.forEach((comment, index) => {
                result += `${index + 1}. ${comment}\n`;
            });
        }

        return result;
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
}

export function initAutoCommentManager(options = {}) {
    const manager = new AutoCommentManager(options);
    manager.init();
    return manager;
}
