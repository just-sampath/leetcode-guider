/**
 * AI Provider Factory
 * 
 * SOLID: Open/Closed Principle - new providers can be added without modifying this factory
 * SOLID: Dependency Inversion - returns abstract AiProvider interface
 */

import { OpenAiProvider } from './providers/OpenAiProvider.js';
import { AnthropicProvider } from './providers/AnthropicProvider.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { CustomProvider } from './providers/CustomProvider.js';

/**
 * Provider configuration constants
 */
const PROVIDERS = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    CUSTOM: 'custom'
};

/**
 * Create an AI provider instance based on settings
 * @param {Object} settings - User settings from chrome.storage
 * @returns {AiProvider} Provider instance
 */
function createProvider(settings) {
    const { provider, apiKeys, baseUrls } = settings;

    const config = {
        apiKey: apiKeys?.[provider] || '',
        baseUrl: baseUrls?.[provider] || undefined
    };

    switch (provider) {
        case PROVIDERS.OPENAI:
            return new OpenAiProvider(config);

        case PROVIDERS.ANTHROPIC:
            return new AnthropicProvider(config);

        case PROVIDERS.GOOGLE:
            return new GeminiProvider(config);

        case PROVIDERS.CUSTOM:
            if (!config.baseUrl) {
                throw new Error('Custom provider requires a base URL');
            }
            return new CustomProvider(config);

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * Get default models for a provider
 * @param {string} providerName
 * @returns {string[]}
 */
function getDefaultModels(providerName) {
    const modelMap = {
        [PROVIDERS.OPENAI]: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
        [PROVIDERS.ANTHROPIC]: ['claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101'],
        [PROVIDERS.GOOGLE]: ['gemini-2.5-pro', 'gemini-2.5-flash'],
        [PROVIDERS.CUSTOM]: []
    };

    return modelMap[providerName] || [];
}

/**
 * Get all available providers
 * @returns {Object}
 */
function getProviders() {
    return PROVIDERS;
}

export { createProvider, getDefaultModels, getProviders, PROVIDERS };
