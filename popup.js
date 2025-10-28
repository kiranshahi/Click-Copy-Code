const searchInput = document.getElementById('searchInput');
const tagInput = document.getElementById('tagInput');
const tagSuggestions = document.getElementById('tagSuggestions');
const snippetList = document.getElementById('snippetList');
const emptyState = document.getElementById('emptyState');
const exportJsonButton = document.getElementById('exportJson');
const exportMarkdownButton = document.getElementById('exportMarkdown');
const savingBanner = document.getElementById('savingBanner');
const openOptionsButton = document.getElementById('openOptions');

const state = {
  snippets: [],
  tags: new Set(),
  settings: null,
};

function sendMessage(type, payload = {}) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type, payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || response.success === false) {
          reject(new Error(response?.error || 'Unknown error'));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function getFilterTags() {
  const raw = tagInput.value || '';
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.toLowerCase());
}

function matchesSnippet(snippet, query, tags) {
  const normalizedQuery = query.trim().toLowerCase();
  const haystacks = [snippet.code, snippet.pageTitle, snippet.sourceUrl, snippet.language]
    .filter(Boolean)
    .map((item) => item.toLowerCase());

  const matchesQuery = normalizedQuery
    ? haystacks.some((value) => value.includes(normalizedQuery))
      || (snippet.tags || []).some((tag) => tag.toLowerCase().includes(normalizedQuery))
    : true;

  const snippetTags = (snippet.tags || []).map((tag) => tag.toLowerCase());
  const matchesTags = tags.length === 0 ? true : tags.every((tag) => snippetTags.includes(tag));

  return matchesQuery && matchesTags;
}

function updateEmptyState(isEmpty) {
  if (isEmpty) {
    emptyState.hidden = false;
    snippetList.setAttribute('hidden', 'hidden');
  } else {
    emptyState.hidden = true;
    snippetList.removeAttribute('hidden');
  }
}

function formatTitle(snippet) {
  if (snippet.pageTitle) {
    return snippet.pageTitle;
  }
  if (snippet.sourceUrl) {
    try {
      const url = new URL(snippet.sourceUrl);
      return url.hostname.replace(/^www\./, '');
    } catch (error) {
      return snippet.sourceUrl;
    }
  }
  return 'Untitled snippet';
}

function formatLanguage(language) {
  return language ? language : 'plain text';
}

function formatTimestamp(value) {
  if (!value) {
    return '';
  }
  try {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  } catch (error) {
    // Ignore parsing errors
  }
  return '';
}

function createSnippetItem(snippet) {
  const li = document.createElement('li');
  li.className = 'snippet-item';
  li.dataset.id = snippet.id;

  const header = document.createElement('div');
  header.className = 'snippet-header';

  const languageChip = document.createElement('span');
  languageChip.className = 'language-chip';
  languageChip.textContent = formatLanguage(snippet.language);

  const title = document.createElement('span');
  title.className = 'snippet-title';
  title.textContent = formatTitle(snippet);

  const timestamp = document.createElement('time');
  timestamp.className = 'snippet-time';
  const formattedTime = formatTimestamp(snippet.createdAt);
  if (formattedTime) {
    timestamp.textContent = formattedTime;
    timestamp.dateTime = new Date(snippet.createdAt).toISOString();
  }

  header.appendChild(languageChip);
  header.appendChild(title);
  header.appendChild(timestamp);

  const preview = document.createElement('pre');
  preview.className = 'snippet-preview';
  preview.textContent = (snippet.code || '').trim();

  const actions = document.createElement('div');
  actions.className = 'snippet-actions';

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.dataset.action = 'copy';
  copyButton.textContent = 'Copy';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.dataset.action = 'delete';
  deleteButton.textContent = 'Delete';

  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.dataset.action = 'tags';
  menuButton.className = 'menu-button';
  menuButton.setAttribute('aria-label', 'Add or remove tags');
  menuButton.textContent = '⋯';

  actions.appendChild(copyButton);
  actions.appendChild(deleteButton);
  actions.appendChild(menuButton);

  li.appendChild(header);
  li.appendChild(preview);
  li.appendChild(actions);

  return li;
}

function renderSnippets() {
  const query = searchInput.value || '';
  const tags = getFilterTags();
  const filtered = state.snippets.filter((snippet) => matchesSnippet(snippet, query, tags));

  snippetList.innerHTML = '';
  filtered.forEach((snippet) => {
    snippetList.appendChild(createSnippetItem(snippet));
  });

  updateEmptyState(filtered.length === 0);
}

