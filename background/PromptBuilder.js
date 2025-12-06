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
- Don't provide even theoratical/mathemetical solutions unless the user is stuck and unable to move forward
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
 * Mode-specific prompt templates
 */
const MODE_PROMPTS = {
    overview: `Explain this LeetCode problem at a high level.

Focus on:
1. What the problem is asking (in simple terms)
2. Key insights or observations about the problem
3. Important constraints to consider

The user uses this mode when they found the given explanation inadequate, so please Do NOT provide a solution or detailed algorithm. Just help the user understand the problem deeply.`,

    hints_socratic: `The user needs a hint for this problem. Use the Socratic method:

- Ask guiding questions that lead to insights
- Don't give direct answers
- Help them discover the solution approach themselves
- One or two good questions per response

Current focus: Help them think about the problem differently.`,

    hints_progressive: `Provide a progressive hint for this problem.

Give ONE incremental hint that moves them forward without revealing too much:
- Start with the most abstract/high-level insight
- If they've already tried something, give a slightly more specific hint
- Build on previous hints in the conversation

Hint should be concise - 1-3 sentences.`,

    hints_direct: `Provide a clearer explanation for this problem.

You can be more direct than usual:
- Explain the general approach or pattern to use
- Point out what the user might be missing
- Give a partial pseudocode outline if helpful

Still avoid writing the complete solution. Leave important details for them to figure out.`,

    debug: `The user's code is failing a test case. Help them debug.

Analyze:
1. What the failing test case tells us
2. Where in their logic the bug might be
3. Common mistakes for this type of problem

Provide:
- Specific questions about their logic
- Areas to check or trace through
- Suggestions for debugging approach

Do NOT fix the code for them. Guide them to find and fix the bug themselves.`,

    review: `Review the user's solution for this problem.

Analyze and comment on:
1. Correctness - does it handle all cases?
2. Time complexity - is it optimal?
3. Space complexity - can it be improved?
4. Code quality - readability, naming, structure
5. Edge cases - are they all handled?
6. Alternative approaches - are there other valid solutions?

Be constructive and specific with feedback.`
};

/**
 * Build the full prompt for an AI call
 * @param {Object} options
 * @param {string} options.mode - 'overview' | 'hints' | 'debug' | 'review'
 * @param {string} [options.hintStyle] - 'socratic' | 'progressive' | 'direct'
 * @param {Object} options.problemContext - Problem data from LeetCode
 * @param {string} options.userPersona - User's custom persona/instructions
 * @param {Array} [options.conversationHistory] - Previous messages
 * @returns {Array<{role: string, content: string}>}
 */
function buildPrompt(options) {
    const { mode, hintStyle, problemContext, userPersona, conversationHistory = [] } = options;

    // Build system message
    let systemContent = BASE_SYSTEM_PROMPT;

    // Add user persona if present
    if (userPersona && userPersona.trim()) {
        systemContent += `\n\n--- User's Custom Instructions ---\n${userPersona}`;
    }

    // Get mode-specific prompt
    let modePrompt;
    if (mode === 'hints' && hintStyle) {
        modePrompt = MODE_PROMPTS[`hints_${hintStyle}`] || MODE_PROMPTS.hints_progressive;
    } else {
        modePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.overview;
    }

    // Build problem context string
    const contextString = formatProblemContext(problemContext);

    // Build user message
    const userContent = `${modePrompt}

--- Problem Context ---
${contextString}`;

    // Construct messages array
    const messages = [
        { role: 'system', content: systemContent }
    ];

    // Add conversation history (limited to last 10 exchanges)
    const recentHistory = conversationHistory.slice(-20);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({ role: 'user', content: userContent });

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

export { buildPrompt, BASE_SYSTEM_PROMPT, MODE_PROMPTS };
