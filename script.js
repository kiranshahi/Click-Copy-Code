(function () {
    "use strict";
    let ccc = {
        copyActive: true,
        theme: { scheme: 'light', bgColor: '#6002ee', textColor: '#f5f5f5' },
        init: function () {
            let cobj = this;
            this.loadState(function () {
                cobj.notifactionDom();
                cobj.copyCode();
                cobj.registerShortcut();
            });
        },
        notifactionDom: function () {
            let div = document.createElement('div');
            div.setAttribute("id", "cccTost");
            if (this.theme.scheme === 'light') {
                div.classList.add('light');
            } else if (this.theme.scheme === 'dark') {
                div.classList.add('dark');
            } else if (this.theme.scheme === 'custom') {
                div.style.backgroundColor = this.theme.bgColor;
                div.style.color = this.theme.textColor;
            }
            document.body.appendChild(div);
        },
        copyCode: function () {
            let cobj = this;
            document.querySelectorAll("pre, code").forEach(codeEle => {
                codeEle.addEventListener('dblclick', function (e) {
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
                                cobj.showMsg("Opps!! some error occured while copying code snippet."); // error
                          });
                    } else {
                        let range = document.createRange();

                        range.selectNode(this);
                        window.getSelection().removeAllRanges();
                        window.getSelection().addRange(range);
                        document.execCommand("copy") ? cobj.showMsg("Code snippet copied successfully !") : cobj.showMsg("Opps!! some error occured while copying code snippet.");
                        window.getSelection().empty();
                    }
                });
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
                chrome.storage.local.get(['copyActive', 'theme'], function (result) {
                    if (typeof result.copyActive !== 'undefined') {
                        cobj.copyActive = result.copyActive;
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
                let themeStored = localStorage.getItem('theme');
                if (themeStored) {
                    try { cobj.theme = JSON.parse(themeStored); } catch(e) {}
                }
                callback();
            }
        },
        saveState: function () {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ copyActive: this.copyActive });
            } else {
                localStorage.setItem('copyActive', this.copyActive);
            }
        },
        showMsg: function (message) {
            let x = document.getElementById("cccTost");
            x.classList.add("show");
            x.textContent = message;
            setTimeout(function () { x.classList.remove("show"); }, 3000);
        }
    };
    function ClickCopy() { }
    ClickCopy.prototype.initialize = function () {
        ccc.init();
    };
    new ClickCopy().initialize();
})();

