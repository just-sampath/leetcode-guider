/**
 * Custom Provider Implementation
 * 
 * Generic OpenAI-compatible provider for custom endpoints
 * Supports any OpenAI API-compatible service (e.g., local LLMs, other providers)
 */

import { AiProvider } from './AiProvider.js';

class CustomProvider extends AiProvider {
    constructor(config) {
        super(config);
        if (!config.baseUrl) {
            throw new Error('CustomProvider requires a baseUrl');
        }
        this.baseUrl = config.baseUrl;
    }

    getName() {
        return 'Custom';
    }

    getDefaultModels() {
        // No defaults for custom - user must specify
        return [];
    }

    /**
     * For custom providers, we pass reasoning_effort 
     * OpenAI-compatible endpoints may or may not support it
     */
    mapReasoningEffort(effort) {
        return { reasoning_effort: effort };
    }

    async callModel(options) {
        const { model, reasoningEffort, messages } = options;

        const requestBody = {
            model: model,
            messages: messages.map(m => ({
                role: m.role,
                content: m.content
            })),
            max_tokens: 4096
        };

        // Optionally include reasoning_effort
        const reasoningParams = this.mapReasoningEffort(reasoningEffort);
        Object.assign(requestBody, reasoningParams);

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
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            const choice = data.choices?.[0];

            if (!choice) {
                throw new Error('No response from API');
            }

            return {
                text: choice.message?.content || '',
                usage: data.usage
            };
        } catch (error) {
            console.error('[CustomProvider] Error:', error);
            throw error;
        }
    }
}

export { CustomProvider };
