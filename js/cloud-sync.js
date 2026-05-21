// Cloud sync via secret GitHub Gists.
// - Push: requires a Personal Access Token with `gist` scope (stored only in localStorage on this device).
// - Pull: only needs the sync code (gist ID). Secret gists are URL-accessible without auth.
// One gist per scenario; gist file is named `ddp-plan-<scenario>.json` with the same payload shape
// as Storage.exportJSON, so it round-trips through Storage.importJSON unchanged.

const Cloud = {
  TOKEN_KEY: `${STORAGE_PREFIX}_gh_token`,
  GIST_KEY_PREFIX: `${STORAGE_PREFIX}_gist_`,
  LAST_PUSH_PREFIX: `${STORAGE_PREFIX}_gist_pushed_`,
  API: 'https://api.github.com',

  getToken() { return localStorage.getItem(this.TOKEN_KEY) || ''; },
  setToken(pat) { localStorage.setItem(this.TOKEN_KEY, (pat || '').trim()); },
  clearToken() { localStorage.removeItem(this.TOKEN_KEY); },
  hasToken() { return !!this.getToken(); },

  getGistId(scenarioName) {
    return localStorage.getItem(this.GIST_KEY_PREFIX + scenarioName) || '';
  },
  setGistId(scenarioName, id) {
    if (id) localStorage.setItem(this.GIST_KEY_PREFIX + scenarioName, id);
    else localStorage.removeItem(this.GIST_KEY_PREFIX + scenarioName);
  },
  getLastPushed(scenarioName) {
    return localStorage.getItem(this.LAST_PUSH_PREFIX + scenarioName) || '';
  },
  setLastPushed(scenarioName, iso) {
    localStorage.setItem(this.LAST_PUSH_PREFIX + scenarioName, iso);
  },

  _filename(scenarioName) {
    return `ddp-plan-${scenarioName}.json`;
  },

  _payload(scenarioName, planState) {
    return {
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      scenarioName,
      plan: planState,
      family: FAMILY,
      pools: POOLS,
      tripDays: TRIP_DAYS
    };
  },

  async _request(path, init = {}) {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {})
    };
    const token = this.getToken();
    if (token && init.method && init.method !== 'GET') {
      headers['Authorization'] = `token ${token}`;
    }
    const res = await fetch(this.API + path, { ...init, headers });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).message || ''; } catch (_) {}
      throw new Error(this._friendlyError(res.status, detail));
    }
    return res.json();
  },

  _friendlyError(status, detail) {
    if (status === 401) return 'Invalid GitHub token (401). Generate a new token with `gist` scope.';
    if (status === 403) return 'GitHub rate-limited or token lacks `gist` scope (403). ' + detail;
    if (status === 404) return 'Sync code not found (404). Double-check the code.';
    if (status === 422) return 'GitHub rejected the request (422). ' + detail;
    return `GitHub error ${status}: ${detail || 'unknown'}`;
  },

  // Push current scenario to gist. Creates a new secret gist on first push,
  // updates the existing one on subsequent pushes.
  async push(scenarioName, planState) {
    if (!this.hasToken()) throw new Error('Add a GitHub token first (gist scope).');

    const filename = this._filename(scenarioName);
    const content = JSON.stringify(this._payload(scenarioName, planState), null, 2);
    const existingId = this.getGistId(scenarioName);

    let gist;
    if (existingId) {
      gist = await this._request(`/gists/${existingId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `token ${this.getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Disney DDP Planner — scenario "${scenarioName}"`,
          files: { [filename]: { content } }
        })
      });
    } else {
      gist = await this._request('/gists', {
        method: 'POST',
        headers: { 'Authorization': `token ${this.getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Disney DDP Planner — scenario "${scenarioName}"`,
          public: false,
          files: { [filename]: { content } }
        })
      });
      this.setGistId(scenarioName, gist.id);
    }

    const now = new Date().toISOString();
    this.setLastPushed(scenarioName, now);
    return { id: gist.id, pushedAt: now };
  },

  // Pull a gist by sync code. No token needed: secret gist URLs are public-with-the-ID.
  // Returns the validated plan state (same shape as Storage.importJSON's resolved value).
  async pull(syncCode) {
    const id = (syncCode || '').trim();
    if (!id) throw new Error('Enter a sync code.');

    const gist = await this._request(`/gists/${id}`, { method: 'GET' });
    const files = gist.files || {};
    // Prefer the ddp-plan-* file; fall back to the first .json file.
    let file = Object.values(files).find(f => f && f.filename && f.filename.startsWith('ddp-plan-'));
    if (!file) file = Object.values(files).find(f => f && f.filename && f.filename.endsWith('.json'));
    if (!file) throw new Error('Sync code points to a gist without a plan file.');

    let text = file.content;
    // GitHub truncates files >1 MB; fetch raw_url for the full content if so.
    if (file.truncated && file.raw_url) {
      const raw = await fetch(file.raw_url);
      if (!raw.ok) throw new Error(`Could not fetch full gist content (${raw.status})`);
      text = await raw.text();
    }

    // Reuse Storage.importJSON's validator by handing it a Blob (FileReader accepts Blob).
    const blob = new Blob([text], { type: 'application/json' });
    const planState = await Storage.importJSON(blob);
    return { plan: planState, gistId: gist.id };
  }
};
