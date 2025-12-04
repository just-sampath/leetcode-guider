/**
 * UI Panel
 * 
 * Creates and manages the floating AI coach panel
 * Handles user interactions and displays AI responses
 * 
 * SOLID: Single Responsibility - only manages UI rendering and events
 */

const UiPanel = (function () {
  let panelElement = null;
  let isVisible = true;
  let currentTab = 'overview';
  let isLoading = false;
  let currentSettings = null;

  /**
   * Create the panel HTML structure
   */
  function createPanelHTML() {
    return `
      <div id="lc-ai-coach-panel" class="lc-ai-coach-panel">
        <div class="lc-ai-coach-header">
          <div class="lc-ai-coach-title">
            <span class="lc-ai-coach-icon">🤖</span>
            AI Coach
          </div>
          <div class="lc-ai-coach-header-actions">
            <button class="lc-ai-coach-settings-btn" title="Settings">⚙️</button>
            <button class="lc-ai-coach-minimize-btn" title="Minimize">−</button>
          </div>
        </div>
        
        <div class="lc-ai-coach-tabs">
          <button class="lc-ai-coach-tab active" data-tab="overview">Overview</button>
          <button class="lc-ai-coach-tab" data-tab="hints">Hints</button>
          <button class="lc-ai-coach-tab" data-tab="debug">Debug</button>
          <button class="lc-ai-coach-tab" data-tab="review">Review</button>
          <button class="lc-ai-coach-tab" data-tab="settings">⚙️</button>
        </div>
        
        <div class="lc-ai-coach-content">
          <!-- Overview Tab -->
          <div class="lc-ai-coach-tab-content active" data-tab-content="overview">
            <div class="lc-ai-coach-problem-info"></div>
            <button class="lc-ai-coach-action-btn" data-action="explain">
              💡 Explain this problem
            </button>
          </div>
          
          <!-- Hints Tab -->
          <div class="lc-ai-coach-tab-content" data-tab-content="hints">
            <div class="lc-ai-coach-hint-style">
              <label>Hint Style:</label>
              <select id="lc-hint-style">
                <option value="socratic">Socratic (Questions)</option>
                <option value="progressive" selected>Progressive Hints</option>
                <option value="direct">More Direct</option>
              </select>
            </div>
            <button class="lc-ai-coach-action-btn" data-action="hint">
              🔍 Get Hint
            </button>
          </div>
          
          <!-- Debug Tab -->
          <div class="lc-ai-coach-tab-content" data-tab-content="debug">
            <div class="lc-ai-coach-debug-info">
              <div class="lc-ai-coach-last-run">
                <strong>Last Run:</strong>
                <span id="lc-last-run-status">No run yet</span>
              </div>
            </div>
            <button class="lc-ai-coach-action-btn" data-action="debug">
              🐛 Why is this failing?
            </button>
          </div>
          
          <!-- Review Tab -->
          <div class="lc-ai-coach-tab-content" data-tab-content="review">
            <p class="lc-ai-coach-description">
              Get feedback on your code's correctness, efficiency, and style.
            </p>
            <button class="lc-ai-coach-action-btn" data-action="review">
              📝 Review my solution
            </button>
          </div>
          
          <!-- Settings Tab -->
          <div class="lc-ai-coach-tab-content" data-tab-content="settings">
            <div class="lc-ai-coach-settings-form">
              <div class="lc-settings-group">
                <label>Provider</label>
                <select id="lc-settings-provider">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google Gemini</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div class="lc-settings-group">
                <label>API Key</label>
                <input type="password" id="lc-settings-apikey" placeholder="sk-...">
              </div>
              <div class="lc-settings-group">
                <label>Model</label>
                <input type="text" id="lc-settings-model" placeholder="gpt-4o">
              </div>
              <div class="lc-settings-group" id="lc-settings-baseurl-group" style="display:none;">
                <label>Base URL</label>
                <input type="text" id="lc-settings-baseurl" placeholder="https://api.example.com/v1">
              </div>
              <button class="lc-ai-coach-action-btn" id="lc-save-settings-btn">
                💾 Save Settings
              </button>
              <div id="lc-settings-status" class="lc-settings-status"></div>
            </div>
          </div>
        </div>
        
        <!-- Reasoning Effort Control -->
        <div class="lc-ai-coach-reasoning">
          <label>Reasoning:</label>
          <select id="lc-reasoning-effort">
            <option value="low">Low (Faster)</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High (Deeper)</option>
          </select>
        </div>
        
        <!-- Response Area -->
        <div class="lc-ai-coach-response">
          <div class="lc-ai-coach-response-header">
            <span>Response</span>
            <button class="lc-ai-coach-copy-btn" title="Copy">📋</button>
            <button class="lc-ai-coach-clear-btn" title="Clear History">🗑️</button>
          </div>
          <div class="lc-ai-coach-response-content">
            <p class="lc-ai-coach-placeholder">
              Click a button above to get AI coaching assistance.
            </p>
          </div>
        </div>
        
        <!-- Loading Indicator -->
        <div class="lc-ai-coach-loading" style="display: none;">
          <div class="lc-ai-coach-spinner"></div>
          <span>Thinking...</span>
        </div>
        
        <!-- Error Display -->
        <div class="lc-ai-coach-error" style="display: none;"></div>
      </div>
      
      <!-- Toggle Button (when minimized) -->
      <button id="lc-ai-coach-toggle" class="lc-ai-coach-toggle" style="display: none;">
        🤖
      </button>
    `;
  }

  /**
   * Inject the panel into the page
   */
  function injectPanel() {
    // Remove existing panel if present
    const existing = document.getElementById('lc-ai-coach-container');
    if (existing) existing.remove();

    // Create container
    const container = document.createElement('div');
    container.id = 'lc-ai-coach-container';
    container.innerHTML = createPanelHTML();
    document.body.appendChild(container);

    panelElement = document.getElementById('lc-ai-coach-panel');

    // Set up event listeners
    setupEventListeners();

    // Load settings
    loadSettings();
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.lc-ai-coach-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Action buttons (except save settings)
    document.querySelectorAll('.lc-ai-coach-action-btn:not(#lc-save-settings-btn)').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action));
    });

    // Minimize button
    document.querySelector('.lc-ai-coach-minimize-btn')?.addEventListener('click', togglePanel);

    // Toggle button
    document.getElementById('lc-ai-coach-toggle')?.addEventListener('click', togglePanel);

    // Settings button in header - switch to settings tab
    document.querySelector('.lc-ai-coach-settings-btn')?.addEventListener('click', () => switchTab('settings'));

    // Copy button
    document.querySelector('.lc-ai-coach-copy-btn')?.addEventListener('click', copyResponse);

    // Clear history button
    document.querySelector('.lc-ai-coach-clear-btn')?.addEventListener('click', clearHistory);

    // Reasoning effort change
    document.getElementById('lc-reasoning-effort')?.addEventListener('change', (e) => {
      updateReasoningEffort(e.target.value);
    });

    // Settings form events
    document.getElementById('lc-settings-provider')?.addEventListener('change', (e) => {
      const baseUrlGroup = document.getElementById('lc-settings-baseurl-group');
      if (baseUrlGroup) {
        baseUrlGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
      }
    });

    document.getElementById('lc-save-settings-btn')?.addEventListener('click', saveInlineSettings);

    // Subscribe to events
    window.EventBus.on(window.EVENTS.AI_RESPONSE_RECEIVED, displayResponse);
    window.EventBus.on(window.EVENTS.AI_REQUEST_STARTED, showLoading);
    window.EventBus.on(window.EVENTS.AI_REQUEST_ERROR, displayError);
    window.EventBus.on(window.EVENTS.PROBLEM_CONTEXT_UPDATED, updateProblemInfo);
    window.EventBus.on(window.EVENTS.RUN_RESULT_UPDATED, updateDebugInfo);
  }

  /**
   * Switch active tab
   */
  function switchTab(tabName) {
    currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.lc-ai-coach-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.lc-ai-coach-tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tabContent === tabName);
    });
  }

  /**
   * Handle action button click
   */
  async function handleAction(action) {
    if (isLoading) return;

    const hintStyle = document.getElementById('lc-hint-style')?.value || 'progressive';

    let mode;
    switch (action) {
      case 'explain':
        mode = 'overview';
        break;
      case 'hint':
        mode = 'hints';
        break;
      case 'debug':
        mode = 'debug';
        break;
      case 'review':
        mode = 'review';
        break;
      default:
        mode = 'overview';
    }

    // Request AI response
    window.EventBus.emit(window.EVENTS.AI_REQUEST_STARTED, { mode, hintStyle });

    try {
      // Get fresh code before the request
      if (window.CodeBridge) {
        await window.CodeBridge.requestCode();
      }

      // Refresh problem context
      const context = window.LeetCodeDomAdapter.refresh();

      // Send request to background
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AI_RESPONSE',
        payload: {
          mode,
          hintStyle,
          problemContext: context
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      window.EventBus.emit(window.EVENTS.AI_RESPONSE_RECEIVED, response);
    } catch (error) {
      window.EventBus.emit(window.EVENTS.AI_REQUEST_ERROR, error.message);
    }
  }

  /**
   * Show loading state
   */
  function showLoading() {
    isLoading = true;
    const loadingEl = document.querySelector('.lc-ai-coach-loading');
    if (loadingEl) loadingEl.style.display = 'flex';

    // Disable action buttons
    document.querySelectorAll('.lc-ai-coach-action-btn').forEach(btn => {
      btn.disabled = true;
    });
  }

  /**
   * Hide loading state
   */
  function hideLoading() {
    isLoading = false;
    const loadingEl = document.querySelector('.lc-ai-coach-loading');
    if (loadingEl) loadingEl.style.display = 'none';

    // Enable action buttons
    document.querySelectorAll('.lc-ai-coach-action-btn').forEach(btn => {
      btn.disabled = false;
    });
  }

  /**
   * Display AI response
   */
  function displayResponse(response) {
    hideLoading();
    hideError();

    const contentEl = document.querySelector('.lc-ai-coach-response-content');
    if (!contentEl) return;

    // Format response with markdown-like rendering
    let html = formatMarkdown(response.text || 'No response received.');

    // Add thinking section if present
    if (response.thinking) {
      html = `
        <details class="lc-ai-coach-thinking">
          <summary>💭 Model Thinking</summary>
          <div class="lc-ai-coach-thinking-content">${formatMarkdown(response.thinking)}</div>
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

    const errorEl = document.querySelector('.lc-ai-coach-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  /**
   * Hide error message
   */
  function hideError() {
    const errorEl = document.querySelector('.lc-ai-coach-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  /**
   * Simple markdown-like formatting
   */
  function formatMarkdown(text) {
    if (!text) return '';

    // Escape HTML
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="lc-ai-coach-code"><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="lc-ai-coach-inline-code">$1</code>');

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
   * Update problem info display
   */
  function updateProblemInfo(context) {
    const infoEl = document.querySelector('.lc-ai-coach-problem-info');
    if (!infoEl) return;

    infoEl.innerHTML = `
      <div class="lc-ai-coach-problem-title">${context.title || 'Loading...'}</div>
      <div class="lc-ai-coach-problem-meta">
        <span class="lc-ai-coach-difficulty ${(context.difficulty || '').toLowerCase()}">${context.difficulty || ''}</span>
        ${context.topics && context.topics.length > 0
        ? `<span class="lc-ai-coach-topics">${context.topics.slice(0, 3).join(', ')}</span>`
        : ''}
      </div>
    `;
  }

  /**
   * Update debug info display
   */
  function updateDebugInfo(result) {
    const statusEl = document.getElementById('lc-last-run-status');
    if (statusEl) {
      let statusClass = '';
      if (result.status.toLowerCase().includes('accepted')) statusClass = 'status-accepted';
      else if (result.status.toLowerCase().includes('wrong')) statusClass = 'status-wrong';
      else if (result.status.toLowerCase().includes('error')) statusClass = 'status-error';

      statusEl.innerHTML = `<span class="${statusClass}">${result.status}</span>`;
    }
  }

  /**
   * Toggle panel visibility
   */
  function togglePanel() {
    isVisible = !isVisible;

    const panel = document.getElementById('lc-ai-coach-panel');
    const toggle = document.getElementById('lc-ai-coach-toggle');

    if (panel) panel.style.display = isVisible ? 'flex' : 'none';
    if (toggle) toggle.style.display = isVisible ? 'none' : 'block';

    window.EventBus.emit(window.EVENTS.PANEL_TOGGLE, isVisible);
  }

  /**
   * Open settings page
   */
  /**
   * Open settings page
   */
  function openSettings() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage().catch(err => {
        console.error('[UiPanel] Failed to open options page via API:', err);
        // Fallback: Open via URL
        window.open(chrome.runtime.getURL('options/options.html'), '_blank');
      });
    } else {
      // Fallback for contexts where openOptionsPage might not be directly available
      window.open(chrome.runtime.getURL('options/options.html'), '_blank');
    }
  }

  /**
   * Copy response to clipboard
   */
  function copyResponse() {
    const contentEl = document.querySelector('.lc-ai-coach-response-content');
    if (!contentEl) return;

    const text = contentEl.innerText;
    navigator.clipboard.writeText(text).then(() => {
      // Show brief feedback
      const copyBtn = document.querySelector('.lc-ai-coach-copy-btn');
      if (copyBtn) {
        const original = copyBtn.textContent;
        copyBtn.textContent = '✓';
        setTimeout(() => { copyBtn.textContent = original; }, 1000);
      }
    });
  }

  /**
   * Clear conversation history
   */
  async function clearHistory() {
    const slug = window.LeetCodeDomAdapter.extractSlugFromUrl();

    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_HISTORY',
        payload: { problemSlug: slug }
      });

      // Clear response display
      const contentEl = document.querySelector('.lc-ai-coach-response-content');
      if (contentEl) {
        contentEl.innerHTML = '<p class="lc-ai-coach-placeholder">Conversation history cleared.</p>';
      }
    } catch (error) {
      console.error('[UiPanel] Failed to clear history:', error);
    }
  }

  /**
   * Load settings and update UI
   */
  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      currentSettings = response;

      // Update reasoning effort selector
      const reasoningEl = document.getElementById('lc-reasoning-effort');
      if (reasoningEl && response.reasoningEffort) {
        reasoningEl.value = response.reasoningEffort;
      }

      // Populate inline settings form
      const provider = response.provider || 'openai';
      const providerEl = document.getElementById('lc-settings-provider');
      if (providerEl) providerEl.value = provider;

      const apiKeyEl = document.getElementById('lc-settings-apikey');
      if (apiKeyEl && response.apiKeys) {
        apiKeyEl.value = response.apiKeys[provider] || '';
      }

      const modelEl = document.getElementById('lc-settings-model');
      if (modelEl && response.models) {
        modelEl.value = response.models[provider] || '';
      }

      const baseUrlEl = document.getElementById('lc-settings-baseurl');
      if (baseUrlEl && response.baseUrls) {
        baseUrlEl.value = response.baseUrls[provider] || '';
      }

      const baseUrlGroup = document.getElementById('lc-settings-baseurl-group');
      if (baseUrlGroup) {
        baseUrlGroup.style.display = provider === 'custom' ? 'block' : 'none';
      }
    } catch (error) {
      console.error('[UiPanel] Failed to load settings:', error);
    }
  }

  /**
   * Save inline settings
   */
  async function saveInlineSettings() {
    const statusEl = document.getElementById('lc-settings-status');

    const provider = document.getElementById('lc-settings-provider')?.value || 'openai';
    const apiKey = document.getElementById('lc-settings-apikey')?.value || '';
    const model = document.getElementById('lc-settings-model')?.value || '';
    const baseUrl = document.getElementById('lc-settings-baseurl')?.value || '';

    try {
      // Get current settings first
      const current = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });

      // Update with new values
      const newSettings = {
        ...current,
        provider: provider,
        apiKeys: { ...(current.apiKeys || {}), [provider]: apiKey },
        models: { ...(current.models || {}), [provider]: model },
        baseUrls: { ...(current.baseUrls || {}), [provider]: baseUrl }
      };

      // Save
      await chrome.storage.local.set({ 'leetcodeAiCoach': newSettings });

      if (statusEl) {
        statusEl.textContent = '✓ Saved!';
        statusEl.style.color = '#00b8a3';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      }

      // Reload settings
      currentSettings = newSettings;
    } catch (error) {
      console.error('[UiPanel] Failed to save settings:', error);
      if (statusEl) {
        statusEl.textContent = '✗ Failed to save';
        statusEl.style.color = '#ff375f';
      }
    }
  }

  /**
   * Update reasoning effort setting
   */
  async function updateReasoningEffort(value) {
    try {
      // Update in settings
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTING',
        payload: { key: 'reasoningEffort', value }
      });
    } catch (error) {
      console.error('[UiPanel] Failed to update reasoning effort:', error);
    }
  }

  /**
   * Initialize the panel
   */
  function init() {
    injectPanel();
    console.log('[UiPanel] Initialized');
  }

  /**
   * Destroy the panel
   */
  function destroy() {
    const container = document.getElementById('lc-ai-coach-container');
    if (container) container.remove();
  }

  return {
    init,
    destroy,
    togglePanel,
    switchTab
  };
})();

// Make available globally
window.UiPanel = UiPanel;
