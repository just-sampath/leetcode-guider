# LeetCode AI Coach 🤖

A powerful Chrome Extension that integrates with LeetCode to provide an intelligent, personalized AI coding coach. It helps you solve problems by providing hints, explanations, and debugging assistance without giving away the full solution.

![LeetCode AI Coach Icon](icons/icon128.png)

## ✨ Features

- **BYOK (Bring Your Own Key)**: Support for multiple AI providers:
  - **OpenAI** (GPT-4o, o1-preview, etc.)
  - **Anthropic** (Claude 3.5 Sonnet, Opus)
  - **Google Gemini** (Gemini 1.5 Pro/Flash)
  - **Custom** (Any OpenAI-compatible endpoint)
- **Smart Coaching Modes**:
  - **Overview**: High-level conceptual explanations.
  - **Hints**: Progressive hints (Socratic, Incremental, or Direct).
  - **Debug**: Analyze failing test cases and logic errors.
  - **Review**: Code quality, complexity analysis, and refactoring tips.
- **Reasoning Effort Control**: Adjust the depth of AI thinking (Low/Medium/High) which maps to provider-specific parameters (e.g., `reasoning_effort`, `thinking_budget`).
- **Custom Persona**: Define your own system instructions (e.g., "Be a strict interviewer" or "Explain like I'm 5").
- **Privacy First**: Your API keys are stored locally in your browser. Code is only sent to the AI provider you choose.

## 🚀 Installation (Developer Mode)

Since this extension is not yet in the Chrome Web Store, you need to load it manually:

1.  **Clone or Download** this repository.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** using the toggle switch in the top right corner.
4.  Click the **Load unpacked** button.
5.  Select the folder where you cloned this repository (the folder containing `manifest.json`).
6.  The "LeetCode AI Coach" extension should now appear in your list.

## ⚙️ Configuration

Before using the extension, you must configure your AI provider:

1.  Click the extension icon in your browser toolbar (you may need to pin it first).
2.  Click the **Settings** gear icon (or right-click the extension icon and select "Options").
3.  **Select Provider**: Choose OpenAI, Anthropic, Google, or Custom.
4.  **API Key**: Enter your valid API key for the selected provider.
    *   *Keys are stored securely in Chrome's local storage.*
5.  **Model**: Select a default model or enter a custom model ID (e.g., `gpt-4o`, `claude-3-5-sonnet-20240620`).
6.  **Persona (Optional)**: Add custom instructions for the AI.
7.  Click **Save Settings**.

## 📖 Usage

1.  Navigate to any [LeetCode Problem](https://leetcode.com/problemset/all/).
2.  The **AI Coach Panel** will appear on the right side of the screen.
3.  Use the tabs to interact with the coach:
    *   **Overview**: Get a breakdown of the problem requirements.
    *   **Hints**: Stuck? Ask for a hint. Choose "Socratic" for guiding questions or "Progressive" for nudges.
    *   **Debug**: If your code fails a test case, click "Why is this failing?" to get an analysis of the error.
    *   **Review**: Finished? Ask for a code review to improve style and complexity.

## 🛠️ Development

### Project Structure

The project follows a modular, SOLID-compliant architecture using vanilla JavaScript (ES Modules) for simplicity and performance.

```
leetcode-guider/
├── manifest.json              # Chrome Extension Manifest V3
├── background/                # Service Worker & Business Logic
│   ├── background.js          # Entry point
│   ├── AiProviderFactory.js   # Factory for AI providers
│   ├── PromptBuilder.js       # Prompt engineering logic
│   └── providers/             # Provider implementations
├── content/                   # Content Scripts (Page Interaction)
│   ├── contentScript.js       # Entry point
│   ├── LeetCodeDomAdapter.js  # DOM scraper/adapter
│   ├── CodeBridge.js          # Monaco editor bridge
│   └── UiPanel.js             # UI rendering
├── options/                   # Options Page
├── panel/                     # Panel CSS
└── icons/                     # Extension Icons
```

### Key Components

*   **LeetCodeDomAdapter**: Robustly reads problem details, description, and test results from the LeetCode DOM, handling dynamic class names.
*   **CodeBridge**: Injects a script into the page context to access the Monaco Editor instance directly, ensuring accurate code retrieval.
*   **AiProviderFactory**: Abstract factory pattern to easily swap or add new LLM providers.

## 📦 Deployment (Chrome Web Store)

To prepare the extension for the Chrome Web Store:

1.  **Remove Secrets**: Ensure no API keys or sensitive data are hardcoded (the current implementation does not hardcode keys).
2.  **Optimize**: Remove any `console.log` statements used for debugging.
3.  **Zip the Package**:
    *   Select all files in the root directory (`manifest.json`, `background/`, `content/`, `icons/`, `options/`, `panel/`, `page/`).
    *   Create a ZIP archive (e.g., `leetcode-ai-coach.zip`).
    *   *Do not include `.git` folders or `README.md` in the ZIP if possible, though Chrome will mostly ignore them.*
4.  **Upload**:
    *   Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/dev/dashboard).
    *   Click "New Item" and upload your ZIP file.
    *   Fill in the store listing details, screenshots, and privacy policy.
    *   Submit for review.

## 🔒 Privacy & Security

*   **Local Storage**: API keys and settings are stored in `chrome.storage.local`. They are never sent to any third-party server other than the AI provider you configure.
*   **Data Transmission**: Problem context and your code are sent *only* to the configured AI provider endpoint (e.g., `api.openai.com`) to generate responses.
*   **No Tracking**: This extension does not include any analytics or tracking scripts.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
