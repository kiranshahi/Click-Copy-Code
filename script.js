(function () {
    "use strict";
    let ccc = {
        copyActive: true,
        init: function () {
            this.notifactionDom();
            this.copyCode();
            this.registerShortcut();
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
                    cobj.showMsg(cobj.copyActive ? 'Copying enabled' : 'Copying disabled');
                }
            });
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

