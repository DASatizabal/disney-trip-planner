const APP_VERSION = '1.4.0';

const FAMILY = [
  { id: 'david', name: 'David', age: 'adult', ddpFree: false, canDrink: true, dietary: null },
  { id: 'lisa', name: 'Lisa', age: 'adult', ddpFree: false, canDrink: true, dietary: 'seafood_allergy' },
  { id: 'dante', name: 'Dante', age: 14, ddpFree: false, canDrink: false, dietary: null },
  { id: 'djr', name: 'David Jr.', age: 6, ddpFree: true, canDrink: false, dietary: null }
];

const POOLS = {
  A: {
    name: 'Bucket A', resort: 'Port Orleans Riverside', confirmation: '#42007787',
    checkin: '2026-06-05', checkout: '2026-06-08', nights: 3,
    ts: 12, qs: 12, sn: 12, color: 'blue'
  },
  B: {
    name: 'Bucket B', resort: 'Art of Animation', confirmation: '#41849743',
    checkin: '2026-06-08', checkout: '2026-06-12', nights: 4,
    ts: 16, qs: 16, sn: 16, color: 'green'
  }
};

const TRIP_DAYS = [
  { date: '2026-06-05', dow: 'Friday',    pool: 'A', defaultPark: 'none',              vip: false, isCheckin: true,  isCheckout: false, notes: 'Drive up from Florida City. Arrive ~noon. PO check-in 3pm' },
  { date: '2026-06-06', dow: 'Saturday',  pool: 'A', defaultPark: 'none',              vip: false, isCheckin: false, isCheckout: false, notes: 'Open day. Water park? Disney Springs?' },
  { date: '2026-06-07', dow: 'Sunday',    pool: 'A', defaultPark: 'EPCOT',             vip: false, isCheckin: false, isCheckout: false, notes: 'Space 220 day!' },
  { date: '2026-06-08', dow: 'Monday',    pool: 'B', defaultPark: 'Hollywood Studios', vip: true,  isCheckin: true,  isCheckout: true,  overlapPool: 'A', notes: 'AoA check-in. Both buckets valid!' },
  { date: '2026-06-09', dow: 'Tuesday',   pool: 'B', defaultPark: 'Magic Kingdom',     vip: true,  isCheckin: false, isCheckout: false, notes: 'Harmony Barber Shop 2pm (both boys)' },
  { date: '2026-06-10', dow: 'Wednesday', pool: 'B', defaultPark: 'Animal Kingdom',    vip: true,  isCheckin: false, isCheckout: false, notes: 'Half day + park hop' },
  { date: '2026-06-11', dow: 'Thursday',  pool: 'B', defaultPark: 'Magic Kingdom',     vip: true,  isCheckin: false, isCheckout: false, notes: 'MK Day 2. Last VIP day' },
  { date: '2026-06-12', dow: 'Friday',    pool: 'B', defaultPark: 'Hollywood Studios', vip: false, isCheckin: false, isCheckout: true,  notes: 'Checkout 11am. Credits expire midnight' }
];

const PARK_OPTIONS = [
  'Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom',
  'Disney Springs', 'Resort Day', 'Water Park - Typhoon Lagoon',
  'Water Park - Blizzard Beach', 'Split Day', 'Travel Day'
];

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack1', 'snack2', 'snack3', 'snack4'];

const MEAL_ICONS = {
  breakfast: 'sunrise', lunch: 'sun', dinner: 'moon',
  snack1: 'cookie', snack2: 'cookie', snack3: 'cookie', snack4: 'cookie'
};

const MEAL_LABELS = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner',
  snack1: 'Snack 1', snack2: 'Snack 2', snack3: 'Snack 3', snack4: 'Snack 4'
};

const STORAGE_PREFIX = 'ddp_planner';
