(async function () {
  'use strict';

  const runtime = (typeof chrome !== 'undefined' && chrome.runtime)
    ? chrome.runtime
    : ((typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : null);

  const { applyTheme } = await ((runtime && runtime.getURL)
    ? import(runtime.getURL('themeUtils.js'))
    : import('./themeUtils.js'));

  const hasChromeStorage = typeof chrome !== 'undefined' && chrome.storage?.local;

  const STORAGE = {
    async get(keys) {
      if (hasChromeStorage) {
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, (result) => resolve(result));
        });
      }
      const result = {};
      keys.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw === null) {
          return;
        }
        if (key === 'copyActive') {
          result.copyActive = raw === 'true';
        } else if (key === 'theme' || key === 'cccSettings') {
          try {
            result[key] = JSON.parse(raw);
          } catch (error) {
            console.warn('Click Copy Code: failed to parse stored value for', key, error);
          }
        } else {
          result[key] = raw;
        }
      });
      return result;
    },
    async set(values) {
      if (hasChromeStorage) {
        return new Promise((resolve) => {
          chrome.storage.local.set(values, () => resolve());
        });
      }
      Object.keys(values).forEach((key) => {
        const value = values[key];
        if (key === 'copyActive') {
          localStorage.setItem(key, value ? 'true' : 'false');
        } else if (key === 'theme' || key === 'cccSettings') {
          localStorage.setItem(key, JSON.stringify(value));
        } else {
          localStorage.setItem(key, value);
        }
      });
    },
  };

  const DEFAULT_THEME = { scheme: 'dark', bgColor: '#6002ee', textColor: '#f5f5f5' };

  const DEFAULT_SETTINGS = Object.freeze({
    savingEnabled: true,
    includeMarkdownHeader: true,
    maxHistory: 200,
    sanitize: {
      stripPrompts: true,
      stripLineNumbers: true,
      stripComments: false,
      stripEmptyLines: false,
    },
  });

  const COMMENT_STYLES = {
    javascript: { prefix: '// ' },
    typescript: { prefix: '// ' },
    jsx: { prefix: '// ' },
    tsx: { prefix: '// ' },
    java: { prefix: '// ' },
    c: { prefix: '// ' },
    cpp: { prefix: '// ' },
    csharp: { prefix: '// ' },
    go: { prefix: '// ' },
    rust: { prefix: '// ' },
    php: { prefix: '// ' },
    swift: { prefix: '// ' },
    kotlin: { prefix: '// ' },
    dart: { prefix: '// ' },
    scala: { prefix: '// ' },
    perl: { prefix: '# ' },
    ruby: { prefix: '# ' },
    python: { prefix: '# ' },
    shell: { prefix: '# ' },
    bash: { prefix: '# ' },
    sh: { prefix: '# ' },
    powershell: { prefix: '# ' },
    r: { prefix: '# ' },
    yaml: { prefix: '# ' },
    toml: { prefix: '# ' },
    sql: { prefix: '-- ' },
    lua: { prefix: '-- ' },
    haskell: { prefix: '-- ' },
    erlang: { prefix: '% ' },
    elixir: { prefix: '# ' },
    html: { prefix: '<!-- ', suffix: ' -->' },
    xml: { prefix: '<!-- ', suffix: ' -->' },
    markdown: { prefix: '<!-- ', suffix: ' -->' },
    css: { prefix: '/* ', suffix: ' */' },
    scss: { prefix: '/* ', suffix: ' */' },
    less: { prefix: '/* ', suffix: ' */' },
    default: { prefix: '// ' },
  };

  function cloneSettings(settings) {
    return JSON.parse(JSON.stringify(settings));
  }

  function deepMerge(target, source) {
    const output = Array.isArray(target) ? target.slice() : { ...target };
    if (!source) {
      return output;
    }
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        output[key] = deepMerge(output[key] || {}, sourceValue);
      } else {
        output[key] = sourceValue;
      }
    });
    return output;
  }

  function mergeSettings(override) {
    return deepMerge(cloneSettings(DEFAULT_SETTINGS), override || {});
  }

  function extractLanguageFromClassName(className) {
    if (!className) {
      return null;
    }
    const classes = className.split(/\s+/);
    for (let i = 0; i < classes.length; i += 1) {
      const cls = classes[i];
      const match = cls.match(/(?:language|lang|prism|hljs)-(\w+)/i);
      if (match) {
        return match[1].toLowerCase();
      }
    }
    return null;
  }

  function heuristicLanguageDetection(code) {
    if (!code) {
      return 'text';
    }
    if (/^\s*#include\s+</m.test(code)) {
      return 'cpp';
    }
    if (/^\s*import\s+.+from\s+/m.test(code) || /function\s+\w+\s*\(/.test(code)) {
      return 'javascript';
    }
    if (/^\s*def\s+\w+\s*\(/m.test(code) || /^\s*class\s+\w+\s*:\s*$/m.test(code)) {
      return 'python';
    }
    if (/<[^>]+>/.test(code) && /<\/?[a-zA-Z]/.test(code)) {
      return 'html';
    }
    if (/^\s*SELECT\s+/im.test(code)) {
      return 'sql';
    }
    if (/^\s*package\s+[\w.]+;/m.test(code)) {
      return 'java';
    }
    return 'text';
  }

  function detectLanguageFromDomOrGuess(targetEl, code) {
    if (targetEl && typeof targetEl.closest === 'function') {
      const codeEl = targetEl.matches('code, pre') ? targetEl : targetEl.querySelector('code, pre');
      if (codeEl) {
        const fromCodeEl = extractLanguageFromClassName(codeEl.className || '');
        if (fromCodeEl) {
          return fromCodeEl;
        }
      }
      let current = targetEl;
      while (current) {
        const lang = extractLanguageFromClassName(current.className || '');
        if (lang) {
          return lang;
        }
        current = current.parentElement;
      }
    }
    return heuristicLanguageDetection(code);
  }

  function stripPromptTokens(line) {
    const patterns = [
      /^\s*(>>>|\.\.\.)\s?/,
      /^\s*(?:In\s*\[\d+\]:|Out\s*\[\d+\]:)\s*/,
      /^\s*(?:PS(?: [A-Z]:\\[\w\s-]*)?>)\s*/,
      /^\s*\$\s+/, // shell prompts
      /^\s*\d+>\s+/,
    ];
    for (let i = 0; i < patterns.length; i += 1) {
      if (patterns[i].test(line)) {
        return line.replace(patterns[i], '');
      }
    }
    return line;
  }

  function stripLineNumbers(line) {
    return line.replace(/^\s*\d+\s*(?:[:|.)]\s*)?/, '');
  }

  function sanitizeCode(rawCode, sanitizeSettings) {
    if (!rawCode) {
      return '';
    }
    const settings = deepMerge(cloneSettings(DEFAULT_SETTINGS).sanitize, sanitizeSettings || {});
    let lines = rawCode.replace(/\u00a0/g, ' ').split(/\r?\n/);
    if (settings.stripPrompts) {
      lines = lines.map((line) => stripPromptTokens(line));
    }
    if (settings.stripLineNumbers) {
      lines = lines.map((line) => stripLineNumbers(line));
    }
    if (settings.stripComments) {
      lines = lines.filter((line) => !/^\s*(?:\/\/|#|--|<!--)/.test(line.trim()));
    }
    if (settings.stripEmptyLines) {
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }
    }
    return lines.join('\n').replace(/[ \t]+$/gm, '').trimEnd();
  }

  function buildSourceComment(language, pageTitle, sourceUrl) {
    const normalizedLang = (language || '').toLowerCase();
    const style = COMMENT_STYLES[normalizedLang] || COMMENT_STYLES.default;
    const cleanedTitle = (pageTitle || '').replace(/\s+/g, ' ').trim();
    const cleanedUrl = (sourceUrl || '').trim();
    let content = cleanedTitle;
    if (cleanedUrl) {
      content = content ? `${content} — ${cleanedUrl}` : cleanedUrl;
    }
    if (!content) {
      content = 'Source unknown';
    }
    if (style.suffix) {
      return `${style.prefix}${content}${style.suffix}`;
    }
    return `${style.prefix}${content}`;
  }

  function buildClipboardPayload(snippet, settings) {
    if (settings.includeMarkdownHeader === false) {
      return snippet.code;
    }
    const language = snippet.language || '';
    const commentLine = buildSourceComment(language, snippet.pageTitle, snippet.sourceUrl);
    let codeSection = snippet.code || '';
    if (codeSection && !codeSection.endsWith('\n')) {
      codeSection += '\n';
    }
    return `\`\`\`${language}\n${commentLine}\n${codeSection}\`\`\``;
  }

  function isEditableElement(element) {
    return element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable);
  }

  function prepareSnippet(target, settings) {
    const clone = target.cloneNode(true);
    clone.querySelectorAll('.ccc-btn-container, .ccc-copy-btn, .ccc-save-btn').forEach((btn) => btn.remove());
    const rawText = clone.textContent || '';
    const code = sanitizeCode(rawText, settings && settings.sanitize);
    const language = detectLanguageFromDomOrGuess(target, code);
    return {
      code,
      language,
      sourceUrl: window.location.href,
      pageTitle: document.title,
    };
  }

  class ClickCopyController {
    constructor() {
      this.copyActive = true;
      this.interactionMode = 'dblclick';
      this.theme = { ...DEFAULT_THEME };
      this.settings = mergeSettings();
      this.lastContextTarget = null;
      this.toastElement = null;
    }

    async init() {
      await this.loadState();
      this.ensureToast();
      this.registerCopyTriggers();
      this.registerShortcut();
      this.registerMessageListener();
      this.registerStorageListener();
    }

    async loadState() {
      const stored = await STORAGE.get(['copyActive', 'interactionMode', 'theme', 'cccSettings']);
      if (typeof stored.copyActive !== 'undefined') {
        this.copyActive = Boolean(stored.copyActive);
      }
      if (stored.interactionMode) {
        this.interactionMode = stored.interactionMode;
      }
      if (stored.theme) {
        this.theme = deepMerge({ ...DEFAULT_THEME }, stored.theme);
      }
      this.settings = mergeSettings(stored.cccSettings || {});
    }

    ensureToast() {
      if (this.toastElement) {
        return;
      }
      const div = document.createElement('div');
      div.id = 'cccToast';
      document.body.appendChild(div);
      applyTheme(div, this.theme);
      this.toastElement = div;
    }

    isInteractionEnabled(mode) {
      return this.interactionMode === mode || this.interactionMode === 'both';
    }

    registerCopyTriggers() {
      document.body.addEventListener('dblclick', (event) => {
        if (!this.isInteractionEnabled('dblclick')) {
          return;
        }
        let target = event.target.closest('pre, code');
        if (!target) {
          return;
        }
        if (target.tagName.toLowerCase() === 'code') {
          const pre = target.closest('pre');
          if (pre) {
            target = pre;
          }
        }
        this.copyFromElement(target);
      });

      document.body.addEventListener('mouseover', (event) => {
        if (!this.copyActive || !this.isInteractionEnabled('hover')) {
          return;
        }
        let target = event.target.closest('pre, code');
        if (!target) {
          return;
        }
        if (event.relatedTarget && target.contains(event.relatedTarget)) {
          return;
        }
        if (target.tagName.toLowerCase() === 'code') {
          const pre = target.closest('pre');
          if (pre) {
            target = pre;
          }
        }
        this.addCopyButton(target);
      });

      document.body.addEventListener('mouseleave', (event) => {
        if (!this.isInteractionEnabled('hover')) {
          return;
        }
        const target = event.target.closest('pre, code');
        if (!target) {
          return;
        }
        this.removeCopyButton(target);
      }, true);

      document.body.addEventListener('contextmenu', (event) => {
        if (!this.copyActive) {
          this.lastContextTarget = null;
          return;
        }
        let target = event.target.closest('pre, code');
        if (!target) {
          this.lastContextTarget = null;
          return;
        }
        if (target.tagName.toLowerCase() === 'code') {
          const pre = target.closest('pre');
          if (pre) {
            target = pre;
          }
        }
        this.lastContextTarget = target;
      });
    }

    addCopyButton(target) {
      if (target.querySelector('.ccc-btn-container')) {
        return;
      }
      if (!target.dataset.cccPrevPos) {
        target.dataset.cccPrevPos = target.style.position;
        if (getComputedStyle(target).position === 'static') {
          target.style.position = 'relative';
        }
      }
      const container = document.createElement('div');
      container.className = 'ccc-btn-container';

      const copyBtn = this.createButton('Copy', 'ccc-copy-btn', (event) => {
        event.stopPropagation();
        this.copyFromElement(target);
      });
      container.appendChild(copyBtn);

      if (this.shouldShowSaveButton()) {
        const saveBtn = this.createButton('Save', 'ccc-save-btn', (event) => {
          event.stopPropagation();
          this.saveSnippetFromElement(target);
        });
        container.appendChild(saveBtn);
      }

      target.appendChild(container);
    }

    removeCopyButton(target) {
      const container = target.querySelector('.ccc-btn-container');
      if (container) {
        container.remove();
      }
      if (target.dataset.cccPrevPos !== undefined) {
        target.style.position = target.dataset.cccPrevPos;
        delete target.dataset.cccPrevPos;
      }
    }

    removeAllCopyButtons() {
      document.querySelectorAll('.ccc-btn-container').forEach((container) => {
        const parent = container.parentElement;
        if (parent) {
          this.removeCopyButton(parent);
        } else {
          container.remove();
        }
      });
    }

    async copyFromElement(target) {
      if (!this.copyActive) {
        return false;
      }
      this.lastContextTarget = target;
      const snippet = prepareSnippet(target, this.settings);
      const clipboardPayload = buildClipboardPayload(snippet, this.settings);
      try {
        await this.writeToClipboard(clipboardPayload);
        this.showMsg('Code snippet copied successfully!');
        this.sendSnippetSaveMessage(snippet);
        return true;
      } catch (error) {
        console.error('Click Copy Code: failed to copy snippet', error);
        this.showMsg('Oops! Some error occurred while copying code snippet.');
        return false;
      }
    }

    saveSnippetFromElement(target) {
      const snippet = prepareSnippet(target, this.settings);
      if (this.sendSnippetSaveMessage(snippet)) {
        this.showMsg('Code snippet saved!');
      } else {
        this.showMsg('Unable to save snippet.');
      }
    }

    createButton(label, className, handler) {
      const btn = document.createElement('button');
      btn.className = `ccc-action-btn ${className}`;
      btn.type = 'button';
      btn.textContent = label;
      btn.addEventListener('click', handler);
      return btn;
    }

    shouldShowSaveButton() {
      return Boolean(this.settings.savingEnabled && runtime && typeof runtime.sendMessage === 'function');
    }

    writeToClipboard(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text);
      }
      return new Promise((resolve, reject) => {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.top = '-1000px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const success = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (success) {
            resolve();
          } else {
            reject(new Error('Copy command unsuccessful'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }

    sendSnippetSaveMessage(snippet) {
      if (!this.shouldShowSaveButton()) {
        return false;
      }
      try {
        runtime.sendMessage({
          type: 'save-snippet',
          payload: {
            code: snippet.code,
            sourceUrl: snippet.sourceUrl,
            pageTitle: snippet.pageTitle,
            language: snippet.language,
            maxHistory: this.settings.maxHistory,
          },
        });
        return true;
      } catch (error) {
        console.warn('Click Copy Code: failed to send save-snippet message', error);
        return false;
      }
    }

    registerShortcut() {
      window.addEventListener('keydown', (event) => {
        if (!event.altKey || (event.key !== 'c' && event.key !== 'C')) {
          return;
        }
        if (isEditableElement(document.activeElement)) {
          return;
        }
        this.copyActive = !this.copyActive;
        if (!this.copyActive) {
          this.removeAllCopyButtons();
          this.lastContextTarget = null;
        }
        this.saveState();
        this.showMsg(this.copyActive ? 'Copying enabled' : 'Copying disabled');
      });
    }

    registerMessageListener() {
      if (!runtime || !runtime.onMessage) {
        return;
      }
      runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || message.action !== 'copy-code') {
          return;
        }
        if (this.copyActive && this.lastContextTarget) {
          this.copyFromElement(this.lastContextTarget).then((success) => {
            if (typeof sendResponse === 'function') {
              sendResponse({ success });
            }
          });
          return true;
        }
        if (typeof sendResponse === 'function') {
          sendResponse({ success: false });
        }
        return undefined;
      });
    }

    registerStorageListener() {
      if (!hasChromeStorage || !chrome.storage?.onChanged) {
        return;
      }
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') {
          return;
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'copyActive')) {
          this.copyActive = Boolean(changes.copyActive.newValue);
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'interactionMode')) {
          this.interactionMode = changes.interactionMode.newValue || this.interactionMode;
          this.removeAllCopyButtons();
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'theme')) {
          this.theme = deepMerge({ ...DEFAULT_THEME }, changes.theme.newValue || {});
          this.updateToastTheme();
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'cccSettings')) {
          this.settings = mergeSettings(changes.cccSettings.newValue || {});
          if (!this.shouldShowSaveButton()) {
            this.removeAllCopyButtons();
          }
        }
      });
    }

    async saveState() {
      await STORAGE.set({
        copyActive: this.copyActive,
        interactionMode: this.interactionMode,
        theme: this.theme,
      });
    }

    updateToastTheme() {
      if (!this.toastElement) {
        return;
      }
      applyTheme(this.toastElement, this.theme);
    }

    showMsg(message) {
      this.ensureToast();
      applyTheme(this.toastElement, this.theme);
      this.toastElement.className = 'show';
      this.toastElement.textContent = message;
      setTimeout(() => {
        if (this.toastElement) {
          this.toastElement.className = this.toastElement.className.replace('show', '');
        }
      }, 3000);
    }
  }

  new ClickCopyController().init().catch((error) => {
    console.error('Failed to initialise Click Copy Code content script', error);
  });
})();
