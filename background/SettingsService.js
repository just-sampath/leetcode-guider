/**
 * Settings Service
 * 
 * Handles loading and saving settings to chrome.storage
 * SOLID: Single Responsibility - only manages settings persistence
 */

const STORAGE_KEY = 'leetcodeAiCoach';

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
    provider: 'openai',
    models: {
        openai: 'gpt-4o',
        anthropic: 'claude-sonnet-4-5-20250929',
        google: 'gemini-2.5-pro',
        custom: ''
    },
    apiKeys: {
        openai: '',
        anthropic: '',
        google: '',
        custom: ''
    },
    baseUrls: {
        openai: '',
        anthropic: '',
        google: '',
        custom: ''
    },
    reasoningEffort: 'medium',
    persona: '',
    panelPosition: 'right',
    panelMode: 'popup', // 'popup' | 'sidebar' | 'sidepanel'
    sidebarWidth: 380,
    openOnPageLoad: false, // Whether to auto-open panel when page loads
    conversationHistory: {} // Keyed by problem slug
};

/**
 * Load settings from chrome.storage
 * @returns {Promise<Object>}
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const saved = result[STORAGE_KEY] || {};

        // Merge with defaults to ensure all keys exist
        return {
            ...DEFAULT_SETTINGS,
            ...saved,
            models: { ...DEFAULT_SETTINGS.models, ...saved.models },
            apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...saved.apiKeys },
            baseUrls: { ...DEFAULT_SETTINGS.baseUrls, ...saved.baseUrls },
            conversationHistory: { ...DEFAULT_SETTINGS.conversationHistory, ...saved.conversationHistory }
        };
    } catch (error) {
        console.error('[SettingsService] Error loading settings:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Save settings to chrome.storage
 * @param {Object} settings
 * @returns {Promise<void>}
 */
async function saveSettings(settings) {
    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: settings });
    } catch (error) {
        console.error('[SettingsService] Error saving settings:', error);
        throw error;
    }
}

/**
 * Update a specific setting
 * @param {string} key
 * @param {*} value
 * @returns {Promise<void>}
 */
async function updateSetting(key, value) {
    const settings = await loadSettings();
    settings[key] = value;
    await saveSettings(settings);
}

/**
 * Get conversation history for a problem and mode
 * @param {string} problemSlug
 * @param {string} mode - 'overview' | 'hints' | 'debug' | 'review'
 * @returns {Promise<Array>}
 */
async function getConversationHistory(problemSlug, mode = 'overview') {
    const settings = await loadSettings();
    const key = `${problemSlug}_${mode}`;
    return settings.conversationHistory[key] || [];
}

/**
 * Save conversation history for a problem and mode
 * @param {string} problemSlug
 * @param {string} mode - 'overview' | 'hints' | 'debug' | 'review'
 * @param {Array} history
 * @returns {Promise<void>}
 */
async function saveConversationHistory(problemSlug, mode, history) {
    const settings = await loadSettings();
    const key = `${problemSlug}_${mode}`;
    settings.conversationHistory[key] = history;
    await saveSettings(settings);
}

/**
 * Get list of modes that have conversation history for a problem
 * @param {string} problemSlug
 * @returns {Promise<Array<{mode: string, messageCount: number}>>}
 */
async function getModeHistories(problemSlug) {
    const settings = await loadSettings();
    const modes = ['overview', 'hints', 'debug', 'review'];
    const result = [];

    for (const mode of modes) {
        const key = `${problemSlug}_${mode}`;
        const history = settings.conversationHistory[key];
        if (history && history.length > 0) {
            result.push({ mode, messageCount: history.length });
        }
    }

    return result;
}



export {
    loadSettings,
    saveSettings,
    updateSetting,
    getConversationHistory,
    saveConversationHistory,
    getModeHistories,
    DEFAULT_SETTINGS
};
