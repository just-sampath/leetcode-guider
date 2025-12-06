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
 * Get conversation history for a problem
 * @param {string} problemSlug
 * @returns {Promise<Array>}
 */
async function getConversationHistory(problemSlug) {
    const settings = await loadSettings();
    return settings.conversationHistory[problemSlug] || [];
}

/**
 * Save conversation history for a problem
 * @param {string} problemSlug
 * @param {Array} history
 * @returns {Promise<void>}
 */
async function saveConversationHistory(problemSlug, history) {
    const settings = await loadSettings();
    settings.conversationHistory[problemSlug] = history;
    await saveSettings(settings);
}

/**
 * Clear conversation history for a problem
 * @param {string} problemSlug
 * @returns {Promise<void>}
 */
async function clearConversationHistory(problemSlug) {
    const settings = await loadSettings();
    delete settings.conversationHistory[problemSlug];
    await saveSettings(settings);
}

/**
 * Get the current API key for the active provider
 * @returns {Promise<string>}
 */
async function getCurrentApiKey() {
    const settings = await loadSettings();
    return settings.apiKeys[settings.provider] || '';
}

/**
 * Get the current model for the active provider
 * @returns {Promise<string>}
 */
async function getCurrentModel() {
    const settings = await loadSettings();
    return settings.models[settings.provider] || '';
}

export {
    loadSettings,
    saveSettings,
    updateSetting,
    getConversationHistory,
    saveConversationHistory,
    clearConversationHistory,
    getCurrentApiKey,
    getCurrentModel,
    DEFAULT_SETTINGS
};
