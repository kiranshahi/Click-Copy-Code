import {
  initSettingsIfMissing,
  loadSettings,
  addSnippet,
  getSnippets,
  deleteSnippet,
  exportSnippetsJSON,
  exportSnippetsMarkdown,
  searchSnippets,
  hashCode,
} from './snippets.js';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `snippet-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePayload(payload = {}) {
  const now = Date.now();
  const code = typeof payload.code === 'string' ? payload.code : '';
  const rawTags = Array.isArray(payload.tags) ? payload.tags : [];
  return {
    id: payload.id || generateId(),
    code,
    sourceUrl: payload.sourceUrl || '',
    pageTitle: payload.pageTitle || '',
    language: payload.language || '',
    tags: rawTags.map((tag) => (typeof tag === 'string' ? tag.trim() : '')).filter(Boolean),
    createdAt: payload.createdAt || now,
    hash: payload.hash || hashCode(code),
  };
}

async function handleSaveSnippet(payload = {}) {
  const settings = await loadSettings();
  const isUpdate = Boolean(payload.id);
  if (!settings.savingEnabled && !isUpdate) {
    return { skipped: true };
  }
  const snippet = normalizePayload(payload);
  await addSnippet(snippet, payload.maxHistory ?? settings.maxHistory);
  return { snippet };
}

async function handleRequestSnippets() {
  const snippets = await getSnippets();
  return { snippets };
}

async function handleDeleteSnippet(payload = {}) {
  if (payload.id) {
    await deleteSnippet(payload.id);
  }
  return { id: payload.id };
}

async function handleExport(format) {
  const blob = format === 'json' ? await exportSnippetsJSON() : await exportSnippetsMarkdown();
  const urlFactory = (typeof globalThis !== 'undefined' && globalThis.URL)
    || (typeof URL !== 'undefined' ? URL : null);
  if (!urlFactory || typeof urlFactory.createObjectURL !== 'function') {
    throw new Error('URL.createObjectURL is not supported in this environment');
  }
  const blobUrl = urlFactory.createObjectURL(blob);
  return { blobUrl };
}

async function handleSearchSnippets(payload = {}) {
  const snippets = await searchSnippets(payload.query || '', payload.tags || []);
  return { snippets };
}

async function handleGetSettings() {
  const settings = await loadSettings();
  return { settings };
}

const messageHandlers = {
  'save-snippet': handleSaveSnippet,
  'request-snippets': handleRequestSnippets,
  'delete-snippet': handleDeleteSnippet,
  'export-json': () => handleExport('json'),
  'export-md': () => handleExport('md'),
  'search-snippets': handleSearchSnippets,
  'get-settings': handleGetSettings,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ccc-copyCode',
    title: 'Copy Code',
    contexts: ['all'],
  });
  initSettingsIfMissing().catch((error) => console.error('Failed to initialise settings on install', error));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    initSettingsIfMissing().catch((error) => {
      console.error('Failed to initialise settings on activate', error);
    }),
  );
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ccc-copyCode' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'copy-code' });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message?.type];
  if (!handler) {
    return false;
  }

  Promise.resolve(handler(message.payload))
    .then((result) => {
      sendResponse({ success: true, ...result });
    })
    .catch((error) => {
      console.error('Failed to handle message', message?.type, error);
      sendResponse({ success: false, error: error?.message || String(error) });
    });

  return true;
});
