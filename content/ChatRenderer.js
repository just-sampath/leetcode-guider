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
   * Convert LaTeX math notation to readable HTML
   * Handles common math symbols and expressions
   * @param {string} latex - The LaTeX expression
   * @returns {string} HTML formatted math
   */
  function convertLatexToHtml(latex) {
    if (!latex) return '';

    let html = latex;

    // Common LaTeX commands to symbols/HTML
    const latexMap = {
      // Comparisons
      '\\le': '≤',
      '\\leq': '≤',
      '\\ge': '≥',
      '\\geq': '≥',
      '\\neq': '≠',
      '\\ne': '≠',
      '\\lt': '<',
      '\\gt': '>',
      '\\approx': '≈',
      '\\equiv': '≡',

      // Greek letters
      '\\alpha': 'α',
      '\\beta': 'β',
      '\\gamma': 'γ',
      '\\delta': 'δ',
      '\\epsilon': 'ε',
      '\\theta': 'θ',
      '\\lambda': 'λ',
      '\\mu': 'μ',
      '\\pi': 'π',
      '\\sigma': 'σ',
      '\\phi': 'φ',
      '\\omega': 'ω',
      '\\Sigma': 'Σ',
      '\\Pi': 'Π',
      '\\Omega': 'Ω',
      '\\Delta': 'Δ',

      // Operators & symbols
      '\\times': '×',
      '\\div': '÷',
      '\\cdot': '·',
      '\\pm': '±',
      '\\mp': '∓',
      '\\infty': '∞',
      '\\sum': 'Σ',
      '\\prod': 'Π',
      '\\sqrt': '√',
      '\\partial': '∂',
      '\\nabla': '∇',

      // Sets
      '\\in': '∈',
      '\\notin': '∉',
      '\\subset': '⊂',
      '\\subseteq': '⊆',
      '\\supset': '⊃',
      '\\supseteq': '⊇',
      '\\cup': '∪',
      '\\cap': '∩',
      '\\emptyset': '∅',
      '\\forall': '∀',
      '\\exists': '∃',

      // Arrows
      '\\rightarrow': '→',
      '\\leftarrow': '←',
      '\\Rightarrow': '⇒',
      '\\Leftarrow': '⇐',
      '\\leftrightarrow': '↔',
      '\\Leftrightarrow': '⇔',
      '\\to': '→',

      // Logic
      '\\land': '∧',
      '\\lor': '∨',
      '\\neg': '¬',
      '\\lnot': '¬',

      // Other
      '\\ldots': '…',
      '\\cdots': '⋯',
      '\\vdots': '⋮',
      '\\ddots': '⋱',
      '\\quad': '  ',
      '\\qquad': '    ',
      '\\,': ' ',
      '\\;': ' ',
      '\\ ': ' ',
      '\\!': '',
    };

    // Replace LaTeX commands with symbols
    for (const [cmd, symbol] of Object.entries(latexMap)) {
      // Escape special regex characters in the command
      const escaped = cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(escaped, 'g'), symbol);
    }

    // Handle superscripts: x^2 or x^{abc}
    html = html.replace(/\^{([^}]+)}/g, '<sup>$1</sup>');
    html = html.replace(/\^(\w)/g, '<sup>$1</sup>');

    // Handle subscripts: x_i or x_{abc}
    html = html.replace(/_{([^}]+)}/g, '<sub>$1</sub>');
    html = html.replace(/_(\w)/g, '<sub>$1</sub>');

    // Handle fractions: \frac{a}{b}
    html = html.replace(/\\frac{([^}]+)}{([^}]+)}/g, '<span class="math-frac"><span class="math-num">$1</span>/<span class="math-den">$2</span></span>');

    // Handle \text{} command - just extract the text
    html = html.replace(/\\text{([^}]+)}/g, '$1');

    // Handle \mathbf{}, \mathrm{}, \mathit{} etc
    html = html.replace(/\\math\w+{([^}]+)}/g, '$1');

    // Handle \left and \right (just remove them)
    html = html.replace(/\\left/g, '');
    html = html.replace(/\\right/g, '');

    // Handle braces
    html = html.replace(/\\{/g, '{');
    html = html.replace(/\\}/g, '}');
    html = html.replace(/\\[[\]]/g, match => match[1]);

    // Clean up remaining backslashes from unknown commands
    html = html.replace(/\\([a-zA-Z]+)/g, '$1');

    return html;
  }

  /**
   * Enhanced markdown formatting with better list, code and math support
   * @param {string} text - Raw text to format
   * @returns {string} HTML formatted text
   */
  function formatMarkdown(text) {
    if (!text) return '';

    // Store code blocks and math expressions to protect them
    const codeBlocks = [];
    const mathBlocks = [];

    // Extract and protect code blocks first
    let html = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push({ lang, code: code.trim() });
      return placeholder;
    });

    // Extract and protect display math \[...\] or $$...$$
    html = html.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
      const placeholder = `__DISPLAY_MATH_${mathBlocks.length}__`;
      mathBlocks.push({ type: 'display', content: math.trim() });
      return placeholder;
    });
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      const placeholder = `__DISPLAY_MATH_${mathBlocks.length}__`;
      mathBlocks.push({ type: 'display', content: math.trim() });
      return placeholder;
    });

    // Extract and protect inline math \(...\) or $...$
    html = html.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
      const placeholder = `__INLINE_MATH_${mathBlocks.length}__`;
      mathBlocks.push({ type: 'inline', content: math.trim() });
      return placeholder;
    });
    html = html.replace(/\$([^$\n]+)\$/g, (match, math) => {
      const placeholder = `__INLINE_MATH_${mathBlocks.length}__`;
      mathBlocks.push({ type: 'inline', content: math.trim() });
      return placeholder;
    });

    // Escape HTML
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

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

    // Blockquotes - handle before lists
    // First, handle multi-line blockquotes by joining consecutive > lines
    html = html.replace(/^&gt; (.+)$/gm, `<blockquote class="${PREFIX}-blockquote">$1</blockquote>`);
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote class="[^"]+">|<\/blockquote><br><blockquote class="[^"]+">/g, '<br>');

    // Numbered lists - match lines starting with number followed by period
    html = html.replace(/^(\d+)\. (.+)$/gm, `<li class="${PREFIX}-numbered-item">$2</li>`);

    // Bullet lists - match lines starting with - or * (but not inside other elements)
    html = html.replace(/^[\-\*] (.+)$/gm, `<li class="${PREFIX}-bullet-item">$1</li>`);

    // Process list wrapping BEFORE converting line breaks
    // Split into lines and process
    const lines = html.split('\n');
    let result = [];
    let inOrderedList = false;
    let inUnorderedList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isNumberedItem = line.includes(`class="${PREFIX}-numbered-item"`);
      const isBulletItem = line.includes(`class="${PREFIX}-bullet-item"`);

      if (isNumberedItem) {
        if (!inOrderedList) {
          result.push(`<ol class="${PREFIX}-list">`);
          inOrderedList = true;
        }
        if (inUnorderedList) {
          result.push('</ul>');
          inUnorderedList = false;
        }
        result.push(line);
      } else if (isBulletItem) {
        if (!inUnorderedList) {
          result.push(`<ul class="${PREFIX}-list">`);
          inUnorderedList = true;
        }
        if (inOrderedList) {
          result.push('</ol>');
          inOrderedList = false;
        }
        result.push(line);
      } else {
        if (inOrderedList) {
          result.push('</ol>');
          inOrderedList = false;
        }
        if (inUnorderedList) {
          result.push('</ul>');
          inUnorderedList = false;
        }
        result.push(line);
      }
    }

    // Close any open lists at the end
    if (inOrderedList) result.push('</ol>');
    if (inUnorderedList) result.push('</ul>');

    html = result.join('\n');

    // Paragraphs
    html = html.replace(/\n\n+/g, '</p><p>');

    // Single line breaks
    html = html.replace(/\n/g, '<br>');

    // Clean up extra <br> around block elements
    html = html.replace(/<br>(<ol|<ul|<\/ol|<\/ul|<blockquote|<\/blockquote|<h[234]|<\/h[234]|<div|<\/div|<pre|<\/pre)/g, '$1');
    html = html.replace(/(<\/ol>|<\/ul>|<blockquote[^>]*>|<\/blockquote>|<h[234]>|<\/h[234]>|<div[^>]*>|<\/div>|<pre[^>]*>|<\/pre>)<br>/g, '$1');

    // Clean up multiple consecutive <br> tags
    html = html.replace(/(<br>){2,}/g, '<br>');

    // Wrap in paragraph
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(\s*<br>\s*)*<\/p>/g, '');

    // Clean up <br> at start/end of paragraphs
    html = html.replace(/<p><br>/g, '<p>');
    html = html.replace(/<br><\/p>/g, '</p>');

    // Clean up paragraphs around block elements
    html = html.replace(/<p>(<ol|<ul|<blockquote|<h[234]|<div|<pre)/g, '$1');
    html = html.replace(/(<\/ol>|<\/ul>|<\/blockquote>|<\/h[234]>|<\/div>|<\/pre>)<\/p>/g, '$1');

    // Clean up <br> immediately before/after block elements
    html = html.replace(/<br>(<blockquote|<ol|<ul|<h[234]|<div|<pre)/g, '$1');
    html = html.replace(/(<\/blockquote>|<\/ol>|<\/ul>|<\/h[234]>|<\/div>|<\/pre>)<br>/g, '$1');

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
      html = html.replace(
        `__CODE_BLOCK_${i}__`,
        `<pre class="${PREFIX}-code-block"><code class="language-${block.lang}">${block.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
      );
    });

    // Restore math blocks with conversion
    mathBlocks.forEach((block, i) => {
      const convertedMath = convertLatexToHtml(block.content);
      if (block.type === 'display') {
        html = html.replace(
          `__DISPLAY_MATH_${i}__`,
          `<div class="${PREFIX}-math-display">${convertedMath}</div>`
        );
      } else {
        html = html.replace(
          `__INLINE_MATH_${i}__`,
          `<span class="${PREFIX}-math-inline">${convertedMath}</span>`
        );
      }
    });

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
        margin: 16px 0 8px 0;
        font-weight: 600;
      }
      
      .${PREFIX}-message-content h2:first-child,
      .${PREFIX}-message-content h3:first-child,
      .${PREFIX}-message-content h4:first-child {
        margin-top: 0;
      }

      .${PREFIX}-message-content h2 { font-size: 15px; }
      .${PREFIX}-message-content h3 { font-size: 14px; }
      .${PREFIX}-message-content h4 { font-size: 13px; }

      .${PREFIX}-message-content p {
        margin: 0 0 12px 0;
        padding-left: 0;
        text-indent: 0;
      }

      .${PREFIX}-message-content p:last-child {
        margin-bottom: 0;
      }
      
      .${PREFIX}-message-content > *:first-child {
        margin-top: 0;
      }
      
      .${PREFIX}-message-content > *:last-child {
        margin-bottom: 0;
      }
      
      /* Reset generic elements to prevent leaks */
      .${PREFIX}-message-content div,
      .${PREFIX}-message-content span,
      .${PREFIX}-message-content applet,
      .${PREFIX}-message-content object,
      .${PREFIX}-message-content iframe,
      .${PREFIX}-message-content h1,
      .${PREFIX}-message-content h2,
      .${PREFIX}-message-content h3,
      .${PREFIX}-message-content h4,
      .${PREFIX}-message-content h5,
      .${PREFIX}-message-content h6,
      .${PREFIX}-message-content p,
      .${PREFIX}-message-content blockquote,
      .${PREFIX}-message-content pre,
      .${PREFIX}-message-content a,
      .${PREFIX}-message-content abbr,
      .${PREFIX}-message-content acronym,
      .${PREFIX}-message-content address,
      .${PREFIX}-message-content big,
      .${PREFIX}-message-content cite,
      .${PREFIX}-message-content code,
      .${PREFIX}-message-content del,
      .${PREFIX}-message-content dfn,
      .${PREFIX}-message-content em,
      .${PREFIX}-message-content img,
      .${PREFIX}-message-content ins,
      .${PREFIX}-message-content kbd,
      .${PREFIX}-message-content q,
      .${PREFIX}-message-content s,
      .${PREFIX}-message-content samp,
      .${PREFIX}-message-content small,
      .${PREFIX}-message-content strike,
      .${PREFIX}-message-content strong,
      .${PREFIX}-message-content sub,
      .${PREFIX}-message-content sup,
      .${PREFIX}-message-content tt,
      .${PREFIX}-message-content var,
      .${PREFIX}-message-content b,
      .${PREFIX}-message-content u,
      .${PREFIX}-message-content i,
      .${PREFIX}-message-content center,
      .${PREFIX}-message-content dl,
      .${PREFIX}-message-content dt,
      .${PREFIX}-message-content dd,
      .${PREFIX}-message-content ol,
      .${PREFIX}-message-content ul,
      .${PREFIX}-message-content li,
      .${PREFIX}-message-content fieldset,
      .${PREFIX}-message-content form,
      .${PREFIX}-message-content label,
      .${PREFIX}-message-content legend,
      .${PREFIX}-message-content table,
      .${PREFIX}-message-content caption,
      .${PREFIX}-message-content tbody,
      .${PREFIX}-message-content tfoot,
      .${PREFIX}-message-content thead,
      .${PREFIX}-message-content tr,
      .${PREFIX}-message-content th,
      .${PREFIX}-message-content td,
      .${PREFIX}-message-content article,
      .${PREFIX}-message-content aside,
      .${PREFIX}-message-content canvas,
      .${PREFIX}-message-content details,
      .${PREFIX}-message-content embed,
      .${PREFIX}-message-content figure,
      .${PREFIX}-message-content figcaption,
      .${PREFIX}-message-content footer,
      .${PREFIX}-message-content header,
      .${PREFIX}-message-content hgroup,
      .${PREFIX}-message-content menu,
      .${PREFIX}-message-content nav,
      .${PREFIX}-message-content output,
      .${PREFIX}-message-content ruby,
      .${PREFIX}-message-content section,
      .${PREFIX}-message-content summary,
      .${PREFIX}-message-content time,
      .${PREFIX}-message-content mark,
      .${PREFIX}-message-content audio,
      .${PREFIX}-message-content video {
        padding: 0;
        border: 0;
        font: inherit;
        vertical-align: baseline;
      }
      
      /* Re-apply specific styles needed */
      .${PREFIX}-message-content p {
         margin-bottom: 12px;
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
        margin: 12px 0;
        padding-left: 24px;
      }

      .${PREFIX}-list li {
        margin: 6px 0;
        line-height: 1.5;
      }
      
      .${PREFIX}-list li:first-child {
        margin-top: 0;
      }
      
      .${PREFIX}-list li:last-child {
        margin-bottom: 0;
      }

      /* ============================================
         Blockquotes
         ============================================ */
      .${PREFIX}-blockquote {
        margin: 12px 0;
        padding: 12px 16px;
        border-left: 4px solid var(--lc-accent, #ffa116);
        background: rgba(255, 161, 22, 0.08);
        border-radius: 0 8px 8px 0;
        font-style: italic;
        color: var(--lc-text-secondary, #b3b3b3);
      }

      .${PREFIX}-blockquote p {
        margin: 0;
      }
      
      .${PREFIX}-blockquote:first-child {
        margin-top: 0;
      }
      
      .${PREFIX}-blockquote:last-child {
        margin-bottom: 0;
      }

      /* ============================================
         Math Styling
         ============================================ */
      .${PREFIX}-math-inline {
        font-family: 'Times New Roman', 'Cambria Math', Georgia, serif;
        font-style: italic;
        color: var(--lc-text-primary, #fff);
        padding: 0 2px;
        font-size: 1em;
      }

      .${PREFIX}-math-display {
        font-family: 'Times New Roman', 'Cambria Math', Georgia, serif;
        font-style: italic;
        color: var(--lc-text-primary, #fff);
        display: block;
        text-align: center;
        padding: 12px 16px;
        margin: 12px 0;
        background: var(--lc-bg-primary, #1a1a1a);
        border-radius: 8px;
        border: 1px solid var(--lc-border, rgba(255,255,255,0.08));
        font-size: 1.1em;
      }

      .${PREFIX}-math-inline sup,
      .${PREFIX}-math-display sup,
      .${PREFIX}-math-inline sub,
      .${PREFIX}-math-display sub {
        font-size: 0.75em;
      }

      .math-frac {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
      }

      .math-num,
      .math-den {
        padding: 0 2px;
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
