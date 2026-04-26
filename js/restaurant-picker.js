const RestaurantPicker = {
  _callback: null,
  _dayDate: null,
  _mealSlot: null,
  _debounceTimer: null,

  open(dayDate, mealSlot, callback) {
    this._dayDate = dayDate;
    this._mealSlot = mealSlot;
    this._callback = callback;

    const td = TRIP_DAYS.find(d => d.date === dayDate);
    const day = Planner.getState().days[dayDate];
    const mealName = CreditEngine.slotToMeal(mealSlot);

    // Context label
    const dateLabel = new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    document.getElementById('picker-context').textContent = `${dateLabel} — ${MEAL_LABELS[mealSlot]} — ${day.park}`;

    this._populateLocationFilter(day);
    this._populateCuisineFilter();

    // Set default type filter based on meal slot
    const typeFilter = document.getElementById('filter-type');
    if (mealName === 'snack') {
      typeFilter.value = 'SN';
    } else {
      typeFilter.value = 'all';
    }

    document.getElementById('picker-search').value = '';
    // E4: Show skeleton while loading
    document.getElementById('picker-results').innerHTML = this._skeleton();
    document.getElementById('picker-count').textContent = 'Loading...';
    document.getElementById('picker-modal').classList.add('active');
    setTimeout(() => {
      this.applyFilters();
      document.getElementById('picker-search').focus();
    }, 50);

    const searchInput = document.getElementById('picker-search');
    searchInput.oninput = () => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this.applyFilters(), 150);
    };
  },

  close() {
    document.getElementById('picker-modal').classList.remove('active');
  },

  _getAllRestaurants() {
    return RestaurantMerge.getMerged();
  },

  _populateLocationFilter(day) {
    const all = this._getAllRestaurants();
    const sel = document.getElementById('filter-location');
    const locations = [...new Set(all.map(r => r.location).filter(Boolean))].sort();
    sel.innerHTML = '<option value="all">All Locations</option>';

    const slotSel = day.selections[this._mealSlot];
    const time = (slotSel && slotSel.time) || DEFAULT_MEAL_TIMES[this._mealSlot] || '12:00';
    const dayPark = parkForTime(day, time);

    const parks = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs'];
    const waterParks = locations.filter(l => l.includes('Blizzard') || l.includes('Typhoon'));
    const resorts = locations.filter(l => !parks.includes(l) && !waterParks.includes(l));

    const addGroup = (label, locs) => {
      if (locs.length === 0) return;
      const optgroup = document.createElement('optgroup');
      optgroup.label = label;
      locs.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l;
        opt.textContent = l;
        optgroup.appendChild(opt);
      });
      sel.appendChild(optgroup);
    };

    addGroup('Parks', parks.filter(p => locations.includes(p)));
    addGroup('Water Parks', waterParks);
    addGroup('Resorts', resorts);

    if (dayPark && dayPark !== 'none' && !dayPark.startsWith('Resort') && !dayPark.startsWith('Travel') && !dayPark.startsWith('Split')) {
      // Water parks don't serve most meals — default to the paired resort instead
      let target = dayPark;
      if (dayPark.startsWith('Water Park')) {
        const td = TRIP_DAYS.find(d => d.date === this._dayDate);
        if (td && POOLS[td.pool]) target = POOLS[td.pool].resort;
      }
      // Try exact match or partial match for the target location
      const match = locations.find(l => l === target || l.includes(target) || target.includes(l));
      sel.value = match || 'all';
    } else {
      sel.value = 'all';
    }
  },

  _populateCuisineFilter() {
    const all = this._getAllRestaurants();
    const sel = document.getElementById('filter-cuisine');
    const cuisines = [...new Set(all.map(r => r.cuisine).filter(Boolean))].sort();
    sel.innerHTML = '<option value="all">All Cuisines</option>';
    cuisines.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  },

  applyFilters() {
    const location = document.getElementById('filter-location').value;
    const type = document.getElementById('filter-type').value;
    const cuisine = document.getElementById('filter-cuisine').value;
    const search = (document.getElementById('picker-search').value || '').toLowerCase().trim();
    const mealName = CreditEngine.slotToMeal(this._mealSlot);

    let results = this._getAllRestaurants();

    // Filter by meal period
    if (mealName === 'snack') {
      results = results.filter(r => r.category === 'snack' || r.creditType === 'SN');
    } else {
      results = results.filter(r => r.meals.includes(mealName));
    }

    // Filter by location (fuzzy — CSV uses "Magic Kingdom Park", DB uses "Magic Kingdom")
    if (location !== 'all') {
      results = results.filter(r => r.location === location);
    }

    if (type !== 'all') {
      results = results.filter(r => r.creditType === type);
    }

    if (cuisine !== 'all') {
      results = results.filter(r => r.cuisine === cuisine);
    }

    if (search) {
      results = results.filter(r =>
        r.name.toLowerCase().includes(search) ||
        (r.cuisine && r.cuisine.toLowerCase().includes(search)) ||
        (r.parkArea && r.parkArea.toLowerCase().includes(search)) ||
        (r.location && r.location.toLowerCase().includes(search)) ||
        (r.characterNames && r.characterNames.toLowerCase().includes(search)) ||
        (r.notes && r.notes.toLowerCase().includes(search))
      );
    }

    // Sort: closed last, skip last, family favorites first, then value, then alpha
    const reviewKey = (r) => r.familyReview || '_none';
    const reviewOrder = { loved: 0, liked: 1, _none: 2, skip: 3 };
    results.sort((a, b) => {
      // Closed items at bottom
      if (a.closed && !b.closed) return 1;
      if (b.closed && !a.closed) return -1;
      // Skip items near bottom
      const aR = reviewOrder[reviewKey(a)] ?? 2;
      const bR = reviewOrder[reviewKey(b)] ?? 2;
      if (aR !== bR) return aR - bR;
      // DB-enriched before CSV-only
      if (a.csvOnly && !b.csvOnly) return 1;
      if (b.csvOnly && !a.csvOnly) return -1;
      // Value rating
      const valueOrder = { excellent: 0, good: 1, fair: 2, poor: 3, 'n/a': 4 };
      const aV = valueOrder[a.ddpValue] ?? 4;
      const bV = valueOrder[b.ddpValue] ?? 4;
      if (aV !== bV) return aV - bV;
      return a.name.localeCompare(b.name);
    });

    this._renderResults(results);
  },

  _renderResults(results) {
    document.getElementById('picker-count').textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;

    const container = document.getElementById('picker-results');
    if (results.length === 0) {
      container.innerHTML = `<div class="text-center text-sm py-8">
        <div class="text-white/30 mb-2">No restaurants match your filters</div>
        <button onclick="RestaurantPicker._clearFilters()" class="text-amber-400 hover:text-amber-300 text-xs">Clear Filters</button>
      </div>`;
      return;
    }

    const searchTerm = (document.getElementById('picker-search').value || '').trim();

    container.innerHTML = results.map(r => {
      const badgeClass = this._creditBadgeClass(r.creditType);
      const vip = r.id ? CreditEngine.getVIPInfo(r.id, this._dayDate, this._mealSlot) : { available: false };
      const ap = (r.apDiscountPct && r.apDiscountPct > 0) ? { available: true, pct: r.apDiscountPct } : { available: false };
      const valueStars = this._valueStars(r.ddpValue);
      const selectAttr = r.closed
        ? 'style="opacity:0.4;pointer-events:none;"'
        : `onclick="RestaurantPicker.selectRestaurant(${r.id ? r.id : "null"}, '${r.name.replace(/'/g, "\\'")}')"`;

      // D4: Highlight search match in name
      const displayName = searchTerm ? this._highlightMatch(r.name, searchTerm) : r.name;

      return `
        <div class="restaurant-card" ${selectAttr}>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium">${displayName}</div>
              <div class="text-[11px] text-white/40 mt-0.5">${r.location || ''}${r.parkArea ? ' — ' + r.parkArea : ''}</div>
              <div class="flex items-center gap-1 mt-1 flex-wrap">
                <span class="badge ${badgeClass}">${r.creditType}</span>
                ${r.closed ? '<span class="badge" style="background:rgba(100,100,100,0.2);color:#999;border:1px solid rgba(100,100,100,0.3)">CLOSED</span>' : ''}
                ${r.csvOnly ? '<span class="badge" style="background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.08);font-style:italic">undetailed</span>' : ''}
                ${r.cuisine ? `<span class="text-[10px] text-white/30">${r.cuisine}</span>` : ''}
                ${r.seafoodWarning ? '<span class="badge badge-seafood">SEAFOOD</span>' : ''}
                ${r.isCharacter ? '<span class="badge badge-character">CHARS</span>' : ''}
                ${r.isBuffet ? '<span class="text-[10px] text-white/30">Buffet/AYCE</span>' : ''}
                ${r.isDiningEvent ? '<span class="badge badge-event">EVENT</span>' : ''}
                ${r.familyReview === 'loved' ? '<span class="badge badge-loved">LOVED</span>' : ''}
                ${r.familyReview === 'liked' ? '<span class="badge badge-loved">LIKED</span>' : ''}
                ${r.familyReview === 'skip' ? '<span class="badge badge-skip">SKIP</span>' : ''}
                ${vip.available ? `<span class="badge badge-vip">${vip.pct}% VIP</span>` : ''}
                ${ap.available && !vip.available ? `<span class="text-[9px] text-amber-400/50">AP ${ap.pct}%</span>` : ''}
              </div>
              ${r.characterNames ? `<div class="text-[10px] text-purple-300/60 mt-0.5">${r.characterNames}</div>` : ''}
              ${r.notes ? `<div class="text-[10px] text-white/25 mt-0.5">${r.notes}</div>` : ''}
            </div>
            <div class="text-right flex-shrink-0">
              ${valueStars ? `<div class="ddp-stars text-[10px]">${valueStars}</div>` : ''}
              ${r.avgAdultPrice ? `<div class="text-[10px] text-white/30 mt-0.5">~$${r.avgAdultPrice}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();
  },

  _clearFilters() {
    document.getElementById('filter-location').value = 'all';
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-cuisine').value = 'all';
    document.getElementById('picker-search').value = '';
    this.applyFilters();
  },

  // E4: Loading skeleton
  _skeleton() {
    const row = `<div class="restaurant-card animate-pulse">
      <div class="h-3 bg-white/10 rounded w-3/4 mb-2"></div>
      <div class="h-2 bg-white/5 rounded w-1/2 mb-2"></div>
      <div class="flex gap-1"><div class="h-3 bg-white/8 rounded w-8"></div><div class="h-3 bg-white/5 rounded w-16"></div></div>
    </div>`;
    return row.repeat(6);
  },

  // D4: Highlight matching substring
  _highlightMatch(text, term) {
    if (!term) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<span class="search-match">$1</span>');
  },

  _creditBadgeClass(creditType) {
    const map = { '1TS': 'badge-ts', '2TS': 'badge-2ts', 'QS': 'badge-qs', 'SN': 'badge-sn', 'OOP': 'badge-oop' };
    return map[creditType] || 'badge-oop';
  },

  _valueStars(value) {
    const map = { excellent: '★★★', good: '★★', fair: '★', poor: '', 'n/a': '' };
    return map[value] || '';
  },

  // Selection flow
  selectRestaurant(restaurantId, restaurantName) {
    // For CSV-only entries (no DB id), find by name and use inferred credit info
    let r;
    if (restaurantId) {
      r = CreditEngine._getRestaurant(restaurantId);
    }
    if (!r && restaurantName) {
      // CSV-only: use merged entry data
      const merged = RestaurantMerge.findByName(restaurantName);
      if (merged) {
        r = merged;
        // CSV-only entries get a temporary id for the selection
        if (!r.id) {
          r._tempId = '_csv_' + restaurantName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        }
      }
    }
    if (!r) return;

    this.close();

    const td = TRIP_DAYS.find(d => d.date === this._dayDate);
    const vip = r.id ? CreditEngine.getVIPInfo(r.id, this._dayDate, this._mealSlot) : { available: false };
    const ap = r.id ? CreditEngine.getAPInfo(r.id, this._dayDate, this._mealSlot) : { available: false };

    if (!r.acceptsDDP || r.creditType === 'OOP') {
      // C5: OOP restaurant but might have AP discount
      if (ap.available) {
        this._showPaymentModal(r, null, ap);
      } else {
        this._finalizeSelection(r.id || r._tempId, 'oop', null);
      }
      return;
    }

    if (vip.available || ap.available) {
      this._showPaymentModal(r, vip.available ? vip : null, ap.available ? ap : null);
      return;
    }

    const pools = CreditEngine.getPoolsForDate(this._dayDate);
    if (pools.length > 1) {
      this._showPoolModal(r.id || r._tempId, 'ddp', pools);
      return;
    }

    this._finalizeSelection(r.id || r._tempId, 'ddp', pools[0]);
  },

  _showPaymentModal(restaurant, vipInfo, apInfo) {
    const modal = document.getElementById('payment-modal');
    document.getElementById('payment-restaurant-name').textContent = restaurant.name;

    const contextParts = [];
    if (vipInfo) contextParts.push(`${vipInfo.pct}% VIP discount: save ~$${vipInfo.estimatedSavings}`);
    if (apInfo) contextParts.push(`AP ${apInfo.pct}% off: save ~$${apInfo.estimatedSavings}${apInfo.notes ? ' (' + apInfo.notes + ')' : ''}`);
    document.getElementById('payment-context').textContent = contextParts.join(' | ');

    const rid = restaurant.id || restaurant._tempId;
    const ridJS = typeof rid === 'number' ? rid : "'" + rid + "'";
    const isDDP = restaurant.acceptsDDP && restaurant.creditType !== 'OOP';

    let options = '';

    if (vipInfo) {
      options += `
        <button onclick="RestaurantPicker._onPaymentChoice(${ridJS}, 'vip')"
          class="w-full text-left p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
          <div class="text-sm font-medium text-amber-300">Use ${vipInfo.pct}% VIP Discount</div>
          <div class="text-[11px] text-white/40 mt-0.5">Pay OOP ~$${Math.round((restaurant.avgAdultPrice || 40) * 3 * (1 - vipInfo.pct / 100))} and save your DDP credit</div>
        </button>`;
    }

    if (apInfo) {
      options += `
        <button onclick="RestaurantPicker._onPaymentChoice(${ridJS}, 'ap')"
          class="w-full text-left p-3 rounded-lg border border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10 transition-colors">
          <div class="text-sm font-medium text-amber-200">Use AP ${apInfo.pct}% Discount</div>
          <div class="text-[11px] text-white/40 mt-0.5">Pay OOP ~$${Math.round((restaurant.avgAdultPrice || 40) * 3 * (1 - apInfo.pct / 100))}${apInfo.notes ? ' — ' + apInfo.notes : ''}</div>
        </button>`;
    }

    if (isDDP) {
      options += `
        <button onclick="RestaurantPicker._onPaymentChoice(${ridJS}, 'ddp')"
          class="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
          <div class="text-sm font-medium">Use DDP Credit</div>
          <div class="text-[11px] text-white/40 mt-0.5">${restaurant.creditsConsumed} ${(restaurant.creditCategory || 'ts').toUpperCase()} credit${restaurant.creditsConsumed > 1 ? 's' : ''}</div>
        </button>`;
    }

    options += `
      <button onclick="RestaurantPicker._onPaymentChoice(${ridJS}, 'oop')"
        class="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
        <div class="text-sm font-medium text-white/60">Pay Out of Pocket (Full Price)</div>
      </button>`;

    document.getElementById('payment-options').innerHTML = options;
    modal.classList.add('active');
  },

  _onPaymentChoice(restaurantId, method) {
    this.closePayment();
    const pools = CreditEngine.getPoolsForDate(this._dayDate);

    if (method === 'ddp' && pools.length > 1) {
      this._showPoolModal(restaurantId, method, pools);
      return;
    }

    this._finalizeSelection(restaurantId, method, method === 'ddp' ? pools[0] : null);
  },

  closePayment() {
    document.getElementById('payment-modal').classList.remove('active');
  },

  _showPoolModal(restaurantId, paymentMethod, pools) {
    const modal = document.getElementById('pool-modal');
    const planState = Planner.getState();

    const options = pools.map(poolId => {
      const balance = CreditEngine.getBalance(poolId, planState);
      const r = typeof restaurantId === 'number' ? CreditEngine._getRestaurant(restaurantId) : null;
      const cat = r ? r.creditCategory : 'ts';
      const remaining = balance[cat].remaining;
      const pool = POOLS[poolId];

      return `
        <button onclick="RestaurantPicker._onPoolChoice(${typeof restaurantId === 'number' ? restaurantId : "'" + restaurantId + "'"}, '${paymentMethod}', '${poolId}')"
          class="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
          <div class="flex items-center gap-2">
            <span class="badge badge-pool-${poolId.toLowerCase()}">Bucket ${poolId}</span>
            <span class="text-sm font-medium">${pool.resort}</span>
          </div>
          <div class="text-[11px] text-white/40 mt-1">${remaining} ${cat.toUpperCase()} credits remaining</div>
        </button>
      `;
    }).join('');

    document.getElementById('pool-options').innerHTML = options;
    modal.classList.add('active');
  },

  _onPoolChoice(restaurantId, paymentMethod, poolId) {
    this.closePool();
    this._finalizeSelection(restaurantId, paymentMethod, poolId);
  },

  closePool() {
    document.getElementById('pool-modal').classList.remove('active');
  },

  _finalizeSelection(restaurantId, paymentMethod, pool) {
    if (this._callback) {
      this._callback(restaurantId, paymentMethod, pool);
    }
  }
};
