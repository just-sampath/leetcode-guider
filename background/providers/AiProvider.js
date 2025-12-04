/**
 * AiProvider - Base interface for all AI providers
 * 
 * SOLID: Interface Segregation - defines minimal contract for AI providers
 * All providers must implement callModel() with unified signature
 */

/**
 * @typedef {Object} Message
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} AiProviderOptions
 * @property {string} model - Model identifier
 * @property {'low'|'medium'|'high'} reasoningEffort - Reasoning effort level
 * @property {Message[]} messages - Conversation messages
 */

/**
 * @typedef {Object} AiResponse
 * @property {string} text - Response text content
 * @property {string} [thinking] - Optional thinking/reasoning content (if supported)
 * @property {Object} [usage] - Token usage info
 */

/**
 * Base class for AI providers
 * Subclasses must implement callModel()
 */
class AiProvider {
    /**
     * @param {Object} config
     * @param {string} config.apiKey - API key for the provider
     * @param {string} [config.baseUrl] - Optional custom base URL
     */
    constructor(config) {
        if (this.constructor === AiProvider) {
            throw new Error('AiProvider is abstract and cannot be instantiated directly');
        }
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl;
    }

    /**
     * Get provider name
     * @returns {string}
     */
    getName() {
        throw new Error('getName() must be implemented');
    }

    /**
     * Get default models for this provider
     * @returns {string[]}
     */
    getDefaultModels() {
        throw new Error('getDefaultModels() must be implemented');
    }

    /**
     * Call the AI model
     * @param {AiProviderOptions} options
     * @returns {Promise<AiResponse>}
     */
    async callModel(options) {
        throw new Error('callModel() must be implemented');
    }

    /**
     * Map unified reasoning effort to provider-specific parameters
     * @param {'low'|'medium'|'high'} effort
     * @returns {Object} Provider-specific parameters
     */
    mapReasoningEffort(effort) {
        throw new Error('mapReasoningEffort() must be implemented');
    }
}

// Export for ES modules
export { AiProvider };
