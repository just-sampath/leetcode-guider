/**
 * Injected Page Script
 * 
 * Runs in the page context (not content script context)
 * This allows access to Monaco editor API
 * 
 * Communicates with content script via postMessage
 */

(function () {
    const MESSAGE_SOURCE = 'leetcode-ai-coach';
    let lastCode = '';
    let checkInterval = null;

    /**
     * Send message to content script
     */
    function sendMessage(type, payload) {
        window.postMessage({
            source: MESSAGE_SOURCE,
            type: type,
            payload: payload
        }, '*');
    }

    /**
     * Get Monaco editor instance
     * @returns {Object|null}
     */
    function getMonacoEditor() {
        // Try various ways to access Monaco
        if (typeof monaco !== 'undefined') {
            const models = monaco.editor.getModels();
            if (models && models.length > 0) {
                return {
                    model: models[0],
                    editors: monaco.editor.getEditors ? monaco.editor.getEditors() : []
                };
            }
        }
        return null;
    }

    /**
     * Get current code from Monaco
     * @returns {{code: string, language: string}}
     */
    function getCurrentCode() {
        const monaco = getMonacoEditor();
        if (monaco && monaco.model) {
            return {
                code: monaco.model.getValue(),
                language: monaco.model.getLanguageId() || ''
            };
        }
        return { code: '', language: '' };
    }

    /**
     * Check for code changes
     */
    function checkForChanges() {
        const { code, language } = getCurrentCode();

        if (code && code !== lastCode) {
            lastCode = code;
            sendMessage('CODE_UPDATE', { code, language });
        }
    }

    /**
     * Handle messages from content script
     */
    function handleMessage(event) {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== MESSAGE_SOURCE) return;

        const { type } = event.data;

        switch (type) {
            case 'REQUEST_CODE':
                const { code, language } = getCurrentCode();
                sendMessage('CODE_RESPONSE', { code, language });
                break;
        }
    }

    /**
     * Wait for Monaco to be available
     */
    function waitForMonaco() {
        return new Promise((resolve) => {
            // Check if Monaco is already loaded
            if (typeof monaco !== 'undefined' && monaco.editor.getModels().length > 0) {
                resolve();
                return;
            }

            // Poll for Monaco
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds

            const checkMonaco = setInterval(() => {
                attempts++;

                if (typeof monaco !== 'undefined' && monaco.editor.getModels().length > 0) {
                    clearInterval(checkMonaco);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkMonaco);
                    console.warn('[LeetCode AI Coach] Monaco editor not found after 10 seconds');
                    resolve(); // Still resolve to continue initialization
                }
            }, 100);
        });
    }

    /**
     * Initialize
     */
    async function init() {
        // Listen for messages from content script
        window.addEventListener('message', handleMessage);

        // Wait for Monaco to be available
        await waitForMonaco();

        // Notify content script that editor is ready
        sendMessage('EDITOR_READY', {});

        // Get initial code
        const { code, language } = getCurrentCode();
        if (code) {
            lastCode = code;
            sendMessage('CODE_UPDATE', { code, language });
        }

        // Set up periodic check for code changes (as backup to model events)
        checkInterval = setInterval(checkForChanges, 2000);

        // Try to hook into Monaco's change events for more responsive updates
        try {
            const monaco = getMonacoEditor();
            if (monaco && monaco.model) {
                monaco.model.onDidChangeContent(() => {
                    checkForChanges();
                });
            }
        } catch (e) {
            // Fallback to polling only
            console.log('[LeetCode AI Coach] Using polling for code changes');
        }

        console.log('[LeetCode AI Coach] Page script initialized');
    }

    // Start initialization
    init();
})();
