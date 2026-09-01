# LTFI — Lock The F*ck In

*Your all-in-one health super app. No paywalls. No BS.*

---

## Development Principle: Technical Build Order

To avoid endlessly adding features and delaying release, the application must be developed using technical dependency order rather than simply completing every feature listed in the roadmap.

Technical build order means building the systems that other systems depend on first. Features that do not block the core product flow should not delay development.

The goal is to first complete the core nutrition tracking and user auth loop before expanding the system with workout timers, health integrations, or dashboards.

---

## Rules of Engagement

To ensure efficient collaboration during the build process, the following rules will be followed:

1. **Minimize Replies** — Responses should remain concise to reduce unnecessary back-and-forth and avoid overwhelming instructions.
2. **No Guessing During Debugging** — Do not provide speculative solutions when debugging. Troubleshooting must be based only on the actual code, logs, or errors provided.
3. **Step-by-Step Workflow** — Only one step should be given at a time. After each step, wait for confirmation before proceeding.
4. **Provide Complete Code Blocks** — Whenever code is required, always provide the full file or full code block to avoid missing pieces or implementation errors.
5. **Code in Chat, Not Artifacts** — Always provide code here in the chat unless an artifact is explicitly requested.
6. **Build Fast** — Always recommend the fastest build path, whether that is running commands from the root terminal or providing full file contents directly.
7. **Always State the File Path** — Every code block must be preceded by the full file path so it is always clear which file to create or update.
8. **One File, One Edit at a Time** — Even within a single file, deliver one focused change per message and wait for confirmation before the next, unless the changes are so interdependent that fragmenting them would leave the file in a broken intermediate state — in which case say so and deliver the full file once.
9. **Verify Against the Real File, Not Assumptions** — If there's any doubt the local sandbox copy of a file matches what's actually deployed or on the user's machine, ask for the current file content before editing it rather than editing a stale or guessed version.
10. **Rule Out Client Caching Before Assuming a Bug** — If a confirmed-pushed and confirmed-published change doesn't appear to be live, check for browser/app caching (hard refresh, disable cache in DevTools, force-close and reopen the app) before concluding the code itself is wrong.

---

## Free-First Requirement

**Every tool, service, and API used in this project must have a free tier or be completely free.** No paid subscriptions, no trial-only services, no features locked behind a paywall — at any layer of the stack.

This applies to:
- All third-party APIs (AI, food data, health data, image hosting)
- All hosting and infrastructure
- All development tools and SDKs
- All database services

If a free option exists, it must be used. If a service requires payment to function at any meaningful level, it must be replaced with a free alternative before building.

Current free services in use:
- MongoDB Atlas — free tier (512MB)
- Open Food Facts API — completely free, no key required
- USDA FoodData Central — completely free, no key required
- Calorie API — free tier, 1,000 calls/month, no credit card
- API Ninjas Nutrition API — free tier, no credit card
- Groq API — free tier with generous limits for vision models
- Cloudinary — free tier (25GB storage, 25GB bandwidth/month, includes Admin API for deletes)
- Gmail SMTP — free via app password
- Expo — free for development and EAS free tier builds
- EAS Build — free tier (30 builds/month)
- EAS Update — free tier (1,000 OTA updates/month)
- Vercel — free tier for frontend hosting
- Render — free tier for backend hosting

---

## The Problem

There is no free, all-in-one health app that combines nutrition tracking, workout timers, and wearable health data without locking features behind a paywall.

Apps like MyFitnessPal charge for:
- Custom recipe builder
- Advanced macro goals
- Full nutrition analytics

This app solves that.

---

## The Solution

An Expo-based mobile and web app that:
- Tracks food intake via barcode scanning and AI food photo recognition
- Lets users build custom foods and recipes with no paywall
- Tracks daily calories, macros, and micronutrients, with daily and weekly dashboard views
- Logs workouts and runs HIIT / Tabata / circuit interval timers with warmup, cooldown, and repeat
- Tracks strength training with sets, reps, weight, and progressive overload — with editable/auto-incrementing week numbers, a kg/lbs unit toggle, bodyweight-friendly PR tracking, and full rename/edit control over every exercise and past log entry
- Logs body weight with optional progress photos, stored on Cloudinary
- Syncs health data from Apple HealthKit and Colmi smart ring via QRing

---

## Design

| Token | Value |
|-------|-------|
| Background | `#EDE8DF` (Warm Putty) |
| Surface | `#D9D3C8` |
| Text | `#1A1A1A` |
| Accent | `#F77E2D` (iPhone 17 Pro Cosmic Orange) |
| Mode | Light mode first, dark mode ready |

---

## Live URLs

