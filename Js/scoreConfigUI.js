import { DEFAULT_SCORE_CONFIG, loadScoreConfig, saveScoreConfig } from './scoreConfig.js';
import { Toast } from './toast.js';

function getScoreElements() {
    return {
        fixedRadio: document.querySelector('input[name="scoreMode"][value="fixed"]'),
        rangeRadio: document.querySelector('input[name="scoreMode"][value="range"]'),
        fixedScore: document.getElementById('fixedScore'),
        scoreMin: document.getElementById('scoreMin'),
        scoreMax: document.getElementById('scoreMax'),
    };
}

function populateScoreConfigUI(config) {
    const { fixedRadio, rangeRadio, fixedScore, scoreMin, scoreMax } = getScoreElements();
    const nextConfig = { ...DEFAULT_SCORE_CONFIG, ...(config || {}) };

    fixedRadio.checked = nextConfig.scoreMode === 'fixed';
    rangeRadio.checked = nextConfig.scoreMode === 'range';
    fixedScore.value = nextConfig.fixedScore;
    scoreMin.value = nextConfig.min;
    scoreMax.value = nextConfig.max;
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

    const { fixedRadio, rangeRadio, fixedScore, scoreMin, scoreMax } = getScoreElements();

    fixedRadio.addEventListener('change', (e) => {
        if (e.target.checked) {
            saveAndRenderScoreConfig({ scoreMode: 'fixed' }, '✓ Đã lưu chế độ điểm cố định');
        }
    });

    rangeRadio.addEventListener('change', (e) => {
        if (e.target.checked) {
            saveAndRenderScoreConfig({ scoreMode: 'range' }, '✓ Đã lưu chế độ random điểm');
        }
    });

    fixedScore.addEventListener('change', (e) => {
        saveAndRenderScoreConfig(
            { fixedScore: e.target.value },
            '✓ Đã lưu điểm cố định',
        );
    });

    scoreMin.addEventListener('change', (e) => {
        const currentConfig = loadScoreConfig();
        const nextMin = Number(e.target.value);
        const nextMax = Number(currentConfig.max);
        saveAndRenderScoreConfig(
            {
                min: nextMin,
                max: Number.isFinite(nextMin) && nextMin > nextMax ? nextMin : nextMax,
            },
            '✓ Đã lưu khoảng điểm',
        );
    });

    scoreMax.addEventListener('change', (e) => {
        const currentConfig = loadScoreConfig();
        const nextMax = Number(e.target.value);
        const nextMin = Number(currentConfig.min);
        saveAndRenderScoreConfig(
            {
                min: Number.isFinite(nextMax) && nextMax < nextMin ? nextMax : nextMin,
                max: nextMax,
            },
            '✓ Đã lưu khoảng điểm',
        );
    });
}
