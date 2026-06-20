const STORAGE_KEY = 'rubricGrade_v1';

function qs(sel, root = document) {
    return root.querySelector(sel);
}
function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
}

function loadGrade() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Failed to load grade', e);
        return null;
    }
}

function saveGrade(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

function clearGrade() {
    localStorage.removeItem(STORAGE_KEY);
}

function getSelectedScore() {
    const el = qs('input[name="studentScore"]:checked');
    return el ? el.value : null;
}

function setSelectedScore(value) {
    qsa('input[name="studentScore"]').forEach((i) => (i.checked = i.value === String(value)));
}

function showToast(msg) {
    // lightweight toast using small ephemeral element
    let t = document.getElementById('gradeToast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'gradeToast';
        t.style.position = 'fixed';
        t.style.right = '18px';
        t.style.bottom = '18px';
        t.style.padding = '10px 14px';
        t.style.background = 'linear-gradient(135deg, #00d4ff, #6366f1)';
        t.style.color = '#042433';
        t.style.borderRadius = '10px';
        t.style.fontWeight = '700';
        t.style.zIndex = 9999;
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(() => {
        t.style.transition = 'opacity 400ms';
        t.style.opacity = '0';
    }, 1800);
}

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = qs('#saveGradeBtn');
    const clearBtn = qs('#clearGradeBtn');
    const exportBtn = qs('#exportGradeBtn');
    const noteEl = qs('#teacherNote');

    // load existing
    const stored = loadGrade();
    if (stored) {
        if (stored.score) setSelectedScore(stored.score);
        if (stored.note) noteEl.value = stored.note;
    }

    saveBtn.addEventListener('click', () => {
        const score = getSelectedScore();
        const note = noteEl.value.trim();
        if (!score) return showToast('Vui lòng chọn điểm trước khi lưu');
        saveGrade({ score, note, updatedAt: new Date().toISOString() });
        showToast('Đã lưu điểm & ghi chú');
    });

    clearBtn.addEventListener('click', () => {
        qsa('input[name="studentScore"]').forEach((i) => (i.checked = false));
        noteEl.value = '';
        clearGrade();
        showToast('Đã xóa điểm & ghi chú');
    });

    exportBtn.addEventListener('click', async () => {
        const score = getSelectedScore();
        const note = noteEl.value.trim();
        if (!score) return showToast('Chưa có điểm để xuất');
        const obj = { score, note, exportedAt: new Date().toISOString() };
        const raw = JSON.stringify(obj, null, 2);
        try {
            await navigator.clipboard.writeText(raw);
            showToast('Đã sao chép JSON vào clipboard');
        } catch (e) {
            // fallback: open a new window with JSON to copy
            const w = window.open('', '_blank');
            if (w) {
                w.document.body.style.background = '#0b1220';
                const pre = w.document.createElement('pre');
                pre.style.color = '#dfefff';
                pre.style.padding = '12px';
                pre.textContent = raw;
                w.document.body.appendChild(pre);
                showToast('Mở cửa sổ mới để sao chép JSON');
            } else {
                showToast('Không thể sao chép — cho phép popup hoặc dùng bàn tay');
            }
        }
    });
});

export {};
