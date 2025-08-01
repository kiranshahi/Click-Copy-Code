// Saves options to chrome.storage
function saveOptions() {
  const interactionMode = document.getElementById('interactionMode').value;
  const theme = document.getElementById('theme').value;

  chrome.storage.local.set({
    interactionMode: interactionMode,
    theme: theme
  }, function() {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => { status.textContent = ''; }, 1000);
  });
}

// Restores select box state using the preferences stored in chrome.storage.
function restoreOptions() {
  chrome.storage.local.get(['interactionMode', 'theme'], function(items) {
    if (items.interactionMode) {
      document.getElementById('interactionMode').value = items.interactionMode;
    }
    if (items.theme) {
      document.getElementById('theme').value = items.theme;
    }
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
