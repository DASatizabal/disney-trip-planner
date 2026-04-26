const Storage = {
  save(scenarioName, planState) {
    try {
      planState.lastModified = new Date().toISOString();
      localStorage.setItem(`${STORAGE_PREFIX}_${scenarioName}`, JSON.stringify(planState));
    } catch (e) {
      console.error('Failed to save plan:', e);
    }
  },

  load(scenarioName) {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}_${scenarioName}`);
      if (!raw) return null;
      const plan = JSON.parse(raw);
      this._normalizePlan(plan);
      return plan;
    } catch (e) {
      console.error('Failed to load plan:', e);
      return null;
    }
  },

  _normalizePlan(plan) {
    if (!plan || !plan.days || typeof plan.days !== 'object') return plan;
    for (const day of Object.values(plan.days)) {
      this._normalizeDay(day);
    }
    return plan;
  },

  _normalizeDay(day) {
    if (!day) return;
    if (typeof day.splitDividerTime === 'undefined') {
      day.splitDividerTime = DEFAULT_SPLIT_DIVIDER_TIME;
    }
    if (!Array.isArray(day.events)) day.events = [];
    if (!day.selections || typeof day.selections !== 'object') day.selections = {};
    for (const slot of MEAL_SLOTS) {
      if (!(slot in day.selections)) day.selections[slot] = null;
      const sel = day.selections[slot];
      if (sel && !sel.time) sel.time = DEFAULT_MEAL_TIMES[slot];
    }
  },

  delete(scenarioName) {
    localStorage.removeItem(`${STORAGE_PREFIX}_${scenarioName}`);
  },

  saveScenarioList(list) {
    localStorage.setItem(`${STORAGE_PREFIX}_scenarios`, JSON.stringify(list));
  },

  loadScenarioList() {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}_scenarios`);
      return raw ? JSON.parse(raw) : ['default'];
    } catch (e) {
      return ['default'];
    }
  },

  saveActiveScenario(name) {
    localStorage.setItem(`${STORAGE_PREFIX}_active`, name);
  },

  loadActiveScenario() {
    return localStorage.getItem(`${STORAGE_PREFIX}_active`) || 'default';
  },

  exportJSON(planState, scenarioName) {
    const data = {
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      scenarioName,
      plan: planState,
      family: FAMILY,
      pools: POOLS,
      tripDays: TRIP_DAYS
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ddp-plan-${scenarioName}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // B5: Hardened import with schema validation
  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const plan = data.plan || (data.days ? data : null);
          if (!plan) {
            reject(new Error('Invalid file: no plan data found'));
            return;
          }

          // Validate days structure
          if (!plan.days || typeof plan.days !== 'object') {
            reject(new Error('Invalid plan: missing "days" object'));
            return;
          }

          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          const validSlots = new Set(MEAL_SLOTS);
          let dayCount = 0;

          for (const [dateKey, day] of Object.entries(plan.days)) {
            if (!dateRegex.test(dateKey)) {
              reject(new Error(`Invalid plan: "${dateKey}" is not a valid date (expected YYYY-MM-DD)`));
              return;
            }
            if (!day.selections || typeof day.selections !== 'object') {
              reject(new Error(`Invalid plan: day ${dateKey} missing "selections" object`));
              return;
            }
            for (const slotKey of Object.keys(day.selections)) {
              if (!validSlots.has(slotKey)) {
                reject(new Error(`Invalid plan: unknown meal slot "${slotKey}" in day ${dateKey}`));
                return;
              }
            }
            dayCount++;
          }

          if (dayCount === 0) {
            reject(new Error('Invalid plan: no days found'));
            return;
          }

          // Ensure all expected fields exist with defaults
          for (const day of Object.values(plan.days)) {
            if (typeof day.park === 'undefined') day.park = 'none';
            if (typeof day.splitDay === 'undefined') day.splitDay = false;
            if (typeof day.splitParks === 'undefined') day.splitParks = null;
            if (typeof day.notes === 'undefined') day.notes = '';
            this._normalizeDay(day);
          }

          plan.version = plan.version || 1;
          plan.lastModified = new Date().toISOString();

          resolve(plan);
        } catch (err) {
          if (err.message.startsWith('Invalid')) reject(err);
          else reject(new Error('Invalid JSON file: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  getDefaultPlan() {
    const days = {};
    TRIP_DAYS.forEach(td => {
      const selections = {};
      MEAL_SLOTS.forEach(slot => { selections[slot] = null; });
      days[td.date] = {
        park: td.defaultPark,
        splitDay: false,
        splitParks: null,
        splitDividerTime: DEFAULT_SPLIT_DIVIDER_TIME,
        notes: td.notes || '',
        selections,
        events: []
      };
    });
    return {
      version: 1,
      scenarioName: 'default',
      lastModified: new Date().toISOString(),
      days
    };
  },

  saveTheme(theme) {
    localStorage.setItem(`${STORAGE_PREFIX}_theme`, theme);
  },

  loadTheme() {
    return localStorage.getItem(`${STORAGE_PREFIX}_theme`) || 'dark';
  }
};
