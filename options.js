import { applyPreview } from './themeUtils.js';
import { loadSettings, saveSettings, overwriteSettings, getDefaultSettings } from './snippets.js';

const DEFAULT_MODE = 'dblclick';
const DEFAULT_THEME = Object.freeze({ scheme: 'dark', bgColor: '#6002ee', textColor: '#f5f5f5' });
const LEGACY_KEYS = ['snippetCollector', 'integrations'];

const storage = typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null;

const ExtensionStorage = {
  async get(keys) {
    if (storage) {
      return new Promise((resolve) => {
        storage.get(keys, (result) => resolve(result));
      });
    }
    const result = {};
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return;
      }
      if (key === 'theme') {
        try {
          result.theme = JSON.parse(raw);
        } catch (error) {
          console.warn('Click Copy Code: failed to parse stored theme', error);
        }
      } else {
        result[key] = raw;
      }
    });
    return result;
  },
  async set(values) {
    if (storage) {
      return new Promise((resolve) => {
        storage.set(values, () => resolve());
      });
    }
    if (Object.prototype.hasOwnProperty.call(values, 'interactionMode')) {
      localStorage.setItem('interactionMode', values.interactionMode);
    }
    if (Object.prototype.hasOwnProperty.call(values, 'theme')) {
      localStorage.setItem('theme', JSON.stringify(values.theme));
    }
  },
  async remove(keys) {
    if (storage) {
      return new Promise((resolve) => {
        storage.remove(keys, () => resolve());
      });
    }
    keys.forEach((key) => localStorage.removeItem(key));
  },
};

class OptionsController {
  constructor() {
    this.elements = {};
    this.statusTimer = null;
    this.handleSchemeChange = this.handleSchemeChange.bind(this);
    this.handleSaveClick = this.handleSaveClick.bind(this);
    this.handleResetClick = this.handleResetClick.bind(this);
    this.updatePreview = this.updatePreview.bind(this);
    this.updateIntegrationInputs = this.updateIntegrationInputs.bind(this);
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.loadState();
  }

  cacheElements() {
    this.elements.modeSelect = document.getElementById('interactionMode');
    this.elements.schemeRadios = Array.from(document.querySelectorAll('input[name="scheme"]'));
    this.elements.customColors = document.getElementById('customColors');
    this.elements.bgColor = document.getElementById('bgColor');
    this.elements.textColor = document.getElementById('textColor');
    this.elements.toastPreview = document.getElementById('toastPreview');
    this.elements.enableSaving = document.getElementById('enableSaving');
    this.elements.maxHistory = document.getElementById('maxHistory');
    this.elements.includeMarkdownHeader = document.getElementById('includeMarkdownHeader');
    this.elements.stripPrompts = document.getElementById('stripPrompts');
    this.elements.stripLineNumbers = document.getElementById('stripLineNumbers');
    this.elements.stripComments = document.getElementById('stripComments');
    this.elements.stripEmptyLines = document.getElementById('stripEmptyLines');
    this.elements.gistEnable = document.getElementById('gistEnable');
    this.elements.gistToken = document.getElementById('gistToken');
    this.elements.llmEnable = document.getElementById('llmEnable');
    this.elements.llmEndpoint = document.getElementById('llmEndpoint');
    this.elements.llmApiKey = document.getElementById('llmApiKey');
    this.elements.saveButton = document.getElementById('save');
    this.elements.resetButton = document.getElementById('reset');
    this.elements.status = document.getElementById('status');
  }

  bindEvents() {
    this.elements.schemeRadios.forEach((radio) => radio.addEventListener('change', this.handleSchemeChange));
    this.elements.bgColor.addEventListener('input', this.updatePreview);
    this.elements.textColor.addEventListener('input', this.updatePreview);
    this.elements.saveButton.addEventListener('click', this.handleSaveClick);
    this.elements.resetButton.addEventListener('click', this.handleResetClick);
    this.elements.gistEnable.addEventListener('change', this.updateIntegrationInputs);
    this.elements.llmEnable.addEventListener('change', this.updateIntegrationInputs);
  }

  async loadState() {
    const [{ interactionMode, theme }, settings] = await Promise.all([
      ExtensionStorage.get(['interactionMode', 'theme']),
      loadSettings(),
    ]);

    this.applyInteractionMode(interactionMode || DEFAULT_MODE);
    this.applyTheme(theme || DEFAULT_THEME);
    this.applySnippetSettings(settings || getDefaultSettings());
    this.updateIntegrationInputs();
    this.updatePreview();
  }

  applyInteractionMode(mode) {
    this.elements.modeSelect.value = mode;
  }

  applyTheme(theme) {
    const effectiveTheme = {
      ...DEFAULT_THEME,
      ...(theme || {}),
    };
    this.elements.schemeRadios.forEach((radio) => {
      radio.checked = radio.value === effectiveTheme.scheme;
    });
    this.toggleCustomColors(effectiveTheme.scheme === 'custom');
    this.elements.bgColor.value = effectiveTheme.bgColor || DEFAULT_THEME.bgColor;
    this.elements.textColor.value = effectiveTheme.textColor || DEFAULT_THEME.textColor;
    applyPreview(this.elements.toastPreview, effectiveTheme);
  }

