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
import { PortkeyProvider } from './providers/PortkeyProvider.js';

/**
 * Provider configuration constants
 */
const PROVIDERS = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    CUSTOM: 'custom',
    PORTKEY: 'portkey'
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

        case PROVIDERS.PORTKEY:
            return new PortkeyProvider({
                ...config,
                virtualKey: settings.virtualKeys?.portkey || '',
                configId: settings.portkeyConfigs?.portkey || ''
            });

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

export { createProvider };