| Environment | URL |
|-------------|-----|
| Frontend (Web) | https://ltfi-app.vercel.app |
| Backend | https://ltfi-backend.onrender.com |
| Android APK | https://expo.dev/accounts/norman.chingcuanco/projects/ltfi/builds/00d76ff8-779a-4837-92d0-6bacdad57ffe |
| iOS Native Build | On hold — requires Apple Developer account ($99/yr) |

---

## Tech Stack

| Layer | Technology | Cost |
|-------|------------|------|
| Mobile + Web | Expo SDK 54 + React Native Web | Free |
| Backend | Node.js + Express | Free |
| Database | MongoDB Atlas (free tier) | Free |
| Auth | JWT + Email/Password | Free |
| Food Data | USDA + Open Food Facts + Calorie API + API Ninjas | Free |
| AI Food Scanning | Groq API — Qwen 3.6 27B vision model (free tier) | Free |
| Image Hosting | Cloudinary (free tier, unsigned upload preset + Admin API delete) | Free |
| Email | Gmail SMTP via Nodemailer | Free |
| Health Data | Apple HealthKit (deferred) | Free |
| Wearable | Colmi Ring via QRing → HealthKit pipeline (deferred) | Free |
| Hosting (Frontend) | Vercel free tier | Free |
| Hosting (Backend) | Render free tier | Free |
| Mobile Builds | EAS Build free tier | Free |
| OTA Updates | EAS Update free tier | Free |

---

## Folder Structure

```
ltfi/
├── backend/
│   ├── controllers/
│   │   ├── aiScanController.js
│   │   ├── authController.js
│   │   ├── exerciseController.js
│   │   ├── foodController.js
│   │   ├── mealController.js
│   │   ├── recipeController.js
│   │   ├── weightController.js
│   │   └── workoutController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── ExerciseLog.js
│   │   ├── Food.js
│   │   ├── Meal.js
│   │   ├── Recipe.js
│   │   ├── Weight.js
│   │   └── Workout.js
│   ├── routes/
│   │   ├── aiScan.js
│   │   ├── auth.js
│   │   ├── exercises.js
│   │   ├── food.js
│   │   ├── meals.js
│   │   ├── recipes.js
│   │   ├── weight.js
│   │   └── workouts.js
│   ├── scripts/
│   │   ├── seedPhilippineFoods.js
│   │   └── backfillMyFoods.js
│   ├── utils/
│   │   ├── calorieCalculator.js
│   │   ├── cloudinary.js
│   │   └── mailer.js
│   ├── server.js
│   ├── .env
│   ├── .env.production
│   └── package.json
├── frontend/
│   ├── assets/
│   │   ├── icon.png
│   │   ├── ltfi-dark.png
│   │   ├── ltfi-light.png
│   │   ├── ltfi-dark (w. tag).png
│   │   ├── ltfi-light (w. tag).png
│   │   ├── ding.mp3
│   │   ├── beep.mp3
│   │   └── chime.mp3
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   └── utils/
│   │       ├── api.js
│   │       ├── healthKit.js
│   │       └── metValues.js
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login.jsx
│   │   │   ├── register.jsx
│   │   │   └── forgot-password.jsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.jsx
│   │   │   ├── dashboard.jsx
│   │   │   ├── diary.jsx
│   │   │   ├── health.jsx
│   │   │   ├── progress.jsx
│   │   │   ├── profile.jsx
│   │   │   ├── recipes.jsx
│   │   │   └── workout.jsx
│   │   ├── _layout.jsx
│   │   ├── add-food.jsx
│   │   ├── add-to-my-foods.jsx
│   │   ├── ai-food-scan.jsx
│   │   ├── barcode-scanner.jsx
│   │   ├── create-recipe.jsx
│   │   ├── create-workout.jsx
│   │   ├── custom-food.jsx
│   │   ├── edit-food.jsx
│   │   ├── edit-recipe.jsx
│   │   ├── edit-workout.jsx
│   │   ├── exercise-history.jsx
│   │   ├── index.jsx
│   │   ├── reset-password.jsx
│   │   └── timer.jsx
│   ├── app.json
│   ├── babel.config.js
│   ├── eas.json
│   ├── metro.config.js
│   ├── package.json
│   └── vercel.json
├── README.md
└── .gitignore
```

---

## Data Models

