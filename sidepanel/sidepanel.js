/**
 * Side Panel JavaScript
 * 
 * Handles the Chrome native side panel UI and communication
 */

const STORAGE_KEY = 'leetcodeAiCoach';

// State
let currentSettings = null;
let currentTab = 'overview';
let isLoading = false;
let problemContext = null;

// Default models per provider
const DEFAULT_MODELS = {
    openai: ['gpt-5-mini', 'gpt-5.1', 'gpt-5.1-codex-max'],
    anthropic: ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'],
    google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-pro-preview'],
    custom: [],
    portkey: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro']
};

/**
 * Initialize the side panel
 */
async function init() {
    console.log('[SidePanel] Initializing...');

    // Load settings
    await loadSettings();

    // Set up event listeners
    setupEventListeners();

    // Connect to active tab
    await connectToActiveTab();

    // Listen for tab changes
    chrome.tabs.onActivated.addListener(handleTabChange);
    chrome.tabs.onUpdated.addListener(handleTabUpdate);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.sidepanel-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Action buttons
    document.querySelectorAll('.action-btn:not(#save-settings-btn)').forEach(btn => {
        btn.addEventListener('click', () => handleAction(btn.dataset.action));
    });

    // Settings form - provider change updates all fields
    document.getElementById('settings-provider')?.addEventListener('change', (e) => {
        const newProvider = e.target.value;
        updateSettingsFieldsForProvider(newProvider);
    });

    // Model select and custom model listeners
    document.getElementById('settings-model-select')?.addEventListener('change', (e) => {
        if (e.target.value) {
            document.getElementById('settings-model-custom').value = '';
        }
    });

    document.getElementById('settings-model-custom')?.addEventListener('input', (e) => {
        if (e.target.value) {
            document.getElementById('settings-model-select').value = '';
        }
    });

    document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);

    // Copy button
    document.querySelector('.copy-btn')?.addEventListener('click', copyResponse);

    // Clear history button
    document.querySelector('.clear-btn')?.addEventListener('click', clearHistory);

    // Reasoning effort change
    document.getElementById('reasoning-effort')?.addEventListener('change', (e) => {
        updateReasoningEffort(e.target.value);
    });
}

/**
 * Switch active tab
 */
function switchTab(tabName) {
    currentTab = tabName;

    document.querySelectorAll('.sidepanel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.sidepanel-tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.tabContent === tabName);
    });
}

/**
 * Connect to active tab to get problem context
 */
async function connectToActiveTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.url && tab.url.includes('leetcode.com/problems/')) {
            updateConnectionStatus(true, 'Connected');
            await requestProblemContext(tab.id);
        } else {
            updateConnectionStatus(false, 'Not on LeetCode problem');
        }
    } catch (error) {
        console.error('[SidePanel] Connection error:', error);
        updateConnectionStatus(false, 'Connection failed');
    }
}

/**
 * Handle tab activation change
 */
async function handleTabChange(activeInfo) {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes('leetcode.com/problems/')) {
        updateConnectionStatus(true, 'Connected');
        await requestProblemContext(activeInfo.tabId);
    } else {
        updateConnectionStatus(false, 'Not on LeetCode problem');
        problemContext = null;
        updateProblemInfo(null);
    }
}

/**
 * Handle tab URL updates
 */
async function handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('leetcode.com/problems/')) {
        updateConnectionStatus(true, 'Connected');
        // Small delay to let content script initialize
        setTimeout(() => requestProblemContext(tabId), 1000);
    }
}

/**
 * Request problem context from content script
 */
async function requestProblemContext(tabId) {
    try {
        const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_PROBLEM_CONTEXT' });
        if (response && response.context) {
            problemContext = response.context;
            updateProblemInfo(problemContext);
            await loadChatHistory();
        }
    } catch (error) {
        console.error('[SidePanel] Failed to get problem context:', error);
    }
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected, text) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        statusEl.className = `sidepanel-status ${connected ? 'connected' : 'disconnected'}`;
        statusEl.querySelector('.status-text').textContent = text;
    }
}

/**
 * Update problem info display
 */
function updateProblemInfo(context) {
    const infoEl = document.getElementById('problem-info');
    if (!infoEl) return;

    if (!context) {
        infoEl.innerHTML = '<p class="no-problem">Navigate to a LeetCode problem to get started.</p>';
        return;
    }

    infoEl.innerHTML = `
        <div class="problem-title">${context.title || 'Unknown Problem'}</div>
        <div class="problem-meta">
            <span class="difficulty ${(context.difficulty || '').toLowerCase()}">${context.difficulty || ''}</span>
            ${context.topics && context.topics.length > 0
            ? `<span class="topics">${context.topics.slice(0, 3).join(', ')}</span>`
            : ''}
        </div>
    `;
}

/**
 * Handle action button click
 */
