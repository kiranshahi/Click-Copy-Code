(function() {
    function getStorage(keys, cb) {
        if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(keys, cb);
        } else {
            let result = {};
            keys.forEach(function(k){
                let v = localStorage.getItem(k);
                if (v !== null) {
                    result[k] = k === 'copyCounts' ? JSON.parse(v) : (v === 'true' ? true : v);
                }
            });
            cb(result);
        }
    }
    function setStorage(obj, cb) {
        if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(obj, cb);
        } else {
            Object.keys(obj).forEach(function(k){
                let v = obj[k];
                if (k === 'copyCounts') {
                    localStorage.setItem(k, JSON.stringify(v));
                } else {
                    localStorage.setItem(k, v);
                }
            });
            if (cb) cb();
        }
    }

    function updateStats(counts) {
        const today = new Date().toISOString().slice(0,10);
        const todayCount = counts[today] || 0;
        let weekCount = 0;
        for (let i=0;i<7;i++) {
            const d = new Date(Date.now() - i*24*60*60*1000).toISOString().slice(0,10);
            weekCount += counts[d] || 0;
        }
        document.getElementById('todayCount').textContent = todayCount;
        document.getElementById('weekCount').textContent = weekCount;
    }

    function init() {
        getStorage(['collectCounts', 'copyCounts'], function(result){
            document.getElementById('collectToggle').checked = !!result.collectCounts;
            const counts = result.copyCounts || {};
            updateStats(counts);
            document.getElementById('collectToggle').addEventListener('change', function(){
                setStorage({collectCounts: this.checked});
            });
            document.getElementById('exportBtn').addEventListener('click', function(){
                const blob = new Blob([JSON.stringify(counts, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'copy_counts.json';
                a.click();
                URL.revokeObjectURL(url);
            });
            document.getElementById('resetBtn').addEventListener('click', function(){
                setStorage({copyCounts: {}}, function(){ location.reload(); });
            });
        });
    }
    document.addEventListener('DOMContentLoaded', init);
})();
