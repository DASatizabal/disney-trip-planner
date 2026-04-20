# Disney World DDP Dining Planner - Claude Code Project Spec

## PROJECT OVERVIEW

Build a GitHub Pages site that serves as a Disney World Dining Plan (DDP) credit planner for a family trip in June 2026. The family needs to visually plan which restaurants to eat at on which days, while tracking DDP credit balances across two separate hotel stays with independent credit pools.

The site should be a single-page app (vanilla HTML/CSS/JS or lightweight framework) that stores selections in localStorage with JSON export/import for sharing between family members.

## THE FAMILY

| Name | Age | DDP Pricing | Drinks Alcohol? | Dietary Notes |
|------|-----|------------|-----------------|---------------|
| David | Adult | Adult ($98.59/night) | Yes | None |
| Lisa | Adult | Adult ($98.59/night) | Yes | **SEAFOOD ALLERGY** - flag at every restaurant |
| Dante | 14 | Adult pricing (age 10+) | No (under 21) | None |
| David Jr. | 6 | FREE (ages 3-9 eat free in 2026) | No | None |

## THE TRIP

### Hotel Stay 1: Port Orleans Riverside
- Check-in: Friday, June 5, 2026
- Check-out: Monday, June 8, 2026
- 3 nights
- Confirmation: #42007787
- **DDP Pool A**: 3 TS + 3 QS + 3 Snacks per person = **12 TS, 12 QS, 12 Snacks** total for family
- **Credits expire: Midnight Monday June 8**

### Hotel Stay 2: Art of Animation
- Check-in: Monday, June 8, 2026
- Check-out: Friday, June 12, 2026
- 4 nights
- Confirmation: #41849743
- **DDP Pool B**: 4 TS + 4 QS + 4 Snacks per person = **16 TS, 16 QS, 16 Snacks** total for family
- **Credits expire: Midnight Friday June 12**

### Day-by-Day Schedule

| Date | Day | Pool | Park Reservation | Key Notes |
|------|-----|------|-----------------|-----------|
| June 5 | Friday | A | None (check-in day) | Drive up from Florida City. Arrive ~noon. PO check-in 3pm |
| June 6 | Saturday | A | TBD | Open day. Water park? Disney Springs? |
| June 7 | Sunday | A | EPCOT | Space 220 day! |
| June 8 | Monday | B (A valid until midnight) | Hollywood Studios | AoA check-in. VIP discount eligible |
| June 9 | Tuesday | B | Magic Kingdom | Harmony Barber Shop 2pm (both boys). VIP eligible |
| June 10 | Wednesday | B | Animal Kingdom | Half day + park hop. VIP eligible |
| June 11 | Thursday | B | Magic Kingdom | MK Day 2. Last VIP day. VIP eligible |
| June 12 | Friday | B | Hollywood Studios | Checkout 11am. Credits expire midnight. NOT VIP eligible |

## DDP CREDIT RULES

1. Credits are calculated per person per night of stay
2. All credits load at check-in and can be used in any order on any day during the stay
3. Credits are pooled across the room (not locked to individuals)
4. Pool A and Pool B are INDEPENDENT. Pool A credits cannot carry over to Pool B
5. Credits expire at 11:59 PM on checkout day
6. June 8 is an overlap day: Pool A credits are still valid until midnight AND Pool B credits activate at AoA check-in
7. Each meal credit includes 1 beverage. Adults 21+ can substitute for beer/wine/cocktail at no extra cost
8. Table Service meal = 1 entree + 1 dessert + 1 beverage (lunch/dinner). Breakfast = 1 entree + 1 beverage
9. Quick Service meal = 1 entree + 1 beverage
10. Some restaurants require 2 TS credits per person per meal (Signature Dining, select Character Dining, Dinner Shows)
11. "OOP" (Out of Pocket) restaurants don't accept DDP at all. They appear on the planner for scheduling but don't consume credits

