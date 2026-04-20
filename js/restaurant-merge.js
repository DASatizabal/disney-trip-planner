// Shared merge logic: combines CSV_RESTAURANTS + RESTAURANTS (DB) into a single
// MERGED_RESTAURANTS array used by both the planner picker and the restaurant list page.

const CLOSED_RESTAURANTS = ["Crew's Cup Lounge", "Refreshment Port", "Trader Sam's Tiki Terrace"];

const RestaurantMerge = {
  _merged: null,

  _norm(s) {
    return (s || '').replace(/[®™©''""–—\-]/g, '').replace(/[^a-z0-9 ]/gi, '').toLowerCase().trim().replace(/ +/g, ' ');
  },

  _extractCuisine(price, style) {
    const parts = [];
    if (price) {
      const m = price.match(/\),\s*(.+)/);
      if (m) parts.push(...m[1].split(',').map(s => s.trim()));
    }
    if (!parts.length && style) {
      const skip = ['a la Carte', 'Buffet', 'Character Dining', 'Casual Dining', 'Fine/Signature Dining',
        'Quick Service Restaurant', 'Mobile Orders', 'Bar-Lounge', 'Pool Bar', 'Snack', 'Quick Service Kiosk',
        'Quick Service - Coffee', 'Bakery', 'Dinner Shows', 'Family Style', 'Dining Events',
        'Reservations Accepted', 'Festival Kiosk', 'Prix Fixe', 'Quick Service'];
      const tags = style.split(',').map(s => s.trim()).filter(s => !skip.includes(s));
      if (tags.length) parts.push(...tags);
    }
    return parts.join(', ') || null;
  },

  _inferCreditType(csvRow) {
    const style = (csvRow.style || '').toLowerCase();
    const type = (csvRow.type || '').toLowerCase();

    if (style.includes('snack')) return { creditType: 'SN', creditsConsumed: 1, creditCategory: 'sn', category: 'snack' };
    if (style.includes('fine/signature') || style.includes('dinner show'))
      return { creditType: '2TS', creditsConsumed: 2, creditCategory: 'ts', category: 'table_service' };
    if (type.includes('quick service'))
      return { creditType: 'QS', creditsConsumed: 1, creditCategory: 'qs', category: 'quick_service' };
    if (type.includes('table service'))
      return { creditType: '1TS', creditsConsumed: 1, creditCategory: 'ts', category: 'table_service' };

    // Pool bars, lounges, events — default OOP
    if (style.includes('pool bar') || style.includes('dining events'))
      return { creditType: 'OOP', creditsConsumed: 0, creditCategory: 'oop', category: 'out_of_pocket' };

    return { creditType: 'OOP', creditsConsumed: 0, creditCategory: 'oop', category: 'out_of_pocket' };
  },

  _priceTier(price) {
    if (!price) return '';
    if (price.startsWith('$$$$')) return '$$$$';
    if (price.startsWith('$$$')) return '$$$';
    if (price.startsWith('$$')) return '$$';
    if (price.startsWith('$')) return '$';
    return '';
  },

  getMerged() {
    if (this._merged) return this._merged;

    // Build DB lookup by normalized name (strip parentheticals for matching)
    const dbMap = new Map();
    if (typeof RESTAURANTS !== 'undefined') {
      RESTAURANTS.forEach(r => {
        dbMap.set(this._norm(r.name.replace(/ \(.*\)/, '')), r);
      });
    }

    const result = [];
    const csvMatchedDbIds = new Set();

    // Process CSV entries if available
    if (typeof CSV_RESTAURANTS !== 'undefined') {
      CSV_RESTAURANTS.forEach(csv => {
        const key = this._norm(csv.name);
        let db = dbMap.get(key);
        if (!db) {
          for (const [dk, dr] of dbMap) {
            if (dk.includes(key) || key.includes(dk)) { db = dr; break; }
          }
        }

        const inferred = db ? null : this._inferCreditType(csv);
        const isClosed = CLOSED_RESTAURANTS.some(c => this._norm(c) === key || key.includes(this._norm(c)));

        result.push({
          // Identity
          id: db ? db.id : null,
          name: csv.name,
          csvOnly: !db,
          closed: isClosed,

          // Type info — prefer DB, fall back to inferred
          creditType: db ? db.creditType : inferred.creditType,
          creditsConsumed: db ? db.creditsConsumed : inferred.creditsConsumed,
          creditCategory: db ? db.creditCategory : inferred.creditCategory,
          category: db ? db.category : inferred.category,

          // Location
          location: csv.location || (db ? db.location : ''),
          parkArea: db ? db.parkArea : null,

          // Details
          cuisine: db ? db.cuisine : this._extractCuisine(csv.price, csv.style),
          meals: db ? db.meals : (inferred.category === 'snack' ? ['snack'] : ['lunch', 'dinner']),
          avgAdultPrice: db ? db.avgAdultPrice : null,
          avgKidPrice: db ? db.avgKidPrice : null,
          type: csv.type || (db ? (db.category === 'table_service' ? 'Table Service' : 'Quick Service') : ''),
          style: csv.style,
          price: csv.price,
          priceTier: this._priceTier(csv.price) || (db && db.avgAdultPrice ? (db.avgAdultPrice > 60 ? '$$$$' : db.avgAdultPrice > 35 ? '$$$' : db.avgAdultPrice > 15 ? '$$' : '$') : ''),
          reservation: csv.reservation === 'Y',

          // DDP flags
          acceptsDDP: db ? db.acceptsDDP : (inferred.creditType !== 'OOP'),
          isCharacter: db ? db.isCharacter : false,
          characterNames: db ? db.characterNames : null,
          isBuffet: db ? db.isBuffet : false,
          isSignature: db ? db.isSignature : false,
          isDinnerShow: db ? db.isDinnerShow : false,
          isLounge: db ? db.isLounge : false,
          seafoodWarning: db ? db.seafoodWarning : false,
          seafoodNotes: db ? db.seafoodNotes : null,
          mobileOrder: db ? db.mobileOrder : false,

          // Discounts
          apDiscountPct: db ? db.apDiscountPct : 0,
          apDiscountNotes: db ? db.apDiscountNotes : null,
          vipDiscountPct: db ? db.vipDiscountPct : 0,
          vipDiscountMeals: db ? db.vipDiscountMeals : [],
          vipDiscountNotes: db ? db.vipDiscountNotes : null,

          // Family
          familyBeenBefore: db ? db.familyBeenBefore : false,
          familyReview: db ? db.familyReview : null,
          ddpValue: db ? db.ddpValue : null,
          notes: db ? db.notes : null,
        });

        if (db) csvMatchedDbIds.add(db.id);
      });
    }

    // Add DB-only entries (snack breakouts, etc.)
    if (typeof RESTAURANTS !== 'undefined') {
      RESTAURANTS.forEach(r => {
        if (csvMatchedDbIds.has(r.id)) return;

        result.push({
          id: r.id,
          name: r.name,
          csvOnly: false,
          closed: false,

          creditType: r.creditType,
          creditsConsumed: r.creditsConsumed,
          creditCategory: r.creditCategory,
          category: r.category,

          location: r.location,
          parkArea: r.parkArea,
          cuisine: r.cuisine,
          meals: r.meals,
          avgAdultPrice: r.avgAdultPrice,
          avgKidPrice: r.avgKidPrice,
          type: r.category === 'table_service' ? 'Table Service' : r.category === 'quick_service' ? 'Quick Service' : 'Quick Service',
          style: '',
          price: '',
          priceTier: r.avgAdultPrice ? (r.avgAdultPrice > 60 ? '$$$$' : r.avgAdultPrice > 35 ? '$$$' : r.avgAdultPrice > 15 ? '$$' : '$') : '',
          reservation: false,

          acceptsDDP: r.acceptsDDP,
          isCharacter: r.isCharacter,
          characterNames: r.characterNames,
          isBuffet: r.isBuffet,
          isSignature: r.isSignature,
          isDinnerShow: r.isDinnerShow,
          isLounge: r.isLounge,
          seafoodWarning: r.seafoodWarning,
          seafoodNotes: r.seafoodNotes,
          mobileOrder: r.mobileOrder,

          apDiscountPct: r.apDiscountPct,
          apDiscountNotes: r.apDiscountNotes,
          vipDiscountPct: r.vipDiscountPct,
          vipDiscountMeals: r.vipDiscountMeals,
          vipDiscountNotes: r.vipDiscountNotes,

          familyBeenBefore: r.familyBeenBefore,
          familyReview: r.familyReview,
          ddpValue: r.ddpValue,
          notes: r.notes,
        });
      });
    }

    this._merged = result;
    return result;
  },

  // Get a restaurant by DB id (for credit engine compatibility)
  getById(id) {
    if (!id) return null;
    if (typeof RESTAURANTS !== 'undefined') {
      if (!this._dbCache) {
        this._dbCache = {};
        RESTAURANTS.forEach(r => { this._dbCache[r.id] = r; });
      }
      return this._dbCache[id];
    }
    return null;
  },

  // Find a merged entry by name (for picker results that are CSV-only)
  findByName(name) {
    const merged = this.getMerged();
    const key = this._norm(name);
    return merged.find(r => this._norm(r.name) === key);
  }
};