  applySnippetSettings(settings) {
    const sanitized = settings || getDefaultSettings();
    this.elements.enableSaving.checked = sanitized.savingEnabled;
    this.elements.maxHistory.value = sanitized.maxHistory;
    this.elements.includeMarkdownHeader.checked = sanitized.includeMarkdownHeader !== false;

    const sanitizeOptions = sanitized.sanitize || {};
    this.elements.stripPrompts.checked = sanitizeOptions.stripPrompts !== false;
    this.elements.stripLineNumbers.checked = sanitizeOptions.stripLineNumbers !== false;
    this.elements.stripComments.checked = Boolean(sanitizeOptions.stripComments);
    this.elements.stripEmptyLines.checked = Boolean(sanitizeOptions.stripEmptyLines);

    const integrations = sanitized.integrations || {};
    const gist = integrations.gist || {};
    const llm = integrations.llm || {};
    this.elements.gistEnable.checked = Boolean(gist.enabled);
    this.elements.gistToken.value = gist.token || '';
    this.elements.llmEnable.checked = Boolean(llm.enabled);
    this.elements.llmEndpoint.value = llm.endpoint || '';
    this.elements.llmApiKey.value = llm.apiKey || '';
  }

  handleSchemeChange(event) {
    this.toggleCustomColors(event.target.value === 'custom');
    this.updatePreview();
  }

  toggleCustomColors(visible) {
    this.elements.customColors.style.display = visible ? 'flex' : 'none';
  }

  getSelectedScheme() {
    const checked = this.elements.schemeRadios.find((radio) => radio.checked);
    return checked ? checked.value : 'dark';
  }

  getThemeFromInputs() {
    const scheme = this.getSelectedScheme();
    const theme = {
      scheme,
      bgColor: this.elements.bgColor.value,
      textColor: this.elements.textColor.value,
    };
    if (scheme !== 'custom') {
      delete theme.bgColor;
      delete theme.textColor;
    }
    return theme;
  }

  getSanitizeSettings() {
    return {
      stripPrompts: this.elements.stripPrompts.checked,
      stripLineNumbers: this.elements.stripLineNumbers.checked,
      stripComments: this.elements.stripComments.checked,
      stripEmptyLines: this.elements.stripEmptyLines.checked,
    };
  }

  getIntegrationsSettings() {
    return {
      gist: {
        enabled: this.elements.gistEnable.checked,
        token: this.elements.gistToken.value.trim(),
      },
      llm: {
        enabled: this.elements.llmEnable.checked,
        endpoint: this.elements.llmEndpoint.value.trim(),
        apiKey: this.elements.llmApiKey.value,
      },
    };
  }

  getValidHistory() {
    const parsed = parseInt(this.elements.maxHistory.value, 10);
    if (Number.isNaN(parsed)) {
      return getDefaultSettings().maxHistory;
    }
    return Math.min(1000, Math.max(50, parsed));
  }

  async handleSaveClick() {
    const theme = this.getThemeFromInputs();
    const snippetSettings = {
      savingEnabled: this.elements.enableSaving.checked,
      maxHistory: this.getValidHistory(),
      includeMarkdownHeader: this.elements.includeMarkdownHeader.checked,
      sanitize: this.getSanitizeSettings(),
      integrations: this.getIntegrationsSettings(),
    };

    await Promise.all([
      ExtensionStorage.set({
        interactionMode: this.elements.modeSelect.value,
        theme,
      }),
      saveSettings(snippetSettings),
      ExtensionStorage.remove(LEGACY_KEYS),
    ]);

    this.showStatus('Saved!');
  }

  async handleResetClick() {
    const defaultSettings = getDefaultSettings();
    await Promise.all([
      ExtensionStorage.set({
        interactionMode: DEFAULT_MODE,
        theme: DEFAULT_THEME,
      }),
      overwriteSettings(defaultSettings),
      ExtensionStorage.remove(LEGACY_KEYS),
    ]);

    this.applyInteractionMode(DEFAULT_MODE);
    this.applyTheme(DEFAULT_THEME);
    this.applySnippetSettings(defaultSettings);
    this.updateIntegrationInputs();
    this.updatePreview();
    this.showStatus('Defaults restored!');
  }

  updatePreview() {
    applyPreview(this.elements.toastPreview, this.getThemeFromInputs());
  }

  updateIntegrationInputs() {
    this.elements.gistToken.disabled = !this.elements.gistEnable.checked;
    this.elements.llmEndpoint.disabled = !this.elements.llmEnable.checked;
    this.elements.llmApiKey.disabled = !this.elements.llmEnable.checked;
  }

  showStatus(message) {
    clearTimeout(this.statusTimer);
    this.elements.status.textContent = message;
    this.statusTimer = setTimeout(() => {
      this.elements.status.textContent = '';
    }, 1500);
  }
}

new OptionsController().init().catch((error) => {
  console.error('Failed to initialise options page', error);
});
