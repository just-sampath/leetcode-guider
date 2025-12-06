/**
 * Background Service Worker
 * 
 * Entry point for the extension's background script
 * Handles messages from content scripts and coordinates AI calls
 */

import { createProvider } from './AiProviderFactory.js';
import { buildPrompt } from './PromptBuilder.js';
import {
    loadSettings,
    getConversationHistory,
    saveConversationHistory,
    updateSetting
} from './SettingsService.js';

/**
 * Message types for content script communication
 */
const MESSAGE_TYPES = {
    GET_AI_RESPONSE: 'GET_AI_RESPONSE',
    GET_SETTINGS: 'GET_SETTINGS',
    GET_HISTORY: 'GET_HISTORY',
    CLEAR_HISTORY: 'CLEAR_HISTORY',
    UPDATE_SETTING: 'UPDATE_SETTING'
};

/**
 * Handle incoming messages from content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle async operations
    handleMessage(request, sender)
        .then(sendResponse)
        .catch(error => {
            console.error('[Background] Error handling message:', error);
            sendResponse({ error: error.message });
        });

    // Return true to indicate async response
    return true;
});

/**
 * Process incoming message
 * @param {Object} request
 * @param {Object} sender
 * @returns {Promise<Object>}
 */
async function handleMessage(request, sender) {
    const { type, payload } = request;

    switch (type) {
        case MESSAGE_TYPES.GET_AI_RESPONSE:
            return handleAiRequest(payload);

        case MESSAGE_TYPES.GET_SETTINGS:
            return loadSettings();

        case MESSAGE_TYPES.GET_HISTORY:
            const history = await getConversationHistory(payload.problemSlug);
            return { history };

        case MESSAGE_TYPES.CLEAR_HISTORY:
            await saveConversationHistory(payload.problemSlug, []);
            return { success: true };

        case MESSAGE_TYPES.UPDATE_SETTING:
            await updateSetting(payload.key, payload.value);
            return { success: true };

        default:
            throw new Error(`Unknown message type: ${type}`);
    }
}

/**
 * Handle AI request from content script
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
async function handleAiRequest(payload) {
    const { mode, hintStyle, problemContext, followUpQuestion } = payload;

    // Load settings
    const settings = await loadSettings();

    // Validate API key
    const apiKey = settings.apiKeys[settings.provider];
    if (!apiKey) {
        throw new Error(`No API key configured for ${settings.provider}. Please set it in extension options.`);
    }

    // Get conversation history
    const problemSlug = problemContext.urlSlug || 'unknown';
    const history = await getConversationHistory(problemSlug);

    // Determine lastMode and lastHintStyle from history metadata
    // We store these in the first user message of each exchange
    let lastMode = null;
    let lastHintStyle = null;

    // Look for the last mode from history (we store metadata in the history)
    const historyMeta = await getHistoryMetadata(problemSlug);
    if (historyMeta) {
        lastMode = historyMeta.lastMode;
        lastHintStyle = historyMeta.lastHintStyle;
    }

    // Build prompt with mode inheritance for follow-ups
    const messages = buildPrompt({
        mode,
        hintStyle,
        lastMode,
        lastHintStyle,
        problemContext,
        userPersona: settings.persona,
        conversationHistory: history,
        followUpQuestion
    });

    // Create provider and call AI
    const provider = createProvider(settings);
    const model = settings.models[settings.provider];

    console.log(`[Background] Calling ${settings.provider} with model ${model}, mode: ${mode}, lastMode: ${lastMode}`);

    const response = await provider.callModel({
        model,
        reasoningEffort: settings.reasoningEffort,
        messages
    });

    // Save to conversation history with readable labels
    const modeLabels = {
        overview: '💡 Explain this problem',
        hints: '🔍 Get Hint',
        debug: '🐛 Debug my code',
        review: '📝 Review my solution',
        followup: null
    };

    const userMessage = followUpQuestion
        ? followUpQuestion
        : (modeLabels[mode] || `Request: ${mode}`);

    const newHistory = [
        ...history,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response.text }
    ];

    // Keep history manageable (last 20 exchanges)
    const trimmedHistory = newHistory.slice(-40);
    await saveConversationHistory(problemSlug, trimmedHistory);

    // Save metadata about the current mode (for follow-ups to inherit)
    const effectiveMode = mode === 'followup' ? (lastMode || 'overview') : mode;
    const effectiveHintStyle = mode === 'followup' ? lastHintStyle : hintStyle;
    await saveHistoryMetadata(problemSlug, {
        lastMode: effectiveMode,
        lastHintStyle: effectiveHintStyle
    });

    return {
        text: response.text,
        thinking: response.thinking,
        provider: settings.provider,
        model
    };
}

/**
 * Get history metadata for a problem
 */
async function getHistoryMetadata(problemSlug) {
    try {
        const key = `historyMeta_${problemSlug}`;
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
    } catch (error) {
        console.error('[Background] Failed to get history metadata:', error);
        return null;
    }
}

/**
 * Save history metadata for a problem
 */
async function saveHistoryMetadata(problemSlug, metadata) {
    try {
        const key = `historyMeta_${problemSlug}`;
        await chrome.storage.local.set({ [key]: metadata });
    } catch (error) {
        console.error('[Background] Failed to save history metadata:', error);
    }
}

// Log when service worker starts
console.log('[LeetCode AI Coach] Background service worker started');