### User

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| email | String | Unique |
| name | String | |
| password | String | bcrypt hashed (10 rounds) |
| age | Number | |
| height | Number | cm |
| currentWeight | Number | kg |
| goalWeight | Number | kg |
| activityLevel | String | sedentary / light / moderate / active / very active |
| dietPreference | String | Optional |
| gender | String | male / female |
| timezone | String | IANA timezone string e.g. Asia/Manila |
| weightUnit | String | kg / lbs — display preference for workout weights, stored value always stays in kg |
| dailyCalorieGoal | Number | Auto-calculated on registration |
| macroGoals | Object | { protein, carbs, fat } in grams |
| avatarInitials | String | Auto-generated from name |
| resetToken | String | Password reset flow |
| resetTokenExpiry | Date | 1 hour expiry |

### Meal Log

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| user | ObjectId | Ref: User |
| date | String | YYYY-MM-DD (local timezone) |
| mealType | String | breakfast / lunch / dinner / snacks |
| foods | Array | [{ foodId, name, quantity, unit, calories, protein, carbs, fat }] |
| totalCalories | Number | Computed |

### Food

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| name | String | |
| barcode | String | Optional |
| calories | Number | Per 100g or per serving |
| protein | Number | |
| carbs | Number | |
| fat | Number | |
| fiber | Number | |
| sodium | Number | |
| sugar | Number | |
| servingSize | Number | Default 100 |
| servingUnit | String | g / oz / ml / cup / tbsp / tsp / pc / serving |
| source | String | open_food_facts / ai_scan / custom |
| createdBy | ObjectId | Ref: User — null if from public DB |

### Recipe

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| user | ObjectId | Ref: User |
| name | String | |
| ingredients | Array | [{ name, quantity, unit, calories, protein, carbs, fat }] |
| servings | Number | |
| notes | String | Optional |
| totalCalories | Number | Computed |
| totalProtein | Number | |
| totalCarbs | Number | |
| totalFat | Number | |

### Weight Log

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| user | ObjectId | Ref: User |
| weight | Number | kg |
| loggedAt | Date | |
| notes | String | Optional |
| photoUrl | String | Optional — Cloudinary secure_url for progress photo |
| photoPublicId | String | Optional — Cloudinary public_id, used to delete image from storage when entry is deleted |

### Workout

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| user | ObjectId | Ref: User |
| name | String | |
| type | String | HIIT / Tabata / circuit / custom |
| mode | String | simple / complex |
| intervals | Array | [{ name, workSeconds, restSeconds, met }] |
| rounds | Number | |
| repeat | Boolean | Loop workout indefinitely |
| warmUp | Number | Seconds |
| coolDown | Number | Seconds |
| caloriesBurned | Number | Optional |
| completedAt | Date | |

### Exercise Log

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| user | ObjectId | Ref: User |
| exercise | String | Exercise name — renameable, updates in place across all logs for that name |
| date | String | YYYY-MM-DD |
| week | Number | Manually settable — auto-increments by 1 each new calendar week (Mon-based) relative to the last logged week for that exercise, unless explicitly overridden |
| sets | Array | [{ setNumber, weight, reps }] — weight always stored in kg regardless of the user's display unit; editable after the fact from the Exercise History screen |
| notes | String | Session notes, supports inline clickable URLs, saved together with sets via one explicit Save action; also editable from the Exercise History screen |

---

## MVP Feature Build Roadmap

### Phase 1 — Nutrition Core

#### 1. Project Scaffold

| Feature | Description | Status |
|---------|-------------|--------|
| Expo App Setup | Expo SDK 54 + React Native Web with navigation | ✅ Done |
| Backend Server Setup | Express app with helmet, morgan, rate limiting | ✅ Done |
| MongoDB Connection | Mongoose connected to MongoDB Atlas free tier | ✅ Done |
| Environment Config | .env for DB URI, JWT secret, Groq API key, Cloudinary keys, email, frontend URL | ✅ Done |
| Rate Limit Tuning | Raised global limit from 100 to 500 req/15min, health checks excluded — fixes false "data lost" symptoms caused by 429s on multi-request screens | ✅ Done |

#### 2. Authentication

| Feature | Description | Status |
|---------|-------------|--------|
| User Model | Mongoose schema with profile fields, goals, and password | ✅ Done |
| Registration Screen | Name, email, password, age, height, current weight, goal weight, activity level, diet preference, gender | ✅ Done |
| Auto Calorie Calculation | Calculate daily calorie and macro goals on registration using TDEE formula | ✅ Done |
| Login Screen | Email + password form with show/hide password | ✅ Done |
| JWT Middleware | Protect all API routes | ✅ Done |
| Session Persistence | JWT survives app restarts — only clears on 401, not network errors | ✅ Done |
| Password Reset | Forgot password flow via email using Gmail + Nodemailer | ✅ Done |
| Profile Screen | Update name, weight, goals — recalculates TDEE on save | ✅ Done |
| Login Speed Fix | bcrypt rounds reduced from 12 to 10 for faster login | ✅ Done |
| Cached Auth | User data cached in AsyncStorage — no backend call on startup | ✅ Done |
| Timezone Selector | User can set their timezone in profile — used across all date calculations | ✅ Done |
| Weight Unit Preference | User can toggle kg/lbs directly from the Workout page — persisted to their profile via `PUT /auth/profile` and read on load via `GET /auth/me` | ✅ Done |

