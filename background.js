(function () {
    "use strict";
    let bw = {
        init: function () {
            this.contextMenuInit();
        },
        contextMenuInit: function () {
            
            chrome.runtime.onInstalled.addListener(async (details) => {
                await chrome.contextMenus.create({
                    id: 'ccc-copyCode',
                    title: 'Copy Code',
                    type: 'normal',
                    contexts: ['all'],
                });
            });

            chrome.contextMenus.onClicked.addListener((info, tab) => {
                console.log(info);
                switch (info.menuItemId) {
                    case 'ccc-copyCode':
                        console.log('ccc-copyCode is clicked');
                        break;
                }
            });
        },
    };
    function BGWorker() { }
    BGWorker.prototype.initialize = function () {
        bw.init();
    };
    new BGWorker().initialize();
})();