async function handleAction(action) {
    if (isLoading || !problemContext) {
        if (!problemContext) {
            displayError('Please navigate to a LeetCode problem first.');
        }
        return;
    }

    const hintStyle = document.getElementById('hint-style')?.value || 'progressive';

    let mode;
    switch (action) {
        case 'explain': mode = 'overview'; break;
        case 'hint': mode = 'hints'; break;
        case 'debug': mode = 'debug'; break;
        case 'review': mode = 'review'; break;
        default: mode = 'overview';
    }

    showLoading();

    try {
        // Get fresh code from content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            try {
                const codeResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CODE' });
                if (codeResponse && codeResponse.code) {
                    problemContext.currentCode = codeResponse.code;
                    problemContext.language = codeResponse.language;
                }
            } catch (e) {
                console.warn('[SidePanel] Could not get code:', e);
            }
        }

        // Send request to background
        const response = await chrome.runtime.sendMessage({
            type: 'GET_AI_RESPONSE',
            payload: {
                mode,
                hintStyle,
                problemContext
            }
        });

        if (response.error) {
            throw new Error(response.error);
        }

        displayResponse(response);
    } catch (error) {
        displayError(error.message);
    }
}

/**
 * Handle follow-up message from chat input
 * @param {string} message - The user's follow-up question
 */
async function handleFollowUpMessage(message) {
    if (isLoading || !message || !problemContext) return;

    const contentEl = document.getElementById('response-content');
    if (!contentEl) return;

    // Inject styles if needed
    ChatRenderer.injectStyles(document);

    // Add user message to chat thread
    ChatRenderer.appendMessage(contentEl, {
        role: 'user',
        content: message
    });

    // Show loading
    showLoading();

    try {
        // Get fresh code from content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            try {
                const codeResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CODE' });
                if (codeResponse && codeResponse.code) {
                    problemContext.currentCode = codeResponse.code;
                    problemContext.language = codeResponse.language;
                }
            } catch (e) {
                console.warn('[SidePanel] Could not get code:', e);
            }
        }

        problemContext.followUpQuestion = message;

        // Send request to background with 'followup' mode
        const response = await chrome.runtime.sendMessage({
            type: 'GET_AI_RESPONSE',
            payload: {
                mode: 'followup',
                followUpQuestion: message,
                problemContext
            }
        });

        if (response.error) {
            throw new Error(response.error);
        }

        displayResponse(response);
    } catch (error) {
        displayError(error.message);
    }
}

/**
 * Show loading state
 */
function showLoading() {
    isLoading = true;
    document.getElementById('loading').style.display = 'flex';
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = true);
}

/**
 * Hide loading state
 */
function hideLoading() {
    isLoading = false;
    document.getElementById('loading').style.display = 'none';
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = false);
}

/**
 * Display AI response - appends to chat thread
 */
function displayResponse(response) {
    hideLoading();
    hideError();

    const contentEl = document.getElementById('response-content');
    if (!contentEl) return;

    // Build content with optional thinking section
    let messageContent = response.text || 'No response received.';
    if (response.thinking) {
        messageContent = `💭 **Model Thinking:**\n${response.thinking}\n\n---\n\n${messageContent}`;
    }

    // Inject styles if not present
    ChatRenderer.injectStyles(document);

    // Use ChatRenderer to append the new message
    ChatRenderer.appendMessage(contentEl, {
        role: 'assistant',
        content: messageContent
    });

    // Ensure event listeners are set up for toggle buttons
    ChatRenderer.setupEventListeners(contentEl, handleFollowUpMessage);
}

/**
 * Display error message
 */
function displayError(message) {
    hideLoading();
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

/**
 * Hide error message
 */
function hideError() {
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

// formatMarkdown is now provided by ChatRenderer - using shared implementation

/**
 * Update settings fields for a specific provider
 */
function updateSettingsFieldsForProvider(provider) {
    // Update API key
    const apiKeyEl = document.getElementById('settings-apikey');
    if (apiKeyEl && currentSettings?.apiKeys) {
        apiKeyEl.value = currentSettings.apiKeys[provider] || '';
    }

    // Update model dropdown
    const modelSelectEl = document.getElementById('settings-model-select');
    const modelCustomEl = document.getElementById('settings-model-custom');
    if (modelSelectEl) {
        modelSelectEl.innerHTML = '<option value="">-- Select --</option>';
        const models = DEFAULT_MODELS[provider] || [];
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            modelSelectEl.appendChild(opt);
        });

        const currentModel = currentSettings?.models?.[provider] || '';
        if (models.includes(currentModel)) {
            modelSelectEl.value = currentModel;
            if (modelCustomEl) modelCustomEl.value = '';
        } else {
            modelSelectEl.value = '';
            if (modelCustomEl) modelCustomEl.value = currentModel;
        }
    }

    // Update base URL
    const baseUrlEl = document.getElementById('settings-baseurl');
    if (baseUrlEl && currentSettings?.baseUrls) {
        baseUrlEl.value = currentSettings.baseUrls[provider] || '';
    }

    // Toggle base URL visibility
    const baseUrlGroup = document.getElementById('baseurl-group');
    if (baseUrlGroup) {
        baseUrlGroup.style.display = provider === 'custom' ? 'block' : 'none';
    }
}

