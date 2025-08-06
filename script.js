import { applyTheme } from './themeUtils.js';

(function () {
    "use strict";
    let ccc = {
        copyActive: true,
        interactionMode: 'dblclick',
        theme: {scheme: 'dark', bgColor: '#6002ee', textColor: '#f5f5f5'},
        init: function () {
            let cobj = this;
            this.loadState(function () {
                cobj.notificationDom();
                cobj.copyCode();
                cobj.registerShortcut();
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
        },
        addCopyButton: function (target) {
            if (target.querySelector('.ccc-copy-btn')) {
                return;
            }
            if (!target.dataset.cccPrevPos) {
                target.dataset.cccPrevPos = target.style.position;
                if (getComputedStyle(target).position === 'static') {
                    target.style.position = 'relative';
                }
            }
            let btn = document.createElement('button');
            btn.className = 'ccc-copy-btn';
            btn.type = 'button';
            btn.textContent = 'Copy';
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.copyFromElement(target);
            });
            target.appendChild(btn);
        },
        removeCopyButton: function (target) {
            let btn = target.querySelector('.ccc-copy-btn');
            if (btn) {
                btn.remove();
            }
            if (target.dataset.cccPrevPos !== undefined) {
                target.style.position = target.dataset.cccPrevPos;
                delete target.dataset.cccPrevPos;
            }
        },
        removeAllCopyButtons: function () {
            document.querySelectorAll('.ccc-copy-btn').forEach(btn => btn.remove());
        },
        copyFromElement: function (target) {
            if (!this.copyActive) {
                return;
            }
            let clone = target.cloneNode(true);
            clone.querySelectorAll('.ccc-copy-btn').forEach(btn => btn.remove());
            let copyText = clone.textContent;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(copyText).then(
                    () => {
                        this.showMsg("Code snippet copied successfully !");
                    })
                    .catch(() => {
                        this.showMsg("Oops!! some error occurred while copying code snippet.");
                    });
            } else {
                let textarea = document.createElement('textarea');
                textarea.value = copyText;
                textarea.style.position = 'fixed';
                textarea.style.top = '-1000px';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand("copy") ? this.showMsg("Code snippet copied successfully !") : this.showMsg("Oops!! some error occurred while copying code snippet.");
                document.body.removeChild(textarea);
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
                    }
                    cobj.saveState();
                    cobj.showMsg(cobj.copyActive ? 'Copying enabled' : 'Copying disabled');
                }
            });
        },
        loadState: function (callback) {
            let cobj = this;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['copyActive', 'interactionMode', 'theme'], function (result) {
                    if (typeof result.copyActive !== 'undefined') {
                        cobj.copyActive = result.copyActive;
                    }
                    if (result.interactionMode) {
                        cobj.interactionMode = result.interactionMode;
                    }
                    if (result.theme) {
                        cobj.theme = result.theme;
                    }
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

