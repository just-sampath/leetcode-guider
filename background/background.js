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
    saveConversationHistory
} from './SettingsService.js';

/**
 * Message types for content script communication
 */
const MESSAGE_TYPES = {
    GET_AI_RESPONSE: 'GET_AI_RESPONSE',
    GET_SETTINGS: 'GET_SETTINGS',
    CLEAR_HISTORY: 'CLEAR_HISTORY'
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

        case MESSAGE_TYPES.CLEAR_HISTORY:
            await saveConversationHistory(payload.problemSlug, []);
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
    const { mode, hintStyle, problemContext } = payload;

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

    // Build prompt
    const messages = buildPrompt({
        mode,
        hintStyle,
        problemContext,
        userPersona: settings.persona,
        conversationHistory: history
    });

    // Create provider and call AI
    const provider = createProvider(settings);
    const model = settings.models[settings.provider];

    console.log(`[Background] Calling ${settings.provider} with model ${model}, effort: ${settings.reasoningEffort}`);

    const response = await provider.callModel({
        model,
        reasoningEffort: settings.reasoningEffort,
        messages
    });

    // Save to conversation history
    // Add the user's query (simplified) and assistant response
    const newHistory = [
        ...history,
        { role: 'user', content: `[${mode}${hintStyle ? ':' + hintStyle : ''}] Request for help` },
        { role: 'assistant', content: response.text }
    ];

    // Keep history manageable (last 20 exchanges)
    const trimmedHistory = newHistory.slice(-40);
    await saveConversationHistory(problemSlug, trimmedHistory);

    return {
        text: response.text,
        thinking: response.thinking,
        provider: settings.provider,
        model
    };
}

// Log when service worker starts
console.log('[LeetCode AI Coach] Background service worker started');
