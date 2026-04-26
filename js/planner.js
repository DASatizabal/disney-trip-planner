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
            ${day.splitDay ? '<span class="badge badge-split">SPLIT</span>' : ''}
            ${td.vip ? '<span class="badge badge-vip">VIP</span>' : ''}
            ${td.isCheckin ? '<span class="badge badge-checkin">Check-in</span>' : ''}
            ${td.isCheckout ? '<span class="badge badge-checkout">Check-out</span>' : ''}
            ${day.notes ? '<span class="note-indicator" title="Has notes"></span>' : ''}
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

      ${this._renderTimeline(td, day)}

      <!-- D1: Day notes — button to expand -->
      <div class="mt-2 pt-2 border-t border-white/5">
        ${day.notes ? `
          <div class="text-[11px] text-white/40 mb-1 cursor-pointer" onclick="this.nextElementSibling.style.display='block'; this.style.display='none';">
            <i data-lucide="sticky-note" class="w-3 h-3 inline text-amber-400/50"></i> ${day.notes.length > 60 ? day.notes.substring(0, 60) + '...' : day.notes}
          </div>
          <textarea style="display:none"
            class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white/60 resize-none focus:text-white/80 focus:outline-none"
            rows="3"
            onchange="Planner.updateNotes('${td.date}', this.value)"
            onblur="Planner.render(); lucide.createIcons();"
          >${day.notes}</textarea>
        ` : `
          <button onclick="this.nextElementSibling.style.display='block'; this.style.display='none'; this.nextElementSibling.focus();"
            class="text-[10px] text-white/20 hover:text-white/40 flex items-center gap-1">
            <i data-lucide="plus" class="w-3 h-3"></i> Add note
          </button>
          <textarea style="display:none"
            class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white/60 resize-none focus:text-white/80 focus:outline-none"
            rows="3" placeholder="Day notes..."
            onchange="Planner.updateNotes('${td.date}', this.value)"
            onblur="if(!this.value) { this.style.display='none'; this.previousElementSibling.style.display=''; }"
          ></textarea>
        `}
      </div>
    `;

    return col;
  },

  _renderSplitParks(date, day) {
    const sp = day.splitParks || { am: day.park, pm: day.park };
    const parkOpts = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs', 'Water Park - Typhoon Lagoon', 'Water Park - Blizzard Beach', 'Resort Day'];
    return `
      <div class="grid grid-cols-2 gap-1 mb-2">
        <select onchange="Planner.changeSplitPark('${date}', 'am', this.value)"
          class="bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none cursor-pointer">
          ${parkOpts.map(p => `<option value="${p}" ${sp.am === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <select onchange="Planner.changeSplitPark('${date}', 'pm', this.value)"
          class="bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none cursor-pointer">
          ${parkOpts.map(p => `<option value="${p}" ${sp.pm === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
    `;
  },

  // Build a time-sorted timeline of meals + events for one day.
  _buildTimeline(day) {
    const items = [];
    MEAL_SLOTS.forEach(slot => {
      const sel = day.selections[slot];
      if (sel) {
        items.push({
          kind: 'meal',
          slot,
          time: sel.time || DEFAULT_MEAL_TIMES[slot],
          sel
        });
      }
    });
    (day.events || []).forEach(ev => {
      items.push({ kind: 'event', time: ev.time || '12:00', ev });
    });
    items.sort((a, b) => {
      const t = a.time.localeCompare(b.time);
      if (t !== 0) return t;
      // Stable tiebreaker: meals before events at same time
      if (a.kind !== b.kind) return a.kind === 'meal' ? -1 : 1;
      return 0;
    });
    return items;
  },

  _renderTimeline(td, day) {
    const items = this._buildTimeline(day);
    const dividerTime = day.splitDividerTime || DEFAULT_SPLIT_DIVIDER_TIME;
    let dividerInserted = false;

    const itemsHtml = items.map(item => {
      let prefix = '';
      if (day.splitDay && !dividerInserted && item.time >= dividerTime) {
        dividerInserted = true;
        prefix = this._renderSplitDivider(td.date, day);
      }
      const itemHtml = item.kind === 'meal'
        ? this._renderTimelineMeal(td, day, item.slot, item.sel)
        : this._renderTimelineEvent(td.date, item.ev);
      return prefix + itemHtml;
    }).join('');

    const trailingDivider = day.splitDay && !dividerInserted
      ? this._renderSplitDivider(td.date, day)
      : '';

    const filledMeals = MEAL_SLOTS.filter(s => day.selections[s]);
    const emptyMeals = MEAL_SLOTS.filter(s => !day.selections[s]);

    const addRow = `
      <div class="timeline-add-row">
        ${emptyMeals.length > 0 ? `
          <button class="timeline-add-btn" onclick="Planner.openMealSlotPicker('${td.date}')">
            <i data-lucide="plus" class="w-3 h-3"></i> Add meal
          </button>
        ` : ''}
        <button class="timeline-add-btn" onclick="Planner.openEventEditor('${td.date}')">
          <i data-lucide="calendar-plus" class="w-3 h-3"></i> Add event
        </button>
      </div>
    `;

    const emptyDropTargets = `
      <div class="timeline-empty-slots">
        <div class="timeline-empty-slots-label">Drop targets</div>
        ${emptyMeals.map(s => `
          <div class="meal-slot meal-slot-empty drop-target-meal flex items-center justify-center gap-1 text-white/30"
               data-date="${td.date}" data-slot="${s}">
            <i data-lucide="plus" class="w-3 h-3"></i>
            <span class="text-[10px]">${MEAL_LABELS[s]}</span>
          </div>
        `).join('')}
      </div>
    `;

    return `
      <div class="space-y-1.5 relative" data-day-timeline="${td.date}">
        ${itemsHtml || (day.splitDay ? '' : '<div class="text-[10px] text-white/25 text-center py-2">No meals or events yet</div>')}
        ${trailingDivider}
        ${addRow}
        ${emptyDropTargets}
      </div>
    `;
  },

  _renderSplitDivider(date, day) {
    const time = day.splitDividerTime || DEFAULT_SPLIT_DIVIDER_TIME;
    return `
      <div class="split-divider-draggable" data-date="${date}"
           onpointerdown="Planner._beginDividerDrag(event, '${date}')">
        <span class="divider-label">
          <i data-lucide="grip-horizontal" class="w-3 h-3"></i>
          Park Hop · ${formatTime12h(time)}
        </span>
      </div>
    `;
  },

  _renderTimelineMeal(td, day, slot, sel) {
    let r = CreditEngine._getRestaurant(sel.restaurantId);
    if (!r && typeof sel.restaurantId === 'string') {
      const name = sel.restaurantId.replace(/^_csv_/, '').replace(/_/g, ' ');
      r = RestaurantMerge.findByName(name);
    }
    if (!r) {
      day.selections[slot] = null;
      return '';
    }

    const time = sel.time || DEFAULT_MEAL_TIMES[slot];
    const badgeClass = this._creditBadgeClass(r.creditType);
    const payBadge = sel.paymentMethod === 'ddp'
      ? `<span class="badge badge-pool-${(sel.pool || td.pool).toLowerCase()}">DDP ${sel.pool || td.pool}</span>`
      : sel.paymentMethod === 'vip'
        ? '<span class="badge badge-vip">VIP</span>'
        : sel.paymentMethod === 'ap'
          ? '<span class="badge badge-vip">AP</span>'
          : '<span class="badge badge-oop">OOP</span>';

    const apBadge = (r.apDiscountPct && sel.paymentMethod !== 'ap')
      ? `<span class="text-[9px] text-amber-400/50">AP ${r.apDiscountPct}%</span>` : '';

    const diners = CreditEngine.selectionDiners(sel);
    const credits = CreditEngine.countCreditsForSelection(sel, r);
    const dinerTitle = diners.map(id => {
      const m = FAMILY.find(f => f.id === id);
      return m ? m.name : id;
    }).join(', ');
    const dinerBadge = `<button draggable="false" onclick="event.stopPropagation(); Planner.openDinersEditor('${td.date}', '${slot}')"
      class="text-[9px] px-1 py-0 rounded border border-white/10 text-white/50 hover:text-white/80 hover:border-white/30 transition-colors"
      title="${dinerTitle}">
      <i data-lucide="users" class="w-2.5 h-2.5 inline -mt-0.5"></i> ${diners.length}${credits && sel.paymentMethod === 'ddp' ? '·' + credits : ''}
    </button>`;

    const dayPark = parkForTime(day, time);
    const isParkRestaurant = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs'].includes(r.location);
    const isMismatch = isParkRestaurant && dayPark && dayPark !== 'none' && !dayPark.startsWith('Resort') && !dayPark.startsWith('Travel') && !dayPark.startsWith('Split') && r.location !== dayPark;
    const mismatchClass = isMismatch ? 'meal-slot-mismatch' : '';
    const mismatchIcon = isMismatch ? '<i data-lucide="map-pin-off" class="w-3 h-3 text-amber-400/60 flex-shrink-0" title="Different park"></i>' : '';

    return `
      <div class="meal-slot meal-slot-filled relative group ${mismatchClass}"
           draggable="true"
           data-date="${td.date}" data-slot="${slot}"
           onclick="Planner.onSlotClick('${td.date}', '${slot}')">
        <div class="flex items-start justify-between gap-1">
          <div class="min-w-0 flex-1">
            <div class="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">
              <span class="meal-time">${formatTime12h(time)}</span>${MEAL_LABELS[slot]}
            </div>
            <div class="text-xs font-medium truncate">${r.name}</div>
            <div class="flex items-center gap-1 mt-0.5 flex-wrap">
              <span class="badge ${badgeClass}">${r.creditType}</span>
              ${payBadge}
              ${dinerBadge}
              ${apBadge}
              ${r.seafoodWarning ? '<span class="badge badge-seafood" title="Seafood - Lisa allergy">SEAFOOD</span>' : ''}
              ${r.familyReview === 'loved' ? '<span class="badge badge-loved">LOVED</span>' : ''}
              ${r.familyReview === 'liked' ? '<span class="badge badge-loved">LIKED</span>' : ''}
              ${r.familyReview === 'skip' ? '<span class="badge badge-skip">SKIP</span>' : ''}
              ${r.isCharacter ? '<span class="badge badge-character">CHARS</span>' : ''}
            </div>
          </div>
          ${mismatchIcon}
          <button draggable="false" onclick="event.stopPropagation(); Planner.clearSlot('${td.date}', '${slot}')"
            class="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-opacity flex-shrink-0">
            <i data-lucide="x" class="w-3 h-3 text-white/40"></i>
          </button>
          <button draggable="false" onclick="event.stopPropagation(); Planner.openTimeEditor('${td.date}', '${slot}')"
            class="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-opacity flex-shrink-0"
            title="Edit time">
            <i data-lucide="clock" class="w-3 h-3 text-white/40"></i>
          </button>
        </div>
      </div>
    `;
  },

  _renderTimelineEvent(date, ev) {
    const kind = EVENT_KIND_MAP[ev.kind] || EVENT_KIND_MAP.other;
    const durationLabel = ev.durationMinutes
      ? ` <span class="text-[10px] text-white/30">(${ev.durationMinutes}m)</span>`
      : '';
    return `
      <div class="timeline-event group" draggable="false"
           data-date="${date}" data-event-id="${ev.id}"
           onclick="Planner.openEventEditor('${date}', '${ev.id}')">
        <span class="meal-time">${formatTime12h(ev.time)}</span>
        <i data-lucide="${kind.icon}" class="w-3 h-3 text-amber-400 flex-shrink-0"></i>
        <span class="event-name">${this._escapeHtml(ev.name)}${durationLabel}</span>
        ${ev.location ? `<span class="event-location">${this._escapeHtml(ev.location)}</span>` : ''}
        <button onclick="event.stopPropagation(); Planner.deleteEvent('${date}', '${ev.id}')"
          class="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-opacity flex-shrink-0">
          <i data-lucide="x" class="w-3 h-3 text-white/40"></i>
        </button>
      </div>
    `;
  },

  _escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Two-screen "Add Meal" flow: first pick a slot, then transition to the restaurant picker
  openMealSlotPicker(date) {
    this._closeAllMenus();
    const day = this._planState.days[date];
    if (!day) return;
    const td = TRIP_DAYS.find(d => d.date === date);
    const emptyMeals = MEAL_SLOTS.filter(s => !day.selections[s]);
    if (emptyMeals.length === 0) {
      App.toast('All meal slots are filled for this day', 'info');
      return;
    }

    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    document.getElementById('meal-slot-modal-subtitle').textContent = `${dateLabel} — ${day.park}`;

    const grid = document.getElementById('meal-slot-options');
    grid.innerHTML = emptyMeals.map(slot => `
      <button onclick="Planner._pickMealSlot('${date}', '${slot}')"
        class="flex flex-col items-start gap-1 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-colors text-left">
        <div class="flex items-center gap-2 w-full">
          <i data-lucide="${MEAL_ICONS[slot]}" class="w-4 h-4 text-amber-400"></i>
          <span class="text-sm font-medium">${MEAL_LABELS[slot]}</span>
        </div>
        <span class="text-[10px] text-white/40">${formatTime12h(DEFAULT_MEAL_TIMES[slot])}</span>
      </button>
    `).join('');

    document.getElementById('meal-slot-modal').classList.add('active');
    lucide.createIcons();
  },

  closeMealSlotPicker() {
    document.getElementById('meal-slot-modal').classList.remove('active');
  },

  _pickMealSlot(date, slot) {
    this.closeMealSlotPicker();
    this.onSlotClick(date, slot);
  },

  // Lightweight inline time editor — uses a prompt-style approach via the input modal
  openTimeEditor(date, slot) {
    const sel = this._planState.days[date]?.selections[slot];
    if (!sel) return;
    const current = sel.time || DEFAULT_MEAL_TIMES[slot];
    App.inputModal(
      `${MEAL_LABELS[slot]} time`,
      `Set the time (HH:MM, 24-hour) for ${MEAL_LABELS[slot]}.`,
      current,
      (value) => {
        if (!value) return;
        if (!/^\d{1,2}:\d{2}$/.test(value)) {
          App.toast('Invalid time format. Use HH:MM (e.g. 18:30)', 'warning');
          return;
        }
        const [h, m] = value.split(':').map(n => parseInt(n, 10));
        if (h < 0 || h > 23 || m < 0 || m > 59) {
          App.toast('Time out of range', 'warning');
          return;
        }
        const padded = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        History.push(JSON.parse(JSON.stringify(this._planState)));
        sel.time = padded;
        this._onChanged();
      }
    );
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

    // D7: Load dismissed VIP tips
    const dismissedRaw = localStorage.getItem(`${STORAGE_PREFIX}_dismissed_tips`) || '{}';
    const dismissed = JSON.parse(dismissedRaw);

    // Filter out dismissed tips
    const visible = conflicts.filter(c => {
      if (c.type === 'missed_vip' && c.dayDate && c.slot) {
        const key = `${c.dayDate}_${c.slot}`;
        return !dismissed[key];
      }
      return true;
    });

    if (visible.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    list.innerHTML = visible.map(c => {
      const icon = c.type === 'overdraft' ? 'alert-triangle' : c.type === 'missed_vip' ? 'sparkles' : 'map-pin';
      const style = c.severity === 'tip'
        ? 'background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.25); color: #fbbf24;'
        : c.severity === 'warning'
          ? 'background: rgba(251,191,36,0.08); border-color: rgba(251,191,36,0.25); color: #fde68a;'
          : '';
      const dismissBtn = c.type === 'missed_vip' && c.dayDate && c.slot
        ? ` <button onclick="event.stopPropagation(); Planner.dismissTip('${c.dayDate}', '${c.slot}')" class="ml-1 text-[9px] opacity-50 hover:opacity-100">dismiss</button>`
        : '';
      // D9: Location mismatch conflicts are clickable to open resolver
      const clickAttr = c.type === 'location_mismatch' && c.dayDate && c.slot
        ? ` style="${style}cursor:pointer;" onclick="Planner.openResolver('${c.dayDate}', ['${c.slot}'])"`
        : ` style="${style}"`;
      return `<div class="conflict-warning"${clickAttr}>
        <i data-lucide="${icon}" class="w-3 h-3 inline mr-1"></i>${c.message}${dismissBtn}
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
    // F1: New selections default to whole-family diners
    const diners = CreditEngine.defaultDiners();
    // B6: Check for overdraft before committing DDP selections
    if (paymentMethod === 'ddp' && pool && typeof restaurantId === 'number') {
      const check = CreditEngine.wouldOverdraft(pool, restaurantId, this._planState, diners);
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

    const existing = this._planState.days[date].selections[slot];
    this._planState.days[date].selections[slot] = {
      restaurantId,
      paymentMethod,
      pool: paymentMethod === 'ddp' ? pool : null,
      notes: '',
      adrNumber: '',
      diners: CreditEngine.defaultDiners(),
      time: existing?.time || DEFAULT_MEAL_TIMES[slot]
    };

    this._onChanged();
  },

  clearSlot(date, slot) {
    if (!this._planState.days[date].selections[slot]) return;
    History.push(JSON.parse(JSON.stringify(this._planState)));
    this._planState.days[date].selections[slot] = null;
    this._onChanged();
  },

  // F1: Diners editor
  _dinersEditing: null,

  openDinersEditor(date, slot) {
    const sel = this._planState.days[date]?.selections[slot];
    if (!sel) return;
    this._dinersEditing = { date, slot, diners: [...CreditEngine.selectionDiners(sel)] };
    const td = TRIP_DAYS.find(d => d.date === date);
    document.getElementById('diners-subtitle').textContent = `${td?.dow || date} — ${MEAL_LABELS[slot]}`;
    this._renderDinersList();
    document.getElementById('diners-modal').classList.add('active');
    lucide.createIcons();
  },

  closeDinersEditor() {
    this._dinersEditing = null;
    document.getElementById('diners-modal').classList.remove('active');
  },

  _renderDinersList() {
    const state = this._dinersEditing;
    if (!state) return;
    const list = document.getElementById('diners-list');
    list.innerHTML = FAMILY.map(m => {
      const checked = state.diners.includes(m.id);
      const ageLabel = m.age === 'adult' ? 'Adult' : `Age ${m.age}`;
      return `
        <label class="flex items-center gap-2 px-2 py-1.5 rounded border border-white/10 hover:bg-white/5 cursor-pointer">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="Planner._dinersToggle('${m.id}')" class="accent-blue-500">
          <span class="text-sm font-medium">${m.name}</span>
          <span class="text-[10px] text-white/40">${ageLabel}${m.ddpFree ? ' · package-free' : ''}</span>
        </label>
      `;
    }).join('');
    // Credit + cost summary (snacks are per-item, meals are per-diner)
    const sel = this._planState.days[state.date].selections[state.slot];
    const r = CreditEngine._getRestaurant(sel.restaurantId);
    const summary = [];
    if (r && r.creditCategory !== 'oop') {
      const credits = r.creditCategory === 'sn'
        ? r.creditsConsumed
        : r.creditsConsumed * state.diners.length;
      summary.push(`${credits} ${r.creditType} credit${credits !== 1 ? 's' : ''}`);
    }
    if (r) {
      const gross = r.creditCategory === 'sn'
        ? (r.avgAdultPrice || 0)
        : CreditEngine.costForDiners(r, state.diners);
      if (gross > 0) summary.push(`~$${Math.round(gross)} gross`);
    }
    document.getElementById('diners-summary').textContent = summary.join(' · ');
  },

  _dinersToggle(id) {
    const state = this._dinersEditing;
    if (!state) return;
    const idx = state.diners.indexOf(id);
    if (idx >= 0) state.diners.splice(idx, 1);
    else state.diners.push(id);
    this._renderDinersList();
  },

  _dinersSelectAll() { if (this._dinersEditing) { this._dinersEditing.diners = FAMILY.map(m => m.id); this._renderDinersList(); } },
  _dinersAdultsOnly() { if (this._dinersEditing) { this._dinersEditing.diners = FAMILY.filter(m => CreditEngine.isAdult(m)).map(m => m.id); this._renderDinersList(); } },
  _dinersKidsOnly() { if (this._dinersEditing) { this._dinersEditing.diners = FAMILY.filter(m => !CreditEngine.isAdult(m)).map(m => m.id); this._renderDinersList(); } },
  _dinersClear() { if (this._dinersEditing) { this._dinersEditing.diners = []; this._renderDinersList(); } },

  // Event editor
  _eventEditing: null,

  openEventEditor(date, eventId = null) {
    this._closeAllMenus();
    const day = this._planState.days[date];
    if (!day) return;
    if (!Array.isArray(day.events)) day.events = [];
    const ev = eventId ? day.events.find(e => e.id === eventId) : null;
    this._eventEditing = { date, eventId: eventId || null };

    const td = TRIP_DAYS.find(d => d.date === date);
    document.getElementById('event-modal-title').textContent = ev ? 'Edit Event' : 'Add Event';
    document.getElementById('event-modal-subtitle').textContent = td ? `${td.dow} ${td.date}` : date;

    const kindSel = document.getElementById('event-kind');
    kindSel.innerHTML = EVENT_KINDS.map(k =>
      `<option value="${k.id}" ${ev && ev.kind === k.id ? 'selected' : ''}>${k.label}</option>`
    ).join('');
    if (ev && ev.kind) kindSel.value = ev.kind;

    document.getElementById('event-name').value = ev?.name || '';
    document.getElementById('event-time').value = ev?.time || '12:00';
    document.getElementById('event-location').value = ev?.location || '';
    document.getElementById('event-duration').value = ev?.durationMinutes || '';
    document.getElementById('event-notes').value = ev?.notes || '';
    document.getElementById('event-modal-delete').style.display = ev ? '' : 'none';

    document.getElementById('event-modal').classList.add('active');
    setTimeout(() => document.getElementById('event-name').focus(), 100);
    lucide.createIcons();
  },

  closeEventEditor() {
    this._eventEditing = null;
    document.getElementById('event-modal').classList.remove('active');
  },

  saveEventEditor() {
    const state = this._eventEditing;
    if (!state) return;
    const name = document.getElementById('event-name').value.trim();
    const time = document.getElementById('event-time').value.trim();
    if (!name) { App.toast('Event name is required', 'warning'); return; }
    if (!/^\d{2}:\d{2}$/.test(time)) { App.toast('Valid time required', 'warning'); return; }

    const durationRaw = document.getElementById('event-duration').value.trim();
    const durationMinutes = durationRaw ? Math.max(0, parseInt(durationRaw, 10)) : null;

    History.push(JSON.parse(JSON.stringify(this._planState)));

    const day = this._planState.days[state.date];
    if (!Array.isArray(day.events)) day.events = [];

    const payload = {
      id: state.eventId || ('evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
      name,
      time,
      kind: document.getElementById('event-kind').value || 'other',
      location: document.getElementById('event-location').value.trim(),
      durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : null,
      notes: document.getElementById('event-notes').value.trim()
    };

    if (state.eventId) {
      const idx = day.events.findIndex(e => e.id === state.eventId);
      if (idx >= 0) day.events[idx] = payload;
      else day.events.push(payload);
    } else {
      day.events.push(payload);
    }

    this.closeEventEditor();
    this._onChanged();
  },

  _eventEditorDelete() {
    const state = this._eventEditing;
    if (!state || !state.eventId) return;
    const date = state.date;
    const eventId = state.eventId;
    this.closeEventEditor();
    this.deleteEvent(date, eventId);
  },

  deleteEvent(date, eventId) {
    const day = this._planState.days[date];
    if (!day || !Array.isArray(day.events)) return;
    const idx = day.events.findIndex(e => e.id === eventId);
    if (idx < 0) return;
    History.push(JSON.parse(JSON.stringify(this._planState)));
    day.events.splice(idx, 1);
    this._onChanged();
  },

  saveDinersEdit() {
    const state = this._dinersEditing;
    if (!state) return;
    const sel = this._planState.days[state.date]?.selections[state.slot];
    if (!sel) { this.closeDinersEditor(); return; }
    if (state.diners.length === 0) {
      App.toast('Pick at least one diner, or remove the whole selection', 'warning');
      return;
    }
    History.push(JSON.parse(JSON.stringify(this._planState)));
    sel.diners = [...state.diners];
    this.closeDinersEditor();
    this._onChanged();
  },

  clearDay(date) {
    this._closeAllMenus();
    App.confirm('Clear All Selections', `Remove all meals and events from ${TRIP_DAYS.find(d => d.date === date)?.dow || date}?`, () => {
      History.push(JSON.parse(JSON.stringify(this._planState)));
      MEAL_SLOTS.forEach(slot => { this._planState.days[date].selections[slot] = null; });
      this._planState.days[date].events = [];
      this._onChanged();
    });
  },

  // Park changes — D9: detect stranded selections and open resolver
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

    // Check for stranded selections after park change
    if (park !== oldPark && park !== 'none' && !park.startsWith('Resort') && !park.startsWith('Travel') && !park.startsWith('Split')) {
      const stranded = this._findStranded(date);
      if (stranded.length > 0) {
        App.toast(`Stranded selections detected. Click to resolve.`, 'warning', () => {
          this.openResolver(date);
        });
      }
    }
  },

  // D9: Find stranded selections for a date
  _findStranded(date, slotsToCheck) {
    const day = this._planState.days[date];
    const park = day.park;
    const slots = slotsToCheck || MEAL_SLOTS;
    const stranded = [];
    const parkLocations = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs'];

    slots.forEach(slot => {
      const sel = day.selections[slot];
      if (!sel) return;
      let r = CreditEngine._getRestaurant(sel.restaurantId);
      if (!r && typeof sel.restaurantId === 'string') {
        r = RestaurantMerge.findByName(sel.restaurantId.replace(/^_csv_/, '').replace(/_/g, ' '));
      }
      if (!r) return;
      const isParkRestaurant = parkLocations.includes(r.location);
      if (isParkRestaurant && r.location !== park) {
        stranded.push({ slot, restaurantId: sel.restaurantId, name: r.name, location: r.location, creditType: r.creditType });
      }
    });
    return stranded;
  },

  // D9: Resolver modal
  openResolver(dateStr, slotsToResolve) {
    const day = this._planState.days[dateStr];
    const td = TRIP_DAYS.find(d => d.date === dateStr);
    const stranded = this._findStranded(dateStr, slotsToResolve);

    if (stranded.length === 0) {
      App.toast('No stranded selections to resolve', 'info');
      return;
    }

    const modal = document.getElementById('resolver-modal');
    document.getElementById('resolver-title').textContent = `Fix stranded selections at ${day.park}`;
    document.getElementById('resolver-subtitle').textContent = `${stranded.length} selection${stranded.length > 1 ? 's' : ''} at restaurants in other parks`;

    this._resolverDate = dateStr;
    this._resolverStranded = stranded;
    this._renderResolverRows();
    modal.classList.add('active');
  },

  _renderResolverRows() {
    const body = document.getElementById('resolver-body');
    const dateStr = this._resolverDate;
    const td = TRIP_DAYS.find(d => d.date === dateStr);
    const day = this._planState.days[dateStr];

    // Refresh stranded list (some may have been resolved)
    const current = this._findStranded(dateStr, this._resolverStranded.map(s => s.slot));

    if (current.length === 0) {
      body.innerHTML = '<div class="text-center text-green-400 text-sm py-4"><i data-lucide="check-circle" class="w-5 h-5 inline mr-1"></i>All resolved!</div>';
      lucide.createIcons();
      return;
    }

    body.innerHTML = current.map(s => {
      const badgeClass = this._creditBadgeClass(s.creditType);
      return `<div class="flex items-center gap-2 py-2 border-b border-white/5">
        <div class="flex-1 min-w-0">
          <div class="text-[10px] text-white/40">${td.dow} ${MEAL_LABELS[s.slot]}</div>
          <div class="text-xs font-medium truncate">${s.name}</div>
          <div class="flex items-center gap-1 mt-0.5">
            <span class="badge ${badgeClass}">${s.creditType}</span>
            <span class="text-[10px] text-white/30">${s.location}</span>
          </div>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button onclick="Planner._resolverSwap('${s.slot}')"
            class="px-2 py-1 text-[10px] rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors">Swap</button>
          <button onclick="Planner._resolverRemove('${s.slot}')"
            class="px-2 py-1 text-[10px] rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors">Remove</button>
        </div>
      </div>`;
    }).join('');

    lucide.createIcons();
  },

  _resolverSwap(slot) {
    const dateStr = this._resolverDate;
    const day = this._planState.days[dateStr];
    const sel = day.selections[slot];
    const r = CreditEngine._getRestaurant(sel?.restaurantId);

    // Close resolver temporarily, open picker filtered to new park + same credit type
    document.getElementById('resolver-modal').classList.remove('active');

    RestaurantPicker.open(dateStr, slot, (restaurantId, paymentMethod, pool) => {
      // Apply selection without pushing history (resolver is one undo-unit)
      this._planState.days[dateStr].selections[slot] = {
        restaurantId,
        paymentMethod,
        pool: paymentMethod === 'ddp' ? pool : null,
        notes: sel?.notes || '',
        adrNumber: sel?.adrNumber || '',
        diners: sel?.diners ? [...sel.diners] : CreditEngine.defaultDiners(),
        time: sel?.time || DEFAULT_MEAL_TIMES[slot]
      };
      Scenarios.save(this._planState);
      this.render();

      // Re-open resolver
      setTimeout(() => this.openResolver(dateStr, this._resolverStranded.map(s => s.slot)), 100);
    });
  },

  _resolverRemove(slot) {
    this._planState.days[this._resolverDate].selections[slot] = null;
    Scenarios.save(this._planState);
    this.render();
    this._renderResolverRows();
  },

  _resolverRemoveAll() {
    const dateStr = this._resolverDate;
    const stranded = this._findStranded(dateStr, this._resolverStranded.map(s => s.slot));
    stranded.forEach(s => {
      this._planState.days[dateStr].selections[s.slot] = null;
    });
    Scenarios.save(this._planState);
    this.render();
    this.closeResolver();
    App.toast('Stranded selections removed', 'info');
  },

  closeResolver() {
    document.getElementById('resolver-modal').classList.remove('active');
    this._resolverDate = null;
    this._resolverStranded = null;
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
      const tempDividerTime = fromDay.splitDividerTime || DEFAULT_SPLIT_DIVIDER_TIME;
      const tempEvents = JSON.parse(JSON.stringify(fromDay.events || []));

      fromDay.selections = JSON.parse(JSON.stringify(toDay.selections));
      fromDay.notes = toDay.notes;
      fromDay.park = toDay.park;
      fromDay.splitDay = toDay.splitDay;
      fromDay.splitParks = toDay.splitParks ? JSON.parse(JSON.stringify(toDay.splitParks)) : null;
      fromDay.splitDividerTime = toDay.splitDividerTime || DEFAULT_SPLIT_DIVIDER_TIME;
      fromDay.events = JSON.parse(JSON.stringify(toDay.events || []));

      toDay.selections = tempSel;
      toDay.notes = tempNotes;
      toDay.park = tempPark;
      toDay.splitDay = tempSplit;
      toDay.splitParks = tempSplitParks;
      toDay.splitDividerTime = tempDividerTime;
      toDay.events = tempEvents;

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
    toDay.splitDividerTime = fromDay.splitDividerTime || DEFAULT_SPLIT_DIVIDER_TIME;
    // Clone events with regenerated ids to avoid duplicates across days
    toDay.events = (fromDay.events || []).map(ev => ({
      ...JSON.parse(JSON.stringify(ev)),
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    }));

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

  // D7: Dismiss a VIP tip per day+slot
  dismissTip(dayDate, slot) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}_dismissed_tips`) || '{}';
    const dismissed = JSON.parse(raw);
    dismissed[`${dayDate}_${slot}`] = true;
    localStorage.setItem(`${STORAGE_PREFIX}_dismissed_tips`, JSON.stringify(dismissed));
    this._renderConflicts();
    lucide.createIcons();
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

  // ===== Card drag-and-drop (desktop only via HTML5 DnD) =====
  _dndPayload: null,

  _canDropMeal(srcSlot, targetSlot) {
    if (!srcSlot || !targetSlot) return false;
    const isSnack = s => s && s.startsWith('snack');
    if (isSnack(srcSlot) && isSnack(targetSlot)) return true;
    if (!isSnack(srcSlot) && !isSnack(targetSlot)) return srcSlot === targetSlot;
    return false;
  },

  _onDragStart(e) {
    const target = e.target.closest('.meal-slot-filled[draggable="true"]');
    if (!target) return;
    const date = target.dataset.date;
    const slot = target.dataset.slot;
    const sel = this._planState.days[date]?.selections[slot];
    if (!sel) return;

    this._dndPayload = { kind: 'meal', date, slot };
    try {
      e.dataTransfer.setData('application/x-ddp-card', JSON.stringify(this._dndPayload));
      e.dataTransfer.setData('text/plain', `${date}/${slot}`);
    } catch (err) { /* ignore */ }
    e.dataTransfer.effectAllowed = 'copyMove';
    target.classList.add('dragging');
    document.body.classList.add('dragging-meal');
  },

  _onDragOver(e) {
    if (!this._dndPayload) return;
    const targetEl = e.target.closest('.meal-slot-filled, .meal-slot-empty');
    if (!targetEl) return;
    const targetDate = targetEl.dataset.date;
    const targetSlot = targetEl.dataset.slot;
    if (!targetDate || !targetSlot) return;
    if (targetDate === this._dndPayload.date && targetSlot === this._dndPayload.slot) return;
    if (!this._canDropMeal(this._dndPayload.slot, targetSlot)) {
      targetEl.classList.add('drop-target-invalid');
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.preventDefault();
    targetEl.classList.add('drop-target-valid');
    e.dataTransfer.dropEffect = (e.ctrlKey || e.altKey || e.metaKey) ? 'copy' : 'move';
  },

  _onDragLeave(e) {
    const targetEl = e.target.closest('.meal-slot-filled, .meal-slot-empty');
    if (!targetEl) return;
    targetEl.classList.remove('drop-target-valid', 'drop-target-invalid');
  },

  _onDrop(e) {
    const payload = this._dndPayload;
    if (!payload) return;
    const targetEl = e.target.closest('.meal-slot-filled, .meal-slot-empty');
    if (!targetEl) return;
    const targetDate = targetEl.dataset.date;
    const targetSlot = targetEl.dataset.slot;
    if (!targetDate || !targetSlot) return;
    if (!this._canDropMeal(payload.slot, targetSlot)) return;
    if (targetDate === payload.date && targetSlot === payload.slot) return;
    e.preventDefault();
    targetEl.classList.remove('drop-target-valid', 'drop-target-invalid');

    const isCopy = e.ctrlKey || e.altKey || e.metaKey;
    this._executeDrop(payload, targetDate, targetSlot, isCopy);
  },

  _onDragEnd() {
    document.querySelectorAll('.meal-slot-filled.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drop-target-valid, .drop-target-invalid').forEach(el => {
      el.classList.remove('drop-target-valid', 'drop-target-invalid');
    });
    document.body.classList.remove('dragging-meal');
    this._dndPayload = null;
  },

  _executeDrop(payload, targetDate, targetSlot, isCopy) {
    const srcDay = this._planState.days[payload.date];
    const srcSel = srcDay?.selections[payload.slot];
    if (!srcSel) return;

    History.push(JSON.parse(JSON.stringify(this._planState)));
    const targetDay = this._planState.days[targetDate];
    const cloned = JSON.parse(JSON.stringify(srcSel));
    // Reset time to default for the new slot kind so cards re-anchor sensibly
    cloned.time = DEFAULT_MEAL_TIMES[targetSlot] || cloned.time;
    targetDay.selections[targetSlot] = cloned;

    // Reassign pool on the target day if DDP
    this._reassignPools(targetDate);

    if (!isCopy) {
      srcDay.selections[payload.slot] = null;
    }
    this._onChanged();
    App.toast(isCopy ? 'Meal copied' : 'Meal moved', 'success');
  },

  // ===== Draggable Park-Hop divider =====
  _dividerDrag: null,

  _beginDividerDrag(event, date) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const dividerEl = event.currentTarget;
    const column = dividerEl.closest('[data-day-timeline]');
    if (!column) return;

    History.push(JSON.parse(JSON.stringify(this._planState)));

    this._dividerDrag = {
      date,
      dividerEl,
      column,
      pointerId: event.pointerId,
      historyPushed: true
    };

    if (event.pointerId !== undefined && dividerEl.setPointerCapture) {
      try { dividerEl.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    }
    dividerEl.classList.add('dragging');

    const onMove = (e) => this._onDividerMove(e);
    const onUp = (e) => {
      this._onDividerUp(e);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  },

  _onDividerMove(event) {
    const drag = this._dividerDrag;
    if (!drag) return;
    event.preventDefault();
    const newTime = this._snapDividerToTimeline(drag.column, event.clientY);
    if (newTime) {
      const day = this._planState.days[drag.date];
      if (day && day.splitDividerTime !== newTime) {
        day.splitDividerTime = newTime;
        // Live update label without full re-render — full render on release
        const labelEl = drag.dividerEl.querySelector('.divider-label');
        if (labelEl) {
          // Preserve the icon
          labelEl.innerHTML = `<i data-lucide="grip-horizontal" class="w-3 h-3"></i> Park Hop · ${formatTime12h(newTime)}`;
          lucide.createIcons();
        }
      }
    }
  },

  _onDividerUp(event) {
    const drag = this._dividerDrag;
    if (!drag) return;
    drag.dividerEl.classList.remove('dragging');
    if (drag.pointerId !== undefined && drag.dividerEl.releasePointerCapture) {
      try { drag.dividerEl.releasePointerCapture(drag.pointerId); } catch (e) { /* ignore */ }
    }
    this._dividerDrag = null;
    this._onChanged();
  },

  // Walk timeline items in the column, find the gap closest to cursorY,
  // return a time that places the divider in that gap.
  _snapDividerToTimeline(column, cursorY) {
    const itemEls = Array.from(column.querySelectorAll('.meal-slot-filled, .timeline-event'));
    const itemData = itemEls.map(el => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const date = el.dataset.date;
      let time = null;
      if (el.classList.contains('meal-slot-filled')) {
        const slot = el.dataset.slot;
        const sel = this._planState.days[date]?.selections[slot];
        time = (sel && sel.time) || DEFAULT_MEAL_TIMES[slot];
      } else if (el.classList.contains('timeline-event')) {
        const evId = el.dataset.eventId;
        const ev = (this._planState.days[date]?.events || []).find(e => e.id === evId);
        time = ev?.time;
      }
      return { center, time };
    }).filter(d => d.time);

    if (itemData.length === 0) return DEFAULT_SPLIT_DIVIDER_TIME;

    // Sort by time
    itemData.sort((a, b) => a.time.localeCompare(b.time));

    // Above all
    if (cursorY < itemData[0].center) {
      return this._timeMinusMinutes(itemData[0].time, 30);
    }
    // Below all
    if (cursorY >= itemData[itemData.length - 1].center) {
      return this._timePlusMinutes(itemData[itemData.length - 1].time, 30);
    }
    // Between two adjacent items
    for (let i = 0; i < itemData.length - 1; i++) {
      const a = itemData[i];
      const b = itemData[i + 1];
      const gap = (a.center + b.center) / 2;
      if (cursorY < gap) {
        return this._timeMinusMinutes(b.time, 1);
      }
    }
    return DEFAULT_SPLIT_DIVIDER_TIME;
  },

  _timeToMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
    return h * 60 + m;
  },

  _minutesToTime(total) {
    let t = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(t / 60);
    const m = t % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  _timePlusMinutes(hhmm, mins) {
    return this._minutesToTime(this._timeToMinutes(hhmm) + mins);
  },

  _timeMinusMinutes(hhmm, mins) {
    return this._minutesToTime(this._timeToMinutes(hhmm) - mins);
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

// Card drag-and-drop event delegation (desktop)
document.addEventListener('dragstart', (e) => Planner._onDragStart(e));
document.addEventListener('dragover',  (e) => Planner._onDragOver(e));
document.addEventListener('dragleave', (e) => Planner._onDragLeave(e));
document.addEventListener('drop',      (e) => Planner._onDrop(e));
document.addEventListener('dragend',   (e) => Planner._onDragEnd(e));
