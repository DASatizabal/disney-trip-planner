const Planner = {
  _planState: null,
  _activeDayIndex: 0,

  loadState(planState) {
    this._planState = planState;
  },

  getState() {
    return this._planState;
  },

  render() {
    const container = document.getElementById('planner-container');
    container.innerHTML = '';

    TRIP_DAYS.forEach((td, idx) => {
      const day = this._planState.days[td.date];
      const col = this._renderDayColumn(td, day, idx);
      container.appendChild(col);
    });

    this._renderDots();
    this.renderCreditDashboard();
    this._renderConflicts();
    lucide.createIcons();
  },

  _renderDayColumn(td, day, idx) {
    const col = document.createElement('div');
    col.className = 'day-column glass-card p-3 ' +
      (td.overlapPool ? 'pool-overlap-card' : td.pool === 'A' ? 'pool-a-card' : 'pool-b-card');
    col.dataset.date = td.date;

    const dateLabel = new Date(td.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const parkColor = this._parkColor(day.park);

    col.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-bold">${td.dow}</span>
            <span class="text-xs text-white/40">${dateLabel}</span>
          </div>
          <div class="flex items-center gap-1 mt-0.5 flex-wrap">
            <span class="badge badge-pool-${td.pool.toLowerCase()}">${td.pool}</span>
            ${td.overlapPool ? `<span class="badge badge-pool-${td.overlapPool.toLowerCase()}">${td.overlapPool}</span>` : ''}
            ${td.vip ? '<span class="badge badge-vip">VIP</span>' : ''}
            ${td.isCheckin ? '<span class="badge badge-checkin">Check-in</span>' : ''}
            ${td.isCheckout ? '<span class="badge badge-checkout">Check-out</span>' : ''}
          </div>
        </div>
        <div class="relative">
          <button onclick="Planner.toggleDayMenu('${td.date}')" class="p-1 hover:bg-white/10 rounded-lg">
            <i data-lucide="more-vertical" class="w-4 h-4 text-white/40"></i>
          </button>
          <div class="dropdown-menu" id="day-menu-${td.date}">
            ${day.splitDay
              ? `<div class="dropdown-item" onclick="Planner.toggleSplit('${td.date}')"><i data-lucide="merge" class="w-3.5 h-3.5"></i> Unsplit day</div>`
              : `<div class="dropdown-item" onclick="Planner.toggleSplit('${td.date}')"><i data-lucide="split" class="w-3.5 h-3.5"></i> Split day</div>`
            }
            <div class="dropdown-item" onclick="Planner.startSwap('${td.date}')"><i data-lucide="arrow-left-right" class="w-3.5 h-3.5"></i> Swap with...</div>
            <div class="dropdown-item" onclick="Planner.startClone('${td.date}')"><i data-lucide="copy" class="w-3.5 h-3.5"></i> Clone to...</div>
            <div class="dropdown-item" onclick="Planner.clearDay('${td.date}')"><i data-lucide="eraser" class="w-3.5 h-3.5 text-red-400"></i> Clear all</div>
          </div>
        </div>
      </div>

      <!-- Park selector -->
      <div class="mb-2">
        <select onchange="Planner.changePark('${td.date}', this.value)"
          class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer ${parkColor}">
          ${PARK_OPTIONS.map(p => `<option value="${p}" ${day.park === p ? 'selected' : ''}>${p}</option>`).join('')}
          <option value="none" ${day.park === 'none' ? 'selected' : ''}>No Park</option>
        </select>
      </div>

      ${day.splitDay ? this._renderSplitParks(td.date, day) : ''}

      <!-- Meal slots -->
      <div class="space-y-1.5">
        ${day.splitDay ? '<div class="text-[10px] text-white/30 uppercase tracking-wider mt-1">Morning / Midday</div>' : ''}
        ${this._renderSlot(td, day, 'breakfast')}
        ${this._renderSlot(td, day, 'lunch')}
        ${day.splitDay ? `
          <div class="split-divider"><span>Park Hop</span></div>
          <div class="text-[10px] text-white/30 uppercase tracking-wider">Afternoon / Evening</div>
        ` : ''}
        ${this._renderSlot(td, day, 'dinner')}
        <div class="mt-2">
          <div class="text-[10px] text-white/30 uppercase tracking-wider mb-1 flex items-center gap-1">
            <i data-lucide="cookie" class="w-3 h-3"></i> Snacks
            <span class="text-white/20">(${this._snackCount(day)}/4)</span>
          </div>
          ${day.splitDay ? `
            <div class="text-[9px] text-white/20 mb-1">AM</div>
            <div class="grid grid-cols-2 gap-1 mb-1">
              ${['snack1', 'snack2'].map(s => this._renderSnackSlot(td, day, s)).join('')}
            </div>
            <div class="text-[9px] text-white/20 mb-1">PM</div>
            <div class="grid grid-cols-2 gap-1">
              ${['snack3', 'snack4'].map(s => this._renderSnackSlot(td, day, s)).join('')}
            </div>
          ` : `
            <div class="grid grid-cols-2 gap-1">
              ${['snack1', 'snack2', 'snack3', 'snack4'].map(s => this._renderSlot(td, day, s)).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- Day notes -->
      <div class="mt-2 pt-2 border-t border-white/5">
        <textarea
          placeholder="Day notes..."
          class="w-full bg-transparent text-[11px] text-white/40 resize-none focus:text-white/70 focus:outline-none"
          rows="1"
          onchange="Planner.updateNotes('${td.date}', this.value)"
          onfocus="this.rows=3" onblur="this.rows=1"
        >${day.notes || ''}</textarea>
      </div>
    `;

    return col;
  },

  _renderSplitParks(date, day) {
    const sp = day.splitParks || { am: day.park, pm: day.park };
    const ratio = day.splitRatio || { am: 50, pm: 50 };
    const parkOpts = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs', 'Water Park - Typhoon Lagoon', 'Water Park - Blizzard Beach', 'Resort Day'];
    return `
      <div class="grid grid-cols-2 gap-1 mb-1">
        <select onchange="Planner.changeSplitPark('${date}', 'am', this.value)"
          class="bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none cursor-pointer">
          ${parkOpts.map(p => `<option value="${p}" ${sp.am === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <select onchange="Planner.changeSplitPark('${date}', 'pm', this.value)"
          class="bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none cursor-pointer">
          ${parkOpts.map(p => `<option value="${p}" ${sp.pm === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="flex items-center gap-1 mb-2">
        <span class="text-[9px] text-white/30 w-6">${ratio.am}%</span>
        <input type="range" min="10" max="90" step="10" value="${ratio.am}"
          onchange="Planner.changeSplitRatio('${date}', this.value)"
          class="flex-1 h-1 appearance-none bg-white/10 rounded cursor-pointer" style="accent-color: var(--pool-a);">
        <span class="text-[9px] text-white/30 w-6 text-right">${ratio.pm}%</span>
      </div>
    `;
  },

  changeSplitRatio(date, amPct) {
    const am = parseInt(amPct);
    this._planState.days[date].splitRatio = { am, pm: 100 - am };
    Scenarios.save(this._planState);
    this.render();
    lucide.createIcons();
  },

  _renderSlot(td, day, slot) {
    const sel = day.selections[slot];
    const isSnack = slot.startsWith('snack');

    if (!sel) {
      return `
        <div class="meal-slot meal-slot-empty flex items-center justify-center gap-1 text-white/20 hover:text-white/40 ${isSnack ? 'py-2' : 'py-3'}"
             onclick="Planner.onSlotClick('${td.date}', '${slot}')">
          <i data-lucide="plus" class="w-3 h-3"></i>
          <span class="text-[10px]">${isSnack ? '' : MEAL_LABELS[slot]}</span>
        </div>
      `;
    }

    let r = CreditEngine._getRestaurant(sel.restaurantId);
    // Fallback for CSV-only entries (string IDs)
    if (!r && typeof sel.restaurantId === 'string') {
      const name = sel.restaurantId.replace(/^_csv_/, '').replace(/_/g, ' ');
      r = RestaurantMerge.findByName(name);
    }
    if (!r) return '';

    const badgeClass = this._creditBadgeClass(r.creditType);
    const payBadge = sel.paymentMethod === 'ddp'
      ? `<span class="badge badge-pool-${(sel.pool || td.pool).toLowerCase()}">DDP ${sel.pool || td.pool}</span>`
      : sel.paymentMethod === 'vip'
        ? '<span class="badge badge-vip">VIP</span>'
        : sel.paymentMethod === 'ap'
          ? '<span class="badge badge-vip">AP</span>'
          : '<span class="badge badge-oop">OOP</span>';

    // C5: AP discount badge
    const apBadge = (r.apDiscountPct && sel.paymentMethod !== 'ap')
      ? `<span class="text-[9px] text-amber-400/50">AP ${r.apDiscountPct}%</span>` : '';

    return `
      <div class="meal-slot meal-slot-filled relative group ${isSnack ? '' : ''}"
           onclick="Planner.onSlotClick('${td.date}', '${slot}')">
        <div class="flex items-start justify-between gap-1">
          <div class="min-w-0 flex-1">
            ${!isSnack ? `<div class="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">${MEAL_LABELS[slot]}</div>` : ''}
            <div class="text-xs font-medium truncate">${r.name}</div>
            <div class="flex items-center gap-1 mt-0.5 flex-wrap">
              <span class="badge ${badgeClass}">${r.creditType}</span>
              ${payBadge}
              ${apBadge}
              ${r.seafoodWarning ? '<span class="badge badge-seafood" title="Seafood - Lisa allergy">SEAFOOD</span>' : ''}
              ${r.familyReview === 'loved' ? '<span class="badge badge-loved">LOVED</span>' : ''}
              ${r.familyReview === 'liked' ? '<span class="badge badge-loved">LIKED</span>' : ''}
              ${r.familyReview === 'skip' ? '<span class="badge badge-skip">SKIP</span>' : ''}
              ${r.isCharacter ? '<span class="badge badge-character">CHARS</span>' : ''}
            </div>
          </div>
          <button onclick="event.stopPropagation(); Planner.clearSlot('${td.date}', '${slot}')"
            class="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-opacity flex-shrink-0">
            <i data-lucide="x" class="w-3 h-3 text-white/40"></i>
          </button>
        </div>
      </div>
    `;
  },

  // B2: Snack slot with AM/PM toggle in split days
  _renderSnackSlot(td, day, slot) {
    const period = day.selections[slot]?._splitPeriod || (slot <= 'snack2' ? 'am' : 'pm');
    return this._renderSlot(td, day, slot);
  },

  toggleSnackPeriod(date, slot) {
    const sel = this._planState.days[date].selections[slot];
    if (!sel) return;
    sel._splitPeriod = (sel._splitPeriod || (slot <= 'snack2' ? 'am' : 'pm')) === 'am' ? 'pm' : 'am';
    this._onChanged();
  },

  _creditBadgeClass(creditType) {
    const map = { '1TS': 'badge-ts', '2TS': 'badge-2ts', 'QS': 'badge-qs', 'SN': 'badge-sn', 'OOP': 'badge-oop' };
    return map[creditType] || 'badge-ts';
  },

  _parkColor(park) {
    const map = {
      'Magic Kingdom': 'park-mk', 'EPCOT': 'park-epcot',
      'Hollywood Studios': 'park-hs', 'Animal Kingdom': 'park-ak',
      'Disney Springs': 'park-ds', 'Resort Day': 'park-resort',
      'Water Park - Typhoon Lagoon': 'park-water', 'Water Park - Blizzard Beach': 'park-water'
    };
    return map[park] || '';
  },

  _snackCount(day) {
    return ['snack1', 'snack2', 'snack3', 'snack4'].filter(s => day.selections[s]).length;
  },

  // Credit Dashboard
  renderCreditDashboard() {
    ['A', 'B'].forEach(poolId => {
      const balance = CreditEngine.getBalance(poolId, this._planState);
      const p = poolId.toLowerCase();

      ['ts', 'qs', 'sn'].forEach(type => {
        const b = balance[type];
        const pct = b.total > 0 ? Math.max(0, (b.remaining / b.total) * 100) : 0;
        const color = pct > 50 ? 'green' : pct > 25 ? 'yellow' : 'red';

        const label = document.getElementById(`pool-${p}-${type}`);
        const bar = document.getElementById(`pool-${p}-${type}-bar`);
        if (label) label.textContent = `${b.remaining}/${b.total}`;
        if (bar) {
          bar.style.width = `${pct}%`;
          bar.className = `credit-bar-fill ${color}`;
        }
      });

      // Compact mobile display
      const compact = document.getElementById(`pool-${p}-compact`);
      if (compact) {
        const ba = balance;
        compact.textContent = `${ba.ts.remaining}ts ${ba.qs.remaining}qs ${ba.sn.remaining}sn`;
        compact.className = [ba.ts, ba.qs, ba.sn].some(b => b.remaining < 0) ? 'text-red-400' : '';
      }
    });

    // C6: OOP tracker
    const oop = CreditEngine.estimateOOPDetailed(this._planState);
    const rewardsInput = document.getElementById('rewards-dollars');
    const rewards = parseFloat(rewardsInput?.value) || 0;
    const net = Math.max(0, oop.committed - rewards);

    const oopEl = document.getElementById('oop-committed');
    const netEl = document.getElementById('oop-net');
    const savingsEl = document.getElementById('oop-savings');
    if (oopEl) oopEl.textContent = `$${oop.committed}`;
    if (netEl) netEl.textContent = `$${net}`;
    if (savingsEl) {
      const totalSavings = oop.vipSavings + oop.apSavings;
      savingsEl.textContent = totalSavings > 0 ? `Saving $${totalSavings} (VIP $${oop.vipSavings} + AP $${oop.apSavings})` : '';
    }
  },

  // Conflicts
  _renderConflicts() {
    const conflicts = CreditEngine.detectConflicts(this._planState);
    const container = document.getElementById('conflicts-container');
    const list = document.getElementById('conflicts-list');

    if (conflicts.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    list.innerHTML = conflicts.map(c => {
      const icon = c.type === 'overdraft' ? 'alert-triangle' : c.type === 'missed_vip' ? 'sparkles' : 'map-pin';
      const cls = c.severity === 'error' ? 'conflict-warning' : c.severity === 'tip'
        ? 'conflict-warning' : 'conflict-warning';
      const style = c.severity === 'tip'
        ? 'background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.25); color: #fbbf24;'
        : c.severity === 'warning'
          ? 'background: rgba(251,191,36,0.08); border-color: rgba(251,191,36,0.25); color: #fde68a;'
          : '';
      return `<div class="${cls}" style="${style}">
        <i data-lucide="${icon}" class="w-3 h-3 inline mr-1"></i>${c.message}
      </div>`;
    }).join('');
  },

  // Dots for mobile
  _renderDots() {
    const dots = document.getElementById('day-dots');
    dots.innerHTML = TRIP_DAYS.map((_, i) =>
      `<div class="day-dot ${i === this._activeDayIndex ? 'active' : ''}" onclick="Planner.goToDay(${i})"></div>`
    ).join('');
  },

  goToDay(index) {
    this._activeDayIndex = Math.max(0, Math.min(index, TRIP_DAYS.length - 1));
    const container = document.getElementById('planner-container');
    const cols = container.querySelectorAll('.day-column');
    if (cols[this._activeDayIndex]) {
      cols[this._activeDayIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
    this._renderDots();
  },

  // Slot click -> open picker
  onSlotClick(date, slot) {
    this._closeAllMenus();
    RestaurantPicker.open(date, slot, (restaurantId, paymentMethod, pool) => {
      this._applySelection(date, slot, restaurantId, paymentMethod, pool);
    });
  },

  _applySelection(date, slot, restaurantId, paymentMethod, pool) {
    // B6: Check for overdraft before committing DDP selections
    if (paymentMethod === 'ddp' && pool && typeof restaurantId === 'number') {
      const check = CreditEngine.wouldOverdraft(pool, restaurantId, this._planState);
      if (!check.ok) {
        const r = CreditEngine._getRestaurant(restaurantId);
        const typeName = (check.creditType || 'ts').toUpperCase();
        App.confirm(
          'Credit Overdraft',
          `Bucket ${pool} ${typeName}: ${check.currentRemaining}/${check.total} remaining → would be ${check.afterRemaining}/${check.total}. Use this credit anyway (shows as over budget) or pay OOP instead?`,
          () => { this._commitSelection(date, slot, restaurantId, paymentMethod, pool); },
          true,
          'Use Anyway',
          'Pay OOP',
          () => { this._commitSelection(date, slot, restaurantId, 'oop', null); }
        );
        return;
      }
    }
    this._commitSelection(date, slot, restaurantId, paymentMethod, pool);
  },

  _commitSelection(date, slot, restaurantId, paymentMethod, pool) {
    History.push(JSON.parse(JSON.stringify(this._planState)));

    this._planState.days[date].selections[slot] = {
      restaurantId,
      paymentMethod,
      pool: paymentMethod === 'ddp' ? pool : null,
      notes: '',
      adrNumber: ''
    };

    this._onChanged();
  },

  clearSlot(date, slot) {
    if (!this._planState.days[date].selections[slot]) return;
    History.push(JSON.parse(JSON.stringify(this._planState)));
    this._planState.days[date].selections[slot] = null;
    this._onChanged();
  },

  clearDay(date) {
    this._closeAllMenus();
    App.confirm('Clear All Selections', `Remove all meals from ${TRIP_DAYS.find(d => d.date === date)?.dow || date}?`, () => {
      History.push(JSON.parse(JSON.stringify(this._planState)));
      MEAL_SLOTS.forEach(slot => { this._planState.days[date].selections[slot] = null; });
      this._onChanged();
    });
  },

  // Park changes — C1: detect stranded selections and offer review
  changePark(date, park) {
    History.push(JSON.parse(JSON.stringify(this._planState)));
    const day = this._planState.days[date];
    const oldPark = day.park;
    day.park = park;
    if (park === 'Split Day') {
      day.splitDay = true;
      if (!day.splitParks) {
        day.splitParks = { am: 'Magic Kingdom', pm: 'EPCOT' };
      }
    }
    this._onChanged();

    // C1: Check for stranded selections after park change
    if (park !== oldPark && park !== 'none' && !park.startsWith('Resort') && !park.startsWith('Travel') && !park.startsWith('Split')) {
      const stranded = [];
      MEAL_SLOTS.forEach(slot => {
        const sel = day.selections[slot];
        if (!sel) return;
        const r = CreditEngine._getRestaurant(sel.restaurantId);
        if (!r) return;
        const isParkRestaurant = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs'].includes(r.location);
        if (isParkRestaurant && r.location !== park) {
          stranded.push({ slot, name: r.name, location: r.location, creditType: r.creditType });
        }
      });

      if (stranded.length > 0) {
        const names = stranded.map(s => s.name).join(', ');
        App.toast(`${stranded.length} selection${stranded.length > 1 ? 's' : ''} at different park: ${names}`, 'warning');
      }
    }
  },

  changeSplitPark(date, period, park) {
    History.push(JSON.parse(JSON.stringify(this._planState)));
    if (!this._planState.days[date].splitParks) {
      this._planState.days[date].splitParks = { am: 'Magic Kingdom', pm: 'EPCOT' };
    }
    this._planState.days[date].splitParks[period] = park;
    this._onChanged();
  },

  toggleSplit(date) {
    this._closeAllMenus();
    History.push(JSON.parse(JSON.stringify(this._planState)));
    const day = this._planState.days[date];
    day.splitDay = !day.splitDay;
    if (day.splitDay && !day.splitParks) {
      day.splitParks = { am: day.park !== 'none' ? day.park : 'Magic Kingdom', pm: 'EPCOT' };
      day.park = 'Split Day';
    } else if (!day.splitDay) {
      day.park = day.splitParks?.am || 'none';
      day.splitParks = null;
    }
    this._onChanged();
  },

  // Swap days
  startSwap(fromDate) {
    this._closeAllMenus();
    this._showDayAction('Swap With...', `Move ${TRIP_DAYS.find(d => d.date === fromDate)?.dow}'s selections to another day`, fromDate, (toDate) => {
      History.push(JSON.parse(JSON.stringify(this._planState)));

      const fromDay = this._planState.days[fromDate];
      const toDay = this._planState.days[toDate];

      const tempSel = JSON.parse(JSON.stringify(fromDay.selections));
      const tempNotes = fromDay.notes;
      const tempPark = fromDay.park;
      const tempSplit = fromDay.splitDay;
      const tempSplitParks = fromDay.splitParks ? JSON.parse(JSON.stringify(fromDay.splitParks)) : null;

      fromDay.selections = JSON.parse(JSON.stringify(toDay.selections));
      fromDay.notes = toDay.notes;
      fromDay.park = toDay.park;
      fromDay.splitDay = toDay.splitDay;
      fromDay.splitParks = toDay.splitParks ? JSON.parse(JSON.stringify(toDay.splitParks)) : null;

      toDay.selections = tempSel;
      toDay.notes = tempNotes;
      toDay.park = tempPark;
      toDay.splitDay = tempSplit;
      toDay.splitParks = tempSplitParks;

      // Re-assign pools on DDP selections
      this._reassignPools(fromDate);
      this._reassignPools(toDate);

      this._onChanged();
      App.toast('Days swapped', 'success');
    });
  },

  startClone(fromDate) {
    this._closeAllMenus();
    this._showDayAction('Clone To...', `Copy ${TRIP_DAYS.find(d => d.date === fromDate)?.dow}'s plan to another day`, fromDate, (toDate) => {
      // B7: Check for overdrafts before committing clone
      const fromDay = this._planState.days[fromDate];
      const targetTd = TRIP_DAYS.find(d => d.date === toDate);
      const targetPool = targetTd?.pool;

      // Simulate: what would the balance be after cloning?
      const ddpSelections = Object.values(fromDay.selections).filter(s => s && s.paymentMethod === 'ddp');
      if (targetPool && ddpSelections.length > 0) {
        // Temporarily simulate the clone to check overdraft
        const simState = JSON.parse(JSON.stringify(this._planState));
        simState.days[toDate].selections = JSON.parse(JSON.stringify(fromDay.selections));
        Object.values(simState.days[toDate].selections).forEach(sel => {
          if (sel && sel.paymentMethod === 'ddp') sel.pool = targetPool;
        });

        const balance = CreditEngine.getBalance(targetPool, simState);
        const overdrafts = ['ts', 'qs', 'sn'].filter(t => balance[t].remaining < 0);

        if (overdrafts.length > 0) {
          const details = overdrafts.map(t =>
            `${t.toUpperCase()}: ${balance[t].remaining}/${balance[t].total}`
          ).join(', ');
          App.confirm(
            'Clone Would Overdraft',
            `Cloning to ${targetTd.dow} (Bucket ${targetPool}) would exceed credits: ${details}. Clone anyway?`,
            () => { this._executeClone(fromDate, toDate); },
            true, 'Clone Anyway', 'Cancel'
          );
          return;
        }
      }

      this._executeClone(fromDate, toDate);
    });
  },

  _executeClone(fromDate, toDate) {
    History.push(JSON.parse(JSON.stringify(this._planState)));

    const fromDay = this._planState.days[fromDate];
    const toDay = this._planState.days[toDate];

    toDay.selections = JSON.parse(JSON.stringify(fromDay.selections));
    toDay.notes = fromDay.notes;
    toDay.park = fromDay.park;
    toDay.splitDay = fromDay.splitDay;
    toDay.splitParks = fromDay.splitParks ? JSON.parse(JSON.stringify(fromDay.splitParks)) : null;

    this._reassignPools(toDate);

    this._onChanged();
    App.toast('Day cloned', 'success');
  },

  _reassignPools(date) {
    const td = TRIP_DAYS.find(d => d.date === date);
    if (!td) return;
    const day = this._planState.days[date];
    Object.values(day.selections).forEach(sel => {
      if (sel && sel.paymentMethod === 'ddp') {
        sel.pool = td.pool;
      }
    });
  },

  _dayActionCallback: null,

  _showDayAction(title, subtitle, excludeDate, callback) {
    this._dayActionCallback = callback;
    const modal = document.getElementById('day-action-modal');
    document.getElementById('day-action-title').textContent = title;
    document.getElementById('day-action-subtitle').textContent = subtitle;

    const targets = document.getElementById('day-action-targets');
    targets.innerHTML = TRIP_DAYS.filter(d => d.date !== excludeDate).map(d => {
      const dateLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `<div class="dropdown-item" onclick="Planner._executeDayAction('${d.date}')">
        <span class="font-medium">${d.dow}</span>
        <span class="text-white/40">${dateLabel}</span>
        <span class="badge badge-pool-${d.pool.toLowerCase()} ml-auto">${d.pool}</span>
      </div>`;
    }).join('');

    modal.classList.add('active');
  },

  _executeDayAction(targetDate) {
    this.closeDayAction();
    if (this._dayActionCallback) {
      this._dayActionCallback(targetDate);
      this._dayActionCallback = null;
    }
  },

  closeDayAction() {
    document.getElementById('day-action-modal').classList.remove('active');
  },

  updateNotes(date, text) {
    this._planState.days[date].notes = text;
    Scenarios.save(this._planState);
  },

  // Day menu
  toggleDayMenu(date) {
    const menu = document.getElementById(`day-menu-${date}`);
    const wasActive = menu.classList.contains('active');
    this._closeAllMenus();
    if (!wasActive) menu.classList.add('active');
  },

  _closeAllMenus() {
    document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
  },

  _onChanged() {
    Scenarios.save(this._planState);
    this.render();
    App.updateUndoRedo();
  }
};

// Close menus on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown-menu') && !e.target.closest('[onclick*="toggleDayMenu"]')) {
    Planner._closeAllMenus();
  }
});
