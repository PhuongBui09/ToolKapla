// scriptGenerator.js
export class ScriptGenerator {
    constructor() {
        this.comments = [];

        this.scoreMode = 'fixed'; // fixed | range
        this.scoreConfig = { fixed: 9, min: 7, max: 10 };
    }

    setComments(text) {
        this.comments = text
            .split('\n')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
    }

    setScoreMode(mode, config) {
        this.scoreMode = mode;
        this.scoreConfig = config;
    }

    getScoreValue() {
        if (this.scoreMode === 'fixed') {
            return this.scoreConfig.fixed;
        }
        const { min, max } = this.scoreConfig;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateScript() {
        return this.#generateScriptHuman();
    }

    // ---------- PRIVATE ----------
    #generateScriptHuman() {
        const scoreExpr =
            this.scoreMode === 'fixed'
                ? this.scoreConfig.fixed
                // REMOVED: module archived to /archive/scriptGenerator.js
                // This file was neutralized per user request (deleted). See archive/scriptGenerator.js for original.
        return `(async function () {