/**
 * Load settings
 */
async function loadSettings() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
        currentSettings = response;

        // Update UI
        const reasoningEl = document.getElementById('reasoning-effort');
        if (reasoningEl && response.reasoningEffort) {
            reasoningEl.value = response.reasoningEffort;
        }

        const provider = response.provider || 'openai';
        document.getElementById('settings-provider').value = provider;

        // Update all fields for this provider
        updateSettingsFieldsForProvider(provider);

        document.getElementById('settings-panelmode').value = response.panelMode || 'popup';
    } catch (error) {
        console.error('[SidePanel] Failed to load settings:', error);
    }
}

/**
 * Save settings
 */
async function saveSettings() {
    const statusEl = document.getElementById('settings-status');

    const provider = document.getElementById('settings-provider')?.value || 'openai';
    const apiKey = document.getElementById('settings-apikey')?.value || '';
    // Get model from dropdown or custom input
    const modelSelect = document.getElementById('settings-model-select')?.value || '';
    const modelCustom = document.getElementById('settings-model-custom')?.value || '';
    const model = modelCustom || modelSelect;
    const baseUrl = document.getElementById('settings-baseurl')?.value || '';
    const panelMode = document.getElementById('settings-panelmode')?.value || 'popup';

    try {
        const current = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });

        const newSettings = {
            ...current,
            provider,
            panelMode,
            apiKeys: { ...(current.apiKeys || {}), [provider]: apiKey },
            models: { ...(current.models || {}), [provider]: model },
            baseUrls: { ...(current.baseUrls || {}), [provider]: baseUrl }
        };

        await chrome.storage.local.set({ [STORAGE_KEY]: newSettings });

        if (statusEl) {
            statusEl.textContent = '✓ Saved!';
            statusEl.style.color = '#00b8a3';
            setTimeout(() => { statusEl.textContent = ''; }, 2000);
        }

        currentSettings = newSettings;
    } catch (error) {
        console.error('[SidePanel] Failed to save settings:', error);
        if (statusEl) {
            statusEl.textContent = '✗ Failed to save';
            statusEl.style.color = '#ff375f';
        }
    }
}

/**
 * Load chat history
 * Uses ChatRenderer for consistent rendering with collapsible messages
 */
async function loadChatHistory() {
    if (!problemContext || !problemContext.urlSlug) return;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_HISTORY',
            payload: { problemSlug: problemContext.urlSlug }
        });

        const history = response.history || [];
        if (history.length === 0) return;

        const contentEl = document.getElementById('response-content');
        if (!contentEl) return;

        // Inject ChatRenderer styles if not already present
        ChatRenderer.injectStyles(document);

        // Use ChatRenderer to render the full chat thread with collapsible messages
        const chatHtml = ChatRenderer.renderChatThread(history, {
            collapseOld: true
        });

        contentEl.innerHTML = chatHtml;

        // Set up event listeners including follow-up handler
        ChatRenderer.setupEventListeners(contentEl, handleFollowUpMessage);

        console.log(`[SidePanel] Loaded ${history.length} history messages`);
    } catch (error) {
        console.error('[SidePanel] Failed to load history:', error);
    }
}

/**
 * Copy response
 */
function copyResponse() {
    const contentEl = document.getElementById('response-content');
    if (!contentEl) return;

    navigator.clipboard.writeText(contentEl.innerText).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            const original = copyBtn.textContent;
            copyBtn.textContent = '✓';
            setTimeout(() => { copyBtn.textContent = original; }, 1000);
        }
    });
}

/**
 * Clear history
 */
async function clearHistory() {
    if (!problemContext || !problemContext.urlSlug) return;

    try {
        await chrome.runtime.sendMessage({
            type: 'CLEAR_HISTORY',
            payload: { problemSlug: problemContext.urlSlug }
        });

        const contentEl = document.getElementById('response-content');
        if (contentEl) {
            ChatRenderer.injectStyles(document);
            contentEl.innerHTML = ChatRenderer.renderChatThread([], { showInput: true });
            ChatRenderer.setupEventListeners(contentEl, handleFollowUpMessage);
        }
    } catch (error) {
        console.error('[SidePanel] Failed to clear history:', error);
    }
}

/**
 * Update reasoning effort
 */
async function updateReasoningEffort(value) {
    try {
        await chrome.runtime.sendMessage({
            type: 'UPDATE_SETTING',
            payload: { key: 'reasoningEffort', value }
        });
    } catch (error) {
        console.error('[SidePanel] Failed to update reasoning effort:', error);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
