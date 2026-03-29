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
    flow1: 'Flow 1 - Nhan xet chung',
    flow2: 'Flow 2 - Theo diem',
};

const PANEL_TITLES = {
    form: 'Them form tu dong',
    list: 'Danh sach mau da luu',
    history: 'Lich su chay tu dong',
};

function createId(prefix = 'auto') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(timestamp) {
    if (!timestamp) {
        return 'Chua co';
    }

    return new Date(timestamp).toLocaleString('vi-VN');
}

function formatRelativeCountdown(targetTime) {
    if (!targetTime) {
        return 'Chua xac dinh';
    }

    const diffMs = targetTime - Date.now();
    if (diffMs <= 0) {
        return 'Den han';
    }

    const totalMinutes = Math.ceil(diffMs / (60 * 1000));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];

    if (days > 0) {
        parts.push(`${days} ngay`);
    }

    if (hours > 0) {
        parts.push(`${hours} gio`);
    }

    if (minutes > 0 && days === 0) {
        parts.push(`${minutes} phut`);
    }

    return parts.join(' ') || 'Duoi 1 phut';
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
        console.error(`Loi khi doc storage ${storageKey}:`, error);
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
        this.activePanel = 'form';
        this.refreshIntervalId = null;
        this.loadingState = true;
        this.lastErrorMessage = '';
        this.submitInFlight = false;
    }

    init() {
        this.cacheDom();
        this.bindEvents();
        this.render();
        this.renderRunHistory();
        this.bootstrap();
    }

    async bootstrap() {
        try {
            const migrated = await this.migrateLegacyLocalData();
            await this.refreshState({ silent: false });
            this.startPolling();

            if (migrated) {
                Toast.show('Da chuyen du lieu auto cu len backend', 'info');
            }
        } catch (error) {
            console.error('Loi khi khoi tao auto manager:', error);
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

            if (action === 'run') {
                void this.runEntryById(entryId, { manual: true });
                return;
            }

            if (action === 'load') {
                this.loadEntryIntoMainForm(entryId);
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

            if (runAction === 'delete') {
                void this.deleteRunHistory(runId);
            }
        });
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
                payload?.error || payload?.message || `Yeu cau that bai (${response.status})`,
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
        this.render();
        this.renderRunHistory();
    }

    async refreshState({ silent = false } = {}) {
        try {
            const payload = await this.request('/api/auto-state');
            this.applyStatePayload(payload);
            return true;
        } catch (error) {
            console.error('Khong the dong bo auto state:', error);
            this.loadingState = false;
            this.lastErrorMessage = error.message || 'Khong the tai du lieu auto tu server';
            this.render();
            this.renderRunHistory();

            if (!silent) {
                Toast.show(this.lastErrorMessage, 'error');
            }

            return false;
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
            console.error('Khong the migrate du lieu auto cu:', error);

            if (localStorage.getItem(BACKEND_MIGRATION_KEY) !== 'done') {
                Toast.show(
                    'Du lieu auto cu van con o may nay vi backend chua san sang de migrate.',
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

    isEntryDue(entry) {
        if (entry.lastStatus === 'running') {
            return false;
        }

        const now = Date.now();
        return now >= this.getNextRunAt(entry) && now >= (Number(entry.retryAfterAt) || 0);
    }

    resetForm() {
        this.entryIdInput.value = '';
        this.lessonPreviewInput.value = '';
        this.flowTypeInput.value = 'flow1';
        this.lessonDescriptionInput.value = '';
        this.saveBtn.textContent = 'Luu mau tu dong';
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
        this.saveBtn.textContent = 'Cap nhat mau';
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
            Toast.show('Vui long nhap day du ten ngan va mo ta buoi hoc', 'warning');
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
            Toast.show(existingId ? 'Da cap nhat mau tu dong' : 'Da luu mau tu dong moi', 'success');
        } catch (error) {
            console.error('Khong the luu mau auto:', error);
            Toast.show(error.message || 'Khong the luu mau tu dong', 'error');
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

        if (!window.confirm(`Xoa mau "${entry.lessonPreview}"?`)) {
            return;
        }

        try {
            const payload = await this.request(`/api/auto-templates?id=${encodeURIComponent(entryId)}`, {
                method: 'DELETE',
            });

            this.applyStatePayload(payload);

            if (this.entryIdInput.value === entryId) {
                this.resetForm();
            }

            Toast.show('Da xoa mau tu dong', 'info');
        } catch (error) {
            console.error('Khong the xoa mau auto:', error);
            Toast.show(error.message || 'Khong the xoa mau tu dong', 'error');
        }
    }

    async deleteRunHistory(runId) {
        const runItem = this.getRunHistoryItemById(runId);
        if (!runItem) {
            return;
        }

        try {
            const payload = await this.request(`/api/auto-runs?id=${encodeURIComponent(runId)}`, {
                method: 'DELETE',
            });

            this.applyStatePayload(payload);
            Toast.show(`Da xoa ban ghi tu dong "${runItem.lessonPreview}"`, 'info');
        } catch (error) {
            console.error('Khong the xoa lich su auto:', error);
            Toast.show(error.message || 'Khong the xoa lich su auto', 'error');
        }
    }

    loadEntryIntoMainForm(entryId) {
        const entry = this.getEntryById(entryId);
        if (!entry) {
            return;
        }

        this.applyDataToMainForm(entry);
        Toast.show('Da nap mau vao tab Tao Nhan Xet', 'success');
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
                console.error('Loi parse auto Flow 2 comments:', error);
                Toast.show('Khong tai duoc ket qua Flow 2 da luu', 'error');
                return;
            }
        } else {
            const text = Array.isArray(runItem.comments)
                ? runItem.comments.join('\n')
                : String(runItem.comments || '');
            document.getElementById('commentsInput').value = text;
        }

        Toast.show('Da nap ket qua tu lich su tu dong', 'success');
    }

    applyDataToMainForm(item) {
        const lessonDescription = document.getElementById('lessonDescription');
        const flowRadio = document.querySelector(`input[name="flowType"][value="${item.flowType}"]`);

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

    markEntryStateLocally(entryId, updates) {
        this.entries = this.entries.map((entry) =>
            entry.id === entryId
                ? normalizeEntry({
                      ...entry,
                      ...updates,
                  })
                : entry,
        );
        this.render();
    }

    async runEntryById(entryId, { manual = false } = {}) {
        const entry = this.getEntryById(entryId);
        if (!entry) {
            return false;
        }

        if (entry.lastStatus === 'running') {
            if (manual) {
                Toast.show('Mau nay dang duoc server xu ly, vui long doi them mot chut.', 'warning');
            }
            return false;
        }

        const startedAt = Date.now();
        this.markEntryStateLocally(entryId, {
            lastStatus: 'running',
            lastAttemptAt: startedAt,
            lastError: '',
            retryAfterAt: 0,
        });

        try {
            const payload = await this.request('/api/auto-run-now', {
                method: 'POST',
                body: { id: entryId },
            });

            this.applyStatePayload(payload);
            Toast.show(
                manual
                    ? `Da chay AI va luu vao lich su tu dong cho "${entry.lessonPreview}"`
                    : `Server da lam moi va luu rieng cho "${entry.lessonPreview}"`,
                'success',
            );
            return true;
        } catch (error) {
            console.error('Khong the chay mau auto:', error);

            if (error.payload?.state) {
                this.applyStatePayload(error.payload);
            } else {
                await this.refreshState({ silent: true });
            }

            Toast.show(`Khong the lam moi "${entry.lessonPreview}": ${error.message}`, 'error');
            return false;
        }
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

    closeModal() {
        this.modal.classList.remove('is-open');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('auto-modal-open');
    }

    renderOverview() {
        const totalEntries = this.entries.length;
        const dueEntries = this.entries.filter((entry) => this.isEntryDue(entry)).length;
        const runCount = this.runHistory.length;
        const latestRun = this.runHistory[0];

        this.entriesCount.textContent = String(totalEntries);
        this.dueCount.textContent = String(dueEntries);
        this.runCount.textContent = String(runCount);
        this.latestRunLabel.textContent = latestRun ? formatDateTime(latestRun.timestamp) : 'Chua co';

        this.formCardMeta.textContent =
            totalEntries === 0 ? 'Bat dau tao mau dau tien' : 'Them moi hoac cap nhat mau hien co';
        this.listCardMeta.textContent =
            totalEntries === 0
                ? 'Chua co mau nao'
                : `${totalEntries} mau dang luu • ${dueEntries} mau den han`;
        this.historyCardMeta.textContent =
            runCount === 0
                ? 'Chua co lan chay nao'
                : `Da luu ${runCount} ket qua auto rieng biet`;
    }

    render() {
        const entries = this.entries.slice().sort((left, right) => right.updatedAt - left.updatedAt);
        this.listContainer.innerHTML = '';
        this.renderOverview();

        if (this.loadingState) {
            this.summary.textContent = 'Dang dong bo mau tu dong tu server...';
            this.emptyState.style.display = 'block';
            this.emptyState.textContent = 'Dang tai du lieu auto...';
            return;
        }

        if (this.lastErrorMessage && entries.length === 0) {
            this.summary.textContent = this.lastErrorMessage;
            this.emptyState.style.display = 'block';
            this.emptyState.textContent = 'Khong the tai du lieu auto tu server.';
            return;
        }

        const totalEntries = entries.length;
        const dueEntries = entries.filter((entry) => this.isEntryDue(entry)).length;
        this.summary.textContent =
            totalEntries === 0
                ? 'Chua co mau tu dong nao. Tao 1 mau de server tu lam moi nhan xet sau moi chu ky 48 gio.'
                : `${totalEntries} mau dang luu, ${dueEntries} mau da den han. Server se xu ly tu dong va luu ket qua rieng, khong chen vao tab Lich Su thu cong.`;

        if (entries.length === 0) {
            this.emptyState.style.display = 'block';
            this.emptyState.textContent = 'Chua co mau tu dong nao';
            return;
        }

        this.emptyState.style.display = 'none';

        entries.forEach((entry) => {
            const nextRunAt = this.getNextRunAt(entry);
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
                    ? 'Dang duoc server goi AI...'
                    : entry.lastGeneratedAt
                      ? `Lan cuoi: ${formatDateTime(entry.lastGeneratedAt)}`
                      : 'Chua tung chay AI';

            const statusText =
                entry.lastStatus === 'error'
                    ? `Loi gan nhat: ${entry.lastError}`
                    : entry.lastStatus === 'running'
                      ? 'Server dang xu ly mau nay'
                      : entry.lastStatus === 'success'
                        ? 'Lan chay gan nhat da duoc luu vao lich su tu dong'
                        : 'Dang cho lan chay dau tien';

            item.innerHTML = `
                <div class="auto-comment-card__header">
                    <div>
                        <h3>${this.escapeHtml(entry.lessonPreview)}</h3>
                        <div class="auto-comment-meta">
                            <span>${this.escapeHtml(flowLabel)}</span>
                            <span>Tao luc ${this.escapeHtml(formatDateTime(entry.createdAt))}</span>
                            <span>${this.escapeHtml(lastRunText)}</span>
                        </div>
                    </div>
                    <div class="auto-comment-badge">${entry.runCount} lan</div>
                </div>
                <p class="auto-comment-description">${this.escapeHtml(entry.lessonDescription)}</p>
                <div class="auto-comment-status">
                    <span>${this.escapeHtml(statusText)}</span>
                    <span>Lan tiep theo: ${this.escapeHtml(formatDateTime(nextRunAt))} (${this.escapeHtml(formatRelativeCountdown(nextRunAt))})</span>
                </div>
                ${this.renderRecentRuns(entry.recentRuns)}
                <div class="auto-comment-actions">
                    <button type="button" class="copy-btn" data-action="run" data-entry-id="${entry.id}" ${disabledAttr}>
                        Chay ngay
                    </button>
                    <button type="button" class="btn-secondary" data-action="load" data-entry-id="${entry.id}" ${disabledAttr}>
                        Nap vao tab tao
                    </button>
                    <button type="button" class="btn-secondary auto-comment-edit-btn" data-action="edit" data-entry-id="${entry.id}" ${disabledAttr}>
                        Sua
                    </button>
                    <button type="button" class="auto-comment-danger-btn" data-action="delete" data-entry-id="${entry.id}" ${disabledAttr}>
                        Xoa
                    </button>
                </div>
            `;

            this.listContainer.appendChild(item);
        });
    }

    renderRunHistory() {
        this.runHistoryContainer.innerHTML = '';
        this.renderOverview();

        if (this.loadingState && this.runHistory.length === 0) {
            this.runHistoryEmpty.style.display = 'block';
            this.runHistoryEmpty.textContent = 'Dang tai lich su auto...';
            return;
        }

        if (this.lastErrorMessage && this.runHistory.length === 0) {
            this.runHistoryEmpty.style.display = 'block';
            this.runHistoryEmpty.textContent = 'Khong the tai lich su auto tu server.';
            return;
        }

        if (this.runHistory.length === 0) {
            this.runHistoryEmpty.style.display = 'block';
            this.runHistoryEmpty.textContent = 'Chua co lan chay auto nao';
            return;
        }

        this.runHistoryEmpty.style.display = 'none';

        this.runHistory.forEach((item) => {
            const flowBadge = item.flowType === 'flow2' ? ' 🔄' : ' ✍️';
            const card = document.createElement('div');
            card.className = 'auto-run-history-item';

            card.innerHTML = `
                <div class="auto-run-history-item__body">
                    <div class="auto-run-history-item__title">${this.escapeHtml(item.lessonPreview)}${flowBadge}</div>
                    <div class="auto-run-history-item__meta">
                        <span>${this.escapeHtml(formatDateTime(item.timestamp))}</span>
                        <span>${this.escapeHtml(FLOW_LABELS[item.flowType] || FLOW_LABELS.flow1)}</span>
                    </div>
                </div>
                <div class="auto-run-history-item__actions">
                    <button type="button" class="btn-secondary" data-run-action="load" data-run-id="${item.id}">
                        Nap ket qua
                    </button>
                    <button type="button" class="auto-comment-danger-btn" data-run-action="delete" data-run-id="${item.id}">
                        Xoa
                    </button>
                </div>
            `;

            this.runHistoryContainer.appendChild(card);
        });
    }

    renderRecentRuns(recentRuns) {
        if (!Array.isArray(recentRuns) || recentRuns.length === 0) {
            return '<div class="auto-comment-run-log empty">Chua co lich su chay noi bo.</div>';
        }

        const items = recentRuns
            .map((run) => {
                const statusLabel = run.status === 'success' ? 'Thanh cong' : 'That bai';
                const sourceLabel = run.triggeredBy === 'cron' ? 'Tu dong' : 'Thu cong';
                const details =
                    run.status === 'success'
                        ? `${sourceLabel} • Da luu vao lich su tu dong`
                        : this.escapeHtml(run.error || 'Khong co chi tiet loi');

                return `<div class="auto-comment-run-log__item">
                    <strong>${statusLabel}</strong>
                    <span>${this.escapeHtml(formatDateTime(run.timestamp))}</span>
                    <small>${details}</small>
                </div>`;
            })
            .join('');

        return `<div class="auto-comment-run-log">${items}</div>`;
    }

    formatCommentBankForDisplay(bank) {
        let result = '';

        if (bank.XUATSAR?.comments) {
            result += '=== NHAN XET MUC XUAT SAC (Diem 10) ===\n';
            bank.XUATSAR.comments.forEach((comment, index) => {
                result += `${index + 1}. ${comment}\n`;
            });
            result += '\n';
        }

        if (bank.GIOI?.comments) {
            result += '=== NHAN XET MUC GIOI (Diem 9) ===\n';
            bank.GIOI.comments.forEach((comment, index) => {
                result += `${index + 1}. ${comment}\n`;
            });
            result += '\n';
        }

        if (bank.KHA?.comments) {
            result += '=== NHAN XET MUC KHA (Diem 7-8) ===\n';
            bank.KHA.comments.forEach((comment, index) => {
                result += `${index + 1}. ${comment}\n`;
            });
            result += '\n';
        }

        if (bank.YEU?.comments) {
            result += '=== NHAN XET MUC YEU (Diem 0-6) ===\n';
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
