/**
 * Anthropic Provider Implementation
 * 
 * Uses Anthropic Messages API with extended thinking support
 * Verified from docs: thinking object with type:'enabled' and budget_tokens
 * 
 * Budget token mappings based on API docs:
 * - Minimum: 1024 tokens
 * - budget_tokens must be less than max_tokens
 */

import { AiProvider } from './AiProvider.js';

class AnthropicProvider extends AiProvider {
    constructor(config) {
        super(config);
        this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    }

    getName() {
        return 'Anthropic';
    }

    getDefaultModels() {
        // Current Claude 4 models as of Dec 2024
        // Using exact model IDs from Anthropic docs
        return [
            'claude-sonnet-4-5-20250929',  // Claude Sonnet 4.5
            'claude-opus-4-5-20251101'     // Claude Opus 4.5
        ];
    }

    /**
     * Map reasoning effort to Anthropic's extended thinking parameters
     * Verified from API docs:
     * - thinking.type: 'enabled'
     * - thinking.budget_tokens: integer (min 1024)
     */
    mapReasoningEffort(effort) {
        const budgetMap = {
            'low': 1024,      // Minimum thinking budget
            'medium': 5000,   // Moderate thinking
            'high': 16000     // Deep reasoning
        };

        return {
            thinking: {
                type: 'enabled',
                budget_tokens: budgetMap[effort] || budgetMap.medium
            }
        };
    }

    async callModel(options) {
        const { model, reasoningEffort, messages } = options;

        // Separate system message from user/assistant messages
        // Anthropic uses a separate 'system' parameter
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        const thinkingParams = this.mapReasoningEffort(reasoningEffort);

        // max_tokens must be greater than budget_tokens
        const maxTokens = Math.max(thinkingParams.thinking.budget_tokens + 4096, 8192);

        const requestBody = {
            model: model,
            max_tokens: maxTokens,
            messages: conversationMessages.map(m => ({
                role: m.role,
                content: m.content
            })),
            ...thinkingParams
        };

        // Add system parameter if present
        if (systemMessage) {
            requestBody.system = systemMessage.content;
        }

        try {
            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`);
            }

            const data = await response.json();

            // Parse response - may contain thinking blocks and text blocks
            let text = '';
            let thinking = '';

            if (data.content && Array.isArray(data.content)) {
                for (const block of data.content) {
                    if (block.type === 'thinking') {
                        thinking = block.thinking || '';
                    } else if (block.type === 'text') {
                        text = block.text || '';
                    }
                }
            }

            return {
                text: text,
                thinking: thinking,
                usage: data.usage
            };
        } catch (error) {
            console.error('[AnthropicProvider] Error:', error);
            throw error;
        }
    }
}

export { AnthropicProvider };
