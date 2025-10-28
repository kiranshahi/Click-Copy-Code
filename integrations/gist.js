const GIST_API_URL = 'https://api.github.com/gists';

function ensureCode(code) {
    if (typeof code !== 'string' || code.trim() === '') {
        throw new Error('createGist requires a non-empty code string.');
    }
    return code;
}

function normalizeFilename(filename) {
    if (typeof filename === 'string' && filename.trim()) {
        return filename.trim();
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `snippet-${timestamp}.txt`;
}

function buildPayload({ code, filename, description }) {
    return {
        description: description || 'Code snippet created by Click Copy Code',
        public: false,
        files: {
            [normalizeFilename(filename)]: { content: ensureCode(code) }
        }
    };
}

export async function createGist({ code, filename, description, token, enabled = false } = {}) {
    const payload = buildPayload({ code, filename, description });

    if (!enabled) {
        return { status: 'disabled', id: null, url: null, payload };
    }

    if (!token) {
        return { status: 'missing-token', id: null, url: null, payload };
    }

    const response = await fetch(GIST_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `token ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create gist: ${response.status} ${response.statusText} - ${error}`);
    }

    const result = await response.json();
    return {
        status: 'created',
        id: result?.id || null,
        url: result?.html_url || null,
        payload,
        response: result
    };
}

export default createGist;
