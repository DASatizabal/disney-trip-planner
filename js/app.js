const App = {
  init() {
    // Version
    document.getElementById('version-tag').textContent = `v${APP_VERSION}`;

    // Theme
    this._initTheme();

    // Scenarios
    Scenarios.init();
    this._renderScenarioSelect();

    // Load plan
    const planState = Storage.load(Scenarios.getCurrent()) || Storage.getDefaultPlan();
    Planner.loadState(planState);
    Planner.render();

    // Swipe
    Swipe.init('planner-container');

    // Keyboard shortcuts
    this._bindKeyboard();

    // Scenario select change
    document.getElementById('scenario-select').addEventListener('change', (e) => {
      const plan = Scenarios.switchTo(e.target.value);
      Planner.loadState(plan);
      Planner.render();
      this.updateUndoRedo();
    });

    // Lucide icons
    lucide.createIcons();

    this.updateUndoRedo();
  },

  // Theme
  _initTheme() {
    const theme = Storage.loadTheme();
    if (theme === 'light') {
      document.body.classList.add('light-mode');
      this._updateThemeIcon('light');
    }
  },

  toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    Storage.saveTheme(isLight ? 'light' : 'dark');
    this._updateThemeIcon(isLight ? 'light' : 'dark');
  },

  _updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    icon.setAttribute('data-lucide', theme === 'light' ? 'sun' : 'moon');
    lucide.createIcons();
  },

  // Undo/Redo
  undo() {
    const prev = History.undo(Planner.getState());
    if (prev) {
      Planner.loadState(prev);
      Scenarios.save(prev);
      Planner.render();
      this.updateUndoRedo();
      this.toast('Undone', 'info');
    }
  },

  redo() {
    const next = History.redo(Planner.getState());
    if (next) {
      Planner.loadState(next);
      Scenarios.save(next);
      Planner.render();
      this.updateUndoRedo();
      this.toast('Redone', 'info');
    }
  },

  updateUndoRedo() {
    document.getElementById('btn-undo').disabled = !History.canUndo();
    document.getElementById('btn-redo').disabled = !History.canRedo();
  },

  // Keyboard
  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Don't capture when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'ArrowLeft') {
        Planner.goToDay(Planner._activeDayIndex - 1);
      } else if (e.key === 'ArrowRight') {
        Planner.goToDay(Planner._activeDayIndex + 1);
      }
    });
  },

  // Scenarios
  _renderScenarioSelect() {
    Scenarios.renderSelect(document.getElementById('scenario-select'));
  },

  newScenario() {
    const name = prompt('New scenario name:');
    if (!name) return;

    const cloneCurrent = confirm('Clone current plan to new scenario?');
    const plan = cloneCurrent ? Planner.getState() : null;

    if (Scenarios.create(name, plan)) {
      const newPlan = Storage.load(Scenarios.getCurrent()) || Storage.getDefaultPlan();
      Planner.loadState(newPlan);
      Planner.render();
      this._renderScenarioSelect();
      this.updateUndoRedo();
      this.toast(`Scenario "${name}" created`, 'success');
    } else {
      this.toast('Invalid or duplicate name', 'error');
    }
  },

  deleteScenario() {
    const current = Scenarios.getCurrent();
    if (current === 'default') {
      this.toast('Cannot delete the default scenario', 'error');
      return;
    }

    this.confirm('Delete Scenario', `Delete "${current}" and all its selections?`, () => {
      Scenarios.deleteCurrent();
      const plan = Storage.load(Scenarios.getCurrent()) || Storage.getDefaultPlan();
      Planner.loadState(plan);
      Planner.render();
      this._renderScenarioSelect();
      this.updateUndoRedo();
      this.toast('Scenario deleted', 'success');
    });
  },

  // Export/Import
  exportPlan() {
    Storage.exportJSON(Planner.getState(), Scenarios.getCurrent());
    this.toast('Plan exported', 'success');
  },

  importPlan() {
    document.getElementById('import-file').click();
  },

  async handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const planState = await Storage.importJSON(file);
      History.push(Planner.getState());
      Planner.loadState(planState);
      Scenarios.save(planState);
      Planner.render();
      this.updateUndoRedo();
      this.toast('Plan imported', 'success');
    } catch (err) {
      this.toast(err.message, 'error');
    }

    event.target.value = '';
  },

  resetPlan() {
    this.confirm('Reset Plan', 'Clear all selections in the current scenario? This cannot be undone.', () => {
      History.clear();
      const plan = Storage.getDefaultPlan();
      plan.scenarioName = Scenarios.getCurrent();
      Planner.loadState(plan);
      Scenarios.save(plan);
      Planner.render();
      this.updateUndoRedo();
      this.toast('Plan reset', 'success');
    });
  },

  // Confirm dialog
  confirm(title, message, onOk) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;

    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    const cleanup = () => {
      modal.classList.remove('active');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => { cleanup(); onOk(); };
    cancelBtn.onclick = () => { cleanup(); };

    modal.classList.add('active');
  },

  // Toast
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
