export function applyTheme(element, theme = {}) {
    if (!element) return;
    if (theme.scheme === 'light') {
        element.style.backgroundColor = '#f5f5f5';
        element.style.color = '#000';
    } else if (theme.scheme === 'custom') {
        element.style.backgroundColor = theme.bgColor || '#6002ee';
        element.style.color = theme.textColor || '#f5f5f5';
    } else {
        element.style.backgroundColor = '#6002ee';
        element.style.color = '#f5f5f5';
    }
}

export function applyPreview(element, theme) {
    applyTheme(element, theme);
}
