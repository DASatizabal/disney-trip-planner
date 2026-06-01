// Shared helpers for the Today (day checklist) and Overview (trip-at-a-glance)
// screens. Reads the same saved plan, restaurant DB, and config globals the
// main planner uses, and adds a per-scenario "completed" state on top.
//
// Item keys are stable so a check survives re-renders and edits:
//   meal:{date}:{slot}        e.g. meal:2026-06-07:dinner
//   event:{date}:{eventId}    e.g. event:2026-06-09:evt_123_abc

const Agenda = {
  PAST_GRACE_MS: 5 * 60 * 1000, // gray out once an item is >5 min in the past

  // ----- scenario / plan -----
  scenario() {
    return localStorage.getItem(`${STORAGE_PREFIX}_active`) || 'default';
  },

  loadPlan() {
    return Storage.load(this.scenario()) || Storage.getDefaultPlan();
  },

  // ----- completed state (per scenario, local to this device) -----
  _doneKey() {
    return `${STORAGE_PREFIX}_done_${this.scenario()}`;
  },

  loadDone() {
    try {
      return JSON.parse(localStorage.getItem(this._doneKey())) || {};
    } catch (e) {
      return {};
    }
  },

  saveDone(map) {
    localStorage.setItem(this._doneKey(), JSON.stringify(map));
  },

  toggleDone(key) {
    const map = this.loadDone();
    if (map[key]) delete map[key];
    else map[key] = true;
    this.saveDone(map);
    return !!map[key];
  },

  clearDoneForDate(date) {
    const map = this.loadDone();
    let changed = false;
    Object.keys(map).forEach(k => {
      if (k.includes(`:${date}:`)) { delete map[k]; changed = true; }
    });
    if (changed) this.saveDone(map);
  },

  // ----- dates -----
  localDateStr(d) {
    d = d || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // The trip day to show first: exact match for today, else the nearest
  // upcoming day, else the final day (trip already over).
  defaultDate() {
    const dates = TRIP_DAYS.map(td => td.date);
    const today = this.localDateStr();
    if (dates.includes(today)) return today;
    const upcoming = dates.filter(d => d >= today);
    if (upcoming.length) return upcoming[0];
    return dates[dates.length - 1];
  },

  tripDay(date) {
    return TRIP_DAYS.find(td => td.date === date) || null;
  },

  // True once `time` on `date` is more than the grace period in the past,
  // measured against the device clock (which is what matters in the parks).
  isPast(date, time) {
    if (!time) return false;
    const dt = new Date(`${date}T${time}:00`);
    if (isNaN(dt.getTime())) return false;
    return (Date.now() - dt.getTime()) > this.PAST_GRACE_MS;
  },

  // ----- formatting -----
  escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  creditBadgeClass(creditType) {
    const map = { '1TS': 'badge-ts', '2TS': 'badge-2ts', 'QS': 'badge-qs', 'SN': 'badge-sn', 'OOP': 'badge-oop' };
    return map[creditType] || 'badge-ts';
  },

  // ----- timeline -----
  // Returns a time-sorted list of checklist items (meals + events) for one day.
  // Each item: { key, time, timeLabel, kind:'meal'|'event', typeLabel, icon,
  //              title, location, badge, badgeClass, adr, duration, notes }
  buildTimeline(date, day) {
    if (!day) return [];
    const items = [];

    MEAL_SLOTS.forEach(slot => {
      const sel = day.selections ? day.selections[slot] : null;
      if (!sel) return;
      const r = CreditEngine._getRestaurant(sel.restaurantId);
      if (!r) return;
      const time = sel.time || DEFAULT_MEAL_TIMES[slot];
      const method = sel.paymentMethod === 'ddp'
        ? `DDP ${sel.pool || ''}`.trim()
        : (sel.paymentMethod || 'oop').toUpperCase();
      items.push({
        key: `meal:${date}:${slot}`,
        time,
        timeLabel: formatTime12h(time),
        kind: 'meal',
        typeLabel: MEAL_LABELS[slot],
        icon: MEAL_ICONS[slot] || 'utensils',
        title: r.name,
        location: r.location || '',
        badge: method,
        badgeClass: this.creditBadgeClass(r.creditType),
        adr: sel.adrNumber || ''
      });
    });

    (day.events || []).forEach(ev => {
      const kind = EVENT_KIND_MAP[ev.kind] || EVENT_KIND_MAP.other;
      items.push({
        key: `event:${date}:${ev.id}`,
        time: ev.time,
        timeLabel: formatTime12h(ev.time),
        kind: 'event',
        typeLabel: kind.label,
        icon: kind.icon,
        title: ev.name,
        location: ev.location || '',
        badge: '',
        badgeClass: '',
        adr: '',
        duration: ev.duration || null,
        notes: ev.notes || ''
      });
    });

    items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    return items;
  }
};
