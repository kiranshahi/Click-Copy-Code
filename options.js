(function(){
    const modeSelect = document.getElementById('interactionMode');
    const saveBtn = document.getElementById('save');
    const schemeRadios = document.querySelectorAll('input[name="scheme"]');
    const customColors = document.getElementById('customColors');
    const bgColor = document.getElementById('bgColor');
    const textColor = document.getElementById('textColor');
    const status = document.getElementById('status');

    function setThemeValues(theme){
        const radio = document.querySelector(`input[name="scheme"][value="${theme.scheme}"]`);
        if(radio){
            radio.checked = true;
        }
        if(theme.scheme === 'custom'){
            customColors.style.display = 'block';
            if(theme.bgColor){ bgColor.value = theme.bgColor; }
            if(theme.textColor){ textColor.value = theme.textColor; }
        }else{
            customColors.style.display = 'none';
        }
    }

    function load(){
        const fallbackTheme = {scheme: 'dark', bgColor: '#6002ee', textColor: '#f5f5f5'};
        if(chrome.storage && chrome.storage.local){
            chrome.storage.local.get(['interactionMode', 'theme'], function(res){
                if(res.interactionMode){
                    modeSelect.value = res.interactionMode;
                }
                setThemeValues(res.theme || fallbackTheme);
            });
        } else {
            const val = localStorage.getItem('interactionMode');
            if(val){
                modeSelect.value = val;
            }
            const themeStr = localStorage.getItem('theme');
            const theme = themeStr ? JSON.parse(themeStr) : fallbackTheme;
            setThemeValues(theme);
        }
    }

    function save(){
        const mode = modeSelect.value;
        const scheme = document.querySelector('input[name="scheme"]:checked').value;
        const theme = {scheme};
        if(scheme === 'custom'){
            theme.bgColor = bgColor.value;
            theme.textColor = textColor.value;
        }
        if(chrome.storage && chrome.storage.local){
            chrome.storage.local.set({interactionMode: mode, theme}, function(){
                status.textContent = 'Saved!';
                setTimeout(()=> status.textContent='', 1000);
            });
        } else {
            localStorage.setItem('interactionMode', mode);
            localStorage.setItem('theme', JSON.stringify(theme));
            status.textContent = 'Saved!';
            setTimeout(()=> status.textContent='', 1000);
        }
    }

    schemeRadios.forEach(r => r.addEventListener('change', function(){
        customColors.style.display = this.value === 'custom' ? 'block' : 'none';
    }));

    saveBtn.addEventListener('click', save);
    document.addEventListener('DOMContentLoaded', load);
})();
