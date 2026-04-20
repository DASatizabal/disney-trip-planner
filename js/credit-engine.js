const CreditEngine = {
  _restaurantCache: null,

  _getRestaurant(id) {
    if (!this._restaurantCache) {
      this._restaurantCache = {};
      RESTAURANTS.forEach(r => { this._restaurantCache[r.id] = r; });
    }
    return this._restaurantCache[id];
  },

  getBalance(poolId, planState) {
    const pool = POOLS[poolId];
    const used = { ts: 0, qs: 0, sn: 0 };

    Object.values(planState.days).forEach(day => {
      Object.values(day.selections).forEach(sel => {
        if (!sel || sel.paymentMethod !== 'ddp' || sel.pool !== poolId) return;
        const r = this._getRestaurant(sel.restaurantId);
        if (!r || r.creditCategory === 'oop') return;
        used[r.creditCategory] += r.creditsConsumed;
      });
    });

    return {
      ts: { total: pool.ts, used: used.ts, remaining: pool.ts - used.ts },
      qs: { total: pool.qs, used: used.qs, remaining: pool.qs - used.qs },
      sn: { total: pool.sn, used: used.sn, remaining: pool.sn - used.sn }
    };
  },

  wouldOverdraft(poolId, restaurantId, planState) {
    const r = this._getRestaurant(restaurantId);
    if (!r || r.creditCategory === 'oop') return { ok: true, remaining: 0, deficit: 0 };

    const balance = this.getBalance(poolId, planState);
    const cat = r.creditCategory;
    const currentRemaining = balance[cat].remaining;
    const afterRemaining = currentRemaining - r.creditsConsumed;
    return {
      ok: afterRemaining >= 0,
      currentRemaining,
      afterRemaining,
      total: balance[cat].total,
      deficit: afterRemaining < 0 ? Math.abs(afterRemaining) : 0,
      creditType: cat,
      creditsNeeded: r.creditsConsumed
    };
  },

  getPoolsForDate(dateStr) {
    const day = TRIP_DAYS.find(d => d.date === dateStr);
    if (!day) return [];
    const pools = [day.pool];
    if (day.overlapPool) pools.push(day.overlapPool);
    return pools;
  },

  getVIPInfo(restaurantId, dateStr, mealSlot) {
    const r = this._getRestaurant(restaurantId);
    const day = TRIP_DAYS.find(d => d.date === dateStr);
    if (!r || !day || !day.vip) return { available: false, pct: 0, estimatedSavings: 0 };

    const mealName = this.slotToMeal(mealSlot);
    if (r.vipDiscountPct > 0 && r.vipDiscountMeals && r.vipDiscountMeals.includes(mealName)) {
      const price = (r.avgAdultPrice || 40) * 3 + (r.avgKidPrice || 15);
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

  estimateOOP(planState) {
    let total = 0;
    Object.values(planState.days).forEach(day => {
      Object.values(day.selections).forEach(sel => {
        if (!sel || sel.paymentMethod === 'ddp') return;
        const r = this._getRestaurant(sel.restaurantId);
        if (!r) return;
        const adultPrice = r.avgAdultPrice || 0;
        const kidPrice = r.avgKidPrice || 0;
        let price = adultPrice * 3 + kidPrice;
        if (sel.paymentMethod === 'vip') {
          price *= (1 - (r.vipDiscountPct || 0) / 100);
        }
        total += price;
      });
    });
    return Math.round(total);
  }
};
