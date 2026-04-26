# Disney DDP Planner — JSON Import Schema Guide

Paste this whole document into a Claude Chat conversation, then ask Claude to generate a JSON file you can import via the planner's Import button.

---

## Purpose

The Disney DDP Planner can import a JSON file that fully specifies a trip plan: which restaurant is booked for each meal, what events (Lightning Lane, fireworks, character experiences, etc.) are scheduled, and how each split day is configured. This document is the contract — if Claude follows it, the planner will accept the file.

## Where this gets imported

The header has two icons next to "Reset":
- **Upload icon** = Export (saves the current plan to a JSON file)
- **Download icon** = Import (loads a JSON file into the current scenario, replacing what's there)

So the workflow is: ask Claude to produce JSON, save it as a `.json` file, click the import button (download icon) in the planner, pick the file.

---

## Trip constants (these are fixed for this specific trip)

### The 8 trip days

The plan **must** include all 8 of these date keys, even if a day has no selections:

| Date | Day | Pool | Default park | VIP-eligible | Notes |
|---|---|---|---|---|---|
| `2026-06-05` | Friday    | A | Water Park - Typhoon Lagoon | no  | Check-in at Port Orleans Riverside |
| `2026-06-06` | Saturday  | A | Water Park - Typhoon Lagoon | no  | Water park primary |
| `2026-06-07` | Sunday    | A | EPCOT                       | no  | Space 220 day |
| `2026-06-08` | Monday    | B | Hollywood Studios           | yes | AoA check-in. Both buckets valid (overlap day) |
| `2026-06-09` | Tuesday   | B | Magic Kingdom               | yes | Harmony Barber Shop 2pm |
| `2026-06-10` | Wednesday | B | Magic Kingdom               | yes | Disney After Hours evening |
| `2026-06-11` | Thursday  | B | Animal Kingdom              | yes | AK closes 6pm |
| `2026-06-12` | Friday    | B | Hollywood Studios           | no  | Checkout day, drive home after HS midnight |

**Pool A** (June 5–8): Port Orleans Riverside. Credits: 12 TS, 12 QS, 12 SN.
**Pool B** (June 8–12): Art of Animation. Credits: 16 TS, 16 QS, 16 SN.
**Pool A credits expire midnight June 8.** Pool B expires midnight June 12.

### Family member ids

Use these exact strings for `diners` arrays:

| id | Name | Age | DDP-counted |
|---|---|---|---|
| `david` | David | adult | yes |
| `lisa` | Lisa | adult | yes (seafood allergy — flag at restaurants) |
| `dante` | Dante | 14 | yes |
| `djr` | David Jr. | 6 | no (free under DDP) |

If `diners` is omitted, all four are assumed.

### Park options (for `day.park` and `day.splitParks.am`/`pm`)

Use exactly one of:
`Magic Kingdom`, `EPCOT`, `Hollywood Studios`, `Animal Kingdom`, `Disney Springs`, `Resort Day`, `Water Park - Typhoon Lagoon`, `Water Park - Blizzard Beach`, `Split Day`, `Travel Day`, `none`.

When `splitDay` is true, `park` should be `Split Day` and the actual parks go in `splitParks.am`/`splitParks.pm`.

### Meal slots

Exactly these seven keys are valid in `selections`:
`breakfast`, `lunch`, `dinner`, `snack1`, `snack2`, `snack3`, `snack4`.

Slot identity drives the label and credit-counting role. Don't put a snack-only restaurant in `dinner` — keep credit categories matched to the slot kind.

### Default meal times

If you omit `time` on a selection, the planner fills in:

```
breakfast 08:00,  lunch 12:30,  dinner 18:30
snack1    10:00,  snack2 15:00, snack3 16:30,  snack4 21:00
```

You can override any of these per selection.

---

## Top-level JSON shape

```json
{
  "exportedAt": "2026-04-26T10:00:00.000Z",
  "appVersion": "1.7.0",
  "scenarioName": "default",
  "plan": {
    "version": 1,
    "scenarioName": "default",
    "lastModified": "2026-04-26T10:00:00.000Z",
    "days": {
      "2026-06-05": { /* day object */ },
      "2026-06-06": { /* day object */ },
      "2026-06-07": { /* day object */ },
      "2026-06-08": { /* day object */ },
      "2026-06-09": { /* day object */ },
      "2026-06-10": { /* day object */ },
      "2026-06-11": { /* day object */ },
      "2026-06-12": { /* day object */ }
    }
  }
}
```

The importer also accepts a flat shape where `plan` is omitted and `days` lives at the top level — but prefer the nested form above.

`family`, `pools`, and `tripDays` may also appear at the top level (the export writes them) but the importer ignores them — they come from the app's config.

---

## Day object schema

```json
{
  "park": "Magic Kingdom",
  "splitDay": false,
  "splitParks": null,
  "splitDividerTime": "13:00",
  "notes": "Optional free-text day notes",
  "selections": {
    "breakfast": null,
    "lunch":     null,
    "dinner":    null,
    "snack1":    null,
    "snack2":    null,
    "snack3":    null,
    "snack4":    null
  },
  "events": []
}
```

### Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `park` | string | yes (defaults to `"none"` if missing) | One of the park-options list. Use `"Split Day"` when `splitDay` is true |
| `splitDay` | boolean | no (defaults to `false`) | When true, AM and PM use different parks |
| `splitParks` | object or null | required when `splitDay` is true | `{ "am": "Magic Kingdom", "pm": "EPCOT" }` |
| `splitDividerTime` | string `"HH:MM"` 24-hour | no (defaults to `"13:00"`) | Items with `time < splitDividerTime` are AM, others PM |
| `notes` | string | no (defaults to `""`) | Free-text |
| `selections` | object | yes | Keyed by meal slot. Use `null` for empty slots |
| `events` | array | no (defaults to `[]`) | Non-dining scheduled items |

### Selection object

A non-null entry in `selections[slot]`:

```json
{
  "restaurantId": 1,
  "paymentMethod": "ddp",
  "pool": "A",
  "notes": "",
  "adrNumber": "12345678901",
  "diners": ["david", "lisa", "dante", "djr"],
  "time": "08:30"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `restaurantId` | number or string | yes | Number = DB id (see "Looking up restaurant ids" below). String like `"_csv_<slug>"` for CSV-only restaurants — only use a string id if you can't find the DB id |
| `paymentMethod` | `"ddp"` \| `"vip"` \| `"ap"` \| `"oop"` | yes | `ddp` = use a DDP credit. `vip` = use V.I.PASSHOLDER discount (Mon–Thu eligible only). `ap` = use Annual Passholder discount. `oop` = pay full price out of pocket |
| `pool` | `"A"` \| `"B"` \| `null` | yes | Required when `paymentMethod` is `"ddp"`. Must be a pool valid for that day's date. `null` for vip/ap/oop |
| `notes` | string | no (default `""`) | |
| `adrNumber` | string | no (default `""`) | The Disney Advanced Dining Reservation confirmation number |
| `diners` | string[] | no (defaults to all four ids) | Subset of `["david","lisa","dante","djr"]`. Per-meal credit counts multiply by `diners.length` (snacks are exempt — one snack = 1 SN credit regardless of diner count) |
| `time` | string `"HH:MM"` 24-hour | no (per-slot defaults above) | Drives sort order and split-day AM/PM assignment |

### Event object

An entry in `events`:

```json
{
  "id": "evt_lightning_tron_jun9",
  "name": "Tron Lightning Lane",
  "time": "09:30",
  "kind": "lightning_lane",
  "location": "Tomorrowland",
  "durationMinutes": 15,
  "notes": "Single rider line as backup"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Must be unique within the entire plan. Convention: `evt_<slug>` |
| `name` | string | yes | Free-text |
| `time` | string `"HH:MM"` 24-hour | yes | |
| `kind` | string | no (default `"other"`) | One of: `lightning_lane`, `character`, `fireworks`, `parade`, `show`, `barber`, `tour`, `other`. Drives the icon |
| `location` | string | no | Free-text (e.g., "Tomorrowland", "Cinderella Castle") |
| `durationMinutes` | number or null | no | Optional integer |
| `notes` | string | no | |

---

## Looking up restaurant ids

The planner has ~187 restaurants in its DB, each with a numeric `id`. Claude doesn't know these ids by heart. Best workflow:

1. **User exports their current plan first** (click the upload-arrow icon in the header). The exported JSON contains real `restaurantId` numbers and restaurant names — paste a few into Claude as a lookup reference.
2. **Or** the user can open `restaurants.html` in the planner to see the full list with ids.
3. **Fallback** for restaurants Claude can't identify: use a string id `"_csv_<lowercase_name_with_underscores>"`, e.g., `"_csv_chef_mickeys"`. The planner will try to match it by name. This works for CSV-imported entries but is fragile — prefer numeric ids whenever possible.

If Claude can't determine a restaurantId with confidence, it should leave that slot as `null` and add a comment in the surrounding text explaining what the user needs to fill in.

---

## Common rules / gotchas

1. **DDP pool must match the day's pool.** A selection with `paymentMethod: "ddp"` and `pool: "A"` only makes sense on June 5–8 (and June 8 overlap). Same for `pool: "B"` on June 8–12.
2. **VIP discount is only eligible Mon–Thu** (June 8, 9, 10, 11) and only for restaurants that offer it. If you're not sure, use `"ddp"` or `"oop"`.
3. **Lisa has a seafood allergy.** Avoid seafood-heavy restaurants for any meal where Lisa is a diner, or flag in `notes`.
4. **DJr (age 6) is DDP-free.** Including him in `diners` is fine; he's tracked but doesn't burn extra DDP credits beyond what the others do (the credit math accounts for this).
5. **Space 220** at EPCOT is **not on DDP** — must use `paymentMethod: "oop"` (or `"ap"` for the 10% lunch AP discount).
6. **Snacks** burn 1 SN credit per item regardless of how many people share it.
7. **Meal credit math** for table-service and quick-service: `creditsConsumed × diners.length`.
8. **Times use 24-hour `"HH:MM"`** with leading zero (e.g., `"08:00"`, not `"8:00"`).
9. **All 8 day keys must exist** in `days`. Days you don't want to plan can have empty selections (`null` for each slot) and `events: []`.

---

## Complete worked example

Trip plan for one realistic Tuesday (June 9) at Magic Kingdom — Be Our Guest breakfast, Pecos Bill lunch, Cinderella's Royal Table dinner with characters, two snacks, plus the locked 2pm Harmony Barber Shop appointment and the evening fireworks show:

```json
{
  "appVersion": "1.7.0",
  "scenarioName": "default",
  "plan": {
    "version": 1,
    "scenarioName": "default",
    "days": {
      "2026-06-09": {
        "park": "Magic Kingdom",
        "splitDay": false,
        "splitParks": null,
        "splitDividerTime": "13:00",
        "notes": "Harmony Barber Shop 2pm LOCKED. Boys haircuts",
        "selections": {
          "breakfast": {
            "restaurantId": 5,
            "paymentMethod": "ddp",
            "pool": "B",
            "notes": "",
            "adrNumber": "11111111111",
            "diners": ["david", "lisa", "dante", "djr"],
            "time": "08:30"
          },
          "lunch": {
            "restaurantId": 21,
            "paymentMethod": "ddp",
            "pool": "B",
            "notes": "",
            "adrNumber": "",
            "diners": ["david", "lisa", "dante", "djr"],
            "time": "12:30"
          },
          "dinner": {
            "restaurantId": 4,
            "paymentMethod": "ddp",
            "pool": "B",
            "notes": "Princess characters",
            "adrNumber": "22222222222",
            "diners": ["david", "lisa", "dante", "djr"],
            "time": "18:00"
          },
          "snack1": {
            "restaurantId": 50,
            "paymentMethod": "ddp",
            "pool": "B",
            "notes": "Mickey pretzel",
            "adrNumber": "",
            "diners": ["david"],
            "time": "11:00"
          },
          "snack2": {
            "restaurantId": 51,
            "paymentMethod": "ddp",
            "pool": "B",
            "notes": "Dole Whip",
            "adrNumber": "",
            "diners": ["dante"],
            "time": "16:00"
          },
          "snack3": null,
          "snack4": null
        },
        "events": [
          {
            "id": "evt_barber_jun9",
            "name": "Harmony Barber Shop — boys haircuts",
            "time": "14:00",
            "kind": "barber",
            "location": "Main Street, U.S.A.",
            "durationMinutes": 30,
            "notes": "Locked appointment"
          },
          {
            "id": "evt_fireworks_jun9",
            "name": "Happily Ever After fireworks",
            "time": "21:00",
            "kind": "fireworks",
            "location": "Cinderella Castle",
            "durationMinutes": 18,
            "notes": ""
          }
        ]
      }
      /* ... all other 7 days here, even if empty ... */
    }
  }
}
```

For an empty day, this minimal shape is valid:

```json
"2026-06-06": {
  "park": "Water Park - Typhoon Lagoon",
  "splitDay": false,
  "splitParks": null,
  "splitDividerTime": "13:00",
  "notes": "",
  "selections": {
    "breakfast": null, "lunch": null, "dinner": null,
    "snack1": null,    "snack2": null, "snack3": null, "snack4": null
  },
  "events": []
}
```

---

## Validation checklist (Claude should self-check before producing output)

- [ ] All 8 date keys present (`2026-06-05` through `2026-06-12`)
- [ ] Each day has `selections` with all 7 meal-slot keys (values may be `null`)
- [ ] Every non-null selection has `restaurantId` and `paymentMethod`
- [ ] Every DDP selection has `pool` matching that day's allowed pool (A for Jun 5–8, B for Jun 8–12, either for Jun 8)
- [ ] No VIP payment methods on Fri/Sat/Sun (only Mon–Thu)
- [ ] No DDP for Space 220 (it's OOP-only)
- [ ] Every event has unique `id`, valid `time`, valid `kind`
- [ ] All times are `"HH:MM"` 24-hour with leading zero
- [ ] Meal slot kinds match restaurant categories (don't put a snack restaurant in `dinner`)

If any of these can't be satisfied with confidence, say so in the response and leave that piece blank instead of guessing.
