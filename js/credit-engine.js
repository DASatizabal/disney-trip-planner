const CreditEngine = {
  _restaurantCache: null,

  // Adult/child-split credit buckets. TS and QS are split by diner age
  // (adults 10+, children 3-9); snacks stay a single shared pool.
  BUCKETS: ['tsAdult', 'tsChild', 'qsAdult', 'qsChild', 'sn'],
  BUCKET_LABELS: {
    tsAdult: 'Adult TS', tsChild: 'Child TS',
    qsAdult: 'Adult QS', qsChild: 'Child QS', sn: 'Snack'
  },

  _getRestaurant(id) {
    if (id == null) return undefined;
    // CSV-only selections store a synthetic "_csv_<slug>" string id with no DB
    // entry. Resolve them through the merge layer so their credits and OOP cost
    // still count toward the pool balances (otherwise added/removed CSV-only
    // snacks and meals never update the dashboard).
    if (typeof id === 'string') {
      if (typeof RestaurantMerge !== 'undefined') {
        return RestaurantMerge.findByCsvId(id) || undefined;
      }
      return undefined;
    }
    if (!this._restaurantCache) {
      this._restaurantCache = {};
      RESTAURANTS.forEach(r => { this._restaurantCache[r.id] = r; });
    }
    return this._restaurantCache[id];
  },

  // F1: Diner helpers — credits and OOP cost are per-head, not per-selection
  defaultDiners() {
    return FAMILY.map(f => f.id);
  },

  isAdult(memberOrId) {
    const m = typeof memberOrId === 'string' ? FAMILY.find(f => f.id === memberOrId) : memberOrId;
    if (!m) return true;
    return m.age === 'adult' || (typeof m.age === 'number' && m.age >= 10);
  },

  selectionDiners(sel) {
    return (sel && Array.isArray(sel.diners) && sel.diners.length) ? sel.diners : this.defaultDiners();
  },

  countCreditsForSelection(sel, restaurant) {
    return this.creditBreakdown(sel, restaurant).total;
  },

  // Split a selection's credit cost by diner age. Meals charge
  // creditsConsumed per head into the adult or child bucket of their
  // category; snacks are per-item (one churro = one SN credit) and never
  // split. Returns { category, adults, children, adultCredits, childCredits, total }.
  creditBreakdown(sel, restaurant) {
    const empty = { category: 'oop', adults: 0, children: 0, adultCredits: 0, childCredits: 0, total: 0 };
    if (!restaurant || restaurant.creditCategory === 'oop') return empty;
    if (restaurant.creditCategory === 'sn') {
      return { category: 'sn', adults: 0, children: 0, adultCredits: 0, childCredits: 0, total: restaurant.creditsConsumed };
    }
    let adults = 0, children = 0;
    this.selectionDiners(sel).forEach(id => { this.isAdult(id) ? adults++ : children++; });
    const adultCredits = restaurant.creditsConsumed * adults;
    const childCredits = restaurant.creditsConsumed * children;
    return { category: restaurant.creditCategory, adults, children, adultCredits, childCredits, total: adultCredits + childCredits };
  },

  // Returns full gross price (before VIP/AP discount) given a restaurant + diners list
  costForDiners(restaurant, dinerIds) {
    if (!restaurant) return 0;
    const adult = restaurant.avgAdultPrice || 0;
    const kid = restaurant.avgKidPrice || 0;
    return dinerIds.reduce((sum, id) => sum + (this.isAdult(id) ? adult : kid), 0);
  },

  // Gross cost of a selection — snacks are per-item, meals are per-diner
  grossCostForSelection(sel, restaurant) {
    if (!restaurant) return 0;
    if (restaurant.creditCategory === 'sn') return restaurant.avgAdultPrice || 0;
    return this.costForDiners(restaurant, this.selectionDiners(sel));
  },

  getBalance(poolId, planState) {
    const pool = POOLS[poolId];
    const used = { tsAdult: 0, tsChild: 0, qsAdult: 0, qsChild: 0, sn: 0 };

    Object.values(planState.days).forEach(day => {
      Object.values(day.selections).forEach(sel => {
        if (!sel || sel.paymentMethod !== 'ddp' || sel.pool !== poolId) return;
        const r = this._getRestaurant(sel.restaurantId);
        if (!r || r.creditCategory === 'oop') return;
        const bd = this.creditBreakdown(sel, r);
        if (bd.category === 'sn') {
          used.sn += bd.total;
        } else {
          used[bd.category + 'Adult'] += bd.adultCredits;
          used[bd.category + 'Child'] += bd.childCredits;
        }
      });
    });

    const mk = (total, u) => ({ total, used: u, remaining: total - u });
    const b = {
      tsAdult: mk(pool.tsAdult, used.tsAdult),
      tsChild: mk(pool.tsChild, used.tsChild),
      qsAdult: mk(pool.qsAdult, used.qsAdult),
      qsChild: mk(pool.qsChild, used.qsChild),
      sn: mk(pool.sn, used.sn)
    };
    // Aggregate convenience totals (adult + child) for summaries and the
    // availability page, which don't care about the age split.
    b.ts = mk(b.tsAdult.total + b.tsChild.total, b.tsAdult.used + b.tsChild.used);
    b.qs = mk(b.qsAdult.total + b.qsChild.total, b.qsAdult.used + b.qsChild.used);
    return b;
  },

  // Checks whether adding this selection would overdraft any of its credit
  // buckets. Adult and child buckets are strictly separate, so a single
  // meal can be checked against up to two buckets (e.g. 3 Adult TS + 1 Child
  // TS). Returns { ok, checks: [{bucket,label,needed,currentRemaining,
  // afterRemaining,total,ok}], worst }.
  wouldOverdraft(poolId, restaurantId, planState, dinerIds) {
    const r = this._getRestaurant(restaurantId);
    if (!r || r.creditCategory === 'oop') return { ok: true, checks: [], worst: null };

    const sel = { diners: (dinerIds && dinerIds.length ? dinerIds : this.defaultDiners()) };
    const bd = this.creditBreakdown(sel, r);
    const balance = this.getBalance(poolId, planState);

    const checks = [];
    const addCheck = (bucket, needed) => {
      if (needed <= 0) return;
      const cur = balance[bucket].remaining;
      checks.push({
        bucket, label: this.BUCKET_LABELS[bucket], needed,
        currentRemaining: cur, afterRemaining: cur - needed,
        total: balance[bucket].total, ok: cur - needed >= 0
      });
    };
    if (bd.category === 'sn') {
      addCheck('sn', bd.total);
    } else {
      addCheck(bd.category + 'Adult', bd.adultCredits);
      addCheck(bd.category + 'Child', bd.childCredits);
    }

    const worst = checks.slice().sort((a, b) => a.afterRemaining - b.afterRemaining)[0] || null;
    return { ok: checks.every(c => c.ok), checks, worst, creditType: r.creditCategory };
  },

  getPoolsForDate(dateStr) {
    const day = TRIP_DAYS.find(d => d.date === dateStr);
    if (!day) return [];
    const pools = [day.pool];
    if (day.overlapPool) pools.push(day.overlapPool);
    return pools;
  },

  getVIPInfo(restaurantId, dateStr, mealSlot, dinerIds) {
    const r = this._getRestaurant(restaurantId);
    const day = TRIP_DAYS.find(d => d.date === dateStr);
    if (!r || !day || !day.vip) return { available: false, pct: 0, estimatedSavings: 0 };

    const mealName = this.slotToMeal(mealSlot);
    if (r.vipDiscountPct > 0 && r.vipDiscountMeals && r.vipDiscountMeals.includes(mealName)) {
      const diners = dinerIds && dinerIds.length ? dinerIds : this.defaultDiners();
      const price = r.creditCategory === 'sn'
        ? (r.avgAdultPrice || 15)
        : (this.costForDiners(r, diners) || (40 * 3 + 15));
      const savings = Math.round(price * (r.vipDiscountPct / 100));
      return { available: true, pct: r.vipDiscountPct, estimatedSavings: savings };
    }
    return { available: false, pct: 0, estimatedSavings: 0 };
  },

  slotToMeal(slot) {
    if (slot.startsWith('snack')) return 'snack';
    return slot;
  },

  detectConflicts(planState) {
    const conflicts = [];

    // Overdraft check
    ['A', 'B'].forEach(poolId => {
      const balance = this.getBalance(poolId, planState);
      this.BUCKETS.forEach(bucket => {
        if (balance[bucket].remaining < 0) {
          const over = Math.abs(balance[bucket].remaining);
          conflicts.push({
            type: 'overdraft',
            pool: poolId,
            creditType: bucket,
            severity: 'error',
            message: `Bucket ${poolId} is ${over} ${this.BUCKET_LABELS[bucket]} credit${over !== 1 ? 's' : ''} over budget`
          });
        }
      });
    });

    // Location mismatch & missed VIP
    TRIP_DAYS.forEach(td => {
      const day = planState.days[td.date];
      if (!day) return;

      MEAL_SLOTS.forEach(slot => {
        const sel = day.selections[slot];
        if (!sel) return;

        const r = this._getRestaurant(sel.restaurantId);
        if (!r) return;

        // Location mismatch — uses time-based AM/PM split
        const time = sel.time || DEFAULT_MEAL_TIMES[slot];
        const effectivePark = parkForTime(day, time);

        if (effectivePark && effectivePark !== 'none' && !effectivePark.startsWith('Resort')
            && !effectivePark.startsWith('Travel') && !effectivePark.startsWith('Split')) {
          const isResort = !['Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs'].includes(r.location)
            && !r.location.startsWith('Water Park');
          if (!isResort && r.location !== effectivePark) {
            conflicts.push({
              type: 'location_mismatch',
              dayDate: td.date,
              slot,
              severity: 'warning',
              message: `${r.name} is at ${r.location} but ${td.dow} is ${effectivePark}`
            });
          }
        }

        // Missed VIP
        if (sel.paymentMethod === 'ddp' && td.vip) {
          const vip = this.getVIPInfo(sel.restaurantId, td.date, slot);
          if (vip.available) {
            conflicts.push({
              type: 'missed_vip',
              dayDate: td.date,
              slot,
              severity: 'tip',
              message: `${vip.pct}% VIP discount available at ${r.name}! Save ~$${vip.estimatedSavings} by paying OOP`
            });
          }
        }
      });
    });

    return conflicts;
  },

  // C6: OOP with committed vs projected split — F1: diners-aware
  estimateOOPDetailed(planState) {
    let committed = 0;
    let vipSavings = 0;
    let apSavings = 0;

    Object.values(planState.days).forEach(day => {
      Object.values(day.selections).forEach(sel => {
        if (!sel || sel.paymentMethod === 'ddp') return;
        const r = this._getRestaurant(sel.restaurantId);
        if (!r) return;
        const fullPrice = this.grossCostForSelection(sel, r);
        let price = fullPrice;
        if (sel.paymentMethod === 'vip') {
          const discount = fullPrice * (r.vipDiscountPct || 0) / 100;
          price -= discount;
          vipSavings += discount;
        }
        if (sel.paymentMethod === 'ap') {
          const discount = fullPrice * (r.apDiscountPct || 0) / 100;
          price -= discount;
          apSavings += discount;
        }
        committed += price;
      });
    });

    return {
      committed: Math.round(committed),
      vipSavings: Math.round(vipSavings),
      apSavings: Math.round(apSavings)
    };
  },

  // C5: AP discount info for a restaurant+date+slot — F1: diners-aware
  getAPInfo(restaurantId, dateStr, mealSlot, dinerIds) {
    const r = this._getRestaurant(restaurantId);
    if (!r || !r.apDiscountPct) return { available: false, pct: 0, estimatedSavings: 0 };

    const diners = dinerIds && dinerIds.length ? dinerIds : this.defaultDiners();
    const price = r.creditCategory === 'sn'
      ? (r.avgAdultPrice || 15)
      : (this.costForDiners(r, diners) || (40 * 3 + 15));
    const savings = Math.round(price * (r.apDiscountPct / 100));
    return {
      available: true,
      pct: r.apDiscountPct,
      estimatedSavings: savings,
      notes: r.apDiscountNotes
    };
  }
};
