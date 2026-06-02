import { DEFAULT_SCORE_CONFIG, loadScoreConfig, saveScoreConfig } from './scoreConfig.js';
import { Toast } from './toast.js';

function getScoreElements() {
    return {
        fixedScore: document.getElementById('fixedScore'),
    };
}

function populateScoreConfigUI(config) {
    const { fixedScore } = getScoreElements();
    const nextConfig = { ...DEFAULT_SCORE_CONFIG, ...(config || {}) };

    fixedScore.value = nextConfig.fixedScore;
}

function saveAndRenderScoreConfig(partialConfig, successMessage) {
    const savedConfig = saveScoreConfig(partialConfig);
    if (!savedConfig) {
        Toast.show('❌ Không thể lưu cấu hình điểm', 'error');
        populateScoreConfigUI(loadScoreConfig());
        return;
    }

    populateScoreConfigUI(savedConfig);
    if (successMessage) {
        Toast.show(successMessage, 'success');
    }
}

export function initScoreConfigUI() {
    populateScoreConfigUI(loadScoreConfig());

    const { fixedScore } = getScoreElements();

    fixedScore.addEventListener('change', (e) => {
        saveAndRenderScoreConfig(
            { fixedScore: e.target.value },
            '✓ Đã lưu điểm mặc định',
        );
    });
}
