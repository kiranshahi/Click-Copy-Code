(function(){
    const modeSelect = document.getElementById('interactionMode');
    const saveBtn = document.getElementById('save');
    const resetBtn = document.getElementById('reset');
    const schemeRadios = document.querySelectorAll('input[name="scheme"]');
    const customColors = document.getElementById('customColors');
    const bgColor = document.getElementById('bgColor');
    const textColor = document.getElementById('textColor');
    const status = document.getElementById('status');
    const toastPreview = document.getElementById('toastPreview');

    const defaultMode = 'dblclick';
    const defaultTheme = {scheme: 'dark', bgColor: '#6002ee', textColor: '#f5f5f5'};

    function applyPreview(theme){
        if(!toastPreview) return;
        if(theme.scheme === 'light'){
            toastPreview.style.backgroundColor = '#f5f5f5';
            toastPreview.style.color = '#000';
        } else if(theme.scheme === 'custom'){
            toastPreview.style.backgroundColor = theme.bgColor || '#6002ee';
            toastPreview.style.color = theme.textColor || '#f5f5f5';
        } else {
            toastPreview.style.backgroundColor = '#6002ee';
            toastPreview.style.color = '#f5f5f5';
        }
    }

    function setThemeValues(theme){
        const radio = document.querySelector(`input[name="scheme"][value="${theme.scheme}"]`);
        if(radio){
            radio.checked = true;
        }
        if(theme.scheme === 'custom'){
            customColors.style.display = 'flex';
            if(theme.bgColor){ bgColor.value = theme.bgColor; }
            if(theme.textColor){ textColor.value = theme.textColor; }
        }else{
            customColors.style.display = 'none';
        }
        applyPreview(theme);
    }

    function load(){
        if(typeof chrome !== "undefined" && chrome.storage && chrome.storage.local){
            chrome.storage.local.get(['interactionMode', 'theme'], function(res){
                modeSelect.value = res.interactionMode || defaultMode;
                setThemeValues(res.theme || defaultTheme);
            });
        } else {
            const val = localStorage.getItem('interactionMode');
            modeSelect.value = val || defaultMode;
            const themeStr = localStorage.getItem('theme');
            const theme = themeStr ? JSON.parse(themeStr) : defaultTheme;
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
        if(typeof chrome !== "undefined" && chrome.storage && chrome.storage.local){
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

    function resetOptions(){
        modeSelect.value = defaultMode;
        setThemeValues(defaultTheme);
        if(typeof chrome !== "undefined" && chrome.storage && chrome.storage.local){
            chrome.storage.local.set({interactionMode: defaultMode, theme: defaultTheme}, function(){
                status.textContent = 'Defaults restored!';
                setTimeout(()=> status.textContent='', 1000);
            });
        } else {
            localStorage.setItem('interactionMode', defaultMode);
            localStorage.setItem('theme', JSON.stringify(defaultTheme));
            status.textContent = 'Defaults restored!';
            setTimeout(()=> status.textContent='', 1000);
        }
    }

    function updatePreview(){
        const scheme = document.querySelector('input[name="scheme"]:checked').value;
        const theme = {scheme};
        if(scheme === 'custom'){
            theme.bgColor = bgColor.value;
            theme.textColor = textColor.value;
        }
        applyPreview(theme);
    }

    schemeRadios.forEach(r => r.addEventListener('change', function(){
        customColors.style.display = this.value === 'custom' ? 'flex' : 'none';
        updatePreview();
    }));
    bgColor.addEventListener('input', updatePreview);
    textColor.addEventListener('input', updatePreview);

    saveBtn.addEventListener('click', save);
    resetBtn.addEventListener('click', resetOptions);
    document.addEventListener('DOMContentLoaded', load);
})();
