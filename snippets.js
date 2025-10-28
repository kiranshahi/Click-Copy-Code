"use strict";

/**
 * Shared storage helpers for snippet collection and user preferences.
 * The functions in this module are safe to call from extension pages,
 * the background service worker or tests. Every call gracefully falls
 * back to `localStorage` when the Chrome extension APIs are not available
 * (for example when running unit tests or the demo page outside Chrome).
 */

const SETTINGS_KEY = 'cccSettings';
const SNIPPETS_KEY = 'cccSnippets';

/**
 * Baseline configuration for how snippets are collected and exported.
 */
export const DEFAULT_SETTINGS = Object.freeze({
  savingEnabled: true,
  maxHistory: 200,
  includeMarkdownHeader: true,
  sanitize: {
    stripPrompts: true,
    stripLineNumbers: true,
    stripComments: false,
    stripEmptyLines: false,
  },
  integrations: {
    gist: { enabled: false, token: '' },
    llm: { enabled: false, endpoint: '', apiKey: '' },
  },
});

const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;

function clone(value) {
  if (value == null) {
    return value;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(target, source) {
  const output = Array.isArray(target) ? target.slice() : { ...target };
  if (!source) {
    return output;
  }
  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      output[key] = deepMerge(output[key] || {}, sourceValue);
    } else {
      output[key] = sourceValue;
    }
  });
  return output;
}

function normalizeSettings(settings) {
  return deepMerge(clone(DEFAULT_SETTINGS), settings || {});
}

function storageGet(key) {
  if (hasChromeStorage) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key]));
    });
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch (error) {
    console.warn('Click Copy Code: failed to read from localStorage', error);
    return undefined;
  }
}

function storageSet(key, value) {
  if (hasChromeStorage) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }
  try {
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn('Click Copy Code: failed to write to localStorage', error);
  }
  return Promise.resolve();
}

function storageRemove(key) {
  if (hasChromeStorage) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Click Copy Code: failed to remove from localStorage', error);
  }
  return Promise.resolve();
}

export function getDefaultSettings() {
  return clone(DEFAULT_SETTINGS);
}

export async function loadSettings() {
  const stored = await storageGet(SETTINGS_KEY);
  return normalizeSettings(stored);
}

export async function saveSettings(partialSettings = {}) {
  const current = await loadSettings();
  const next = deepMerge(current, partialSettings);
  await storageSet(SETTINGS_KEY, next);
  return next;
}

export async function overwriteSettings(nextSettings = {}) {
  const normalized = normalizeSettings(nextSettings);
  await storageSet(SETTINGS_KEY, normalized);
  return normalized;
}

