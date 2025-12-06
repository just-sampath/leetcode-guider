/**
 * Prompt Builder
 * 
 * Builds prompts for different coaching modes
 * Combines base system instructions, user persona, and problem context
 * 
 * SOLID: Single Responsibility - only builds prompts
 */

/**
 * Base system prompt for the AI coach
 */
const BASE_SYSTEM_PROMPT = `You are an AI coding coach helping a user solve LeetCode problems. Your role is to guide, not to solve.

Key principles:
- Provide hints and explanations, not complete solutions
- Don't provide even theoretical/mathematical solutions unless the user is stuck and unable to move forward
- Encourage learning and understanding
- Be supportive but also challenge the user to think
- Focus on problem-solving strategies and patterns
- Explain concepts clearly with examples when helpful

Important: Never write complete working solutions unless explicitly asked. Instead, provide:
- Conceptual guidance
- Hints about edge cases
- Questions to guide thinking
- Pattern/approach suggestions`;

/**
 * Mode-specific system instructions (added to system prompt)
 */
const MODE_INSTRUCTIONS = {
    overview: `
--- CURRENT MODE: EXPLAIN ---
The user wants you to explain this problem at a high level.

Focus on:
1. What the problem is asking (in simple terms)
2. Key insights or observations about the problem
3. Important constraints to consider

Do NOT provide a solution or detailed algorithm. Do NOT suggest approaches like DP, sliding window, etc.
Just help the user understand the problem deeply.`,

    hints_socratic: `
--- CURRENT MODE: SOCRATIC HINTS ---
The user wants hints using the Socratic method.

STRICT RULES:
- Ask guiding questions that lead to insights
- NEVER give direct answers, approaches, or solutions
- NEVER mention specific algorithms (DP, sliding window, etc.) unless user identifies them first
- Question the user to build their intuition
- If they suggest something wrong, provide counterexamples to help them realize
- One or two good questions per response

If the user responds to your questions, continue the Socratic dialogue - ask follow-up questions based on their answer.`,

    hints_progressive: `
--- CURRENT MODE: PROGRESSIVE HINTS ---
The user wants progressive hints.

Give ONE incremental hint that moves them forward without revealing too much:
- Start with the most abstract/high-level insight
- If they've already tried something, give a slightly more specific hint
- Build on previous hints in the conversation
- If they have code written, reference it to guide them

Hint should be concise - 1-3 sentences.`,

    hints_direct: `
--- CURRENT MODE: DIRECT HINTS ---
The user wants more direct hints.

You can be more direct than usual:
- Explain the general approach or pattern to use
- Point out what the user might be missing
- If they have code written, identify specific issues or improvements

Still avoid writing the complete solution.`,

    debug: `
--- CURRENT MODE: DEBUG ---
The user's code is failing. Help them debug.

Analyze:
1. What the failing test case tells us
2. Where in their logic the bug might be
3. Common mistakes for this type of problem

Do NOT fix the code for them. Guide them to find and fix the bug.`,

    review: `
--- CURRENT MODE: REVIEW ---
Review the user's solution.

Analyze:
1. Correctness - does it handle all cases?
2. Time/space complexity - is it optimal?
3. Code quality - readability, naming, structure
4. Edge cases and alternative approaches

Be constructive and specific.`
};

/**
 * Build the full prompt for an AI call
 * @param {Object} options
 * @param {string} options.mode - 'overview' | 'hints' | 'debug' | 'review' | 'followup'
 * @param {string} [options.hintStyle] - 'socratic' | 'progressive' | 'direct'
 * @param {string} [options.lastMode] - The mode of the last exchange (for follow-ups)
 * @param {string} [options.lastHintStyle] - The hint style of the last exchange (for follow-ups)
 * @param {Object} options.problemContext - Problem data from LeetCode
 * @param {string} options.userPersona - User's custom persona/instructions
 * @param {Array} [options.conversationHistory] - Previous messages
 * @param {string} [options.followUpQuestion] - The user's follow-up question
 * @returns {Array<{role: string, content: string}>}
 */
