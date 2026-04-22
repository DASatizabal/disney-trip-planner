const App = {
  init() {
    document.getElementById('version-tag').textContent = `v${APP_VERSION}${APP_BUILD ? '.' + APP_BUILD : ''}`;
    this._initTheme();

    Scenarios.init();
    this._renderScenarioSelect();

    const planState = Storage.load(Scenarios.getCurrent()) || Storage.getDefaultPlan();
    Planner.loadState(planState);
    Planner.render();

    Swipe.init('planner-container');
    this._bindKeyboard();

    document.getElementById('scenario-select').addEventListener('change', (e) => {
      const plan = Scenarios.switchTo(e.target.value);
      Planner.loadState(plan);
      Planner.render();
      this.updateUndoRedo();
    });

    // C4: Check for shared plan in URL hash
    this._loadFromHash();

    // E5: What's New on version bump
    this._checkWhatsNew();

    // C6: Rewards dollars persistence
    const savedRewards = localStorage.getItem(`${STORAGE_PREFIX}_rewards`) || '806.41';
    const rewardsInput = document.getElementById('rewards-dollars');
    if (rewardsInput) {
      rewardsInput.value = savedRewards;
      rewardsInput.addEventListener('change', () => {
        localStorage.setItem(`${STORAGE_PREFIX}_rewards`, rewardsInput.value);
        Planner.renderCreditDashboard();
      });
    }

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

  // Scenarios — B4: use modals instead of prompt/confirm
  _renderScenarioSelect() {
    Scenarios.renderSelect(document.getElementById('scenario-select'));
  },

  newScenario() {
    this.inputModal('New Scenario', 'Enter a name for the new scenario:', '', (name) => {
      if (!name) return;
      this.confirm('Clone Plan?', 'Clone the current plan to the new scenario, or start fresh?', () => {
        // Clone
        if (Scenarios.create(name, Planner.getState())) {
          const newPlan = Storage.load(Scenarios.getCurrent()) || Storage.getDefaultPlan();
          Planner.loadState(newPlan);
          Planner.render();
          this._renderScenarioSelect();
          this.updateUndoRedo();
          this.toast(`Scenario "${name}" created`, 'success');
        } else {
          this.toast('Invalid or duplicate name', 'error');
        }
      }, false, 'Clone Current', 'Start Fresh', () => {
        // Start fresh
        if (Scenarios.create(name, null)) {
          const newPlan = Storage.load(Scenarios.getCurrent()) || Storage.getDefaultPlan();
          Planner.loadState(newPlan);
          Planner.render();
          this._renderScenarioSelect();
          this.updateUndoRedo();
          this.toast(`Scenario "${name}" created`, 'success');
        } else {
          this.toast('Invalid or duplicate name', 'error');
        }
      });
    });
  },

  deleteScenario() {
    const current = Scenarios.getCurrent();
    if (current === 'default') {
      this.toast('Cannot delete the default scenario', 'error');
      return;
    }

    this.confirm('Delete Scenario', `Delete "${current}" and all its selections? This cannot be undone.`, () => {
      Scenarios.deleteCurrent();
      const plan = Storage.load(Scenarios.getCurrent()) || Storage.getDefaultPlan();
      Planner.loadState(plan);
      Planner.render();
      this._renderScenarioSelect();
      this.updateUndoRedo();
      this.toast('Scenario deleted', 'success');
    }, true);
  },

  // Export/Import
  exportPlan() {
    Storage.exportJSON(Planner.getState(), Scenarios.getCurrent());
    this.toast('Plan exported', 'success');
  },

  // C4: Share link (compressed URL hash or clipboard fallback)
  async sharePlan() {
    const plan = Planner.getState();
    const json = JSON.stringify(plan);

    try {
      // Try gzip + base64 for URL hash
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
      const compressed = await new Response(stream).arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(compressed)));
      const hash = '#plan=' + encodeURIComponent(b64);

      if (hash.length <= 2000) {
        const url = window.location.origin + window.location.pathname + hash;
        await navigator.clipboard.writeText(url);
        this.toast('Share link copied to clipboard', 'success');
        return;
      }
    } catch (e) {
      // CompressionStream not supported or other error
    }

    // Fallback: copy JSON to clipboard
    try {
      await navigator.clipboard.writeText(json);
      this.toast('Plan too large for share link, copied JSON to clipboard instead', 'warning');
    } catch (e) {
      this.toast('Failed to copy to clipboard', 'error');
    }
  },

  // C4: Load plan from URL hash on init
  _loadFromHash() {
    const hash = window.location.hash;
    if (!hash.startsWith('#plan=')) return false;
    try {
      const b64 = decodeURIComponent(hash.slice(6));
      const binary = atob(b64);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      new Response(stream).text().then(json => {
        const plan = JSON.parse(json);
        if (plan.days) {
          Planner.loadState(plan);
          Scenarios.save(plan);
          Planner.render();
          this.toast('Plan loaded from share link', 'success');
          window.location.hash = '';
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  importPlan() {
    document.getElementById('import-file').click();
  },

  async handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const planState = await Storage.importJSON(file);
      // B5: confirm before overwriting
      this.confirm('Import Plan', 'Importing will replace your current plan. Continue?', () => {
        History.push(Planner.getState());
        Planner.loadState(planState);
        Scenarios.save(planState);
        Planner.render();
        this.updateUndoRedo();
        this.toast('Plan imported', 'success');
      }, true, 'Import', 'Cancel');
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
    }, true);
  },

  // B3: Confirm dialog with destructive flag + custom button labels + optional cancel callback
  confirm(title, message, onOk, destructive = false, okLabel = 'Confirm', cancelLabel = 'Cancel', onCancel = null) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;

    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    okBtn.textContent = okLabel;
    cancelBtn.textContent = cancelLabel;

    if (destructive) {
      okBtn.className = 'flex-1 px-3 py-2 text-xs rounded-lg bg-red-500/80 hover:bg-red-500 text-white font-medium transition-colors';
    } else {
      okBtn.className = 'flex-1 px-3 py-2 text-xs rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white font-medium transition-colors';
    }

    const cleanup = () => {
      modal.classList.remove('active');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => { cleanup(); onOk(); };
    cancelBtn.onclick = () => { cleanup(); if (onCancel) onCancel(); };

    modal.classList.add('active');
  },

  // B4: Input modal (replaces prompt)
  inputModal(title, message, defaultValue, onSubmit) {
    const modal = document.getElementById('input-modal');
    document.getElementById('input-modal-title').textContent = title;
    document.getElementById('input-modal-message').textContent = message;
    const input = document.getElementById('input-modal-field');
    input.value = defaultValue || '';

    const okBtn = document.getElementById('input-modal-ok');
    const cancelBtn = document.getElementById('input-modal-cancel');

    const cleanup = () => {
      modal.classList.remove('active');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      input.onkeydown = null;
    };

    okBtn.onclick = () => { cleanup(); onSubmit(input.value.trim()); };
    cancelBtn.onclick = () => { cleanup(); };
    input.onkeydown = (e) => { if (e.key === 'Enter') { cleanup(); onSubmit(input.value.trim()); } };

    modal.classList.add('active');
    setTimeout(() => input.focus(), 100);
  },

  // C7: Trip Summary modal
  showTripSummary() {
    const plan = Planner.getState();
    const modal = document.getElementById('summary-modal');
    const body = document.getElementById('summary-body');

    let html = '';
    TRIP_DAYS.forEach(td => {
      const day = plan.days[td.date];
      if (!day) return;
      const dateLabel = new Date(td.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      html += `<div class="mb-4 pb-3 border-b border-white/10">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-bold text-sm">${dateLabel}</span>
          <span class="badge badge-pool-${td.pool.toLowerCase()}">${td.pool}</span>
          <span class="text-[11px] text-white/40">${day.park}</span>
          ${td.vip ? '<span class="badge badge-vip">VIP</span>' : ''}
        </div>`;

      MEAL_SLOTS.forEach(slot => {
        const sel = day.selections[slot];
        if (!sel) return;
        const r = CreditEngine._getRestaurant(sel.restaurantId);
        if (!r) return;

        const adrNum = sel.adrNumber || '';
        const method = sel.paymentMethod === 'ddp' ? `DDP ${sel.pool}` : sel.paymentMethod.toUpperCase();

        html += `<div class="flex items-center gap-2 text-xs py-0.5 ml-2">
          <span class="text-white/30 w-14">${MEAL_LABELS[slot]}</span>
          <span class="font-medium flex-1">${r.name}</span>
          <span class="badge ${Planner._creditBadgeClass(r.creditType)} text-[8px]">${method}</span>
          ${adrNum ? `<span class="text-[9px] text-green-400/60">#${adrNum}</span>` : ''}
        </div>`;
      });

      if (day.notes) {
        html += `<div class="text-[10px] text-white/30 mt-1 ml-2">${day.notes}</div>`;
      }
      html += '</div>';
    });

    // OOP summary
    const oop = CreditEngine.estimateOOPDetailed(plan);
    const balA = CreditEngine.getBalance('A', plan);
    const balB = CreditEngine.getBalance('B', plan);
    html += `<div class="text-xs space-y-1">
      <div class="font-bold">Credit Summary</div>
      <div>Bucket A: ${balA.ts.remaining}/${balA.ts.total} TS, ${balA.qs.remaining}/${balA.qs.total} QS, ${balA.sn.remaining}/${balA.sn.total} SN</div>
      <div>Bucket B: ${balB.ts.remaining}/${balB.ts.total} TS, ${balB.qs.remaining}/${balB.qs.total} QS, ${balB.sn.remaining}/${balB.sn.total} SN</div>
      <div class="pt-1">Estimated OOP: <strong>$${oop.committed}</strong></div>
    </div>`;

    body.innerHTML = html;
    modal.classList.add('active');
    lucide.createIcons();
  },

  closeSummary() {
    document.getElementById('summary-modal').classList.remove('active');
  },

  // E5: What's New
  _releaseNotes: [
    { version: '1.6.0', date: '2026-04-22', notes: [
      'New Pre-Trip Checklist page — link in the header toolbar (Checklist). Separate localStorage, so Lisa and you each track your own progress from your phones'
    ]},
    { version: '1.5.4', date: '2026-04-22', notes: [
      'Credit math now counts per-diner: a family meal burns one credit per person, not one per selection',
      'OOP cost math uses actual diner composition (adults vs kids) instead of hardcoded 3+1',
      'Click the diner badge on any slot to edit who is dining (Adults only / Kids only / All shortcuts)',
      'New selections default to the whole family; previously-saved selections migrate on first read'
    ]},
    { version: '1.5.3', date: '2026-04-22', notes: [
      'Picker defaults to paired resort on water park days (water parks do not serve most meals)',
      'Self-heal orphaned meal selections so slots no longer vanish when a restaurant id goes stale'
    ]},
    { version: '1.5.2', date: '2026-04-22', notes: [
      'Park assignments optimized based on crowd calendar'
    ]},
    { version: '1.5.0', date: '2026-04-20', notes: [
      'Resolver modal: swap or remove stranded selections when changing parks',
      'AP discount as a payment option alongside VIP and DDP',
      'OOP + Disney Rewards Dollars tracker with committed/net view',
      'Trip Summary modal with day-by-day overview',
      'Share link via compressed URL hash (or clipboard fallback)',
      'Dining events + festival food booths in restaurant database',
      'Search highlighting in picker, dismissible VIP tips, loading skeletons'
    ]},
    { version: '1.2.0', date: '2026-04-20', notes: [
      'Overdraft prevention with balance vs deficit display',
      'Modal-based scenario creation (no more browser prompts)',
      'Import validation with schema checks',
      'Clone-to-pool mismatch warnings before commit',
      'Undo history expanded to 50 levels'
    ]},
    { version: '1.1.0', date: '2026-04-20', notes: [
      'Merged restaurant universe: 434 restaurants from CSV + DB',
      'Shared merge module used by both planner and restaurant list',
      'Credit type inference for CSV-only entries',
      'Closed restaurant detection (gray CLOSED badge)',
      'Space 220 split into separate lunch/dinner entries',
      'Deduplication of Gaston\'s Tavern and BoardWalk Pizza Window'
    ]}
  ],

  _checkWhatsNew() {
    const lastSeen = localStorage.getItem(`${STORAGE_PREFIX}_last_version`);
    if (lastSeen !== APP_VERSION) {
      localStorage.setItem(`${STORAGE_PREFIX}_last_version`, APP_VERSION);
      if (lastSeen) {
        // Only show on upgrade, not first visit
        setTimeout(() => this.showWhatsNew(), 500);
      }
    }
  },

  showWhatsNew() {
    const modal = document.getElementById('whatsnew-modal');
    const body = document.getElementById('whatsnew-body');

    body.innerHTML = this._releaseNotes.slice(0, 3).map(r => `
      <div class="mb-3">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold">v${r.version}</span>
          <span class="text-[10px] text-white/30">${r.date}</span>
        </div>
        <ul class="text-[11px] text-white/60 space-y-0.5 ml-3">
          ${r.notes.map(n => `<li class="list-disc">${n}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    modal.classList.add('active');
  },

  closeWhatsNew() {
    document.getElementById('whatsnew-modal').classList.remove('active');
  },

  // Toast — supports optional click callback
  toast(message, type = 'info', onClick = null) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    if (onClick) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', () => { toast.remove(); onClick(); });
    }
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, onClick ? 5000 : 2500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
