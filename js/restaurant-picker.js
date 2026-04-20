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

    // Populate location filter with smart default
    this._populateLocationFilter(day);

    // Populate cuisine filter
    this._populateCuisineFilter();

    // Set default type filter based on meal slot
    const typeFilter = document.getElementById('filter-type');
    if (mealName === 'snack') {
      typeFilter.value = 'SN';
    } else {
      typeFilter.value = 'all';
    }

    // Clear search
    document.getElementById('picker-search').value = '';

    // Render results
    this.applyFilters();

    // Show modal
    document.getElementById('picker-modal').classList.add('active');

    // Focus search
    setTimeout(() => document.getElementById('picker-search').focus(), 100);

    // Bind search with debounce
    const searchInput = document.getElementById('picker-search');
    searchInput.oninput = () => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this.applyFilters(), 150);
    };
  },

  close() {
    document.getElementById('picker-modal').classList.remove('active');
  },

  _populateLocationFilter(day) {
    const sel = document.getElementById('filter-location');
    const locations = [...new Set(RESTAURANTS.map(r => r.location))].sort();
    sel.innerHTML = '<option value="all">All Locations</option>';

    // Smart default: match the day's park
    const dayPark = day.splitDay && day.splitParks
      ? (this._mealSlot === 'dinner' || this._mealSlot.startsWith('snack3') || this._mealSlot.startsWith('snack4')
        ? day.splitParks.pm : day.splitParks.am)
      : day.park;

    // Group by park/springs/resorts
    const parks = ['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs'];
    const waterParks = locations.filter(l => l.startsWith('Water Park'));
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
    addGroup('Disney Springs', ['Disney Springs'].filter(p => locations.includes(p)));
    addGroup('Water Parks', waterParks);
    addGroup('Resorts', resorts);

    // Default to the day's park if it's a real park
    if (dayPark && dayPark !== 'none' && !dayPark.startsWith('Resort') && !dayPark.startsWith('Travel') && !dayPark.startsWith('Split')) {
      sel.value = dayPark;
    } else {
      sel.value = 'all';
    }
  },

  _populateCuisineFilter() {
    const sel = document.getElementById('filter-cuisine');
    const cuisines = [...new Set(RESTAURANTS.map(r => r.cuisine).filter(Boolean))].sort();
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

    let results = RESTAURANTS;

    // Filter by meal period
    if (mealName === 'snack') {
      results = results.filter(r => r.category === 'snack' || r.creditType === 'SN');
    } else {
      results = results.filter(r => r.meals.includes(mealName));
    }

    // Filter by location
    if (location !== 'all') {
      results = results.filter(r => r.location === location);
    }

    // Filter by credit type
    if (type !== 'all') {
      results = results.filter(r => r.creditType === type);
    }

    // Filter by cuisine
    if (cuisine !== 'all') {
      results = results.filter(r => r.cuisine === cuisine);
    }

    // Text search
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

    // Sort: family favorites first, then by value, then alphabetical
    results.sort((a, b) => {
      // Skip items last
      if (a.familyReview === 'skip' && b.familyReview !== 'skip') return 1;
      if (b.familyReview === 'skip' && a.familyReview !== 'skip') return -1;
      // Loved/liked first
      const reviewOrder = { loved: 0, liked: 1, null: 2, skip: 3 };
      const aR = reviewOrder[a.familyReview] ?? 2;
      const bR = reviewOrder[b.familyReview] ?? 2;
      if (aR !== bR) return aR - bR;
      // Value rating
      const valueOrder = { excellent: 0, good: 1, fair: 2, poor: 3, 'n/a': 4 };
      const aV = valueOrder[a.ddpValue] ?? 4;
      const bV = valueOrder[b.ddpValue] ?? 4;
      if (aV !== bV) return aV - bV;
      // Alphabetical
      return a.name.localeCompare(b.name);
    });

    this._renderResults(results);
  },

  _renderResults(results) {
    document.getElementById('picker-count').textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;

    const container = document.getElementById('picker-results');
    if (results.length === 0) {
      container.innerHTML = '<div class="text-center text-white/30 text-sm py-8">No restaurants match your filters</div>';
      return;
    }

    const td = TRIP_DAYS.find(d => d.date === this._dayDate);

    container.innerHTML = results.map(r => {
      const badgeClass = this._creditBadgeClass(r.creditType);
      const vip = CreditEngine.getVIPInfo(r.id, this._dayDate, this._mealSlot);
      const valueStars = this._valueStars(r.ddpValue);

      return `
        <div class="restaurant-card" onclick="RestaurantPicker.selectRestaurant(${r.id})">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium">${r.name}</div>
              <div class="text-[11px] text-white/40 mt-0.5">${r.location}${r.parkArea ? ' — ' + r.parkArea : ''}</div>
              <div class="flex items-center gap-1 mt-1 flex-wrap">
                <span class="badge ${badgeClass}">${r.creditType}</span>
                ${r.cuisine ? `<span class="text-[10px] text-white/30">${r.cuisine}</span>` : ''}
                ${r.seafoodWarning ? '<span class="badge badge-seafood">SEAFOOD</span>' : ''}
                ${r.isCharacter ? `<span class="badge badge-character">CHARS</span>` : ''}
                ${r.isBuffet ? '<span class="text-[10px] text-white/30">Buffet/AYCE</span>' : ''}
                ${r.familyReview === 'loved' ? '<span class="badge badge-loved">LOVED</span>' : ''}
                ${r.familyReview === 'liked' ? '<span class="badge badge-loved">LIKED</span>' : ''}
                ${r.familyReview === 'skip' ? '<span class="badge badge-skip">SKIP</span>' : ''}
                ${vip.available ? `<span class="badge badge-vip">${vip.pct}% VIP</span>` : ''}
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

  _creditBadgeClass(creditType) {
    const map = { '1TS': 'badge-ts', '2TS': 'badge-2ts', 'QS': 'badge-qs', 'SN': 'badge-sn', 'OOP': 'badge-oop' };
    return map[creditType] || 'badge-ts';
  },

  _valueStars(value) {
    const map = { excellent: '★★★', good: '★★', fair: '★', poor: '', 'n/a': '' };
    return map[value] || '';
  },

  // Selection flow
  selectRestaurant(restaurantId) {
    const r = CreditEngine._getRestaurant(restaurantId);
    if (!r) return;

    this.close();

    const td = TRIP_DAYS.find(d => d.date === this._dayDate);
    const vip = CreditEngine.getVIPInfo(restaurantId, this._dayDate, this._mealSlot);

    if (!r.acceptsDDP || r.creditType === 'OOP') {
      // OOP only
      this._finalizeSelection(restaurantId, 'oop', null);
      return;
    }

    if (vip.available) {
      // Show VIP prompt
      this._showPaymentModal(r, vip);
      return;
    }

    // DDP eligible, check for June 8 overlap
    const pools = CreditEngine.getPoolsForDate(this._dayDate);
    if (pools.length > 1) {
      this._showPoolModal(restaurantId, 'ddp', pools);
      return;
    }

    this._finalizeSelection(restaurantId, 'ddp', pools[0]);
  },

  _showPaymentModal(restaurant, vipInfo) {
    const modal = document.getElementById('payment-modal');
    document.getElementById('payment-restaurant-name').textContent = restaurant.name;
    document.getElementById('payment-context').textContent =
      `${vipInfo.pct}% V.I.PASSHOLDER discount available! Estimated savings: ~$${vipInfo.estimatedSavings}`;

    const pools = CreditEngine.getPoolsForDate(this._dayDate);
    const restaurantId = restaurant.id;

    let options = `
      <button onclick="RestaurantPicker._onPaymentChoice(${restaurantId}, 'vip')"
        class="w-full text-left p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
        <div class="text-sm font-medium text-amber-300">Use ${vipInfo.pct}% VIP Discount</div>
        <div class="text-[11px] text-white/40 mt-0.5">Pay OOP ~$${Math.round((restaurant.avgAdultPrice || 40) * 3 * (1 - vipInfo.pct / 100))} and save your DDP credit</div>
      </button>
      <button onclick="RestaurantPicker._onPaymentChoice(${restaurantId}, 'ddp')"
        class="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
        <div class="text-sm font-medium">Use DDP Credit</div>
        <div class="text-[11px] text-white/40 mt-0.5">${restaurant.creditsConsumed} ${restaurant.creditCategory.toUpperCase()} credit${restaurant.creditsConsumed > 1 ? 's' : ''}</div>
      </button>
      <button onclick="RestaurantPicker._onPaymentChoice(${restaurantId}, 'oop')"
        class="w-full text-left p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
        <div class="text-sm font-medium text-white/60">Pay Out of Pocket</div>
        <div class="text-[11px] text-white/40 mt-0.5">No discount, no DDP credit</div>
      </button>
    `;

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
      const r = CreditEngine._getRestaurant(restaurantId);
      const cat = r.creditCategory;
      const remaining = balance[cat].remaining;
      const pool = POOLS[poolId];

      return `
        <button onclick="RestaurantPicker._onPoolChoice(${restaurantId}, '${paymentMethod}', '${poolId}')"
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
