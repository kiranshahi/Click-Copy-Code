(function () {
    "use strict";
    let ccc = {
        copyActive: true,
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
                chrome.storage.local.get(['copyActive'], function (result) {
                    if (typeof result.copyActive !== 'undefined') {
                        cobj.copyActive = result.copyActive;
                    }
                    callback();
                });
            } else {
                let stored = localStorage.getItem('copyActive');
                if (stored !== null) {
                    cobj.copyActive = stored === 'true';
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

