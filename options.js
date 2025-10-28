// Options page logic wrapped in an object to manage state and behaviour
import { applyPreview } from './themeUtils.js';

(function () {
    const optionsManager = {
        modeSelect: null,
        saveBtn: null,
        resetBtn: null,
        schemeRadios: null,
        customColors: null,
        bgColor: null,
        textColor: null,
        status: null,
        toastPreview: null,
        defaultMode: 'dblclick',
        defaultTheme: { scheme: 'dark', bgColor: '#6002ee', textColor: '#f5f5f5' },
        defaultSnippetCollector: {
            enableSaving: true,
            maxHistory: 200,
            includeMarkdownHeader: true,
            sanitize: {
                stripPrompts: false,
                stripComments: false,
                stripEmptyLines: false
            }
        },
        defaultIntegrations: {
            gist: { enable: false, token: '' },
            llm: { enable: false, endpoint: '', apiKey: '' }
        },
        init: function () {
            this.modeSelect = document.getElementById('interactionMode');
            this.saveBtn = document.getElementById('save');
            this.resetBtn = document.getElementById('reset');
            this.schemeRadios = document.querySelectorAll('input[name="scheme"]');
            this.customColors = document.getElementById('customColors');
            this.bgColor = document.getElementById('bgColor');
            this.textColor = document.getElementById('textColor');
            this.status = document.getElementById('status');
            this.toastPreview = document.getElementById('toastPreview');
            this.enableSaving = document.getElementById('enableSaving');
            this.maxHistory = document.getElementById('maxHistory');
            this.includeMarkdownHeader = document.getElementById('includeMarkdownHeader');
            this.stripPrompts = document.getElementById('stripPrompts');
            this.stripComments = document.getElementById('stripComments');
            this.stripEmptyLines = document.getElementById('stripEmptyLines');
            this.gistEnable = document.getElementById('gistEnable');
            this.gistToken = document.getElementById('gistToken');
            this.llmEnable = document.getElementById('llmEnable');
            this.llmEndpoint = document.getElementById('llmEndpoint');
            this.llmApiKey = document.getElementById('llmApiKey');

            this.schemeRadios.forEach(r => r.addEventListener('change', (e) => {
                this.customColors.style.display = e.target.value === 'custom' ? 'flex' : 'none';
                this.updatePreview();
            }));
            this.bgColor.addEventListener('input', () => this.updatePreview());
            this.textColor.addEventListener('input', () => this.updatePreview());
            this.saveBtn.addEventListener('click', () => this.save());
            this.resetBtn.addEventListener('click', () => this.resetOptions());
            this.gistEnable.addEventListener('change', () => this.updateIntegrationInputs());
            this.llmEnable.addEventListener('change', () => this.updateIntegrationInputs());

            this.load();
        },
        setThemeValues: function (theme) {
            const radio = document.querySelector(`input[name="scheme"][value="${theme.scheme}"]`);
            if (radio) {
                radio.checked = true;
            }
            if (theme.scheme === 'custom') {
                this.customColors.style.display = 'flex';
                if (theme.bgColor) { this.bgColor.value = theme.bgColor; }
                if (theme.textColor) { this.textColor.value = theme.textColor; }
            } else {
                this.customColors.style.display = 'none';
            }
            applyPreview(this.toastPreview, theme);
        },
        setSnippetValues: function (snippet) {
            const values = snippet || this.defaultSnippetCollector;
            this.enableSaving.checked = values.enableSaving !== undefined ? values.enableSaving : this.defaultSnippetCollector.enableSaving;
            this.maxHistory.value = values.maxHistory || this.defaultSnippetCollector.maxHistory;
            this.includeMarkdownHeader.checked = values.includeMarkdownHeader !== undefined ? values.includeMarkdownHeader : this.defaultSnippetCollector.includeMarkdownHeader;
            const sanitize = values.sanitize || {};
            this.stripPrompts.checked = sanitize.stripPrompts || false;
            this.stripComments.checked = sanitize.stripComments || false;
            this.stripEmptyLines.checked = sanitize.stripEmptyLines || false;
        },
        setIntegrationValues: function (integrations) {
            const gist = integrations?.gist || this.defaultIntegrations.gist;
            const llm = integrations?.llm || this.defaultIntegrations.llm;
            this.gistEnable.checked = Boolean(gist.enable);
            this.gistToken.value = gist.token || '';
            this.llmEnable.checked = Boolean(llm.enable);
            this.llmEndpoint.value = llm.endpoint || '';
            this.llmApiKey.value = llm.apiKey || '';
            this.updateIntegrationInputs();
        },
        load: function () {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['interactionMode', 'theme', 'snippetCollector', 'integrations'], (res) => {
                    this.modeSelect.value = res.interactionMode || this.defaultMode;
                    this.setThemeValues(res.theme || this.defaultTheme);
                    this.setSnippetValues(res.snippetCollector);
                    this.setIntegrationValues(res.integrations);
                });
            } else {
                const val = localStorage.getItem('interactionMode');
                this.modeSelect.value = val || this.defaultMode;
                const themeStr = localStorage.getItem('theme');
                const theme = themeStr ? JSON.parse(themeStr) : this.defaultTheme;
                this.setThemeValues(theme);
                const snippetStr = localStorage.getItem('snippetCollector');
                const snippet = snippetStr ? JSON.parse(snippetStr) : this.defaultSnippetCollector;
                this.setSnippetValues(snippet);
                const integrationsStr = localStorage.getItem('integrations');
                const integrations = integrationsStr ? JSON.parse(integrationsStr) : this.defaultIntegrations;
                this.setIntegrationValues(integrations);
            }
        },
        save: function () {
            const mode = this.modeSelect.value;
            const scheme = document.querySelector('input[name="scheme"]:checked').value;
            const theme = { scheme };
            if (scheme === 'custom') {
                theme.bgColor = this.bgColor.value;
                theme.textColor = this.textColor.value;
            }
            const snippetCollector = {
                enableSaving: this.enableSaving.checked,
                maxHistory: this.getValidHistory(),
                includeMarkdownHeader: this.includeMarkdownHeader.checked,
                sanitize: {
                    stripPrompts: this.stripPrompts.checked,
                    stripComments: this.stripComments.checked,
                    stripEmptyLines: this.stripEmptyLines.checked
                }
            };
            const integrations = {
                gist: {
                    enable: this.gistEnable.checked,
                    token: this.gistToken.value.trim()
                },
                llm: {
                    enable: this.llmEnable.checked,
                    endpoint: this.llmEndpoint.value.trim(),
                    apiKey: this.llmApiKey.value
                }
            };
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ interactionMode: mode, theme, snippetCollector, integrations }, () => {
                    this.status.textContent = 'Saved!';
                    setTimeout(() => this.status.textContent = '', 1000);
                });
            } else {
                localStorage.setItem('interactionMode', mode);
                localStorage.setItem('theme', JSON.stringify(theme));
                localStorage.setItem('snippetCollector', JSON.stringify(snippetCollector));
                localStorage.setItem('integrations', JSON.stringify(integrations));
                this.status.textContent = 'Saved!';
                setTimeout(() => this.status.textContent = '', 1000);
            }
        },
        resetOptions: function () {
            this.modeSelect.value = this.defaultMode;
            this.setThemeValues(this.defaultTheme);
            this.setSnippetValues(this.defaultSnippetCollector);
            this.setIntegrationValues(this.defaultIntegrations);
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({
                    interactionMode: this.defaultMode,
                    theme: this.defaultTheme,
                    snippetCollector: this.defaultSnippetCollector,
                    integrations: this.defaultIntegrations
                }, () => {
                    this.status.textContent = 'Defaults restored!';
                    setTimeout(() => this.status.textContent = '', 1000);
                });
            } else {
                localStorage.setItem('interactionMode', this.defaultMode);
                localStorage.setItem('theme', JSON.stringify(this.defaultTheme));
                localStorage.setItem('snippetCollector', JSON.stringify(this.defaultSnippetCollector));
                localStorage.setItem('integrations', JSON.stringify(this.defaultIntegrations));
                this.status.textContent = 'Defaults restored!';
                setTimeout(() => this.status.textContent = '', 1000);
            }
        },
        updatePreview: function () {
            const scheme = document.querySelector('input[name="scheme"]:checked').value;
            const theme = { scheme };
            if (scheme === 'custom') {
                theme.bgColor = this.bgColor.value;
                theme.textColor = this.textColor.value;
            }
            applyPreview(this.toastPreview, theme);
        },
        updateIntegrationInputs: function () {
            this.gistToken.disabled = !this.gistEnable.checked;
            this.llmEndpoint.disabled = !this.llmEnable.checked;
            this.llmApiKey.disabled = !this.llmEnable.checked;
        },
        getValidHistory: function () {
            const parsed = parseInt(this.maxHistory.value, 10);
            const fallback = this.defaultSnippetCollector.maxHistory;
            if (Number.isNaN(parsed)) {
                return fallback;
            }
            return Math.min(1000, Math.max(50, parsed));
        }
    };

    function Options() { }
    Options.prototype.initialize = function () {
        optionsManager.init();
    };
    new Options().initialize();
})();
