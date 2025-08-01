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
            this.applyTheme();
        },
        copyCode: function () {
            let cobj = this;
            const events = [];
            if (cobj.interactionMode === 'dblclick' || cobj.interactionMode === 'both') {
                events.push('dblclick');
            }
            if (cobj.interactionMode === 'hover' || cobj.interactionMode === 'both') {
                events.push('mouseenter');
            }
            document.querySelectorAll("pre, code").forEach(codeEle => {
                events.forEach(evt => codeEle.addEventListener(evt, function () {
                    if (!cobj.copyActive) {
                        return;
                    }
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(codeEle.textContent).then(
                            function(){
                                cobj.showMsg("Code snippet copied successfully !") // success
                            })
                          .catch(
                             function() {
                                cobj.showMsg("Oops!! some error occurred while copying code snippet."); // error
                          });
                    } else {
                        let range = document.createRange();

                        range.selectNode(this);
                        window.getSelection().removeAllRanges();
                        window.getSelection().addRange(range);
                        document.execCommand("copy") ? cobj.showMsg("Code snippet copied successfully !") : cobj.showMsg("Oops!! some error occurred while copying code snippet.");
                        window.getSelection().empty();
                    }
                }));
            });
        },
        registerShortcut: function () {
            let cobj = this;
            window.addEventListener('keydown', function (e) {
                if (e.altKey && (e.key === 'c' || e.key === 'C')) {
                    cobj.copyActive = !cobj.copyActive;
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
        applyTheme: function(){
            const x = document.getElementById('cccToast');
            if(!x) return;
            const t = this.theme || {};
            if(t.scheme === 'light'){
                x.style.backgroundColor = '#f5f5f5';
                x.style.color = '#000';
            } else if(t.scheme === 'custom'){
                x.style.backgroundColor = t.bgColor || '#6002ee';
                x.style.color = t.textColor || '#f5f5f5';
            } else {
                x.style.backgroundColor = '#6002ee';
                x.style.color = '#f5f5f5';
            }
        },
        showMsg: function (message) {
            let x = document.getElementById("cccToast");
            this.applyTheme();
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

