document.querySelectorAll("pre, code").forEach(codeEle => {
    codeEle.addEventListener('dblclick', function() {
        let range = document.createRange();
        range.selectNode(this);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        let isCoppied = document.execCommand("Copy");
    });
});