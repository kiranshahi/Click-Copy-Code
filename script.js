(function () {
    "use strict";
    let ccc = {
        init: function () {
            this.notifactionDom();
            this.copyCode();
        },
        notifactionDom: function () {
            var div = document.createElement('div');
            div.setAttribute("id", "cccTost");
            document.body.appendChild(div);
        },
        copyCode: function () {
            let cobj = this;
            document.querySelectorAll("pre, code").forEach(codeEle => {
                codeEle.addEventListener('dblclick', function (e) {
                    let range = document.createRange();
                    range.selectNode(this);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                    document.execCommand("Copy") ? cobj.showMsg("Code copied successfully !") : cobj.showMsg("Opps!! some error occured while copying code snippet.");
                    window.getSelection().empty();
                });
            });
        },
        showMsg: function (message) {
            var x = document.getElementById("cccTost");
            x.className = "show";
            x.textContent = message;
            setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
        }
    };
    function ClicCopy() { }
    ClicCopy.prototype.initialize = function () {
        ccc.init();
    };
    new ClicCopy().initialize();
})();