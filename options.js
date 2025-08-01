(function(){
    const modeSelect = document.getElementById('interactionMode');
    const saveBtn = document.getElementById('save');

    function load(){
        if(chrome.storage && chrome.storage.local){
            chrome.storage.local.get(['interactionMode'], function(res){
                if(res.interactionMode){
                    modeSelect.value = res.interactionMode;
                }
            });
        } else {
            const val = localStorage.getItem('interactionMode');
            if(val){
                modeSelect.value = val;
            }
        }
    }

    function save(){
        const mode = modeSelect.value;
        if(chrome.storage && chrome.storage.local){
            chrome.storage.local.set({interactionMode: mode});
        } else {
            localStorage.setItem('interactionMode', mode);
        }
    }

    saveBtn.addEventListener('click', save);
    document.addEventListener('DOMContentLoaded', load);
    load();
})();