#### 3. Food Tracking

| Feature | Description | Status |
|---------|-------------|--------|
| Food Model | Mongoose schema with nutrition fields and source tracking | ✅ Done |
| Meal Log Model | Daily meal log per user with meal types | ✅ Done |
| Daily Food Diary | Log food under breakfast, lunch, dinner, snacks | ✅ Done |
| Delete Food from Diary | Remove logged food items from any meal | ✅ Done |
| Edit Food in Diary | Edit quantity of logged food items with calorie preview | ✅ Done |
| Date Navigation | Navigate to any past or future date in the diary | ✅ Done |
| Timezone Fix | Diary uses local date formatting to prevent UTC date shift | ✅ Done |
| Copy Previous Day | Copy all meals from previous day to current date | ✅ Done |
| Barcode Scanner | Camera-based barcode scan via Open Food Facts API — creates a Food doc automatically, appears in My Foods | ✅ Done |
| Web Barcode Scanner | Browser-based barcode scanning via ZXing library | ✅ Done |
| Manual Barcode Entry | Type barcode number manually with keyboard submit support | ✅ Done |
| Barcode Fallback | When OFF fails, falls through to all 4 search sources | ✅ Done |
| Global Barcode Types | Supports EAN13, EAN8, UPC, Code128, Code39, QR, ITF14, Codabar | ✅ Done |
| AI Food Photo Scan | Camera photo → Groq Qwen 3.6 27B vision model → searches all food DBs for best match | ✅ Done |
| AI Scan Vision Model | Switched from deprecated `meta-llama/llama-4-scout-17b-16e-instruct` to `qwen/qwen3.6-27b`, Groq's current vision model | ✅ Done |
| AI Scan Thinking-Tag Strip | Qwen returns `<think>` reasoning blocks before the JSON payload — stripped before parsing to prevent scan failures | ✅ Done |
| AI Scan Image Compression | Compress image to stay under Groq's base64 payload limit | ✅ Done |
| AI Scan Saves to My Foods | AI-scanned results now create a Food doc automatically, matching barcode behavior | ✅ Done |
| My Foods Backfill Script | One-time script (`backend/scripts/backfillMyFoods.js`) that scans historical meal logs and creates missing Food docs for any food that was logged before the AI Scan → My Foods fix existed | ✅ Done |
| Custom Food Entry | Manual entry form with unit picker (g, oz, ml, cup, tbsp, tsp, pc, serving) | ✅ Done |
| Edit Custom Food | Edit name, macros, serving size and unit of saved custom foods | ✅ Done |
| Add to My Foods | Add food to library without logging to a meal | ✅ Done |
| My Foods | View, edit, search, paginate, and delete custom foods | ✅ Done |
| My Foods in Search | Custom foods pinned to top of search results with My Food badge | ✅ Done |
| My Foods Shortcut | Quick access to My Foods from the diary page | ✅ Done |
| Seeded PH Foods | Jollibee, McDonald's PH, Chowking, Starbucks PH, eggs seeded to DB | ✅ Done |
| Quantity Picker | Select serving size and auto-scale macros before adding food to diary | ✅ Done |
| Serving/PC Unit Fix | 1 serving or 1 pc correctly maps to 100% of calories without 100g lock | ✅ Done |
| Recipe Builder | Build a recipe from multiple ingredients with unit picker and macro scaling | ✅ Done |
| Edit Recipe | Full edit screen (`edit-recipe.jsx`) — loads existing recipe, converts logged macros back to per-100g base values for correct unit/quantity rescaling, saves via `PUT /recipes/:id` | ✅ Done |
| Recipes Screen | View, edit, delete, and add recipes to diary | ✅ Done |
| Multi-day Food Logging | Log same food across multiple days | ✅ Done |
| Food Search | USDA + Open Food Facts + Calorie API + API Ninjas + custom entries | ✅ Done |
| Search Ranking | Exact and partial name matches ranked above unrelated results | ✅ Done |
| Search Deduplication | Duplicate food names across sources filtered out | ✅ Done |

#### 4. Nutrition Dashboard