function populateTags() {
  tagSuggestions.innerHTML = '';
  Array.from(state.tags)
    .sort((a, b) => a.localeCompare(b))
    .forEach((tag) => {
      const option = document.createElement('option');
      option.value = tag;
      tagSuggestions.appendChild(option);
    });
}

async function loadSnippets() {
  try {
    const response = await sendMessage('request-snippets');
    const snippets = Array.isArray(response.snippets) ? response.snippets : [];
    state.snippets = snippets;
    state.tags = new Set();
    snippets.forEach((snippet) => {
      (snippet.tags || []).forEach((tag) => {
        if (tag) {
          state.tags.add(tag);
        }
      });
    });
    populateTags();
    renderSnippets();
  } catch (error) {
    console.error('Failed to load snippets', error);
    state.snippets = [];
    updateEmptyState(true);
  }
}

function updateSavingBanner(settings) {
  const enabled = settings?.savingEnabled !== false;
  if (enabled) {
    savingBanner.hidden = true;
  } else {
    savingBanner.hidden = false;
  }
}

async function loadSettingsState() {
  try {
    const response = await sendMessage('get-settings');
    state.settings = response.settings || null;
    updateSavingBanner(state.settings);
  } catch (error) {
    console.error('Failed to load settings', error);
    state.settings = null;
    updateSavingBanner(state.settings);
  }
}

async function copySnippet(snippet) {
  try {
    await navigator.clipboard.writeText(snippet.code || '');
  } catch (error) {
    console.error('Failed to copy snippet', error);
  }
}

async function deleteSnippet(id) {
  try {
    await sendMessage('delete-snippet', { id });
    state.snippets = state.snippets.filter((snippet) => snippet.id !== id);
    renderSnippets();
  } catch (error) {
    console.error('Failed to delete snippet', error);
  }
}

function parseTagsInput(value) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function editTags(snippet) {
  const existing = (snippet.tags || []).join(', ');
  const input = prompt('Edit tags (comma separated)', existing);
  if (input === null) {
    return;
  }
  const tags = parseTagsInput(input);
  try {
    await sendMessage('save-snippet', { ...snippet, tags });
    const index = state.snippets.findIndex((item) => item.id === snippet.id);
    if (index !== -1) {
      state.snippets[index] = { ...snippet, tags };
      state.tags = new Set();
      state.snippets.forEach((item) => {
        (item.tags || []).forEach((tagItem) => {
          if (tagItem) {
            state.tags.add(tagItem);
          }
        });
      });
      populateTags();
      renderSnippets();
    }
  } catch (error) {
    console.error('Failed to update tags', error);
  }
}

async function handleActionClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const listItem = button.closest('.snippet-item');
  if (!listItem) {
    return;
  }
  const id = listItem.dataset.id;
  const snippet = state.snippets.find((item) => item.id === id);
  if (!snippet) {
    return;
  }

  const action = button.dataset.action;
  if (action === 'copy') {
    await copySnippet(snippet);
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 1500);
  } else if (action === 'delete') {
    await deleteSnippet(id);
  } else if (action === 'tags') {
    await editTags(snippet);
  }
}

function handleInputChange() {
  renderSnippets();
}

async function handleExport(format) {
  const type = format === 'json' ? 'export-json' : 'export-md';
  try {
    const response = await sendMessage(type);
    const blobUrl = response.blobUrl;
    if (!blobUrl) {
      throw new Error('Missing download URL');
    }
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = format === 'json' ? 'snippets.json' : 'snippets.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        // Ignore revoke errors
      }
    }, 1000);
  } catch (error) {
    console.error('Failed to export snippets', error);
  }
}

function handleOpenOptions() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    window.open(chrome.runtime.getURL('options.html'), '_blank');
  }
}

function subscribeToStorageUpdates() {
  if (!chrome.storage?.onChanged) {
    return;
  }
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }
    if (changes.cccSnippets) {
      loadSnippets();
    }
    if (changes.cccSettings) {
      state.settings = changes.cccSettings.newValue || null;
      updateSavingBanner(state.settings);
    }
  });
}

snippetList.addEventListener('click', (event) => {
  handleActionClick(event);
});

searchInput.addEventListener('input', handleInputChange);
tagInput.addEventListener('input', handleInputChange);

exportJsonButton.addEventListener('click', () => handleExport('json'));
exportMarkdownButton.addEventListener('click', () => handleExport('md'));
openOptionsButton.addEventListener('click', handleOpenOptions);

Promise.all([loadSettingsState(), loadSnippets()])
  .then(() => {
    subscribeToStorageUpdates();
  })
  .catch((error) => {
    console.error('Failed to initialise popup', error);
  });
