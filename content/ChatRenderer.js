/**
 * ChatRenderer - Shared Chat UI Rendering Module
 * 
 * Provides consistent chat thread rendering for both injected sidebar
 * and Chrome side panel. Follows DRY principles.
 * 
 * Features:
 * - Full message bubbles for user and assistant
 * - CSS-based collapsing (max-height) preserves full content
 * - Follow-up input field for multi-turn conversations
 * - Fully responsive design
 * 
 * @module ChatRenderer
 */

const ChatRenderer = (function () {
  /**
   * CSS class prefix for namespacing
   */
  const PREFIX = 'lc-chat';

  /**
   * Enhanced markdown formatting with better list and code support
   * @param {string} text - Raw text to format
   * @returns {string} HTML formatted text
   */
  function formatMarkdown(text) {
    if (!text) return '';

    // Escape HTML first
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks (must be done first to preserve content)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="${PREFIX}-code-block"><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, `<code class="${PREFIX}-inline-code">$1</code>`);

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Numbered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, `<li class="${PREFIX}-numbered-item">$2</li>`);

    // Bullet lists
    html = html.replace(/^[-*] (.+)$/gm, `<li class="${PREFIX}-bullet-item">$1</li>`);

    // Wrap consecutive list items
    html = html.replace(new RegExp(`(<li class="${PREFIX}-numbered-item">[\\s\\S]*?</li>)(\\s*<br>)*(\\s*<li class="${PREFIX}-numbered-item">)`, 'g'), '$1$3');
    html = html.replace(new RegExp(`(<li class="${PREFIX}-bullet-item">[\\s\\S]*?</li>)(\\s*<br>)*(\\s*<li class="${PREFIX}-bullet-item">)`, 'g'), '$1$3');

    // Wrap in ol/ul
    html = html.replace(new RegExp(`(<li class="${PREFIX}-numbered-item">[\\s\\S]*?</li>)+`, 'g'), `<ol class="${PREFIX}-list">$&</ol>`);
    html = html.replace(new RegExp(`(<li class="${PREFIX}-bullet-item">[\\s\\S]*?</li>)+`, 'g'), `<ul class="${PREFIX}-list">$&</ul>`);

    // Paragraphs
    html = html.replace(/\n\n+/g, '</p><p>');

    // Single line breaks
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(\s*<br>\s*)*<\/p>/g, '');

    return html;
  }

  /**
   * Create a single message bubble element
   * @param {Object} message - The message object {role, content}
   * @param {Object} options - Rendering options
   * @param {boolean} options.collapsed - Whether to show collapsed
   * @returns {string} HTML for the message bubble
   */
  function createMessageBubble(message, options = {}) {
    const { collapsed = false } = options;
    const isUser = message.role === 'user';
    const roleClass = isUser ? 'user' : 'assistant';
    const collapsedClass = collapsed ? 'collapsed' : '';

    // Format content - ALWAYS include full content
    const formattedContent = formatMarkdown(message.content);

    const roleIcon = isUser ? '👤' : '🤖';
    const roleLabel = isUser ? 'You' : 'AI Coach';

    // All assistant messages get a toggle button
    const toggleButton = !isUser ? `
          <button class="${PREFIX}-message-toggle" aria-label="Toggle message">
            <span class="toggle-icon">${collapsed ? '▼' : '▲'}</span>
            <span class="toggle-text">${collapsed ? 'Read more' : 'Collapse'}</span>
          </button>
        ` : '';

    return `
      <div class="${PREFIX}-message ${roleClass} ${collapsedClass}" data-role="${message.role}">
        <div class="${PREFIX}-message-header">
          <span class="${PREFIX}-message-icon">${roleIcon}</span>
          <span class="${PREFIX}-message-role">${roleLabel}</span>
          ${toggleButton}
        </div>
        <div class="${PREFIX}-message-body">
          <div class="${PREFIX}-message-content">${formattedContent}</div>
        </div>
      </div>
    `;
  }

  /**
   * Create the chat input field for follow-up questions
   * @returns {string} HTML for the input field
   */
  function createChatInput() {
    return `
      <div class="${PREFIX}-input-container">
        <textarea 
          class="${PREFIX}-input" 
          placeholder="Ask a follow-up question..."
          rows="2"
        ></textarea>
        <button class="${PREFIX}-send-btn" title="Send">
          <span>Send</span>
          <span class="send-icon">→</span>
        </button>
      </div>
    `;
  }

  /**
   * Render complete chat thread from history with input field
   * @param {Array} history - Array of message objects
   * @param {Object} options - Rendering options
   * @param {boolean} options.collapseOld - Collapse all but latest response
   * @param {boolean} options.showInput - Show follow-up input field
   * @returns {string} HTML for the entire chat thread
   */
  function renderChatThread(history, options = {}) {
    const { collapseOld = true, showInput = true } = options;

    if (!history || history.length === 0) {
      let html = `<p class="${PREFIX}-placeholder">Click a button above to get AI coaching assistance.</p>`;
      if (showInput) {
        html += createChatInput();
      }
      return html;
    }

    let html = `<div class="${PREFIX}-thread">`;

    const messageCount = history.length;

    history.forEach((message, index) => {
      // Collapse all assistant messages except the last one
      const isLastAssistant = message.role === 'assistant' &&
        !history.slice(index + 1).some(m => m.role === 'assistant');
      const shouldCollapse = collapseOld && message.role === 'assistant' && !isLastAssistant;

      html += createMessageBubble(message, {
        collapsed: shouldCollapse
      });
    });

    html += '</div>';

    // Add chat input at the bottom
    if (showInput) {
      html += createChatInput();
    }

    return html;
  }

  /**
   * Toggle collapse state of a message element
   * @param {HTMLElement} messageEl - The message element to toggle
   */
  function toggleMessage(messageEl) {
    if (!messageEl) return;

    const isCollapsed = messageEl.classList.contains('collapsed');
    messageEl.classList.toggle('collapsed');

    const toggleBtn = messageEl.querySelector(`.${PREFIX}-message-toggle`);
    if (toggleBtn) {
      const toggleText = toggleBtn.querySelector('.toggle-text');
      const toggleIcon = toggleBtn.querySelector('.toggle-icon');
      if (toggleText) {
        toggleText.textContent = isCollapsed ? 'Collapse' : 'Read more';
      }
      if (toggleIcon) {
        toggleIcon.textContent = isCollapsed ? '▲' : '▼';
      }
    }
  }

  /**
   * Append a new message to an existing chat thread
   * @param {HTMLElement} container - The chat container element
   * @param {Object} message - The message to append
   */
  function appendMessage(container, message) {
    if (!container) return;

    // Find or create thread container
    let thread = container.querySelector(`.${PREFIX}-thread`);
    if (!thread) {
      thread = document.createElement('div');
      thread.className = `${PREFIX}-thread`;
      // Keep input if present
      const input = container.querySelector(`.${PREFIX}-input-container`);
      container.innerHTML = '';
      container.appendChild(thread);
      if (input) container.appendChild(input);
    }

    // Collapse all previous assistant messages
    if (message.role === 'assistant') {
      const previousAssistants = thread.querySelectorAll(`.${PREFIX}-message.assistant`);
      previousAssistants.forEach(msg => {
        if (!msg.classList.contains('collapsed')) {
          msg.classList.add('collapsed');
          const toggleBtn = msg.querySelector(`.${PREFIX}-message-toggle`);
          if (toggleBtn) {
            const toggleText = toggleBtn.querySelector('.toggle-text');
            const toggleIcon = toggleBtn.querySelector('.toggle-icon');
            if (toggleText) toggleText.textContent = 'Read more';
            if (toggleIcon) toggleIcon.textContent = '▼';
          }
        }
      });
    }

    // Create and append new message (not collapsed)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = createMessageBubble(message, { collapsed: false });

    const newMessage = tempDiv.firstElementChild;
    thread.appendChild(newMessage);

    // Scroll to the new message
    newMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  /**
   * Set up event listeners for toggle buttons and chat input
   * @param {HTMLElement} container - The container element
   * @param {Function} onSendMessage - Callback when user sends a message
   */
  function setupEventListeners(container, onSendMessage) {
    if (!container) return;

    // Prevent duplicate event listeners
    if (container.dataset.chatListenersAttached) return;
    container.dataset.chatListenersAttached = 'true';

    // Toggle button clicks
    container.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest(`.${PREFIX}-message-toggle`);
      if (toggleBtn) {
        const messageEl = toggleBtn.closest(`.${PREFIX}-message`);
        toggleMessage(messageEl);
        return;
      }

      const sendBtn = e.target.closest(`.${PREFIX}-send-btn`);
      if (sendBtn && onSendMessage) {
        const input = container.querySelector(`.${PREFIX}-input`);
        if (input && input.value.trim()) {
          onSendMessage(input.value.trim());
          input.value = '';
        }
      }
    });

    // Enter to send (Shift+Enter for new line)
    container.addEventListener('keydown', (e) => {
      if (e.target.classList.contains(`${PREFIX}-input`)) {
        if (e.key === 'Enter' && !e.shiftKey && onSendMessage) {
          e.preventDefault();
          const value = e.target.value.trim();
          if (value) {
            onSendMessage(value);
            e.target.value = '';
          }
        }
      }
    });
  }

  /**
   * Get CSS styles for the chat UI
   * @returns {string} CSS styles as a string
   */
  function getStyles() {
    return `
      /* ============================================
         Chat Thread Container
         ============================================ */
      .${PREFIX}-thread {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 4px 0;
      }

      .${PREFIX}-placeholder {
        color: var(--lc-text-disabled, #555);
        text-align: center;
        margin: 30px 0;
        font-style: italic;
      }

      /* ============================================
         Message Bubble - Base
         ============================================ */
      .${PREFIX}-message {
        display: flex;
        flex-direction: column;
        padding: 12px 14px;
        border-radius: 12px;
        position: relative;
        border: 1px solid var(--lc-border, rgba(255,255,255,0.08));
      }

      .${PREFIX}-message-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .${PREFIX}-message-icon {
        font-size: 14px;
      }

      .${PREFIX}-message-body {
        position: relative;
      }

      .${PREFIX}-message-content {
        font-size: 13px;
        line-height: 1.6;
        transition: max-height 0.3s ease;
      }

      .${PREFIX}-message-content h2,
      .${PREFIX}-message-content h3,
      .${PREFIX}-message-content h4 {
        color: var(--lc-text-primary, #fff);
        margin: 12px 0 6px 0;
        font-weight: 600;
      }

      .${PREFIX}-message-content h2 { font-size: 15px; }
      .${PREFIX}-message-content h3 { font-size: 14px; }
      .${PREFIX}-message-content h4 { font-size: 13px; }

      .${PREFIX}-message-content p {
        margin: 0 0 8px 0;
      }

      .${PREFIX}-message-content p:last-child {
        margin-bottom: 0;
      }

      /* ============================================
         User Message
         ============================================ */
      .${PREFIX}-message.user {
        background: linear-gradient(135deg, rgba(255, 161, 22, 0.12) 0%, rgba(255, 140, 0, 0.08) 100%);
        border-left: 3px solid var(--lc-accent, #ffa116);
      }

      .${PREFIX}-message.user .${PREFIX}-message-role {
        color: var(--lc-accent, #ffa116);
      }

      /* ============================================
         Assistant Message
         ============================================ */
      .${PREFIX}-message.assistant {
        background: var(--lc-bg-elevated, #2d2d2d);
        border-left: 3px solid var(--lc-info, #6366f1);
      }

      .${PREFIX}-message.assistant .${PREFIX}-message-role {
        color: var(--lc-info, #6366f1);
        flex: 1;
      }

      /* ============================================
         Collapsed State - CSS max-height based
         Content is NOT cut, just hidden with scroll
         ============================================ */
      .${PREFIX}-message.collapsed .${PREFIX}-message-content {
        max-height: 4.8em; /* ~3 lines at 1.6 line-height */
        overflow: hidden;
        position: relative;
      }

      .${PREFIX}-message.collapsed .${PREFIX}-message-content::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2em;
        background: linear-gradient(transparent, var(--lc-bg-elevated, #2d2d2d));
        pointer-events: none;
      }

      .${PREFIX}-message.collapsed {
        opacity: 0.9;
      }

      /* Expanded state - ensure content is visible */
      .${PREFIX}-message:not(.collapsed) .${PREFIX}-message-content {
        max-height: none;
        overflow: visible;
      }

      .${PREFIX}-message:not(.collapsed) .${PREFIX}-message-content::after {
        display: none;
      }

      /* ============================================
         Toggle Button
         ============================================ */
      .${PREFIX}-message-toggle {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: auto;
        padding: 2px 8px;
        background: transparent;
        border: 1px solid var(--lc-border, rgba(255,255,255,0.15));
        border-radius: 4px;
        color: var(--lc-text-muted, #888);
        font-size: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
        text-transform: none;
        font-weight: 500;
      }

      .${PREFIX}-message-toggle:hover {
        background: var(--lc-bg-hover, #333);
        border-color: var(--lc-accent, #ffa116);
        color: var(--lc-text-primary, #fff);
      }

      .${PREFIX}-message-toggle .toggle-icon {
        font-size: 10px;
      }

      /* ============================================
         Chat Input
         ============================================ */
      .${PREFIX}-input-container {
        display: flex;
        gap: 8px;
        padding: 12px 0;
        margin-top: 8px;
        border-top: 1px solid var(--lc-border, rgba(255,255,255,0.08));
      }

      .${PREFIX}-input {
        flex: 1;
        padding: 10px 12px;
        background: var(--lc-bg-elevated, #2d2d2d);
        border: 1px solid var(--lc-border-strong, rgba(255,255,255,0.12));
        border-radius: 8px;
        color: var(--lc-text-primary, #fff);
        font-size: 13px;
        font-family: inherit;
        resize: none;
        outline: none;
        transition: border-color 0.2s ease;
      }

      .${PREFIX}-input:focus {
        border-color: var(--lc-accent, #ffa116);
      }

      .${PREFIX}-input::placeholder {
        color: var(--lc-text-disabled, #555);
      }

      .${PREFIX}-send-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 10px 16px;
        background: linear-gradient(135deg, var(--lc-accent, #ffa116) 0%, #ff8c00 100%);
        border: none;
        border-radius: 8px;
        color: #000;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .${PREFIX}-send-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 161, 22, 0.3);
      }

      .${PREFIX}-send-btn:active {
        transform: translateY(0);
      }

      .${PREFIX}-send-btn .send-icon {
        font-size: 14px;
      }

      /* ============================================
         Code Styling
         ============================================ */
      .${PREFIX}-code-block {
        background: var(--lc-bg-primary, #1a1a1a);
        padding: 12px 14px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 10px 0;
        font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', monospace;
        font-size: 12px;
        border: 1px solid var(--lc-border, rgba(255,255,255,0.08));
        white-space: pre-wrap;
        word-break: break-word;
      }

      .${PREFIX}-inline-code {
        background: var(--lc-bg-primary, #1a1a1a);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', monospace;
        font-size: 12px;
        color: var(--lc-accent, #ffa116);
      }

      /* ============================================
         Lists
         ============================================ */
      .${PREFIX}-list {
        margin: 8px 0;
        padding-left: 20px;
      }

      .${PREFIX}-list li {
        margin: 4px 0;
        line-height: 1.5;
      }

      /* ============================================
         Responsive Design
         ============================================ */
      @media (max-width: 400px) {
        .${PREFIX}-message {
          padding: 10px 12px;
        }

        .${PREFIX}-message-header {
          font-size: 10px;
        }

        .${PREFIX}-message-content {
          font-size: 12px;
        }

        .${PREFIX}-code-block {
          padding: 10px 12px;
          font-size: 11px;
        }

        .${PREFIX}-input-container {
          flex-direction: column;
        }

        .${PREFIX}-send-btn {
          justify-content: center;
        }
      }
    `;
  }

  /**
   * Inject styles into document if not already present
   * @param {Document} doc - The document to inject styles into
   */
  function injectStyles(doc = document) {
    const styleId = `${PREFIX}-styles`;
    if (doc.getElementById(styleId)) return;

    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = getStyles();
    doc.head.appendChild(style);
  }

  // Public API
  return {
    formatMarkdown,
    createMessageBubble,
    createChatInput,
    renderChatThread,
    toggleMessage,
    appendMessage,
    setupEventListeners,
    getStyles,
    injectStyles,
    PREFIX
  };
})();

// Export for both content script and module usage
if (typeof window !== 'undefined') {
  window.ChatRenderer = ChatRenderer;
}