| Feature | Description | Status |
|---------|-------------|--------|
| Daily Calorie Counter | Shows calories eaten vs remaining vs goal with progress bar | ✅ Done |
| Dashboard UTC Fix | Dashboard uses local date formatting to prevent showing yesterday's data | ✅ Done |
| Dashboard Daily/Weekly Toggle | Segmented toggle switches the calorie/macro card between today's numbers and a 7-day daily average | ✅ Done |
| Dashboard Date Navigation | Prev/next arrows step through past days in Daily mode or past weeks in Weekly mode — capped at today / current week | ✅ Done |
| Macros Tracking | Protein, carbs, fat progress bars vs goals, both daily and weekly-average views | ✅ Done |
| Micronutrients | Sodium, sugar, fiber breakdown per day in diary | ✅ Done |
| Nutrition Summary | Per meal and per day breakdown | ✅ Done |
| Progress Dashboard | Visual overview of daily and weekly nutrition | ✅ Done |
| Weekly Calorie History | Bar chart of daily calories vs goal with Mon-Sun week navigation, titled section, positioned at bottom of Progress page | ✅ Done |
| Weekly Weight Tracker | Log weight entries and view weekly trend chart | ✅ Done |
| Weight Trend Range | Weight Trend chart limited to last 4 weeks of entries | ✅ Done |
| Progress Chart Fix | Chart overflow clipped correctly inside card | ✅ Done |
| Delete Weight Entries | Remove incorrect weight log entries | ✅ Done |
| Recent Entries Pagination | Weight log list paginated 10 entries per page with Prev/Next | ✅ Done |
| Progress Photos | Attach a camera or gallery photo to a weight entry, uploaded to Cloudinary | ✅ Done |
| Progress Photo Thumbnails | Recent Entries list shows a thumbnail per logged photo | ✅ Done |
| Show/Hide Photos Toggle | Photos hidden by default behind a lock icon, toggle to reveal | ✅ Done |
| Progress Photo Cleanup | Deleting a weight entry also deletes its photo from Cloudinary via Admin API | ✅ Done — applies to entries logged after this fix; earlier entries lack the stored public_id |
| Workout Calories Deducted | Calories burned from workouts added to remaining on dashboard | ✅ Done |
| Dashboard Focus Refresh | Dashboard re-fetches data every time user navigates to it, and on day/week offset change | ✅ Done |
| Diary Focus Refresh | Diary re-fetches data every time user navigates to it | ✅ Done |

#### 5. Profile

| Feature | Description | Status |
|---------|-------------|--------|
| Profile Stats View | Shows current weight, goal weight, height, age, gender, activity level, timezone | ✅ Done |
| Weight Loss Plan | Shows daily deficit target, 500 kcal deficit, and estimated weeks to goal | ✅ Done |
| Macro Formula | Updated to 25% protein / 45% carbs / 30% fat industry standard split | ✅ Done |
| TDEE Formula | Mifflin-St Jeor with activity multiplier and gender | ✅ Done |
| Gender Field | Male/female selector on registration and profile for accurate TDEE | ✅ Done |
| Timezone Selector | IANA timezone picker in profile — used across all date calculations | ✅ Done |
| Context Sync | User context updates immediately after profile save | ✅ Done |
| Logout | Moved to Profile tab only | ✅ Done |

---

### Phase 2 — Workout and Interval Timer

