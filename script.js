(function () {
    "use strict";
    let ccc = {
        copyActive: true,
        collectCounts: false,
        copyCounts: {},
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
                                cobj.incrementCopyCount();
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
                        if (document.execCommand("copy")) {
                            cobj.showMsg("Code snippet copied successfully !");
                            cobj.incrementCopyCount();
                        } else {
                            cobj.showMsg("Opps!! some error occured while copying code snippet.");
                        }
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
                chrome.storage.local.get(['copyActive', 'collectCounts', 'copyCounts'], function (result) {
                    if (typeof result.copyActive !== 'undefined') {
                        cobj.copyActive = result.copyActive;
                    }
                    if (typeof result.collectCounts !== 'undefined') {
                        cobj.collectCounts = result.collectCounts;
                    }
                    if (result.copyCounts) {
                        cobj.copyCounts = result.copyCounts;
                    }
                    callback();
                });
            } else {
                let stored = localStorage.getItem('copyActive');
                if (stored !== null) {
                    cobj.copyActive = stored === 'true';
                }
                let cc = localStorage.getItem('collectCounts');
                if (cc !== null) {
                    cobj.collectCounts = cc === 'true';
                }
                let counts = localStorage.getItem('copyCounts');
                if (counts) {
                    try {
                        cobj.copyCounts = JSON.parse(counts);
                    } catch (e) {}
                }
                callback();
            }
        },
        saveState: function () {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ copyActive: this.copyActive, collectCounts: this.collectCounts });
            } else {
                localStorage.setItem('copyActive', this.copyActive);
                localStorage.setItem('collectCounts', this.collectCounts);
            }
        },
        showMsg: function (message) {
            let x = document.getElementById("cccTost");
            x.className = "show";
            x.textContent = message;
            setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
        },
        incrementCopyCount: function () {
            if (!this.collectCounts) {
                return;
            }
            let today = new Date().toISOString().slice(0, 10);
            this.copyCounts[today] = (this.copyCounts[today] || 0) + 1;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ copyCounts: this.copyCounts });
            } else {
                localStorage.setItem('copyCounts', JSON.stringify(this.copyCounts));
            }
        }
    };
    function ClickCopy() { }
    ClickCopy.prototype.initialize = function () {
        ccc.init();
    };
    new ClickCopy().initialize();
})();

