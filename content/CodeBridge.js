/**
 * Code Bridge
 * 
 * Handles communication with Monaco editor via injected page script
 * Uses postMessage for cross-context communication
 * 
 * SOLID: Single Responsibility - only handles code extraction
 */

const CodeBridge = (function () {
    const MESSAGE_SOURCE = 'leetcode-ai-coach';
    let isInitialized = false;
    let pendingCodeRequest = null;

    /**
     * Inject the page script that has access to Monaco
     */
    function injectPageScript() {
        // Check if already injected
        if (document.getElementById('leetcode-ai-coach-script')) {
            return;
        }

        const script = document.createElement('script');
        script.id = 'leetcode-ai-coach-script';
        script.src = chrome.runtime.getURL('page/injectedPageScript.js');
        script.onload = function () {
            this.remove(); // Clean up after execution
        };
        (document.head || document.documentElement).appendChild(script);
    }

    /**
     * Handle messages from the injected page script
     */
    function handleMessage(event) {
        // Only accept messages from our page script
        if (event.source !== window) return;
        if (!event.data || event.data.source !== MESSAGE_SOURCE) return;

        const { type, payload } = event.data;

        switch (type) {
            case 'CODE_UPDATE':
                handleCodeUpdate(payload);
                break;

            case 'CODE_RESPONSE':
                handleCodeResponse(payload);
                break;

            case 'LANGUAGE_UPDATE':
                handleLanguageUpdate(payload);
                break;

            case 'EDITOR_READY':
                console.log('[CodeBridge] Monaco editor detected');
                requestCode();
                break;
        }
    }

    /**
     * Handle code update from page script
     */
    function handleCodeUpdate(payload) {
        const { code, language } = payload;

        if (window.LeetCodeDomAdapter) {
            window.LeetCodeDomAdapter.updateUserCode(code);
            if (language) {
                window.LeetCodeDomAdapter.updateLanguage(language);
            }
        }

        window.EventBus.emit(window.EVENTS.CODE_UPDATED, { code, language });
    }

    /**
     * Handle code response from page script
     */
    function handleCodeResponse(payload) {
        if (pendingCodeRequest) {
            pendingCodeRequest.resolve(payload);
            pendingCodeRequest = null;
        }

        handleCodeUpdate(payload);
    }

    /**
     * Handle language update
     */
    function handleLanguageUpdate(payload) {
        if (window.LeetCodeDomAdapter) {
            window.LeetCodeDomAdapter.updateLanguage(payload.language);
        }
    }

    /**
     * Request current code from Monaco editor
     * @returns {Promise<{code: string, language: string}>}
     */
    function requestCode() {
        return new Promise((resolve, reject) => {
            // Set up pending request with timeout
            const timeout = setTimeout(() => {
                if (pendingCodeRequest) {
                    pendingCodeRequest = null;
                    reject(new Error('Code request timed out'));
                }
            }, 5000);

            pendingCodeRequest = {
                resolve: (data) => {
                    clearTimeout(timeout);
                    resolve(data);
                }
            };

            // Send request to page script
            window.postMessage({
                source: MESSAGE_SOURCE,
                type: 'REQUEST_CODE'
            }, '*');
        });
    }

    /**
     * Get current code (async)
     * @returns {Promise<string>}
     */
    async function getCurrentCode() {
        try {
            const result = await requestCode();
            return result.code || '';
        } catch (error) {
            console.error('[CodeBridge] Failed to get code:', error);
            return '';
        }
    }

    /**
     * Initialize the code bridge
     */
    function init() {
        if (isInitialized) return;

        // Listen for messages from page script
        window.addEventListener('message', handleMessage);

        // Inject the page script
        injectPageScript();

        isInitialized = true;
        console.log('[CodeBridge] Initialized');
    }

    /**
     * Cleanup
     */
    function destroy() {
        window.removeEventListener('message', handleMessage);
        isInitialized = false;
    }

    return {
        init,
        destroy,
        requestCode,
        getCurrentCode
    };
})();

// Make available globally
window.CodeBridge = CodeBridge;