## V.I.PASSHOLDER SUMMER DAYS DISCOUNTS

The family has Disney Pirate Pass Annual Passes. V.I.PASSHOLDER Summer Days runs May 1 - July 31, 2026 with dining discounts Monday-Thursday ONLY. These discounts CANNOT be combined with DDP credits. If the family wants to use the discount, they pay out of pocket (OOP) and save the DDP credit for elsewhere.

### 40% Off Restaurants (Mon-Thu only):
| Restaurant | Location | Valid Meals |
|-----------|----------|-------------|
| Biergarten Restaurant | EPCOT (Germany) | Lunch only |
| Coral Reef Restaurant | EPCOT (The Seas) | Dinner only |
| Garden Grill | EPCOT (The Land) | Lunch and Dinner |
| Hollywood & Vine | Hollywood Studios | Breakfast, Lunch, Dinner |
| Tusker House | Animal Kingdom | Lunch and Dinner |
| Tiffins | Animal Kingdom | Dinner only |
| Boatwright's Dining Hall | Port Orleans Riverside | Dinner only |
| Whispering Canyon Cafe | Wilderness Lodge | Brunch and Dinner |
| Cape May Cafe | Beach Club | Dinner only |
| Toledo | Coronado Springs | Dinner only |

### 20% Off Restaurants (Mon-Thu only):
| Restaurant | Location | Valid Meals |
|-----------|----------|-------------|
| Be Our Guest | Magic Kingdom | Lunch only |
| The Crystal Palace | Magic Kingdom | Lunch and Dinner |

### Standard AP Discount (10%, available anytime unless noted):
Most Disney-owned table service restaurants offer 10% off for APs (passholder + up to 3 guests). This also cannot combine with DDP. Notable exceptions or special rules:
- Space 220: AP 10% at LUNCH ONLY, no dinner discount
- Some Disney Springs third-party restaurants have their own AP discounts (varies)

## COMPREHENSIVE RESTAURANT LIST

Build the database with ALL table service restaurants in the Disney World ecosystem. Use this list from the Disney Food Blog (updated April 2026) as the primary source. For each restaurant, you'll need to determine/research: credit type, DDP participation, meal periods, cuisine, and any relevant notes.

### MAGIC KINGDOM - Table Service (DDP participating)
**1 TS Credit:**
- The Crystal Palace (characters: Pooh, Tigger, Eeyore, Piglet. Buffet)
- The Diamond Horseshoe (lunch/dinner)
- Jungle Navigation Co. Skipper Canteen (Asian/Latin fusion. Adventureland)
- Liberty Tree Tavern (AYCE family style. Thanksgiving dinner)
- The Plaza Restaurant (American. Burgers, sandwiches)
- Tony's Town Square (Italian. Lady and the Tramp themed)

