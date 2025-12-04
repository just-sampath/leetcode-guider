/**
 * Options Page JavaScript
 * 
 * Handles loading and saving extension settings
 */

const STORAGE_KEY = 'leetcodeAiCoach';

// Default models per provider
const DEFAULT_MODELS = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
    anthropic: ['claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101'],
    google: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    custom: []
};

// Default settings
const DEFAULT_SETTINGS = {
    provider: 'openai',
    models: {
        openai: 'gpt-4o',
        anthropic: 'claude-sonnet-4-5-20250929',
        google: 'gemini-2.5-pro',
        custom: ''
    },
    apiKeys: {
        openai: '',
        anthropic: '',
        google: '',
        custom: ''
    },
    baseUrls: {
        openai: '',
        anthropic: '',
        google: '',
        custom: ''
    },
    reasoningEffort: 'medium',
    persona: ''
};

let currentSettings = { ...DEFAULT_SETTINGS };
let currentProvider = 'openai';

/**
 * Initialize the options page
 */
async function init() {
    console.log('[Options] Initializing...');

    // Set up event listeners first so UI is interactive immediately
    setupEventListeners();

    // Load saved settings
    await loadSettings();

    // Update UI with current settings
    updateUI();
}

/**
 * Load settings from chrome.storage
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const saved = result[STORAGE_KEY] || {};

        // Robust merging to handle potential null/undefined values in saved data
        currentSettings = {
            ...DEFAULT_SETTINGS,
            ...saved,
            models: { ...DEFAULT_SETTINGS.models, ...(saved.models || {}) },
            apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...(saved.apiKeys || {}) },
            baseUrls: { ...DEFAULT_SETTINGS.baseUrls, ...(saved.baseUrls || {}) }
        };

        currentProvider = currentSettings.provider || 'openai';
        console.log('[Options] Settings loaded:', currentSettings);
    } catch (error) {
        console.error('[Options] Failed to load settings:', error);
        // Fallback to defaults if load fails
        currentSettings = { ...DEFAULT_SETTINGS };
    }
}

/**
 * Save settings to chrome.storage
 */
async function saveSettings() {
    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: currentSettings });
        showStatus('Settings saved!', 'success');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showStatus('Failed to save settings', 'error');
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Provider selection
    document.querySelectorAll('input[name="provider"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            console.log('[Options] Provider changed:', e.target.value);
            currentProvider = e.target.value;
            currentSettings.provider = currentProvider;
            updateProviderUI();
        });
    });

    // API Key input
    document.getElementById('api-key').addEventListener('input', (e) => {
        currentSettings.apiKeys[currentProvider] = e.target.value;
    });

    // Toggle API key visibility
    document.getElementById('toggle-key').addEventListener('click', () => {
        const input = document.getElementById('api-key');
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Model select
    document.getElementById('model-select').addEventListener('change', (e) => {
        if (e.target.value) {
            currentSettings.models[currentProvider] = e.target.value;
            document.getElementById('custom-model').value = '';
        }
    });

    // Custom model input
    document.getElementById('custom-model').addEventListener('input', (e) => {
        if (e.target.value) {
            currentSettings.models[currentProvider] = e.target.value;
            document.getElementById('model-select').value = '';
        }
    });

    // Base URL
    document.getElementById('base-url').addEventListener('input', (e) => {
        currentSettings.baseUrls[currentProvider] = e.target.value;
    });

    // Reasoning effort slider
    document.getElementById('reasoning-effort').addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        const effort = value === 1 ? 'low' : value === 2 ? 'medium' : 'high';
        currentSettings.reasoningEffort = effort;
    });

    // Persona textarea
    document.getElementById('persona').addEventListener('input', (e) => {
        currentSettings.persona = e.target.value;
    });

    // Save button
    document.getElementById('save-btn').addEventListener('click', saveSettings);
}

/**
 * Update the entire UI with current settings
 */
function updateUI() {
    // Set provider radio
    const providerRadio = document.querySelector(`input[name="provider"][value="${currentSettings.provider}"]`);
    if (providerRadio) providerRadio.checked = true;

    // Update provider-specific UI
    updateProviderUI();

    // Set reasoning effort
    const effort = currentSettings.reasoningEffort;
    const effortValue = effort === 'low' ? 1 : effort === 'high' ? 3 : 2;
    document.getElementById('reasoning-effort').value = effortValue;

    // Set persona
    document.getElementById('persona').value = currentSettings.persona || '';
}

/**
 * Update UI elements specific to the selected provider
 */
function updateProviderUI() {
    // Update API key
    document.getElementById('api-key').value = currentSettings.apiKeys[currentProvider] || '';

    // Update model dropdown
    const modelSelect = document.getElementById('model-select');
    modelSelect.innerHTML = '<option value="">-- Select a model --</option>';

    const models = DEFAULT_MODELS[currentProvider] || [];
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });

    // Set current model
    const currentModel = currentSettings.models[currentProvider] || '';
    const customModelInput = document.getElementById('custom-model');

    if (models.includes(currentModel)) {
        modelSelect.value = currentModel;
        customModelInput.value = '';
    } else {
        modelSelect.value = '';
        customModelInput.value = currentModel;
    }

    // Update base URL
    document.getElementById('base-url').value = currentSettings.baseUrls[currentProvider] || '';

    // Show/hide base URL section (always show for custom, optional for others)
    const baseUrlSection = document.getElementById('base-url-section');
    if (currentProvider === 'custom') {
        baseUrlSection.style.display = 'block';
        baseUrlSection.querySelector('h2').textContent = 'Base URL (Required)';
    } else {
        baseUrlSection.style.display = 'block';
        baseUrlSection.querySelector('h2').textContent = 'Base URL (Optional)';
    }
}

/**
 * Show status message
 */
function showStatus(message, type) {
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = message;
    statusEl.className = 'save-status ' + type;

    setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'save-status';
    }, 3000);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