export async function initSettingsIfMissing() {
  const existing = await storageGet(SETTINGS_KEY);
  if (!existing) {
    await overwriteSettings(DEFAULT_SETTINGS);
  } else {
    await overwriteSettings(existing);
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function normalizeSnippet(snippet) {
  if (!snippet) {
    throw new Error('normalizeSnippet requires a snippet object');
  }
  const now = Date.now();
  const code = typeof snippet.code === 'string' ? snippet.code : '';
  const tags = ensureArray(snippet.tags).map((tag) => tag.trim()).filter(Boolean);
  return {
    id: snippet.id,
    code,
    sourceUrl: snippet.sourceUrl || '',
    pageTitle: snippet.pageTitle || '',
    language: snippet.language || '',
    tags,
    createdAt: snippet.createdAt || now,
    hash: snippet.hash || hashCode(code),
  };
}

export async function addSnippet(snippet, maxHistoryOverride) {
  if (!snippet || !snippet.id) {
    return undefined;
  }
  const normalized = normalizeSnippet(snippet);
  const current = await getSnippets();
  const deduped = current.filter((item) => item.id !== normalized.id && item.hash !== normalized.hash);
  deduped.unshift(normalized);
  const settings = await loadSettings();
  const limit = typeof maxHistoryOverride === 'number' && maxHistoryOverride > 0
    ? maxHistoryOverride
    : settings.maxHistory;
  if (deduped.length > limit) {
    deduped.length = limit;
  }
  await storageSet(SNIPPETS_KEY, deduped);
  return normalized;
}

export async function getSnippets() {
  const stored = await storageGet(SNIPPETS_KEY);
  if (!Array.isArray(stored)) {
    return [];
  }
  return stored.map((item) => normalizeSnippet(item));
}

export async function deleteSnippet(id) {
  if (!id) {
    return;
  }
  const stored = await getSnippets();
  const filtered = stored.filter((snippet) => snippet.id !== id);
  if (filtered.length === 0) {
    await storageRemove(SNIPPETS_KEY);
  } else {
    await storageSet(SNIPPETS_KEY, filtered);
  }
}

export async function searchSnippets(query, tags) {
  const normalizedQuery = (query || '').trim().toLowerCase();
  const requestedTags = Array.isArray(tags) ? tags.map((tag) => tag.toLowerCase()) : [];
  const snippets = await getSnippets();
  return snippets.filter((snippet) => {
    const haystacks = [
      snippet.code,
      snippet.pageTitle,
      snippet.sourceUrl,
      snippet.language || '',
    ]
      .filter(Boolean)
      .map((value) => value.toLowerCase());
    const matchesQuery = normalizedQuery
      ? haystacks.some((value) => value.includes(normalizedQuery))
        || snippet.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      : true;
    const matchesTags = requestedTags.length === 0
      ? true
      : requestedTags.every((tag) => snippet.tags.map((t) => t.toLowerCase()).includes(tag));
    return matchesQuery && matchesTags;
  });
}

function createBlob(parts, options) {
  if (typeof Blob === 'function') {
    return new Blob(parts, options);
  }
  const globalRef = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
  if (globalRef.Blob) {
    return new globalRef.Blob(parts, options);
  }
  throw new Error('Blob is not supported in this environment');
}

export async function exportSnippetsJSON() {
  const snippets = await getSnippets();
  const payload = JSON.stringify(snippets, null, 2);
  return createBlob([payload], { type: 'application/json' });
}

export async function exportSnippetsMarkdown() {
  const [settings, snippets] = await Promise.all([loadSettings(), getSnippets()]);
  const lines = [];
  if (settings.includeMarkdownHeader !== false) {
    lines.push('# Smart Code Collector Export');
    lines.push('');
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push('');
  }
  snippets.forEach((snippet) => {
    const title = snippet.pageTitle || 'Untitled Snippet';
    const language = snippet.language || '';
    lines.push(`## ${title}`);
    if (snippet.sourceUrl) {
      lines.push(`Source: ${snippet.sourceUrl}`);
    }
    lines.push(`Created: ${new Date(snippet.createdAt).toISOString()}`);
    if (snippet.tags.length > 0) {
      lines.push(`Tags: ${snippet.tags.join(', ')}`);
    }
    lines.push('');
    lines.push('```' + language);
    lines.push(snippet.code || '');
    lines.push('```');
    lines.push('');
  });
  const payload = lines.join('\n');
  return createBlob([payload], { type: 'text/markdown' });
}

export function hashCode(value) {
  if (!value) {
    return '0';
  }
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    const chr = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString();
}

function extractLanguageFromClassName(className) {
  if (!className) {
    return null;
  }
  const classes = className.split(/\s+/);
  for (let i = 0; i < classes.length; i += 1) {
    const cls = classes[i];
    const match = cls.match(/(?:language|lang|prism|hljs)-(\w+)/i);
    if (match) {
      return match[1].toLowerCase();
    }
  }
  return null;
}

function heuristicLanguageDetection(code) {
  if (!code) {
    return 'text';
  }
  if (/^\s*#include\s+</m.test(code)) {
    return 'cpp';
  }
  if (/^\s*import\s+.+from\s+/m.test(code) || /function\s+\w+\s*\(/.test(code)) {
    return 'javascript';
  }
  if (/^\s*def\s+\w+\s*\(/m.test(code) || /^\s*class\s+\w+\s*:\s*$/m.test(code)) {
    return 'python';
  }
  if (/<[^>]+>/.test(code) && /<\/?[a-zA-Z]/.test(code)) {
    return 'html';
  }
  if (/^\s*SELECT\s+/im.test(code)) {
    return 'sql';
  }
  if (/^\s*package\s+[\w.]+;/m.test(code)) {
    return 'java';
  }
  return 'text';
}

export function detectLanguage(targetEl, code) {
  if (targetEl && typeof targetEl.closest === 'function') {
    const codeEl = targetEl.matches('code, pre') ? targetEl : targetEl.querySelector('code, pre');
    if (codeEl) {
      const fromCodeEl = extractLanguageFromClassName(codeEl.className || '');
      if (fromCodeEl) {
        return fromCodeEl;
      }
    }
    let current = targetEl;
    while (current) {
      const lang = extractLanguageFromClassName(current.className || '');
      if (lang) {
        return lang;
      }
      current = current.parentElement;
    }
  }
  return heuristicLanguageDetection(code);
}