function buildPrompt(options) {
    const { mode, hintStyle, lastMode, lastHintStyle, problemContext, userPersona, conversationHistory = [], followUpQuestion } = options;

    // Determine which mode instructions to use
    // For follow-ups, use the last mode if available
    let effectiveMode = mode;
    let effectiveHintStyle = hintStyle;

    if (mode === 'followup' && lastMode) {
        effectiveMode = lastMode;
        effectiveHintStyle = lastHintStyle;
    }

    // Build system message with mode instructions
    let systemContent = BASE_SYSTEM_PROMPT;

    // Add mode-specific instructions to system prompt
    let modeInstructions;
    if (effectiveMode === 'hints' && effectiveHintStyle) {
        modeInstructions = MODE_INSTRUCTIONS[`hints_${effectiveHintStyle}`] || MODE_INSTRUCTIONS.hints_progressive;
    } else {
        modeInstructions = MODE_INSTRUCTIONS[effectiveMode] || MODE_INSTRUCTIONS.overview;
    }

    systemContent += '\n' + modeInstructions;

    // Add user persona if present
    if (userPersona && userPersona.trim()) {
        systemContent += `\n\n--- User's Custom Instructions ---\n${userPersona}`;
    }

    // Build problem context string
    const contextString = formatProblemContext(problemContext);

    // Add problem context to system message
    systemContent += `\n\n--- Problem Context ---\n${contextString}`;

    // Construct messages array
    const messages = [
        { role: 'system', content: systemContent }
    ];

    // Add conversation history (limited to last 20 messages)
    const recentHistory = conversationHistory.slice(-20);
    messages.push(...recentHistory);

    // For follow-ups, add the user's actual question as the last message
    if (mode === 'followup' && followUpQuestion) {
        messages.push({ role: 'user', content: followUpQuestion });
    } else if (mode !== 'followup') {
        // For initial requests, add a simple request message
        const requestMessages = {
            overview: 'Please explain this problem to me.',
            hints: 'I need a hint for this problem.',
            debug: 'My code is failing. Can you help me debug it?',
            review: 'Please review my solution.'
        };
        messages.push({ role: 'user', content: requestMessages[mode] || 'Help me with this problem.' });
    }

    return messages;
}

/**
 * Format problem context into a readable string
 * @param {Object} ctx
 * @returns {string}
 */
function formatProblemContext(ctx) {
    const parts = [];

    if (ctx.title) {
        parts.push(`**Problem:** ${ctx.title}`);
    }

    if (ctx.difficulty) {
        parts.push(`**Difficulty:** ${ctx.difficulty}`);
    }

    if (ctx.topics && ctx.topics.length > 0) {
        parts.push(`**Topics:** ${ctx.topics.join(', ')}`);
    }

    if (ctx.description) {
        parts.push(`\n**Description:**\n${ctx.description}`);
    }

    if (ctx.examplesText) {
        parts.push(`\n**Examples:**\n${ctx.examplesText}`);
    }

    if (ctx.constraintsText) {
        parts.push(`\n**Constraints:**\n${ctx.constraintsText}`);
    }

    if (ctx.userCode) {
        parts.push(`\n**User's Current Code (${ctx.language || 'Unknown'}):**\n\`\`\`${ctx.language || ''}\n${ctx.userCode}\n\`\`\``);
    }

    if (ctx.lastRun && ctx.lastRun.status) {
        parts.push(`\n**Last Run Result:** ${ctx.lastRun.status}`);

        if (ctx.lastRun.failingInput) {
            parts.push(`**Failing Input:** ${ctx.lastRun.failingInput}`);
        }
        if (ctx.lastRun.expectedOutput) {
            parts.push(`**Expected Output:** ${ctx.lastRun.expectedOutput}`);
        }
        if (ctx.lastRun.actualOutput) {
            parts.push(`**Actual Output:** ${ctx.lastRun.actualOutput}`);
        }
        if (ctx.lastRun.errorMessage) {
            parts.push(`**Error:** ${ctx.lastRun.errorMessage}`);
        }
    }

    return parts.join('\n');
}

export { buildPrompt, BASE_SYSTEM_PROMPT, MODE_INSTRUCTIONS };
