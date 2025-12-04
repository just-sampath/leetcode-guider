/**
 * Popup JavaScript
 * Handles settings in the extension popup
 */

const STORAGE_KEY = 'leetcodeAiCoach';

const DEFAULT_MODELS = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
    anthropic: ['claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101'],
    google: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    custom: []
};

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

let settings = { ...DEFAULT_SETTINGS };

// DOM elements
const providerSelect = document.getElementById('provider-select');
const apiKeyInput = document.getElementById('api-key');
const toggleKeyBtn = document.getElementById('toggle-key');
const modelSelect = document.getElementById('model-select');
const customModelInput = document.getElementById('custom-model');
const baseUrlInput = document.getElementById('base-url');
const baseUrlGroup = document.getElementById('base-url-group');
const reasoningSelect = document.getElementById('reasoning-effort');
const personaInput = document.getElementById('persona');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');

// Load settings on popup open
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    updateUI();
    setupListeners();
});

async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const saved = result[STORAGE_KEY] || {};
        settings = {
            ...DEFAULT_SETTINGS,
            ...saved,
            models: { ...DEFAULT_SETTINGS.models, ...(saved.models || {}) },
            apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...(saved.apiKeys || {}) },
            baseUrls: { ...DEFAULT_SETTINGS.baseUrls, ...(saved.baseUrls || {}) }
        };
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
}

async function saveSettings() {
    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: settings });
        showStatus('Saved!', 'success');
    } catch (e) {
        console.error('Failed to save:', e);
        showStatus('Failed to save', 'error');
    }
}

function updateUI() {
    const provider = settings.provider;

    // Provider
    providerSelect.value = provider;

    // API Key
    apiKeyInput.value = settings.apiKeys[provider] || '';

    // Models dropdown
    modelSelect.innerHTML = '<option value="">-- Select --</option>';
    (DEFAULT_MODELS[provider] || []).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modelSelect.appendChild(opt);
    });

    const currentModel = settings.models[provider] || '';
    if (DEFAULT_MODELS[provider]?.includes(currentModel)) {
        modelSelect.value = currentModel;
        customModelInput.value = '';
    } else {
        modelSelect.value = '';
        customModelInput.value = currentModel;
    }

    // Base URL
    baseUrlInput.value = settings.baseUrls[provider] || '';
    baseUrlGroup.style.display = provider === 'custom' ? 'flex' : 'none';

    // Reasoning
    reasoningSelect.value = settings.reasoningEffort || 'medium';

    // Persona
    personaInput.value = settings.persona || '';
}

function setupListeners() {
    providerSelect.addEventListener('change', () => {
        settings.provider = providerSelect.value;
        updateUI();
    });

    apiKeyInput.addEventListener('input', () => {
        settings.apiKeys[settings.provider] = apiKeyInput.value;
    });

    toggleKeyBtn.addEventListener('click', () => {
        apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    });

    modelSelect.addEventListener('change', () => {
        if (modelSelect.value) {
            settings.models[settings.provider] = modelSelect.value;
            customModelInput.value = '';
        }
    });

    customModelInput.addEventListener('input', () => {
        if (customModelInput.value) {
            settings.models[settings.provider] = customModelInput.value;
            modelSelect.value = '';
        }
    });

    baseUrlInput.addEventListener('input', () => {
        settings.baseUrls[settings.provider] = baseUrlInput.value;
    });

    reasoningSelect.addEventListener('change', () => {
        settings.reasoningEffort = reasoningSelect.value;
    });

    personaInput.addEventListener('input', () => {
        settings.persona = personaInput.value;
    });

    saveBtn.addEventListener('click', saveSettings);
}

function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status ' + type;
    setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'status';
    }, 2000);
}