**2 TS Credits:**
- Be Our Guest Restaurant (Beast's castle. French/American. Prix fixe dinner)
- Cinderella's Royal Table (characters: Cinderella, princesses. Inside the castle)

### EPCOT - Table Service (DDP participating)
**1 TS Credit:**
- Akershus Royal Banquet Hall (1 credit BREAKFAST only; 2 credits lunch/dinner. Princess characters)
- Biergarten Restaurant (German buffet. Live entertainment)
- Chefs de France (French. World Showcase)
- Coral Reef Restaurant (Aquarium views. Seafood heavy - LISA FLAG)
- Garden Grill (characters: Mickey, Pluto, Chip, Dale. AYCE family style. Rotating restaurant)
- La Hacienda de San Angel (Mexican. Dinner only. Lagoon fireworks view)
- La Creperie de Paris (French crepes. Prix fixe)
- Nine Dragons Restaurant (Chinese)
- Rose & Crown Dining Room (British pub. Fireworks patio)
- San Angel Inn Restaurante (Mexican. Inside pyramid. Lunch and dinner)
- Shiki-Sai: Sushi Izakaya (Japanese sushi/izakaya)
- Spice Road Table (Mediterranean small plates. Morocco)
- Teppan Edo (Japanese hibachi. Fun for kids)
- Tutto Italia Ristorante (Italian)
- Via Napoli Ristorante e Pizzeria (Wood-fired pizza)

**2 TS Credits:**
- Akershus Royal Banquet Hall (LUNCH and DINNER = 2 credits)
- Le Cellier Steakhouse (Canadian steakhouse. Signature)

### EPCOT - NOT on DDP (OOP only)
- Space 220 Restaurant (Modern American prix fixe. $55 lunch, $79 dinner. AP 10% lunch only)
- Space 220 Lounge (A la carte small plates. Same space elevator experience)

### HOLLYWOOD STUDIOS - Table Service (DDP participating)
**1 TS Credit:**
- 50's Prime Time Cafe (American comfort. Fun theming)
- Hollywood & Vine (characters: Minnie's Seasonal Dine. Buffet)
- Roundup Rodeo BBQ (AYCE family style BBQ. Toy Story Land. Family has been here, liked it)
- Sci-Fi Dine-In Theater (American. Car-shaped booths. Family has been here, said skip)

**2 TS Credits:**
- The Hollywood Brown Derby (Signature. Famous Cobb salad)
- The Hollywood Brown Derby Lounge (same 2-credit requirement)

### ANIMAL KINGDOM - Table Service (DDP participating)
**1 TS Credit:**
- Rainforest Cafe (American. Themed. Also at Disney Springs)
- Tusker House Restaurant (characters: Donald, Daisy, Mickey, Goofy. African/American buffet)
- Yak & Yeti Restaurant (Pan-Asian)
- Nomad Lounge (small plates. Accepts 1 TS credit. Adjacent to Tiffins)

**2 TS Credits:**
- Tiffins (Global fine dining. Best restaurant at AK)

### DISNEY SPRINGS - Table Service (DDP participating)
**1 TS Credit:**
- Chef Art Smith's Homecomin' (Southern)
- City Works Eatery & Pour House (American gastropub)
- The Edison (American. 1920s themed)
- Enzo's Hideaway Tunnel Bar (Italian. Underground speakeasy)
- Frontera Cocina (Rick Bayless Mexican)
- House of Blues Restaurant & Bar (Southern/Cajun)
- Jock Lindsey's Hangar Bar (small plates. Indiana Jones themed)
- Maria & Enzo's Ristorante (Italian)
- Morimoto Asia (Asian fusion. 1 credit at LUNCH only)
- Paradiso 37, Taste of the Americas (Latin American)
- Planet Hollywood (American)
- Raglan Road Irish Pub (Irish. Live entertainment)
- Rainforest Cafe (American. Themed)
- Splitsville Luxury Lanes (American. Bowling alley)
- Terralina Crafted Italian (Italian. Family has been here: $305 for family of 4)
- T-REX (American. Dinosaur themed. Fun for kids)

**2 TS Credits:**
- The BOATHOUSE (Seafood/American - LISA FLAG)
- Jaleo by Jose Andres (Spanish tapas)
- Morimoto Asia (2 credits at DINNER)
- Paddlefish (Seafood - LISA FLAG)

### DISNEY SPRINGS - NOT on DDP (OOP only)
Search for any Disney Springs restaurants not on the DDP list. Examples may include:
- Wine Bar George
- STK Orlando
- Wolfgang Puck Bar & Grill
- Polite Pig (this might be QS only)
- Summer House on the Lake

### RESORT HOTELS - Table Service (DDP participating)

**Animal Kingdom Lodge:**
- Boma - Flavors of Africa (1TS. African buffet. Dinner)
- Sanaa (1TS lunch/dinner. African/Indian. Bread service famous. QS at breakfast)
- Jiko - The Cooking Place (2TS. African fine dining)
- Victoria Falls Lounge (1TS)
- Sanaa Lounge (1TS)
- Cape Town Lounge and Wine Bar (2TS)

**BoardWalk Inn:**
- Trattoria al Forno (1TS. Italian. Family favorite! Skyliner accessible)
- Flying Fish (2TS. Seafood - LISA FLAG)

**Caribbean Beach:**
- Sebastian's Bistro (1TS. Caribbean/Latin)
- Banana Cabana (1TS lounge)

**Contemporary:**
- Chef Mickey's (1TS. Characters: Mickey, Minnie, Donald, Goofy, Pluto. Buffet)
- Steakhouse 71 (1TS. American steakhouse)
- Steakhouse 71 Lounge (1TS)

**Coronado Springs:**
- Rix Sports Bar & Grill (1TS)
- Maya Grill (1TS. Mexican/American)
- Three Bridges Bar and Grill (1TS. Tapas/American)
- Toledo - Tapas, Steak & Seafood (1TS. Spanish. Rooftop)

**Fort Wilderness:**
- Crockett's Tavern (1TS lounge)
- Hoop-Dee-Doo Musical Revue (2TS. Dinner show. Tip included)
- Trail's End Restaurant (QS)

**Grand Floridian:**
- Grand Floridian Cafe (1TS)
- 1900 Park Fare (1TS. Characters. Buffet)
- Citricos (2TS. Mediterranean fine dining)
- Citricos Lounge (2TS)
- Narcoossee's (2TS. Seafood - LISA FLAG. Fireworks view)
- Enchanted Rose Lounge (1TS)

**Old Key West:**
- Olivia's Cafe (1TS. Key West American)

**Polynesian Village:**
- Kona Cafe (1TS. Asian/Polynesian)
- 'Ohana (1TS. AYCE grilled skewers. Characters at breakfast: Lilo & Stitch)
- Wailulu Bar & Grill (1TS lunch/dinner. Island Tower)
- Tambu Lounge (1TS)

**Port Orleans Riverside (their resort!):**
- Boatwright's Dining Hall (1TS. Cajun/Southern)
- River Roost Lounge (1TS)

**Riviera:**
- Topolino's Terrace (1TS breakfast with Mickey & Friends. 2TS dinner. French/Italian)

**Saratoga Springs:**
- The Turf Club Bar and Grill (1TS)
- The Turf Club Lounge (1TS)

**Wilderness Lodge:**
- Whispering Canyon Cafe (1TS. Western/American. AYCE skillets. Fun for kids)
- Storybook Dining at Artist Point with Snow White (2TS. Characters: Snow White)
- Territory Lounge (1TS)
- Geyser Point Bar & Grill (1TS. Waterfront)

**Yacht & Beach Club:**
- Beaches & Cream Soda Shop (1TS. Ice cream/burgers)
- Cape May Cafe (1TS. Characters at breakfast. SEAFOOD BUFFET at dinner - LISA FLAG)
- Ale & Compass Restaurant (1TS. New England American)
- Yachtsman Steakhouse (2TS. Steaks)
- Ale & Compass Lounge (1TS)
- Crew's Cup Lounge (1TS)

### RESORT HOTELS - NOT on DDP (OOP only)
- California Grill (Contemporary Resort. Rooftop. Fireworks view. ~$75-89/adult prix fixe)
- Search for any other resort restaurants not on the DDP list

## QUICK SERVICE LOCATIONS

Include all QS locations that accept the DDP. Here's the full list by location:

### Magic Kingdom QS:
Casey's Corner, Columbia Harbour House (SEAFOOD - Lisa flag), Cosmic Ray's, The Friar's Nook, Gaston's Tavern, Golden Oak Outpost, Liberty Square Market, The Lunching Pad, Main Street Bakery (Starbucks), Pecos Bill, Pinocchio Village Haus, Sleepy Hollow, Tortuga Tavern (seasonal)

### EPCOT QS:
Connections Cafe (Starbucks), Connections Eatery, Crepes A Emporter, Fife & Drum, Garden House, Katsura Grill, Kringla Bakeri Og Cafe, La Cantina de San Angel, Les Halles Boulangerie (HIGH DDP VALUE - no mobile order), Lotus Blossom, Pizza al Taglio, Refreshment Outpost, Refreshment Port, Regal Eagle Smokehouse, Sommerfest, Sunshine Seasons, Yorkshire County Fish Shop

### Hollywood Studios QS:
ABC Commissary, Backlot Express, Catalina Eddie's, Docking Bay 7, Dockside Diner, Fairfax Fare, Ronto Roasters, Rosie's All-American, Trolley Car Cafe (Starbucks), Woody's Lunch Box

### Animal Kingdom QS:
Creature Comforts (Starbucks), Flame Tree Barbecue, Harambe Market, Pizzafari, Satu'li Canteen (BEST QS AT WDW), Yak & Yeti Local Food Cafes

### Disney Springs QS:
4 Rivers Cantina Food Truck, Amorette's, B.B. Wolf's, Blaze Pizza, Chicken Guy!, Cookes of Dublin, Daily Poutine, D-Luxe Burger, Earl of Sandwich, eet by Maneet Chauhan, Everglazed Donuts, Morimoto Street Food, Pepe by Jose Andres, Pizza Ponte, Polite Pig, Smokehouse at House of Blues, and many more (see DFB list)

### Resort QS:
- Art of Animation: Landscape of Flavors, Drop Off Pool Bar
- Port Orleans Riverside: Riverside Mill Food Court, Muddy Rivers
- Pop Century: Everything POP
- All other resort food courts and pool bars (see DFB list)

### Water Parks QS:
- Typhoon Lagoon: Leaning Palms, Typhoon Tilly's, etc.
- Blizzard Beach: Lottawatta Lodge, Avalunch, etc.

## SNACK LOCATIONS

Include notable snack-credit-worthy items. Focus on items worth $7+ (good DDP value) and flag items under $5 as poor value. Key items:

**Excellent value ($10+):**
- Ronto Wrap / Ronto Morning Wrap (HS, Galaxy's Edge, ~$13)
- Spring Roll Cart (MK, Adventureland, ~$10)
- EPCOT Festival booth items (when festivals are running)

**Good value ($6-9):**
- Dole Whip (MK Aloha Isle, AK, ~$7)
- Mickey Premium Bar (~$7)
- School Bread (EPCOT Norway, ~$6)
- Cheshire Cat Tail (MK, ~$7)
- Pongu Lumpia (AK Pandora, ~$9)
- Num Num Cookie (AK Pandora, ~$8)
- Starbucks drinks (all parks, ~$6-8)
- Joffrey's specialty drinks (all parks, ~$7-9. AP 20% off!)

**Poor value (under $5 - pay cash):**
- Fresh fruit cups (~$4)
- Bottled water (~$3.75 - WORST credit use. Ask for FREE ice water at any QS!)

Also include snack-only locations from each park (see DFB list for full list including all cart locations, bakeries, ice cream shops, etc.)

## DATABASE SCHEMA

Use this schema (SQLite compatible, but export everything to JSON for the site):

```sql
CREATE TABLE family_members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    is_adult_pricing BOOLEAN,
    ddp_free BOOLEAN,
    can_drink_alcohol BOOLEAN,
    dietary_notes TEXT
);

CREATE TABLE credit_pools (
    id INTEGER PRIMARY KEY,
    pool_name TEXT,
    resort TEXT,
    checkin_date TEXT,
    checkout_date TEXT,
    nights INTEGER,
    ts_per_person_per_night INTEGER DEFAULT 1,
    qs_per_person_per_night INTEGER DEFAULT 1,
    sn_per_person_per_night INTEGER DEFAULT 1,
    total_ts INTEGER,  -- per person total
    total_qs INTEGER,
    total_sn INTEGER,
    family_size INTEGER DEFAULT 4,
    family_total_ts INTEGER,  -- family total
    family_total_qs INTEGER,
    family_total_sn INTEGER,
    expires_at TEXT
);

CREATE TABLE trip_days (
    id INTEGER PRIMARY KEY,
    date TEXT UNIQUE,
    day_of_week TEXT,
    pool_id INTEGER,
    park_reservation TEXT,
    notes TEXT,
    is_checkin BOOLEAN DEFAULT 0,
    is_checkout BOOLEAN DEFAULT 0,
    vip_discount_eligible BOOLEAN DEFAULT 0,
    FOREIGN KEY (pool_id) REFERENCES credit_pools(id)
);

CREATE TABLE restaurants (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    credit_type TEXT NOT NULL,  -- '2TS', '1TS', 'QS', 'SN', 'OOP'
    credits_consumed INTEGER DEFAULT 1,  -- 2 for 2TS, 1 for 1TS, 1 for QS, 1 for SN, 0 for OOP
    category TEXT,  -- 'table_service', 'quick_service', 'snack', 'out_of_pocket'
    location TEXT NOT NULL,  -- 'Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs', resort name, etc.
    park_area TEXT,  -- 'Fantasyland', 'World Showcase - France', 'Galaxy\'s Edge', etc.
    cuisine TEXT,
    meal_periods TEXT,  -- comma-separated: 'breakfast,lunch,dinner'
    avg_adult_price REAL,
    avg_kid_price REAL,
    is_character_dining BOOLEAN DEFAULT 0,
    character_names TEXT,
    is_buffet_family_style BOOLEAN DEFAULT 0,
    is_signature BOOLEAN DEFAULT 0,
    is_dinner_show BOOLEAN DEFAULT 0,
    is_lounge BOOLEAN DEFAULT 0,
    accepts_ddp BOOLEAN DEFAULT 1,
    ap_discount_pct REAL DEFAULT 0,
    ap_discount_notes TEXT,
    vip_discount_pct REAL DEFAULT 0,
    vip_discount_meals TEXT,  -- comma-separated meal periods eligible for VIP
    vip_discount_notes TEXT,
    seafood_warning BOOLEAN DEFAULT 0,
    seafood_notes TEXT,
    mobile_order BOOLEAN DEFAULT 0,  -- for QS
    family_been_before BOOLEAN DEFAULT 0,
    family_review TEXT,  -- 'liked', 'skip', 'loved', etc.
    ddp_value_rating TEXT,  -- 'excellent', 'good', 'fair', 'poor', 'avoid', 'n/a'
    notes TEXT,
    menu_url TEXT
);

CREATE TABLE selections (
    id INTEGER PRIMARY KEY,
    trip_day_id INTEGER,
    meal_slot TEXT,  -- 'breakfast', 'lunch', 'dinner', 'snack1', 'snack2', 'snack3', 'snack4'
    restaurant_id INTEGER,
    payment_method TEXT,  -- 'ddp_credit', 'out_of_pocket', 'vip_discount'
    credits_used INTEGER DEFAULT 0,
    estimated_oop_cost REAL DEFAULT 0,
    notes TEXT,
    selected_by TEXT DEFAULT 'david',
    FOREIGN KEY (trip_day_id) REFERENCES trip_days(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
```

## SITE REQUIREMENTS

### Layout
- Single page app, mobile-friendly (they'll use it on phones at the parks)
- Day columns across the top (June 5-12), each showing: date, day of week, park reservation, pool indicator (A or B), VIP eligible badge
- Three row sections: Table Service, Quick Service, Snacks
- Each day column has meal slots: Breakfast, Lunch, Dinner, + up to 4 snack slots
- Credit balance dashboard at top showing remaining TS/QS/SN for each pool with color coding (green = plenty, yellow = getting low, red = 0 or negative)

### Interaction
- Tap a meal slot to open a restaurant picker filtered by: location (match the day's park reservation, but allow "all"), credit type, cuisine, and meal period
- Dragging/reordering is nice-to-have but not required. Tap-to-select is fine
- Each restaurant in the picker should show: name, location, credit type, VIP discount badge (if applicable for that day), seafood warning icon (red fish icon for Lisa), DDP value rating stars, and family review if they've been before
- When selecting a restaurant, ask whether to pay with DDP credit or OOP (default to DDP for DDP-eligible restaurants, default to OOP for non-DDP restaurants)
- If a VIP discount is available for that restaurant on that day, show a prompt: "40% VIP discount available! Pay OOP ($XX est.) and save your DDP credit?"

### Credit Tracking
- Real-time balance update as selections are made
- Pool A balance (June 5-8) shown in blue
- Pool B balance (June 8-12) shown in green
- June 8 overlap indicator showing both pool balances
- Warning when a selection would make any credit type go negative
- Each family member's individual credit count doesn't need tracking (credits are pooled), but track total family credits per pool

### Special Flags
- Lisa's seafood allergy: red fish icon next to any restaurant with seafood_warning = true
- "SKIP" badge on restaurants the family has tried and doesn't want to repeat (Sci-Fi Dine-In, Beak & Barrel)
- "FAVORITE" badge on restaurants the family loved (Trattoria al Forno, Minnie's Seasonal Dine, Roundup Rodeo)
- VIP discount badge with percentage on eligible days
- "NOT ON DDP" red badge for OOP restaurants

### Data Persistence
- Save selections to localStorage automatically
- Export button: downloads selections as JSON file
- Import button: upload JSON file to load selections
- Reset button: clear all selections (with confirmation)
- The JSON export should include enough context that it can be pasted into a Claude conversation for further planning

### Plan Flexibility (CRITICAL)

Plans change. Trip plans especially. The site must make it trivially easy to change a day's focus without losing existing dining selections or manually redoing work. Build these flexibility features as first-class functionality, not afterthoughts:

**1. Change the park for any day**
- Each day column has a park selector dropdown (editable inline)
- Options include all four parks, "Disney Springs", "Resort Day", "Water Park - Blizzard Beach", "Water Park - Typhoon Lagoon", "Split Day", and "Travel Day"
- Changing the park should NOT wipe existing dining selections, but should:
  - Flag selections that no longer make geographic sense (e.g., a lunch at Pecos Bill in MK but the park is now EPCOT) with a yellow warning badge
  - Offer a "Suggest replacements" action that shows equivalent options in the new park
  - Keep resort dining selections untouched (they're location-independent)

**2. Split park days**
- Any day can be marked as a "Split Day" with two park segments: Morning/Midday and Afternoon/Evening
- When split, the day column visually divides with a clear separator
- Meal slots get reassigned:
  - Breakfast and Lunch belong to the Morning segment
  - Dinner belongs to the Afternoon segment
  - Snacks can be tagged to either segment
- The restaurant picker filters by the active segment's park
- Example: AK morning (rope drop through 1pm), EPCOT afternoon/evening (park hop at 2pm through fireworks)
- A "split ratio" indicator shows how much time is in each park (not required, just helpful)

**3. Water park days**
- Blizzard Beach and Typhoon Lagoon are both open June 2026 (both parks open May 12 - September 8)
- Water park days should offer quick-select for water park quick service locations (Leaning Palms, Typhoon Tilly's, Lottawatta Lodge, Avalunch, etc.)
- These don't require park reservations and use snack/QS credits normally
- Water park days can ALSO be split (e.g., water park morning, resort pool afternoon, Disney Springs dinner)
- Remember: family has Water Park & Sports add-on, so no separate admission needed

**4. Swap/reorder days**
- Drag-and-drop or "swap days" button to exchange entire day contents between two dates
- Useful when weather forces a change (rain day = switch indoor park day)
- Preserves all dining selections, just moves them to a different date
- Pool assignments (A vs B) stay with the DATE, not the selections - so swapping June 6 content with June 10 content moves the selections but they still count against their new date's pool

**5. Quick duplicate/clone**
- "Copy day" button to duplicate a day's full plan to another date
- Useful for repeat parks (two MK days)
- Offers to resolve conflicts if target day already has selections

**6. Undo/Redo**
- At minimum 10 levels of undo/redo
- Critical for when Lisa makes a change David disagrees with (or vice versa)

**7. "What if" scenarios**
- Save multiple plan scenarios (e.g., "Plan A - Rain", "Plan B - Hot day", "Plan C - Park Hop Heavy")
- Switch between scenarios with a dropdown
- Compare scenarios side by side (nice to have, not required)

**8. Real-time conflict detection**
- If a selection puts any credit pool into negative, show a prominent warning
- If a selection is at a restaurant in a park different from the day's park reservation, show a transportation time warning
- If a VIP discount is available on the day but the user chose to use a DDP credit instead, show a "missed savings" tip (dismissible, not blocking)

**9. Notes per day**
- Each day has a free-text notes field
- Use cases: "Lisa has headache, go late", "Dante wants roller coasters today", "Thunderstorm forecast - indoor priority"
- Notes should persist in the JSON export so they're preserved when sharing the plan

**10. Mobile gesture support**
- Swipe between days on mobile (they'll use this in the parks)
- Long-press to move a selection to a different slot or day
- Pinch-to-zoom on the credit dashboard to see more detail

### Visual Design
- Disney-inspired but not copyright-infringing. Use a clean, modern design with:
  - Pool A color theme: blue tones
  - Pool B color theme: green tones
  - OOP meals: pink/red accent
  - VIP discounts: gold/yellow badges
  - Seafood warnings: red fish icon
- Dark mode toggle would be nice for nighttime park planning
- Should feel like a premium planning tool, not a basic spreadsheet

## FAMILY-SPECIFIC NOTES TO EMBED

These should appear as contextual tips or in a notes section:

1. Pool A (Port Orleans) credits expire MIDNIGHT Monday June 8
2. Pool B (Art of Animation) credits expire MIDNIGHT Friday June 12
3. June 8 overlap: PO credits still valid until midnight + AoA credits activate at check-in
4. V.I.PASSHOLDER 40% off: Mon-Thu only. Cannot combine with DDP
5. Space 220 is NOT on DDP. Out of pocket only. AP 10% lunch discount
6. Lisa seafood allergy: Flag at EVERY restaurant
7. Harmony Barber Shop: Tue 6/9 at 2pm at MK (David Jr + Dante haircuts)
8. Refillable mugs: Get at resort food court Day 1. Works at ALL resort QS locations, NOT in parks
9. Drinks included with every meal credit. Adults 21+ can sub for beer/wine/cocktail
10. Art of Animation checkout 11am June 12 but credits valid until midnight
11. Ask for FREE ice water at any QS. Never waste a snack credit on bottled water
12. Sci-Fi Dine-In: SKIP (been there, not worth repeating)
13. Beak & Barrel: SKIP (been there, not worth repeating)
14. Family previously enjoyed: Minnie's Seasonal Dine, Trattoria al Forno, Roundup Rodeo BBQ
15. Disney Rewards Dollars available: $806.41 (can redeem toward purchases)

## TECHNICAL NOTES

- Deploy to GitHub Pages (static site)
- No backend needed. All data lives in the JSON and localStorage
- Search the DFB list (https://www.disneyfoodblog.com/2026-disney-dining-plan-restaurants-walt-disney-world/) to fill in any restaurants I may have missed
- For restaurants I didn't provide cuisine/price data for, search their menus online to fill in
- The JSON data file should be comprehensive enough that another AI assistant (Claude) can read it and build a day-by-day itinerary from the family's selections
