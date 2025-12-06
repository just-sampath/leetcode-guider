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

    // Settings form
    document.getElementById('settings-provider')?.addEventListener('change', (e) => {
        const baseUrlGroup = document.getElementById('baseurl-group');
        if (baseUrlGroup) {
            baseUrlGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
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
 * Display AI response
 */
function displayResponse(response) {
    hideLoading();
    hideError();

    const contentEl = document.getElementById('response-content');
    if (!contentEl) return;

    let html = formatMarkdown(response.text || 'No response received.');

    if (response.thinking) {
        html = `
            <details class="thinking-section">
                <summary>💭 Model Thinking</summary>
                <div class="thinking-content">${formatMarkdown(response.thinking)}</div>
            </details>
            ${html}
        `;
    }

    contentEl.innerHTML = html;
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

/**
 * Simple markdown formatting
 */
function formatMarkdown(text) {
    if (!text) return '';

    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="code-block"><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
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

        if (response.apiKeys) {
            document.getElementById('settings-apikey').value = response.apiKeys[provider] || '';
        }

        if (response.models) {
            document.getElementById('settings-model').value = response.models[provider] || '';
        }

        if (response.baseUrls) {
            document.getElementById('settings-baseurl').value = response.baseUrls[provider] || '';
        }

        document.getElementById('settings-panelmode').value = response.panelMode || 'popup';

        document.getElementById('baseurl-group').style.display =
            provider === 'custom' ? 'block' : 'none';
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
    const model = document.getElementById('settings-model')?.value || '';
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

        const lastAssistantMsg = [...history].reverse().find(msg => msg.role === 'assistant');

        if (lastAssistantMsg) {
            const exchangeCount = Math.floor(history.length / 2);
            let html = `<div class="history-indicator">
                <span>📜 ${exchangeCount} previous exchange${exchangeCount !== 1 ? 's' : ''}</span>
            </div>`;
            html += `<div class="last-response">${formatMarkdown(lastAssistantMsg.content)}</div>`;
            contentEl.innerHTML = html;
        }
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

        document.getElementById('response-content').innerHTML =
            '<p class="placeholder">Conversation history cleared.</p>';
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
