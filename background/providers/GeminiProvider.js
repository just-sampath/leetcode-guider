/**
 * Google Gemini Provider Implementation
 * 
 * Uses Google AI Gemini API with thinkingConfig support
 * Verified from docs:
 * - generationConfig.thinkingConfig.thinkingLevel: 'LOW' | 'HIGH'
 * - generationConfig.thinkingConfig.thinkingBudget: integer
 * Note: thinkingConfig recommended for Gemini 3+ models
 */

import { AiProvider } from './AiProvider.js';

class GeminiProvider extends AiProvider {
    constructor(config) {
        super(config);
        this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    }

    getName() {
        return 'Google';
    }

    getDefaultModels() {
        return [
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-3-pro-preview'
        ];
    }

    /**
     * Map reasoning effort to Gemini's thinkingConfig
     * 
     * IMPORTANT: Gemini 2.5 models use thinkingBudget ONLY (not thinkingLevel)
     * - thinkingBudget: 0 = disabled, -1 = dynamic, or explicit token count
     * - Range: 128 to 32768 for Gemini 2.5 Pro
     * - Gemini 3+ models use thinkingLevel: 'LOW' | 'HIGH'
     * 
     * For compatibility, we use thinkingBudget which works with 2.5 models
     */
    mapReasoningEffort(effort, model = '') {
        // For Gemini 2.5 models, use thinkingBudget only
        const is25Model = model.includes('2.5') || model.includes('gemini-2');

        if (is25Model) {
            // thinkingBudget only for 2.5 models
            const budgetMap = {
                'low': { thinkingBudget: 1024 },      // Minimal thinking
                'medium': { thinkingBudget: 8192 },   // Moderate thinking
                'high': { thinkingBudget: 24576 }     // Deep thinking
            };
            return { thinkingConfig: budgetMap[effort] || budgetMap.medium };
        } else {
            // For Gemini 3+ models, use thinkingLevel
            const levelMap = {
                'low': { thinkingLevel: 'LOW' },
                'medium': { thinkingLevel: 'HIGH' },
                'high': { thinkingLevel: 'HIGH' }
            };
            return { thinkingConfig: levelMap[effort] || levelMap.medium };
        }
    }

    async callModel(options) {
        const { model, reasoningEffort, messages } = options;

        // Convert messages to Gemini format
        // Gemini uses 'parts' array and 'model'/'user' roles
        const systemInstruction = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        const contents = conversationMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const thinkingConfig = this.mapReasoningEffort(reasoningEffort, model);

        const requestBody = {
            contents: contents,
            generationConfig: {
                maxOutputTokens: 8192,
                ...thinkingConfig
            }
        };

        // Add system instruction if present
        if (systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: systemInstruction.content }]
            };
        }

        try {
            // Gemini API uses model in URL path with API key as query param
            const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
            }

            const data = await response.json();

            // Parse Gemini response format
            const candidate = data.candidates?.[0];
            if (!candidate) {
                throw new Error('No response from Gemini');
            }

            // Extract text from parts
            let text = '';
            let thinking = '';

            if (candidate.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.thought) {
                        // Thinking content (if model returns it)
                        thinking = part.text || part.thought || '';
                    } else if (part.text) {
                        text += part.text;
                    }
                }
            }

            return {
                text: text,
                thinking: thinking,
                usage: data.usageMetadata
            };
        } catch (error) {
            console.error('[GeminiProvider] Error:', error);
            throw error;
        }
    }
}

export { GeminiProvider };