| Feature | Description | Status |
|---------|-------------|--------|
| Workout Model | Mongoose schema with warmUp, coolDown, repeat, mode fields | ✅ Done |
| Simple Mode | Single countdown timer for straightforward workouts | ✅ Done |
| Complex Mode | HIIT, Tabata, and circuit timer with work and rest periods | ✅ Done |
| Custom Intervals | Set work duration, rest duration, rounds, and sets | ✅ Done |
| Named Exercises | Label each interval with an exercise name | ✅ Done |
| Custom Interval Names | Type a custom name not in the list and confirm with "Use custom name" | ✅ Done |
| Interval Reordering | Move intervals up or down with arrow buttons | ✅ Done |
| MET Lookup Table | 50+ exercises with accurate MET values for calorie calculation | ✅ Done |
| MET-based Calorie Calc | Per-exercise MET values used for accurate calorie burn estimate | ✅ Done |
| Saved Workout Presets | Save and reuse custom timer configurations | ✅ Done |
| Edit Workout | Edit existing workout name, type, mode, intervals, rounds, warmup, cooldown, repeat | ✅ Done |
| Warm Up Timer | Warmup phase runs before main intervals in both simple and complex mode | ✅ Done |
| Cool Down Timer | Cooldown phase runs after main intervals in both simple and complex mode | ✅ Done |
| Warmup Cooldown in Total Time | Warmup and cooldown seconds included in total workout time calculation | ✅ Done |
| Total Workout Time on Card | Each saved workout card shows total duration including warmup and cooldown | ✅ Done |
| Default Rest Time Fix | New intervals default to 0s rest instead of 10s | ✅ Done |
| Repeat Toggle | Loop the entire workout indefinitely | ✅ Done |
| Voice Announcements | Audio cues for interval changes with countdown | ✅ Done |
| Voice Picker | Select from available system voices before starting workout | ✅ Done |
| iOS Done Button | Floating done button above number-pad keyboard on iOS | ✅ Done |
| Exercise Logging | Log workout type, duration, sets, reps | ✅ Done |
| Calories Burned | MET-based auto-estimate on completion, editable before saving | ✅ Done |
| Workout Settings Screen | Preview intervals, warmup, cooldown, repeat, and select voice before starting | ✅ Done |
| Delete Workouts | Remove saved workouts | ✅ Done |
| Workout Page Focus Refresh | Workout list refreshes on every tab focus | ✅ Done |
| Keep Screen Awake | Screen stays on globally while app is open via expo-keep-awake | ✅ Done |
| Sound Effects | Ding, beep, and chime sounds on interval transitions — Android only | ✅ Done |
| Audio Mix Mode | Timer sounds duck background audio without interrupting it — Android only | ✅ Done |
| Workout Timer/Tracker Tabs | Workout page split into Timer tab and Tracker tab | ✅ Done |
| Exercise Tracker | Log sets, reps, weight per exercise with progressive overload tracking | ✅ Done |
| Dynamic Per-Set Rows | Add multiple set rows at once, each with its own weight and reps | ✅ Done |
| kg/lbs Weight Unit Toggle | Toggle sits directly on the Tracker tab; all displayed and entered weights convert live while the underlying value is always stored in kg | ✅ Done |
| Bodyweight PR Tracking | Exercises logged with 0 weight (e.g. pullups, pushups) now show a "X reps best" badge instead of no badge at all | ✅ Done |
| Unified Save Button | Replaced flaky auto-save-on-blur notes with a single explicit Save button per exercise card that commits pending sets and notes together in one request | ✅ Done |
| Exercise Notes Inline Links | Saved notes render as plain text with URLs shown as tappable, underlined hyperlinks; tap the note to re-enter edit mode | ✅ Done |
| Stale-Data Save Fix | All exercise saves (notes, week, sets) now fetch the current server state immediately before saving, instead of trusting local component state that may be empty if the card was never expanded — prevents accidentally wiping existing sets or notes | ✅ Done |
| Backend Overwrite Guard | `logExercise` only overwrites `sets`/`notes` on the server when those fields are actually present in the request, so an omitted field can never wipe existing data even from a future client bug | ✅ Done |
| Editable / Auto-Incrementing Week | Tap the "Week X" label on any exercise card to manually set a starting week number; going forward, new logs for that exercise auto-increment the week by however many calendar weeks (Mon-based) have elapsed since the last log, rather than resetting to the actual calendar week-of-year | ✅ Done |
| Exercise Rename | Rename any exercise from the Tracker card (pencil icon) or the Exercise History screen — updates the `exercise` field across all of that exercise's logged history via `PUT /exercises/by-name/:exercise/rename` | ✅ Done |
| Full Exercise Edit Modal | Pencil icon on a Tracker card opens a combined view to rename the exercise and edit today's logged sets and notes together, in one Save action | ✅ Done |
| Tracker List Pagination | Exercise list in the Tracker tab paginated 10 per page with Prev/Next | ✅ Done |
| Auto-Collapse on Navigate Away | Expanded exercise card automatically collapses when leaving the Workout tab or coming back to it | ✅ Done |
| Minimize Button | Explicit ⌃ collapse button appears on an expanded exercise card, next to the week label | ✅ Done |
| Exercise History Screen | View progressive overload history per exercise — all-time best (weight or reps for bodyweight), per-session volume, PR badge, delete individual logs | ✅ Done |
| Exercise History Pagination | History log list paginated 10 per page with Prev/Next; backend log limit raised from 20 to 200 to give pagination real room | ✅ Done |
| Edit Exercise History Entry | Pencil icon on any past log opens inline editing for its sets (weight/reps, add/remove rows) and notes, saved via `PUT /exercises/:id` | ✅ Done |
| Delete Exercise | ✕ button on each exercise card deletes the exercise and all its logged history via `DELETE /exercises/by-name/:exercise` | ✅ Done |
| Back Navigation Fix | Root layout switched from Slot to Stack so pushed screens (e.g. exercise history) correctly pop back to the previous tab instead of resetting to Home | ✅ Done |
| Background Timer | Timer continues running when app is backgrounded | ⬜ On hold — requires native build |
| iOS Sound Effects | Timer sound effects on iPhone | ⬜ On hold — requires Apple Developer account |

