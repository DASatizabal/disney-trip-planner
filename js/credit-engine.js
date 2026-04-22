const CreditEngine = {
  _restaurantCache: null,

  _getRestaurant(id) {
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
    if (!restaurant || restaurant.creditCategory === 'oop') return 0;
    return restaurant.creditsConsumed * this.selectionDiners(sel).length;
  },

  // Returns full gross price (before VIP/AP discount) given a restaurant + diners list
  costForDiners(restaurant, dinerIds) {
    if (!restaurant) return 0;
    const adult = restaurant.avgAdultPrice || 0;
    const kid = restaurant.avgKidPrice || 0;
    return dinerIds.reduce((sum, id) => sum + (this.isAdult(id) ? adult : kid), 0);
  },

  getBalance(poolId, planState) {
    const pool = POOLS[poolId];
    const used = { ts: 0, qs: 0, sn: 0 };

    Object.values(planState.days).forEach(day => {
      Object.values(day.selections).forEach(sel => {
        if (!sel || sel.paymentMethod !== 'ddp' || sel.pool !== poolId) return;
        const r = this._getRestaurant(sel.restaurantId);
        if (!r || r.creditCategory === 'oop') return;
        used[r.creditCategory] += this.countCreditsForSelection(sel, r);
      });
    });

    return {
      ts: { total: pool.ts, used: used.ts, remaining: pool.ts - used.ts },
      qs: { total: pool.qs, used: used.qs, remaining: pool.qs - used.qs },
      sn: { total: pool.sn, used: used.sn, remaining: pool.sn - used.sn }
    };
  },

  wouldOverdraft(poolId, restaurantId, planState, dinerIds) {
    const r = this._getRestaurant(restaurantId);
    if (!r || r.creditCategory === 'oop') return { ok: true, remaining: 0, deficit: 0 };

    const diners = dinerIds && dinerIds.length ? dinerIds : this.defaultDiners();
    const needed = r.creditsConsumed * diners.length;
    const balance = this.getBalance(poolId, planState);
    const cat = r.creditCategory;
    const currentRemaining = balance[cat].remaining;
    const afterRemaining = currentRemaining - needed;
    return {
      ok: afterRemaining >= 0,
      currentRemaining,
      afterRemaining,
      total: balance[cat].total,
      deficit: afterRemaining < 0 ? Math.abs(afterRemaining) : 0,
      creditType: cat,
      creditsNeeded: needed
    };
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
      const price = this.costForDiners(r, diners) || (40 * 3 + 15);
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
      ['ts', 'qs', 'sn'].forEach(type => {
        if (balance[type].remaining < 0) {
          conflicts.push({
            type: 'overdraft',
            pool: poolId,
            creditType: type,
            severity: 'error',
            message: `Bucket ${poolId} is ${Math.abs(balance[type].remaining)} ${type.toUpperCase()} credit${Math.abs(balance[type].remaining) !== 1 ? 's' : ''} over budget`
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

        // Location mismatch
        const effectivePark = day.splitDay && day.splitParks
          ? (slot === 'dinner' || slot.startsWith('snack3') || slot.startsWith('snack4')
            ? day.splitParks.pm : day.splitParks.am)
          : day.park;

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
        const fullPrice = this.costForDiners(r, this.selectionDiners(sel));
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
    const price = this.costForDiners(r, diners) || (40 * 3 + 15);
    const savings = Math.round(price * (r.apDiscountPct / 100));
    return {
      available: true,
      pct: r.apDiscountPct,
      estimatedSavings: savings,
      notes: r.apDiscountNotes
    };
  }
};
