// Options page logic wrapped in an object to manage state and behaviour
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

            this.schemeRadios.forEach(r => r.addEventListener('change', (e) => {
                this.customColors.style.display = e.target.value === 'custom' ? 'flex' : 'none';
                this.updatePreview();
            }));
            this.bgColor.addEventListener('input', () => this.updatePreview());
            this.textColor.addEventListener('input', () => this.updatePreview());
            this.saveBtn.addEventListener('click', () => this.save());
            this.resetBtn.addEventListener('click', () => this.resetOptions());

            this.load();
        },
        applyPreview: function (theme) {
            if (!this.toastPreview) return;
            if (theme.scheme === 'light') {
                this.toastPreview.style.backgroundColor = '#f5f5f5';
                this.toastPreview.style.color = '#000';
            } else if (theme.scheme === 'custom') {
                this.toastPreview.style.backgroundColor = theme.bgColor || '#6002ee';
                this.toastPreview.style.color = theme.textColor || '#f5f5f5';
            } else {
                this.toastPreview.style.backgroundColor = '#6002ee';
                this.toastPreview.style.color = '#f5f5f5';
            }
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
            this.applyPreview(theme);
        },
        load: function () {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['interactionMode', 'theme'], (res) => {
                    this.modeSelect.value = res.interactionMode || this.defaultMode;
                    this.setThemeValues(res.theme || this.defaultTheme);
                });
            } else {
                const val = localStorage.getItem('interactionMode');
                this.modeSelect.value = val || this.defaultMode;
                const themeStr = localStorage.getItem('theme');
                const theme = themeStr ? JSON.parse(themeStr) : this.defaultTheme;
                this.setThemeValues(theme);
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
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ interactionMode: mode, theme }, () => {
                    this.status.textContent = 'Saved!';
                    setTimeout(() => this.status.textContent = '', 1000);
                });
            } else {
                localStorage.setItem('interactionMode', mode);
                localStorage.setItem('theme', JSON.stringify(theme));
                this.status.textContent = 'Saved!';
                setTimeout(() => this.status.textContent = '', 1000);
            }
        },
        resetOptions: function () {
            this.modeSelect.value = this.defaultMode;
            this.setThemeValues(this.defaultTheme);
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ interactionMode: this.defaultMode, theme: this.defaultTheme }, () => {
                    this.status.textContent = 'Defaults restored!';
                    setTimeout(() => this.status.textContent = '', 1000);
                });
            } else {
                localStorage.setItem('interactionMode', this.defaultMode);
                localStorage.setItem('theme', JSON.stringify(this.defaultTheme));
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
            this.applyPreview(theme);
        }
    };

    function Options() { }
    Options.prototype.initialize = function () {
        optionsManager.init();
    };
    new Options().initialize();
})();
