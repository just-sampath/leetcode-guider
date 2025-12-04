/**
 * Content Script - Main Entry Point
 * 
 * Initializes all content script modules and coordinates them
 * 
 * SOLID: Single Responsibility - only orchestrates initialization
 */

(function () {
    // Prevent multiple initializations
    if (window.lcAiCoachInitialized) {
        console.log('[LeetCode AI Coach] Already initialized');
        return;
    }
    window.lcAiCoachInitialized = true;

    /**
     * Initialize the extension
     */
    async function init() {
        console.log('[LeetCode AI Coach] Initializing...');

        try {
            // Initialize components in order
            // 1. Code Bridge (set up Monaco communication)
            window.CodeBridge.init();

            // 2. DOM Adapter (read problem data)
            window.LeetCodeDomAdapter.init();

            // 3. UI Panel (inject and set up UI)
            window.UiPanel.init();

            // Log success
            const context = window.LeetCodeDomAdapter.getContext();
            console.log('[LeetCode AI Coach] Ready!', {
                problem: context.title || context.urlSlug,
                difficulty: context.difficulty
            });

        } catch (error) {
            console.error('[LeetCode AI Coach] Initialization error:', error);
        }
    }

    /**
     * Wait for DOM to be ready
     */
    function waitForReady(callback) {
        if (document.readyState === 'complete') {
            callback();
        } else {
            window.addEventListener('load', callback);
        }
    }

    /**
     * Wait for LeetCode's dynamic content to load
     * LeetCode uses client-side rendering, so we need to wait a bit
     */
    function waitForLeetCodeContent(callback) {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds

        const check = () => {
            attempts++;

            // Look for signs that LeetCode content is loaded
            const hasEditor = document.querySelector('.monaco-editor');
            const hasDescription = document.querySelector('[data-track-load="description_content"]') ||
                document.querySelector('div[class*="description"]');

            if (hasEditor || hasDescription || attempts >= maxAttempts) {
                callback();
            } else {
                setTimeout(check, 100);
            }
        };

        check();
    }

    // Start initialization
    waitForReady(() => {
        waitForLeetCodeContent(() => {
            // Small delay to ensure all DOM is settled
            setTimeout(init, 500);
        });
    });
})();
