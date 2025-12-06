/**
 * OpenAI Provider Implementation
 * 
 * Uses OpenAI Chat Completions API with reasoning_effort parameter
 * Verified from OpenAI docs: reasoning_effort accepts 'low', 'medium', 'high'
 */

import { AiProvider } from './AiProvider.js';

class OpenAiProvider extends AiProvider {
    constructor(config) {
        super(config);
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    }

    getName() {
        return 'OpenAI';
    }

    getDefaultModels() {
        return ['gpt-5.1-mini', 'gpt-5.1', 'gpt-5.1-codex-max'];
    }

    /**
     * Map reasoning effort to OpenAI's reasoning_effort parameter
     * Verified from API docs: 'low', 'medium', 'high'
     * Note: reasoning_effort is supported on reasoning models (o1 series, future models)
     */
    mapReasoningEffort(effort) {
        // OpenAI uses the same values directly
        return { reasoning_effort: effort };
    }

    async callModel(options) {
        const { model, reasoningEffort, messages } = options;

        const reasoningParams = this.mapReasoningEffort(reasoningEffort);

        // Build request body
        const requestBody = {
            model: model,
            messages: messages.map(m => ({
                role: m.role,
                content: m.content
            })),
            max_tokens: 4096
        };

        // Add reasoning_effort for models that support it
        // Non-reasoning models will ignore this parameter
        if (model.startsWith('o1') || model.includes('reasoning') || model.startsWith('gpt-5')) {
            Object.assign(requestBody, reasoningParams);
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const choice = data.choices?.[0];

            if (!choice) {
                throw new Error('No response from OpenAI');
            }

            return {
                text: choice.message?.content || '',
                usage: data.usage
            };
        } catch (error) {
            console.error('[OpenAiProvider] Error:', error);
            throw error;
        }
    }
}

export { OpenAiProvider };
