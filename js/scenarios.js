const Scenarios = {
  _current: 'default',
  _list: ['default'],

  init() {
    this._list = Storage.loadScenarioList();
    this._current = Storage.loadActiveScenario();
    if (!this._list.includes(this._current)) {
      this._current = this._list[0] || 'default';
    }
  },

  getList() {
    return [...this._list];
  },

  getCurrent() {
    return this._current;
  },

  switchTo(name) {
    if (!this._list.includes(name)) return null;
    this._current = name;
    Storage.saveActiveScenario(name);
    History.clear();
    return Storage.load(name) || Storage.getDefaultPlan();
  },

  save(planState) {
    planState.scenarioName = this._current;
    Storage.save(this._current, planState);
  },

  create(name, cloneFrom) {
    const safeName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!safeName || this._list.includes(safeName)) return false;

    this._list.push(safeName);
    Storage.saveScenarioList(this._list);

    const plan = cloneFrom
      ? JSON.parse(JSON.stringify(cloneFrom))
      : Storage.getDefaultPlan();
    plan.scenarioName = safeName;
    Storage.save(safeName, plan);

    this._current = safeName;
    Storage.saveActiveScenario(safeName);
    History.clear();
    return true;
  },

  deleteCurrent() {
    if (this._list.length <= 1) return false;
    const toDelete = this._current;
    this._list = this._list.filter(n => n !== toDelete);
    Storage.saveScenarioList(this._list);
    Storage.delete(toDelete);

    this._current = this._list[0];
    Storage.saveActiveScenario(this._current);
    History.clear();
    return true;
  },

  renderSelect(selectEl) {
    selectEl.innerHTML = '';
    this._list.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
      if (name === this._current) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }
};
