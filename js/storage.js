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
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Failed to load plan:', e);
      return null;
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

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.plan && data.plan.days) {
            resolve(data.plan);
          } else if (data.days) {
            resolve(data);
          } else {
            reject(new Error('Invalid plan file: missing days object'));
          }
        } catch (err) {
          reject(new Error('Invalid JSON file'));
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
        notes: td.notes || '',
        selections
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
