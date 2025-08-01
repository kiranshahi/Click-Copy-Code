(function () {
    'use strict';

    function showStatus(message) {
        const status = document.getElementById('status');
        status.textContent = message;
        setTimeout(function () { status.textContent = ''; }, 1000);
    }

    function saveOptions() {
        const selectors = document.getElementById('selectors').value
            .split('\n')
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s; });
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ additionalSelectors: selectors }, function () {
                showStatus('Options saved.');
            });
        } else {
            localStorage.setItem('additionalSelectors', JSON.stringify(selectors));
            showStatus('Options saved.');
        }
    }

    function restoreOptions() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['additionalSelectors'], function (result) {
                const selectors = result.additionalSelectors || [];
                document.getElementById('selectors').value = selectors.join('\n');
            });
        } else {
            const stored = localStorage.getItem('additionalSelectors');
            const selectors = stored ? JSON.parse(stored) : [];
            document.getElementById('selectors').value = selectors.join('\n');
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        restoreOptions();
        document.getElementById('save').addEventListener('click', saveOptions);
    });
})();