---

### Phase 3 — Health Data Integration

#### iOS — Apple HealthKit

> ⚠️ On hold — requires EAS native iOS build. Will resume once Apple Developer account is set up.

| Feature | Description | Status |
|---------|-------------|--------|
| Apple HealthKit Setup | Request HealthKit permissions on first launch | ⏸ On hold — requires native build |
| Steps Tracking | Read daily step count from HealthKit | ⏸ On hold |
| Active Calories | Read active calories burned from HealthKit | ⏸ On hold |
| Heart Rate | Read heart rate data from HealthKit | ⏸ On hold |
| Blood Oxygen | Read SpO2 data from HealthKit | ⏸ On hold |
| Sleep Tracking | Read sleep duration from HealthKit | ⏸ On hold |
| Distance | Read daily distance from HealthKit | ⏸ On hold |
| Multi-sport Workout Sync | Sync completed workouts from HealthKit | ⏸ On hold |
| Colmi Ring Integration | Colmi ring data flows via QRing app into HealthKit — no direct integration needed | ⏸ On hold |
| Health Screen UI | Dashboard showing steps, heart rate, calories, sleep, distance | ✅ Built — pending native build |
| HealthKit Utility Layer | Platform-aware data fetching from HealthKit | ✅ Built — pending native build |

#### Android — Google Health Connect

| Feature | Description | Status |
|---------|-------------|--------|
| Health Connect Setup | Request Health Connect permissions on first launch | ⬜ Not Built |
| Steps Tracking | Read daily step count from Health Connect | ⬜ Not Built |
| Active Calories | Read active calories burned from Health Connect | ⬜ Not Built |
| Heart Rate | Read heart rate data from Health Connect | ⬜ Not Built |
| Sleep Tracking | Read sleep duration from Health Connect | ⬜ Not Built |
| Distance | Read daily distance from Health Connect | ⬜ Not Built |

---

### Phase 4 — Deployment and Performance

| Feature | Description | Status |
|---------|-------------|--------|
| Backend Deployment | Deploy Express backend to Render free tier | ✅ Done |
| Frontend Deployment | Deploy Expo web to Vercel | ✅ Done |
| Environment Config (Production) | Set production env vars on Render and Vercel, including Cloudinary credentials | ✅ Done |
| SPA Routing Fix | Vercel rewrite rules for client-side routing | ✅ Done |
| Cache Control | Static assets cached, HTML no-cache for instant updates | ✅ Done |
| Tab Bar Icons | Ionicons on all tabs with safe area padding for Android | ✅ Done |
| App Icon | Custom muscle map figure with lock icon — dark version | ✅ Done |
| Android APK Build | EAS build for Android — sideload distribution, no Play Store needed | ✅ Done |
| OTA Updates | expo-updates for seamless over-the-air app updates | ✅ Done |
| Backend Warm-Up | Ping /health on app launch with retry to wake Render free tier | ✅ Done |
| API Response Caching | Cache utility for food search and meal data | ✅ Done |
| Lazy Tab Loading | Tabs load on demand with lazy: true | ✅ Done |
| Session Persistence Fix | Token only cleared on 401, not on network timeout | ✅ Done |
| Timezone Date Fix | All date formatting uses local time to prevent UTC date shift | ✅ Done |
| Rate Limit Tuning | Global limiter raised to 500 req/15min with health checks excluded | ✅ Done |
| iOS Native Build | EAS build for iOS — requires Apple Developer account ($99/yr) | ⬜ On hold |

---

## Known Limitations

| Limitation | Platform | Resolution |
|------------|----------|------------|
| Timer voice announcements interrupt background music | iOS | Requires Apple Developer account for native build |
| Sound effects (ding, beep, chime) not available | iOS | Requires Apple Developer account for native build |
| Timer pauses when app is backgrounded | iOS + Android | On hold — requires native build |
| Background timer | Both | On hold — requires native build |
| Progress photos logged before the Cloudinary cleanup fix have no stored public_id | Both | Those images will remain in Cloudinary storage even after the weight entry is deleted; negligible at current free-tier usage (25GB) |
| Exercise notes/sets lost before the unified Save button and stale-data fixes shipped | Both | Data wiped by the earlier auto-save race condition cannot be recovered automatically — re-enter it manually; the underlying bug is fixed going forward |
| Local `.env` MongoDB URI drift | Local dev only | Local `.env` is gitignored and separate from Render's environment variables — if the Atlas `admin` password is rotated, both must be updated manually or the local backend/scripts will fail with `bad auth` while the deployed app keeps working fine (or vice versa) |
| Assistant sandbox state can go stale between sessions | Development process only | The AI assistant's working copy of the codebase can silently reset between sessions; when in doubt whether a file matches what's actually deployed, paste the real current file content before requesting further edits to it |
| Browser/app caching can mask a successfully deployed fix | Development process only | If a confirmed-published OTA update doesn't appear to change behavior, hard-refresh (or disable cache in DevTools) or force-close and reopen the app before assuming the fix itself is broken |

