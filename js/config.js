const APP_VERSION = '1.11.4';
const APP_BUILD = 'd05ef17';

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
  { date: '2026-06-05', dow: 'Friday',    pool: 'A', defaultPark: 'Water Park - Typhoon Lagoon', vip: false, isCheckin: true,  isCheckout: false, notes: 'Leave 6am, 4hr drive, check in 10am at PO. Typhoon Lagoon afternoon. HS backup if water park closed' },
  { date: '2026-06-06', dow: 'Saturday',  pool: 'A', defaultPark: 'Water Park - Typhoon Lagoon', vip: false, isCheckin: false, isCheckout: false, notes: 'Water park primary. Storm/lightning closure backup = any park reservation' },
  { date: '2026-06-07', dow: 'Sunday',    pool: 'A', defaultPark: 'EPCOT',                       vip: false, isCheckin: false, isCheckout: false, notes: 'Space 220 day' },
  { date: '2026-06-08', dow: 'Monday',    pool: 'B', defaultPark: 'Hollywood Studios',           vip: true,  isCheckin: true,  isCheckout: true,  overlapPool: 'A', notes: 'AoA check-in. Green crowd for HS. Both buckets valid today' },
  { date: '2026-06-09', dow: 'Tuesday',   pool: 'B', defaultPark: 'Magic Kingdom',               vip: true,  isCheckin: false, isCheckout: false, notes: 'Harmony Barber Shop 2pm LOCKED. Boys haircuts' },
  { date: '2026-06-10', dow: 'Wednesday', pool: 'B', defaultPark: 'Magic Kingdom',               vip: true,  isCheckin: false, isCheckout: false, notes: 'MK Day 2. Green crowd. Disney After Hours in evening shortens regular hours' },
  { date: '2026-06-11', dow: 'Thursday',  pool: 'B', defaultPark: 'Animal Kingdom',              vip: true,  isCheckin: false, isCheckout: false, notes: 'AK full day. Green crowd. Last VIP day. AK closes 6pm so pool/Springs evening' },
  { date: '2026-06-12', dow: 'Friday',    pool: 'B', defaultPark: 'Hollywood Studios',           vip: false, isCheckin: false, isCheckout: true,  notes: 'Checkout 11am, bags to bell services. HS till midnight close. Drive home after midnight' }
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

const DEFAULT_MEAL_TIMES = {
  breakfast: '08:00',
  lunch:     '12:30',
  dinner:    '18:30',
  snack1:    '10:00',
  snack2:    '15:00',
  snack3:    '16:30',
  snack4:    '21:00'
};

const DEFAULT_SPLIT_DIVIDER_TIME = '13:00';

const EVENT_KINDS = [
  { id: 'lightning_lane', label: 'Lightning Lane',       icon: 'zap' },
  { id: 'character',      label: 'Character experience', icon: 'sparkles' },
  { id: 'fireworks',      label: 'Fireworks',            icon: 'flame' },
  { id: 'parade',         label: 'Parade',               icon: 'flag' },
  { id: 'show',           label: 'Show',                 icon: 'tv' },
  { id: 'barber',         label: 'Barber shop',          icon: 'scissors' },
  { id: 'tour',           label: 'Tour',                 icon: 'map' },
  { id: 'other',          label: 'Other',                icon: 'calendar' }
];

const EVENT_KIND_MAP = EVENT_KINDS.reduce((acc, k) => { acc[k.id] = k; return acc; }, {});

function formatTime12h(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return '';
  const [hStr, mStr] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return '';
  const ampm = h >= 12 ? 'p' : 'a';
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, '0')}${ampm}`;
}

function parkForTime(day, hhmm) {
  if (!day) return null;
  if (!day.splitDay || !day.splitParks) return day.park;
  const divider = day.splitDividerTime || DEFAULT_SPLIT_DIVIDER_TIME;
  return (hhmm || '00:00') < divider ? day.splitParks.am : day.splitParks.pm;
}

const STORAGE_PREFIX = 'ddp_planner';
