(async function () {
    "use strict";

    const runtime = (typeof chrome !== 'undefined' && chrome.runtime)
        ? chrome.runtime
        : ((typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : null);

    const { applyTheme } = await ((runtime && runtime.getURL)
        ? import(runtime.getURL('themeUtils.js'))
        : import('./themeUtils.js'));

    const DEFAULT_SETTINGS = {
        savingEnabled: true,
        includeMarkdownHeader: true,
        sanitize: {
            stripPrompts: true,
            stripLineNumbers: true,
            stripComments: false,
            stripEmptyLines: false
        }
    };

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
        default: { prefix: '// ' }
    };

    function deepMergeSettings(target, source) {
        const result = { ...target };
        if (!source) {
            return result;
        }
        Object.keys(source).forEach((key) => {
            const sourceValue = source[key];
            if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
                result[key] = deepMergeSettings(target[key] || {}, sourceValue);
            } else {
                result[key] = sourceValue;
            }
        });
        return result;
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
            /^\s*(?:PS(?: [A-Z]:\\[\w\s-]*)?>)\s*/, // PowerShell prompts
            /^\s*\$\s+/, // shell prompts
            /^\s*\d+>\s+/
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
        const settings = deepMergeSettings(DEFAULT_SETTINGS.sanitize, sanitizeSettings || {});
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
            pageTitle: document.title
        };
    }

    let ccc = {
        copyActive: true,
        interactionMode: 'dblclick',
        theme: {scheme: 'dark', bgColor: '#6002ee', textColor: '#f5f5f5'},
        settings: deepMergeSettings(DEFAULT_SETTINGS, {}),
        lastContextTarget: null,
        init: function () {
            let cobj = this;
            this.loadState(function () {
                cobj.notificationDom();
                cobj.copyCode();
                cobj.registerShortcut();
                cobj.registerMessageListener();
            });
        },
        notificationDom: function () {
            let div = document.createElement('div');
            div.setAttribute("id", "cccToast");
            document.body.appendChild(div);
            applyTheme(div, this.theme);
        },
        copyCode: function () {
            let cobj = this;
            if (cobj.interactionMode === 'dblclick' || cobj.interactionMode === 'both') {
                document.body.addEventListener('dblclick', function (e) {
                    let target = e.target.closest('pre, code');
                    if (!target) {
                        return;
                    }
                    if (target.tagName.toLowerCase() === 'code') {
                        let pre = target.closest('pre');
                        if (pre) target = pre;
                    }
                    cobj.copyFromElement(target);
                });
            }
            if (cobj.interactionMode === 'hover' || cobj.interactionMode === 'both') {
                document.body.addEventListener('mouseover', function (e) {
                    let target = e.target.closest('pre, code');
                    if (!target) {
                        return;
                    }
                    if (e.relatedTarget && target.contains(e.relatedTarget)) {
                        return;
                    }
                    if (target.tagName.toLowerCase() === 'code') {
                        let pre = target.closest('pre');
                        if (pre) target = pre;
                    }
                    if (!cobj.copyActive) {
                        return;
                    }
                    cobj.addCopyButton(target);
                });
                document.body.addEventListener('mouseleave', function (e) {
                    let target = e.target.closest('pre, code');
                    if (!target) {
                        return;
                    }
                    cobj.removeCopyButton(target);
                }, true);
            }
            document.body.addEventListener('contextmenu', function (e) {
                let target = e.target.closest('pre, code');
                if (!target || !cobj.copyActive) {
                    cobj.lastContextTarget = null;
                    return;
                }
                if (target.tagName.toLowerCase() === 'code') {
                    let pre = target.closest('pre');
                    if (pre) target = pre;
                }
                cobj.lastContextTarget = target;
            });
        },
        addCopyButton: function (target) {
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

            const copyBtn = this.createButton('Copy', 'ccc-copy-btn', (ev) => {
                ev.stopPropagation();
                this.copyFromElement(target);
            });
            container.appendChild(copyBtn);

            if (this.shouldShowSaveButton()) {
                const saveBtn = this.createButton('Save', 'ccc-save-btn', (ev) => {
                    ev.stopPropagation();
                    this.saveSnippetFromElement(target);
                });
                container.appendChild(saveBtn);
            }

            target.appendChild(container);
        },
        removeCopyButton: function (target) {
            let container = target.querySelector('.ccc-btn-container');
            if (container) {
                container.remove();
            }
            if (target.dataset.cccPrevPos !== undefined) {
                target.style.position = target.dataset.cccPrevPos;
                delete target.dataset.cccPrevPos;
            }
        },
        removeAllCopyButtons: function () {
            document.querySelectorAll('.ccc-btn-container').forEach((container) => {
                const parent = container.parentElement;
                if (parent && parent.classList) {
                    this.removeCopyButton(parent);
                } else {
                    container.remove();
                }
            });
        },
        copyFromElement: function (target) {
            if (!this.copyActive) {
                return Promise.resolve(false);
            }
            this.lastContextTarget = target;
            const snippet = prepareSnippet(target, this.settings);
            const clipboardPayload = buildClipboardPayload(snippet, this.settings);
            return this.writeToClipboard(clipboardPayload)
                .then(() => {
                    this.showMsg("Code snippet copied successfully !");
                    this.sendSnippetSaveMessage(snippet);
                    return true;
                })
                .catch(() => {
                    this.showMsg("Oops!! some error occurred while copying code snippet.");
                    return false;
                });
        },
        saveSnippetFromElement: function (target) {
            const snippet = prepareSnippet(target, this.settings);
            if (this.sendSnippetSaveMessage(snippet)) {
                this.showMsg('Code snippet saved!');
            } else {
                this.showMsg('Unable to save snippet.');
            }
        },
        createButton: function (label, className, handler) {
            const btn = document.createElement('button');
            btn.className = `ccc-action-btn ${className}`;
            btn.type = 'button';
            btn.textContent = label;
            btn.addEventListener('click', handler);
            return btn;
        },
        shouldShowSaveButton: function () {
            return !!(this.settings && this.settings.savingEnabled && runtime && typeof runtime.sendMessage === 'function');
        },
        writeToClipboard: function (text) {
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
                    const success = document.execCommand("copy");
                    document.body.removeChild(textarea);
                    if (success) {
                        resolve();
                    } else {
                        reject(new Error('Copy command unsuccessful'));
                    }
                } catch (err) {
                    reject(err);
                }
            });
        },
        sendSnippetSaveMessage: function (snippet) {
            if (!this.settings || !this.settings.savingEnabled || !runtime || typeof runtime.sendMessage !== 'function') {
                return false;
            }
            try {
                runtime.sendMessage({
                    type: 'save-snippet',
                    payload: {
                        code: snippet.code,
                        sourceUrl: snippet.sourceUrl,
                        pageTitle: snippet.pageTitle,
                        language: snippet.language
                    }
                });
                return true;
            } catch (err) {
                return false;
            }
        },
        registerShortcut: function () {
            let cobj = this;
            window.addEventListener('keydown', function (e) {
                if (e.altKey && (e.key === 'c' || e.key === 'C')) {
                    let activeElem = document.activeElement;
                    if (activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA' || activeElem.isContentEditable)) {
                        return;
                    }
                    cobj.copyActive = !cobj.copyActive;
                    if (!cobj.copyActive) {
                        cobj.removeAllCopyButtons();
                        cobj.lastContextTarget = null;
                    }
                    cobj.saveState();
                    cobj.showMsg(cobj.copyActive ? 'Copying enabled' : 'Copying disabled');
                }
            });
        },
        registerMessageListener: function () {
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
            });
        },
        loadState: function (callback) {
            let cobj = this;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['copyActive', 'interactionMode', 'theme', 'cccSettings'], function (result) {
                    if (typeof result.copyActive !== 'undefined') {
                        cobj.copyActive = result.copyActive;
                    }
                    if (result.interactionMode) {
                        cobj.interactionMode = result.interactionMode;
                    }
                    if (result.theme) {
                        cobj.theme = result.theme;
                    }
                    cobj.settings = deepMergeSettings(DEFAULT_SETTINGS, result.cccSettings || {});
                    callback();
                });
            } else {
                let stored = localStorage.getItem('copyActive');
                if (stored !== null) {
                    cobj.copyActive = stored === 'true';
                }
                let mode = localStorage.getItem('interactionMode');
                if (mode) {
                    cobj.interactionMode = mode;
                }
                let themeStr = localStorage.getItem('theme');
                if (themeStr) {
                    try { cobj.theme = JSON.parse(themeStr); } catch(e) {}
                }
                let settingsStr = localStorage.getItem('cccSettings');
                if (settingsStr) {
                    try { cobj.settings = deepMergeSettings(DEFAULT_SETTINGS, JSON.parse(settingsStr)); } catch(e) {}
                } else {
                    cobj.settings = deepMergeSettings(DEFAULT_SETTINGS, {});
                }
                callback();
            }
        },
        saveState: function () {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ copyActive: this.copyActive, interactionMode: this.interactionMode, theme: this.theme });
            } else {
                localStorage.setItem('copyActive', this.copyActive);
                localStorage.setItem('interactionMode', this.interactionMode);
                localStorage.setItem('theme', JSON.stringify(this.theme));
            }
        },
        showMsg: function (message) {
            let x = document.getElementById("cccToast");
            applyTheme(x, this.theme);
            x.className = "show";
            x.textContent = message;
            setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
        }
    };
    function ClickCopy() { }
    ClickCopy.prototype.initialize = function () {
        ccc.init();
    };
    new ClickCopy().initialize();
})();