---

## Setup Instructions

### Prerequisites

- Node.js v20+
- MongoDB Atlas account (free tier)
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Expo Go app on Android for local testing
- Groq account (free tier) for AI food scanning — https://console.groq.com
- Gmail account with app password enabled for password reset emails
- Calorie API key (free) — https://calorieapi.com
- API Ninjas key (free) — https://api-ninjas.com
- Open Food Facts API (no key required)
- USDA FoodData Central (no key required)
- Cloudinary account (free tier) for progress photos — https://cloudinary.com

### 1. Clone the repo

```
git clone https://github.com/normanchingcuanco/ltfi-app.git
cd ltfi
```

### 2. Install dependencies

```
cd backend && npm install
cd ../frontend && npm install --legacy-peer-deps
```

### 3. Configure environment variables

Create `backend/.env` and fill in your values:

```
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_random_secret
FRONTEND_URL=http://localhost:8081
PORT=5000
GROQ_API_KEY=your_groq_api_key
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
USDA_API_KEY=your_usda_key
CALORIE_API_KEY=your_calorie_api_key
API_NINJAS_KEY=your_api_ninjas_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Important: the `MONGODB_URI` here is separate from whatever is set on Render — they are two independent copies. If the Atlas database password is ever reset, **update it in both places**, or one environment will start failing with `bad auth: authentication failed` while the other keeps working. If the local network blocks SRV DNS lookups (common on restrictive/corporate networks), use the non-SRV connection string format from Atlas's "Connect" screen (toggle off "SRV Connection String") instead of `mongodb+srv://`.

These same `CLOUDINARY_*` values also need to be set as environment variables on Render for the deployed backend — `.env` is gitignored and never reaches production on its own.

The frontend's Cloudinary cloud name and unsigned upload preset are set directly in `frontend/app/(tabs)/progress.jsx` as `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` constants, since unsigned uploads are safe to expose client-side.

### 4. Run locally

Terminal 1 — Backend:
```
cd backend && node server.js
```

Terminal 2 — Frontend:
```
cd frontend && npx expo start
```

- Frontend (Web): http://localhost:8081
- Frontend (Mobile): scan QR code with Expo Go on Android
- Backend: http://localhost:5000

### 5. Build Android APK

```
cd frontend
eas build -p android --profile preview
```

Download and sideload the APK directly. No Google Play account needed.

---

## Maintenance Scripts

`backend/scripts/backfillMyFoods.js` — one-time recovery script. Scans every historical `Meal` document, finds unique food names per user, and creates a matching `Food` doc (with `createdBy` set) for anything missing from that user's My Foods library. Safe to re-run; it skips anything that already exists. Run with:

```
cd backend
node scripts/backfillMyFoods.js
```

`backend/scripts/seedPhilippineFoods.js` — seeds common Philippine fast-food items (Jollibee, McDonald's PH, Chowking, Starbucks PH) directly into the public Food collection.

---

## Pushing OTA Updates

For any JS/UI changes that don't require new native modules, push an OTA update instead of rebuilding the APK.

### When to use OTA vs rebuild

| Change | Use |
|--------|-----|
| UI changes, bug fixes, new screens | OTA update |
| New native library added | Rebuild APK |
| app.json native config changed | Rebuild APK |
| App icon changed | Rebuild APK |

### How to push an OTA update

```
cd frontend
eas update --branch preview --message "your update description"
```

Users get the update silently on next app launch. No new APK download needed. If a confirmed-published update doesn't seem to have taken effect on a device already running the app, hard-refresh on web or force-close and reopen the app on mobile before assuming the deploy itself failed.

### Branches

| Branch | Used for |
|--------|----------|
| preview | Internal testing and distribution |
| production | App Store / Play Store (future) |

---

## Sharing Without App Store

**Android (free):**
1. Build the APK via `eas build -p android --profile preview`
2. Share the EAS download link or the APK file directly via WhatsApp, Telegram, or Google Drive
3. Recipients enable "Install from unknown sources" on their Android and install

**iOS:**
Requires Apple Developer account ($99/yr) for any distribution outside of Expo Go.

---

*Last updated: August 2026*