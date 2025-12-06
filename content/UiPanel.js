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
    openai: ['gpt-5.1-mini', 'gpt-5.1', 'gpt-5.1-codex-max'],
    anthropic: ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'],
    google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-pro-preview'],
    custom: []
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
   * Set up message handler for Chrome Side Panel communication
   */
  function setupSidePanelMessageHandler() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'GET_PROBLEM_CONTEXT') {
        const context = window.LeetCodeDomAdapter.getContext();
        sendResponse({ context });
        return true;
      }
      if (request.type === 'GET_CODE') {
        const code = window.CodeBridge?.getCode?.() || '';
        const language = window.LeetCodeDomAdapter?.getLanguage?.() || 'unknown';
        sendResponse({ code, language });
        return true;
      }
    });
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
   * Enhanced markdown-like formatting
   */
  function formatMarkdown(text) {
    if (!text) return '';

    // Escape HTML
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks (must be done first to preserve content)
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

    // Numbered lists (1. item, 2. item, etc.)
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="lc-numbered-item">$2</li>');

    // Bullet lists (- item or * item)
    html = html.replace(/^[-*] (.+)$/gm, '<li class="lc-bullet-item">$1</li>');

    // Wrap consecutive list items in ul/ol
    html = html.replace(/(<li class="lc-numbered-item">[\s\S]*?<\/li>)(\s*<br>)*(\s*<li class="lc-numbered-item">)/g, '$1$3');
    html = html.replace(/(<li class="lc-bullet-item">[\s\S]*?<\/li>)(\s*<br>)*(\s*<li class="lc-bullet-item">)/g, '$1$3');

    // Wrap numbered items in ol
    html = html.replace(/(<li class="lc-numbered-item">[\s\S]*?<\/li>)+/g, '<ol class="lc-ai-list">$&</ol>');

    // Wrap bullet items in ul
    html = html.replace(/(<li class="lc-bullet-item">[\s\S]*?<\/li>)+/g, '<ul class="lc-ai-list">$&</ul>');

    // Paragraphs - double newlines become paragraph breaks
    html = html.replace(/\n\n+/g, '</p><p class="lc-ai-paragraph">');

    // Single line breaks
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph
    html = '<p class="lc-ai-paragraph">' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p class="lc-ai-paragraph"><\/p>/g, '');
    html = html.replace(/<p class="lc-ai-paragraph">(\s*<br>\s*)*<\/p>/g, '');

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
   * Load and display chat history for current problem
   */
  async function loadChatHistory() {
    try {
      const slug = window.LeetCodeDomAdapter.extractSlugFromUrl();
      if (!slug) return;

      const response = await chrome.runtime.sendMessage({
        type: 'GET_HISTORY',
        payload: { problemSlug: slug }
      });

      const history = response.history || [];

      if (history.length === 0) {
        // No history - show placeholder
        return;
      }

      // Display the last assistant response from history
      const contentEl = document.querySelector('.lc-ai-coach-response-content');
      if (!contentEl) return;

      // Find the last assistant message
      const lastAssistantMsg = [...history].reverse().find(msg => msg.role === 'assistant');

      if (lastAssistantMsg) {
        // Build history display HTML
        let html = '';

        // Show conversation count
        const exchangeCount = Math.floor(history.length / 2);
        html += `<div class="lc-ai-coach-history-indicator">
          <span>📜 ${exchangeCount} previous exchange${exchangeCount !== 1 ? 's' : ''}</span>
        </div>`;

        // Show the last response
        html += `<div class="lc-ai-coach-last-response">`;
        html += formatMarkdown(lastAssistantMsg.content);
        html += `</div>`;

        contentEl.innerHTML = html;

        console.log(`[UiPanel] Loaded ${history.length} history messages for ${slug}`);
      }
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

      // Load chat history for this problem
      await loadChatHistory();
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

