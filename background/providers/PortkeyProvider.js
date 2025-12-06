/**
 * Portkey Provider Implementation
 * 
 * Portkey is an AI gateway that routes requests to various LLM providers.
 * It uses special headers for authentication:
 * - x-portkey-api-key: Required Portkey API key
 * - x-portkey-virtual-key: Optional virtual key for provider routing
 * - x-portkey-config: Optional config ID for advanced routing (either/or with virtual key)
 */

import { AiProvider } from './AiProvider.js';

class PortkeyProvider extends AiProvider {
    constructor(config) {
        super(config);
        this.baseUrl = 'https://api.portkey.ai/v1';
        this.virtualKey = config.virtualKey || '';
        this.configId = config.configId || '';
    }

    getName() {
        return 'Portkey';
    }

    getDefaultModels() {
        return ['gpt-4.1'];
    }

    /**
     * Portkey passes reasoning_effort to the underlying provider
     */
    mapReasoningEffort(effort) {
        return { reasoning_effort: effort };
    }

    async callModel(options) {
        const { reasoningEffort, messages } = options;

        const requestBody = {
            messages: messages.map(m => ({
                role: m.role,
                content: m.content
            })),
            max_completion_tokens: 4096
        };

        // Add reasoning_effort for models that may support it
        const reasoningParams = this.mapReasoningEffort(reasoningEffort);
        Object.assign(requestBody, reasoningParams);

        // Build headers with Portkey authentication
        const headers = {
            'Content-Type': 'application/json',
            'x-portkey-api-key': this.apiKey
        };

        // Add virtual key OR config (mutually exclusive)
        if (this.virtualKey) {
            headers['x-portkey-virtual-key'] = this.virtualKey;
        } else if (this.configId) {
            headers['x-portkey-config'] = this.configId;
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Portkey API error: ${response.status}`);
            }

            const data = await response.json();
            const choice = data.choices?.[0];

            if (!choice) {
                throw new Error('No response from Portkey');
            }

            return {
                text: choice.message?.content || '',
                usage: data.usage
            };
        } catch (error) {
            console.error('[PortkeyProvider] Error:', error);
            throw error;
        }
    }
}

export { PortkeyProvider };
