/**
 * LeetCode DOM Adapter
 * 
 * Reads problem data from LeetCode page DOM
 * Uses flexible selectors due to LeetCode's dynamic class names
 * 
 * SOLID: Single Responsibility - only reads DOM data
 * 
 * NOTE: Selectors are based on live inspection (Dec 2024).
 * LeetCode may change their DOM structure - selectors may need updates.
 */

const LeetCodeDomAdapter = (function () {
    /**
     * Problem context object - maintains current state
     */
    let problemContext = {
        title: '',
        difficulty: '',
        topics: [],
        urlSlug: '',
        description: '',
        examplesText: '',
        constraintsText: '',
        userCode: '',
        language: '',
        lastRun: {
            status: '',
            failingInput: '',
            expectedOutput: '',
            actualOutput: '',
            errorMessage: ''
        },
        customTestInput: ''
    };

    let resultObserver = null;

    /**
     * Extract problem slug from URL
     * @returns {string}
     */
    function extractSlugFromUrl() {
        // URL format: https://leetcode.com/problems/{slug}/...
        const match = window.location.pathname.match(/\/problems\/([^/]+)/);
        return match ? match[1] : '';
    }

    /**
     * Find element using multiple selector strategies
     * @param {string[]} selectors - Array of CSS selectors to try
     * @returns {Element|null}
     */
    function findElement(selectors) {
        for (const selector of selectors) {
            try {
                const el = document.querySelector(selector);
                if (el) return el;
            } catch (e) {
                // Invalid selector, skip
            }
        }
        return null;
    }

    /**
     * Find all elements using multiple selector strategies
     * @param {string[]} selectors
     * @returns {Element[]}
     */
    function findElements(selectors) {
        for (const selector of selectors) {
            try {
                const els = document.querySelectorAll(selector);
                if (els.length > 0) return Array.from(els);
            } catch (e) {
                // Invalid selector, skip
            }
        }
        return [];
    }

    /**
     * Extract problem title
     * TODO: Verify selector against current LeetCode DOM
     */
    function extractTitle() {
        const selectors = [
            // Link to problem in header area
            'a[href*="/problems/"][class*="text-title"]',
            // Title text in description area
            'div[class*="text-title-large"]',
            // Fallback: first heading in problem area
            '[data-track-load="description_content"] h1',
            'div[class*="description"] h1',
            // Generic approach - look for problem name link
            `a[href="/problems/${extractSlugFromUrl()}/"]`
        ];

        const titleEl = findElement(selectors);
        return titleEl ? titleEl.textContent.trim() : '';
    }

    /**
     * Extract problem difficulty
     * TODO: Verify selector against current LeetCode DOM
     */
    function extractDifficulty() {
        const selectors = [
            'div[class*="text-difficulty-easy"]',
            'div[class*="text-difficulty-medium"]',
            'div[class*="text-difficulty-hard"]',
            // Alternative: look for text containing Easy/Medium/Hard
            'div[class*="text-olive"]',  // Easy is often green/olive
            'div[class*="text-yellow"]', // Medium is often yellow
            'div[class*="text-pink"]'    // Hard is often red/pink
        ];

        const diffEl = findElement(selectors);
        if (diffEl) {
            const text = diffEl.textContent.trim().toLowerCase();
            if (text.includes('easy')) return 'Easy';
            if (text.includes('medium')) return 'Medium';
            if (text.includes('hard')) return 'Hard';
            return diffEl.textContent.trim();
        }
        return '';
    }

    /**
     * Extract topic tags
     * TODO: Verify selector against current LeetCode DOM
     */
    function extractTopics() {
        const topics = [];

        // Look for topics section
        const topicSelectors = [
            // Topic links/tags
            'a[href*="/tag/"]',
            'div[class*="topic-tag"]',
            // Topics section container
            '[class*="mt-"] a[class*="rounded"]'
        ];

        const topicEls = findElements(topicSelectors);
        topicEls.forEach(el => {
            const text = el.textContent.trim();
            // Filter out non-topic elements
            if (text && text.length < 50 && !text.includes('\n')) {
                topics.push(text);
            }
        });

        return [...new Set(topics)]; // Remove duplicates
    }

    /**
     * Extract problem description
     * TODO: Verify selector against current LeetCode DOM
     */
    function extractDescription() {
        const selectors = [
            '[data-track-load="description_content"]',
            'div[class*="description"][class*="content"]',
            'div[class*="_description_"]',
            // Scrollable description area
            'div[class*="elfjS"]'
        ];

        const descEl = findElement(selectors);
        if (!descEl) return '';

        // Get text content, preserving some structure
        let text = '';
        const walker = document.createTreeWalker(
            descEl,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeName === 'BR' || node.nodeName === 'P' || node.nodeName === 'DIV') {
                text += '\n';
            }
        }

        return text.trim();
    }

    /**
     * Extract examples text
     */
    function extractExamples() {
        const description = extractDescription();

        // Try to extract Example sections
        const exampleMatch = description.match(/Example\s*\d*:[\s\S]*?(?=Example\s*\d*:|Constraints:|$)/gi);
        if (exampleMatch) {
            return exampleMatch.join('\n\n');
        }

        return '';
    }

    /**
     * Extract constraints text
     */
    function extractConstraints() {
        const description = extractDescription();

        // Try to extract Constraints section
        const constraintMatch = description.match(/Constraints:[\s\S]*$/i);
        if (constraintMatch) {
            return constraintMatch[0];
        }

        return '';
    }

    /**
     * Extract current language from editor
     * TODO: Verify selector against current LeetCode DOM
     */
    function extractLanguage() {
        const selectors = [
            'button[class*="language-selector"]',
            'div[class*="lang-select"] button',
            '[data-cy="lang-select"]',
            // Look for common language names in buttons
            'button:has(span[class*="text"])'
        ];

        const langEl = findElement(selectors);
        if (langEl) {
            const text = langEl.textContent.trim();
            // Common language mappings
            const langMap = {
                'c++': 'cpp',
                'python3': 'python',
                'python': 'python',
                'java': 'java',
                'javascript': 'javascript',
                'typescript': 'typescript',
                'c': 'c',
                'go': 'go',
                'rust': 'rust'
            };
            const lower = text.toLowerCase();
            return langMap[lower] || lower;
        }
        return '';
    }

    /**
     * Parse run/submit result from DOM
     * TODO: Verify selector against current LeetCode DOM
     */
    function parseRunResult() {
        const result = {
            status: '',
            failingInput: '',
            expectedOutput: '',
            actualOutput: '',
            errorMessage: ''
        };

        // Status selectors
        const statusSelectors = [
            '[data-e2e-locator="console-result"]',
            'div[class*="result-container"] span[class*="text"]',
            'span[class*="text-green"]',   // Accepted
            'span[class*="text-red"]',     // Wrong Answer
            'div[class*="text-red-"]'      // Error
        ];

        const statusEl = findElement(statusSelectors);
        if (statusEl) {
            result.status = statusEl.textContent.trim();
        }

        // Look for labeled sections
        const allText = document.body.innerText;

        // Extract failing input
        const inputMatch = allText.match(/Input[:\s]*([^\n]+)/i);
        if (inputMatch) result.failingInput = inputMatch[1].trim();

        // Extract expected output
        const expectedMatch = allText.match(/Expected[:\s]*([^\n]+)/i);
        if (expectedMatch) result.expectedOutput = expectedMatch[1].trim();

        // Extract actual output
        const outputMatch = allText.match(/Output[:\s]*([^\n]+)/i);
        if (outputMatch) result.actualOutput = outputMatch[1].trim();

        // Extract error message
        const errorSelectors = [
            'div[class*="error"]',
            'pre[class*="error"]',
            'span[class*="compile-error"]'
        ];

        const errorEl = findElement(errorSelectors);
        if (errorEl) {
            result.errorMessage = errorEl.textContent.trim().substring(0, 500);
        }

        return result;
    }

    /**
     * Refresh all problem context
     */
    function refresh() {
        problemContext = {
            title: extractTitle(),
            difficulty: extractDifficulty(),
            topics: extractTopics(),
            urlSlug: extractSlugFromUrl(),
            description: extractDescription(),
            examplesText: extractExamples(),
            constraintsText: extractConstraints(),
            userCode: problemContext.userCode, // Preserve code (updated via CodeBridge)
            language: extractLanguage(),
            lastRun: parseRunResult(),
            customTestInput: ''
        };

        window.EventBus.emit(window.EVENTS.PROBLEM_CONTEXT_UPDATED, problemContext);
        return problemContext;
    }

    /**
     * Update user code (called by CodeBridge)
     * @param {string} code
     */
    function updateUserCode(code) {
        problemContext.userCode = code;
    }

    /**
     * Update language
     * @param {string} language
     */
    function updateLanguage(language) {
        problemContext.language = language;
    }

    /**
     * Set up MutationObserver to watch for run results
     */
    function setupResultObserver() {
        if (resultObserver) {
            resultObserver.disconnect();
        }

        // Find the result panel area
        const resultPanel = document.querySelector('[class*="result"]') ||
            document.querySelector('[data-e2e-locator="console-result"]')?.parentElement ||
            document.body;

        resultObserver = new MutationObserver((mutations) => {
            // Debounce updates
            clearTimeout(window._resultUpdateTimeout);
            window._resultUpdateTimeout = setTimeout(() => {
                const newResult = parseRunResult();
                if (newResult.status && newResult.status !== problemContext.lastRun.status) {
                    problemContext.lastRun = newResult;
                    window.EventBus.emit(window.EVENTS.RUN_RESULT_UPDATED, newResult);
                }
            }, 500);
        });

        resultObserver.observe(resultPanel, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    /**
     * Get current problem context
     * @returns {Object}
     */
    function getContext() {
        return { ...problemContext };
    }

    /**
     * Initialize the adapter
     */
    function init() {
        // Initial refresh
        refresh();

        // Set up result observer
        setupResultObserver();

        console.log('[LeetCodeDomAdapter] Initialized for:', problemContext.title || problemContext.urlSlug);
    }

    return {
        init,
        refresh,
        getContext,
        updateUserCode,
        updateLanguage,
        extractSlugFromUrl
    };
})();

// Make available globally
window.LeetCodeDomAdapter = LeetCodeDomAdapter;
