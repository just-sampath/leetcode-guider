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
  let isVisible = false; // Start minimized - don't auto-open
  let currentTab = 'overview';
  let isLoading = false;
  let currentSettings = null;
  let panelMode = 'popup'; // 'popup' | 'sidebar' | 'sidepanel'
  let sidebarWidth = 380;

  // Default models per provider
  const DEFAULT_MODELS = {
    openai: ['gpt-5-mini', 'gpt-5.1', 'gpt-5.1-codex-max'],
    anthropic: ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'],
    google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-pro-preview'],
    custom: [],
    portkey: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro']
  };

  /**
   * Create the panel HTML structure
   * Panel starts hidden, toggle button starts visible
   */
  function createPanelHTML() {
    return `
      <div id="lc-ai-coach-panel" class="lc-ai-coach-panel" style="display: none;">
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
                  <option value="portkey">Portkey</option>
                </select>
              </div>
              <div class="lc-settings-group">
                <label>API Key</label>
                <input type="password" id="lc-settings-apikey" placeholder="sk-...">
              </div>
              <div class="lc-settings-group">
                <label>Model</label>
                <select id="lc-settings-model-select">
                  <option value="">-- Select --</option>
                </select>
                <input type="text" id="lc-settings-model-custom" placeholder="Or enter custom model">
              </div>
              <div class="lc-settings-group" id="lc-settings-baseurl-group" style="display:none;">
                <label>Base URL</label>
                <input type="text" id="lc-settings-baseurl" placeholder="https://api.example.com/v1">
              </div>
              <div class="lc-settings-group" id="lc-settings-portkey-group" style="display:none;">
                <label>Virtual Key (optional)</label>
                <input type="text" id="lc-settings-virtualkey" placeholder="vk-...">
                <label style="margin-top: 8px;">Config ID (optional)</label>
                <input type="text" id="lc-settings-configid" placeholder="pc-...">
                <p class="lc-settings-hint">Use either Virtual Key OR Config ID, not both</p>
              </div>
              <div class="lc-settings-group">
                <label>Custom Persona (optional)</label>
                <textarea id="lc-settings-persona" rows="3" placeholder="Custom instructions for the AI..."></textarea>
              </div>
              <div class="lc-settings-group">
                <label>Panel Mode</label>
                <select id="lc-settings-panelmode">
                  <option value="popup">Floating Popup</option>
                  <option value="sidebar">Injected Sidebar</option>
                </select>
                <p class="lc-settings-hint">Changes take effect on page refresh</p>
              </div>
              <div class="lc-settings-group lc-settings-checkbox-group">
                <label class="lc-settings-checkbox-label">
                  <input type="checkbox" id="lc-settings-openonload">
                  <span>Open panel automatically on page load</span>
                </label>
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
            <button class="lc-ai-coach-import-btn" title="Import Context from Other Mode">📥</button>
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
      
      <!-- Toggle Button (starts visible since panel is minimized) -->
      <button id="lc-ai-coach-toggle" class="lc-ai-coach-toggle" style="display: block;">
        🤖
      </button>
    `;
  }

  /**
   * Inject the panel into the page based on panelMode
   */
  function injectPanel() {
    // Remove existing panel if present
    const existing = document.getElementById('lc-ai-coach-container');
    if (existing) existing.remove();

    // Remove any sidebar adjustments
    document.body.style.marginRight = '';
    document.documentElement.style.marginRight = '';


    // Create container
    const container = document.createElement('div');
    container.id = 'lc-ai-coach-container';
    container.innerHTML = createPanelHTML();
    document.body.appendChild(container);

    panelElement = document.getElementById('lc-ai-coach-panel');

    // Apply mode-specific styles
    if (panelMode === 'sidebar') {
      applySidebarMode();
    }

    // Set up event listeners
    setupEventListeners();

    // Load settings (don't re-fetch mode)
    loadSettingsUI();
  }

  /**
   * Apply sidebar mode - dock to right and push page content
   */
  function applySidebarMode() {
    const panel = document.getElementById('lc-ai-coach-panel');
    const toggle = document.getElementById('lc-ai-coach-toggle');
    const container = document.getElementById('lc-ai-coach-container');

    if (!panel || !container) return;

    // Add sidebar class
    container.classList.add('lc-ai-coach-sidebar-mode');

    // Modify panel styles for sidebar
    panel.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: ${sidebarWidth}px !important;
      max-height: 100vh !important;
      border-radius: 0 !important;
      border-left: 1px solid #333 !important;
      display: flex !important;
      z-index: 10000 !important;
      transition: transform 0.3s ease !important;
    `;

    // Hide the floating toggle
    if (toggle) toggle.style.display = 'none';

    // Add resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'lc-ai-coach-resize-handle';
    resizeHandle.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      cursor: ew-resize;
      background: transparent;
      z-index: 10001;
    `;
    resizeHandle.addEventListener('mousedown', startResize);
    panel.appendChild(resizeHandle);

    // Add collapse button to header
    const header = panel.querySelector('.lc-ai-coach-header-actions');
    if (header) {
      const collapseBtn = document.createElement('button');
      collapseBtn.className = 'lc-ai-coach-collapse-btn';
      collapseBtn.title = 'Collapse Sidebar';
      collapseBtn.textContent = '→';
      collapseBtn.addEventListener('click', toggleSidebar);
      header.insertBefore(collapseBtn, header.firstChild);

      // Hide minimize and settings buttons in sidebar mode - collapse button is sufficient
      const minimizeBtn = header.querySelector('.lc-ai-coach-minimize-btn');
      if (minimizeBtn) minimizeBtn.style.display = 'none';

      const settingsBtn = header.querySelector('.lc-ai-coach-settings-btn');
      if (settingsBtn) settingsBtn.style.display = 'none';
    }

    // Create collapsed sidebar tab (stays visible when sidebar is hidden)
    const collapsedTab = document.createElement('div');
    collapsedTab.id = 'lc-ai-coach-collapsed-tab';
    collapsedTab.className = 'lc-ai-coach-collapsed-tab';
    collapsedTab.innerHTML = '🤖';
    collapsedTab.title = 'Open AI Coach';
    collapsedTab.style.display = 'none'; // Hidden initially since sidebar is open
    collapsedTab.addEventListener('click', toggleSidebar);
    container.appendChild(collapsedTab);

    // Push page content - target LeetCode's main layout container
    adjustPageLayout(sidebarWidth);

    // Start visible in sidebar mode
    isVisible = true;

    console.log('[UiPanel] Sidebar mode applied');
  }

  /**
   * Adjust LeetCode's page layout to make room for sidebar
   * Uses multiple strategies to push content
   */
  function adjustPageLayout(width) {
    // Strategy 1: Target LeetCode's #__next root container
    const nextRoot = document.getElementById('__next');
    if (nextRoot) {
      nextRoot.style.cssText = `
        width: calc(100% - ${width}px) !important;
        max-width: calc(100% - ${width}px) !important;
        transition: width 0.3s ease, max-width 0.3s ease !important;
      `;
    }

    // Strategy 2: Also adjust body for any fixed elements
    document.body.style.marginRight = `${width}px`;
    document.body.style.transition = 'margin-right 0.3s ease';

    // Strategy 3: Mark document for CSS-based adjustments
    document.documentElement.style.setProperty('--lc-sidebar-width', `${width}px`);
  }

  /**
   * Reset page layout when sidebar is hidden
   */
  function resetPageLayout() {
    const nextRoot = document.getElementById('__next');
    if (nextRoot) {
      nextRoot.style.cssText = `
        width: 100% !important;
        max-width: 100% !important;
        transition: width 0.3s ease, max-width 0.3s ease !important;
      `;
    }
    document.body.style.marginRight = '0';
    document.documentElement.style.setProperty('--lc-sidebar-width', '0px');
  }

  /**
   * Toggle sidebar visibility
   */
  function toggleSidebar() {
    const panel = document.getElementById('lc-ai-coach-panel');
    const collapseBtn = panel?.querySelector('.lc-ai-coach-collapse-btn');
    const collapsedTab = document.getElementById('lc-ai-coach-collapsed-tab');

    isVisible = !isVisible;

    if (isVisible) {
      // Show sidebar
      panel.style.transform = 'translateX(0)';
      adjustPageLayout(sidebarWidth);
      if (collapseBtn) collapseBtn.textContent = '→';
      if (collapsedTab) collapsedTab.style.display = 'none';
    } else {
      // Hide sidebar
      panel.style.transform = `translateX(${sidebarWidth}px)`;
      resetPageLayout();
      if (collapseBtn) collapseBtn.textContent = '←';
      if (collapsedTab) collapsedTab.style.display = 'flex';
    }
  }


  /**
   * Start resize operation
   */
  function startResize(e) {
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    function doResize(e) {
      const delta = startX - e.clientX;
      const newWidth = Math.max(300, Math.min(600, startWidth + delta));
      sidebarWidth = newWidth;

      const panel = document.getElementById('lc-ai-coach-panel');
      if (panel) {
        panel.style.width = `${newWidth}px`;
      }
      adjustPageLayout(newWidth);
    }

    function stopResize() {
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);

      // Save width preference
      saveSidebarWidth();
    }

    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
  }

  /**
   * Save sidebar width preference
   */
  async function saveSidebarWidth() {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTING',
        payload: { key: 'sidebarWidth', value: sidebarWidth }
      });
    } catch (error) {
      console.error('[UiPanel] Failed to save sidebar width:', error);
    }
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

    // Import context button
    document.querySelector('.lc-ai-coach-import-btn')?.addEventListener('click', showImportModal);

    // Reasoning effort change
    document.getElementById('lc-reasoning-effort')?.addEventListener('change', (e) => {
      updateReasoningEffort(e.target.value);
    });

    // Settings form events - provider change updates all fields
    document.getElementById('lc-settings-provider')?.addEventListener('change', (e) => {
      const newProvider = e.target.value;
      updateSettingsFieldsForProvider(newProvider);
    });

    // Model select and custom model listeners
    document.getElementById('lc-settings-model-select')?.addEventListener('change', (e) => {
      if (e.target.value) {
        document.getElementById('lc-settings-model-custom').value = '';
      }
    });

    document.getElementById('lc-settings-model-custom')?.addEventListener('input', (e) => {
      if (e.target.value) {
        document.getElementById('lc-settings-model-select').value = '';
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

    // Load mode-specific chat history when switching to a content tab
    if (['overview', 'hints', 'debug', 'review'].includes(tabName)) {
      loadChatHistory(tabName);
    }
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
   * Handle follow-up message from chat input
   * @param {string} message - The user's follow-up question
   */
  async function handleFollowUpMessage(message) {
    if (isLoading || !message) return;

    const contentEl = document.querySelector('.lc-ai-coach-response-content');
    if (!contentEl) return;

    // Inject ChatRenderer styles if needed
    window.ChatRenderer.injectStyles(document);

    // Add user message to chat thread
    window.ChatRenderer.appendMessage(contentEl, {
      role: 'user',
      content: message
    });

    // Show loading
    showLoading();

    try {
      // Get fresh code before the request
      if (window.CodeBridge) {
        await window.CodeBridge.requestCode();
      }

      // Get current context
      const context = window.LeetCodeDomAdapter.refresh();
      context.followUpQuestion = message;

      // Send request to background with 'followup' mode
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AI_RESPONSE',
        payload: {
          mode: 'followup',
          followUpQuestion: message,
          problemContext: context
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Display the AI response
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
   * Display AI response - appends to chat thread
   */
  function displayResponse(response) {
    hideLoading();
    hideError();

    const contentEl = document.querySelector('.lc-ai-coach-response-content');
    if (!contentEl) return;

    // Build content with optional thinking section
    let messageContent = response.text || 'No response received.';
    if (response.thinking) {
      messageContent = `💭 **Model Thinking:**\n${response.thinking}\n\n---\n\n${messageContent}`;
    }

    // Inject styles if not present
    window.ChatRenderer.injectStyles(document);

    // Use ChatRenderer to append the new message
    window.ChatRenderer.appendMessage(contentEl, {
      role: 'assistant',
      content: messageContent
    });

    // Ensure event listeners are set up for toggle buttons
    window.ChatRenderer.setupEventListeners(contentEl, handleFollowUpMessage);
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

  // formatMarkdown is now provided by ChatRenderer - using shared implementation

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
    const mode = currentTab === 'settings' ? 'overview' : currentTab;

    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_HISTORY',
        payload: { problemSlug: slug, mode }
      });

      // Clear response display but keep input
      const contentEl = document.querySelector('.lc-ai-coach-response-content');
      if (contentEl) {
        window.ChatRenderer.injectStyles(document);
        contentEl.innerHTML = window.ChatRenderer.renderChatThread([], { showInput: true });
        window.ChatRenderer.setupEventListeners(contentEl, handleFollowUpMessage);
      }
    } catch (error) {
      console.error('[UiPanel] Failed to clear history:', error);
    }
  }

  /**
   * Show import context modal
   */
  async function showImportModal() {
    const slug = window.LeetCodeDomAdapter.extractSlugFromUrl();
    const currentMode = currentTab === 'settings' ? 'overview' : currentTab;

    try {
      // Get available modes with history
      const response = await chrome.runtime.sendMessage({
        type: 'GET_MODE_HISTORIES',
        payload: { problemSlug: slug }
      });

      const modeHistories = response.modeHistories || [];

      // Filter out current mode
      const otherModes = modeHistories.filter(m => m.mode !== currentMode);

      if (otherModes.length === 0) {
        alert('No conversation history available from other modes to import.');
        return;
      }

      // Create modal
      const modal = document.createElement('div');
      modal.id = 'lc-import-modal';
      modal.className = 'lc-import-modal';
      modal.innerHTML = `
        <div class="lc-import-modal-content">
          <div class="lc-import-modal-header">
            <h3>📥 Import Context</h3>
            <button class="lc-import-modal-close">×</button>
          </div>
          <p>Select a mode to import conversation history from:</p>
          <div class="lc-import-mode-list">
            ${otherModes.map(m => `
              <button class="lc-import-mode-btn" data-mode="${m.mode}">
                ${getModeIcon(m.mode)} ${m.mode.charAt(0).toUpperCase() + m.mode.slice(1)}
                <span class="lc-import-mode-count">(${m.messageCount} messages)</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

      // Add styles for modal
      const style = document.createElement('style');
      style.id = 'lc-import-modal-styles';
      style.textContent = `
        .lc-import-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100001;
        }
        .lc-import-modal-content {
          background: var(--lc-bg-panel, #1a1a1a);
          border-radius: 12px;
          padding: 20px;
          max-width: 400px;
          width: 90%;
          border: 1px solid var(--lc-border, rgba(255,255,255,0.1));
        }
        .lc-import-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .lc-import-modal-header h3 {
          margin: 0;
          color: var(--lc-text-primary, #fff);
        }
        .lc-import-modal-close {
          background: none;
          border: none;
          color: var(--lc-text-muted, #888);
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .lc-import-modal-close:hover {
          color: var(--lc-text-primary, #fff);
        }
        .lc-import-modal p {
          color: var(--lc-text-secondary, #aaa);
          margin-bottom: 16px;
        }
        .lc-import-mode-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .lc-import-mode-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--lc-bg-elevated, #2d2d2d);
          border: 1px solid var(--lc-border, rgba(255,255,255,0.1));
          border-radius: 8px;
          color: var(--lc-text-primary, #fff);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lc-import-mode-btn:hover {
          background: var(--lc-bg-hover, #333);
          border-color: var(--lc-accent, #ffa116);
        }
        .lc-import-mode-count {
          color: var(--lc-text-muted, #888);
          margin-left: auto;
          font-size: 12px;
        }
      `;

      if (!document.getElementById('lc-import-modal-styles')) {
        document.head.appendChild(style);
      }
      document.body.appendChild(modal);

      // Event listeners
      modal.querySelector('.lc-import-modal-close').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });

      modal.querySelectorAll('.lc-import-mode-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await handleImportContext(btn.dataset.mode, currentMode);
          modal.remove();
        });
      });
    } catch (error) {
      console.error('[UiPanel] Failed to show import modal:', error);
    }
  }

  /**
   * Get icon for mode
   */
  function getModeIcon(mode) {
    const icons = {
      overview: '💡',
      hints: '🔍',
      debug: '🐛',
      review: '📝'
    };
    return icons[mode] || '💬';
  }

  /**
   * Handle importing context from one mode to another
   */
  async function handleImportContext(fromMode, toMode) {
    const slug = window.LeetCodeDomAdapter.extractSlugFromUrl();

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_HISTORY',
        payload: { problemSlug: slug, fromMode, toMode }
      });

      if (response.success) {
        // Reload chat history to show imported messages
        await loadChatHistory(toMode);
        console.log(`[UiPanel] Imported ${response.importedCount} messages from ${fromMode} to ${toMode}`);
      } else {
        console.error('[UiPanel] Import failed:', response.error);
        alert('Failed to import context: ' + response.error);
      }
    } catch (error) {
      console.error('[UiPanel] Failed to import context:', error);
    }
  }


  /**
   * Load and display chat history for current problem
   * Uses ChatRenderer for consistent rendering with collapsible messages
   */
  async function loadChatHistory(mode = 'overview') {
    try {
      const slug = window.LeetCodeDomAdapter.extractSlugFromUrl();
      if (!slug) return;

      const response = await chrome.runtime.sendMessage({
        type: 'GET_HISTORY',
        payload: { problemSlug: slug, mode }
      });

      const history = response.history || [];
      const contentEl = document.querySelector('.lc-ai-coach-response-content');
      if (!contentEl) return;

      // Inject ChatRenderer styles if not already present
      window.ChatRenderer.injectStyles(document);

      // Use ChatRenderer to render the full chat thread with collapsible messages
      const chatHtml = window.ChatRenderer.renderChatThread(history, {
        collapseOld: true,
        showInput: true
      });

      contentEl.innerHTML = chatHtml;

      // Set up event listeners including follow-up handler
      window.ChatRenderer.setupEventListeners(contentEl, handleFollowUpMessage);

      console.log(`[UiPanel] Loaded ${history.length} history messages for ${slug}`);
    } catch (error) {
      console.error('[UiPanel] Failed to load chat history:', error);
    }
  }

  /**
   * Save inline settings
   */
  async function saveInlineSettings() {
    const statusEl = document.getElementById('lc-settings-status');

    const provider = document.getElementById('lc-settings-provider')?.value || 'openai';
    const apiKey = document.getElementById('lc-settings-apikey')?.value || '';
    // Get model from dropdown or custom input
    const modelSelect = document.getElementById('lc-settings-model-select')?.value || '';
    const modelCustom = document.getElementById('lc-settings-model-custom')?.value || '';
    const model = modelCustom || modelSelect;
    const baseUrl = document.getElementById('lc-settings-baseurl')?.value || '';
    const persona = document.getElementById('lc-settings-persona')?.value || '';
    const newPanelMode = document.getElementById('lc-settings-panelmode')?.value || 'popup';

    // Get Portkey-specific fields
    const virtualKey = document.getElementById('lc-settings-virtualkey')?.value || '';
    const configId = document.getElementById('lc-settings-configid')?.value || '';

    // Get open on page load setting
    const openOnPageLoad = document.getElementById('lc-settings-openonload')?.checked || false;

    try {
      // Get current settings first
      const current = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });

      // Update with new values
      const newSettings = {
        ...current,
        provider: provider,
        persona: persona,
        panelMode: newPanelMode,
        apiKeys: { ...(current.apiKeys || {}), [provider]: apiKey },
        models: { ...(current.models || {}), [provider]: model },
        baseUrls: { ...(current.baseUrls || {}), [provider]: baseUrl },
        virtualKeys: { ...(current.virtualKeys || {}), portkey: virtualKey },
        portkeyConfigs: { ...(current.portkeyConfigs || {}), portkey: configId },
        openOnPageLoad: openOnPageLoad
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
   * Update settings fields for a specific provider
   * Called when provider changes or on initial load
   */
  function updateSettingsFieldsForProvider(provider) {
    // Update API key
    const apiKeyEl = document.getElementById('lc-settings-apikey');
    if (apiKeyEl && currentSettings?.apiKeys) {
      apiKeyEl.value = currentSettings.apiKeys[provider] || '';
    }

    // Update model dropdown
    const modelSelectEl = document.getElementById('lc-settings-model-select');
    const modelCustomEl = document.getElementById('lc-settings-model-custom');
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
    const baseUrlEl = document.getElementById('lc-settings-baseurl');
    if (baseUrlEl && currentSettings?.baseUrls) {
      baseUrlEl.value = currentSettings.baseUrls[provider] || '';
    }

    // Toggle base URL visibility
    const baseUrlGroup = document.getElementById('lc-settings-baseurl-group');
    if (baseUrlGroup) {
      baseUrlGroup.style.display = provider === 'custom' ? 'block' : 'none';
    }

    // Toggle Portkey-specific fields visibility
    const portkeyGroup = document.getElementById('lc-settings-portkey-group');
    if (portkeyGroup) {
      portkeyGroup.style.display = provider === 'portkey' ? 'block' : 'none';
      if (provider === 'portkey') {
        const virtualKeyEl = document.getElementById('lc-settings-virtualkey');
        const configIdEl = document.getElementById('lc-settings-configid');
        if (virtualKeyEl) virtualKeyEl.value = currentSettings?.virtualKeys?.portkey || '';
        if (configIdEl) configIdEl.value = currentSettings?.portkeyConfigs?.portkey || '';
      }
    }
  }

  /**
   * Load settings UI only (without fetching mode again)
   * Called after panel injection
   */
  async function loadSettingsUI() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      currentSettings = response;

      // Update reasoning effort selector
      const reasoningEl = document.getElementById('lc-reasoning-effort');
      if (reasoningEl && response.reasoningEffort) {
        reasoningEl.value = response.reasoningEffort;
      }

      // Set provider
      const provider = response.provider || 'openai';
      const providerEl = document.getElementById('lc-settings-provider');
      if (providerEl) providerEl.value = provider;

      // Update all fields for this provider
      updateSettingsFieldsForProvider(provider);

      // Load persona
      const personaEl = document.getElementById('lc-settings-persona');
      if (personaEl && response.persona) {
        personaEl.value = response.persona;
      }

      // Update panel mode selector
      const panelModeEl = document.getElementById('lc-settings-panelmode');
      if (panelModeEl && response.panelMode) {
        panelModeEl.value = response.panelMode;
      }

      // Update open on page load checkbox
      const openOnLoadEl = document.getElementById('lc-settings-openonload');
      if (openOnLoadEl) {
        openOnLoadEl.checked = response.openOnPageLoad || false;
      }

      // Load chat history for this problem (use current tab as mode)
      await loadChatHistory(currentTab === 'settings' ? 'overview' : currentTab);
    } catch (error) {
      console.error('[UiPanel] Failed to load settings:', error);
    }
  }

  /**
   * Initialize the panel
   * First loads settings to determine panel mode
   */
  async function init() {
    try {
      // Load settings first to get panel mode
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      currentSettings = response;
      panelMode = response.panelMode || 'popup';
      sidebarWidth = response.sidebarWidth || 380;

      console.log(`[UiPanel] Initializing in ${panelMode} mode`);

      // Inject panel based on mode
      injectPanel();

      // Auto-open panel if setting is enabled (for popup mode)
      if (response.openOnPageLoad && panelMode === 'popup') {
        isVisible = true;
        const panel = document.getElementById('lc-ai-coach-panel');
        const toggle = document.getElementById('lc-ai-coach-toggle');
        if (panel) panel.style.display = 'flex';
        if (toggle) toggle.style.display = 'none';
      }

      console.log('[UiPanel] Initialized');
    } catch (error) {
      console.error('[UiPanel] Failed to initialize:', error);
      // Fallback to popup mode
      panelMode = 'popup';
      injectPanel();
    }
  }

  /**
   * Destroy the panel
   */
  function destroy() {
    const container = document.getElementById('lc-ai-coach-container');
    if (container) container.remove();

    // Reset body margin
    document.body.style.marginRight = '';
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
