/**
 * scoreConfig.js
 * Quản lý cấu hình chọn điểm và lưu vào localStorage
 */

const SCORE_CONFIG_STORAGE_KEY = 'toolkapla_score_config';

export const DEFAULT_SCORE_CONFIG = {
    scoreMode: 'fixed',
    fixedScore: 9,
    min: 8,
    max: 9,
};

function clampScore(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.min(10, Math.max(1, Math.round(parsed)));
}

function normalizeScoreConfig(config = {}) {
    const mergedConfig = {
        ...DEFAULT_SCORE_CONFIG,
        ...(config && typeof config === 'object' ? config : {}),
    };
    const scoreMode = mergedConfig.scoreMode === 'range' ? 'range' : 'fixed';
    const fixedScore = clampScore(mergedConfig.fixedScore, DEFAULT_SCORE_CONFIG.fixedScore);
    let min = clampScore(mergedConfig.min, DEFAULT_SCORE_CONFIG.min);
    let max = clampScore(mergedConfig.max, DEFAULT_SCORE_CONFIG.max);

    if (min > max) {
        [min, max] = [max, min];
    }

    return {
        scoreMode,
        fixedScore,
        min,
        max,
    };
}

export function loadScoreConfig() {
    try {
        const saved = localStorage.getItem(SCORE_CONFIG_STORAGE_KEY);
        if (saved) {
            return normalizeScoreConfig(JSON.parse(saved));
        }
    } catch (e) {
        console.error('Lỗi khi đọc cấu hình điểm:', e);
    }
    return { ...DEFAULT_SCORE_CONFIG };
}

export function saveScoreConfig(config) {
    try {
        const mergedConfig = normalizeScoreConfig({
            ...loadScoreConfig(),
            ...(config || {}),
        });
        localStorage.setItem(SCORE_CONFIG_STORAGE_KEY, JSON.stringify(mergedConfig));
        return mergedConfig;
    } catch (e) {
        console.error('Lỗi khi lưu cấu hình điểm:', e);
        return null;
    }
}

export function resetScoreConfig() {
    localStorage.removeItem(SCORE_CONFIG_STORAGE_KEY);
    return { ...DEFAULT_SCORE_CONFIG };
}

