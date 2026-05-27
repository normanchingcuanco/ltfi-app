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

---

## Free-First Requirement

**Every tool, service, and API used in this project must have a free tier or be completely free.** No paid subscriptions, no trial-only services, no features locked behind a paywall — at any layer of the stack.

This applies to:
- All third-party APIs (AI, food data, health data)
- All hosting and infrastructure
- All development tools and SDKs
- All database services

If a free option exists, it must be used. If a service requires payment to function at any meaningful level, it must be replaced with a free alternative before building.

Current free services in use:
- MongoDB Atlas — free tier (512MB)
- Open Food Facts API — completely free, no key required
- Groq API — free tier with generous limits for LLaMA vision
- Gmail SMTP — free via app password
- Expo — free for development and Expo Go distribution

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
- Tracks daily calories, macros, and micronutrients
- Logs workouts and runs HIIT / Tabata / circuit interval timers
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
| Frontend (Web) | TBD |
| Backend | TBD |
| Mobile (Expo Go) | TBD |

---

## Tech Stack

| Layer | Technology | Cost |
|-------|------------|------|
| Mobile + Web | Expo + React Native Web | Free |
| Backend | Node.js + Express | Free |
| Database | MongoDB Atlas (free tier) | Free |
| Auth | JWT + Email/Password | Free |
| Barcode Scanning | Open Food Facts API | Free |
| AI Food Scanning | Groq API — LLaMA Vision (free tier) | Free |
| Email | Gmail SMTP via Nodemailer | Free |
| Health Data | Apple HealthKit | Free |
| Wearable | Colmi Ring via QRing → HealthKit pipeline | Free |
| Hosting (Frontend) | TBD — target free tier | Free |
| Hosting (Backend) | TBD — target free tier | Free |

---

## Folder Structure

ltfi/
├── backend/
│   ├── config/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── foodController.js
│   │   ├── mealController.js
│   │   ├── recipeController.js
│   │   ├── weightController.js
│   │   └── workoutController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Food.js
│   │   ├── Meal.js
│   │   ├── Recipe.js
│   │   ├── Weight.js
│   │   └── Workout.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── food.js
│   │   ├── meals.js
│   │   ├── recipes.js
│   │   ├── weight.js
│   │   └── workouts.js
│   ├── utils/
│   │   ├── calorieCalculator.js
│   │   └── mailer.js
│   ├── server.js
│   ├── .env
│   ├── .env.production
│   └── package.json
├── frontend/
│   ├── assets/
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   └── utils/
│   │       └── api.js
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login.jsx
│   │   │   ├── register.jsx
│   │   │   └── forgot-password.jsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.jsx
│   │   │   ├── dashboard.jsx
│   │   │   ├── diary.jsx
│   │   │   ├── recipes.jsx
│   │   │   ├── workout.jsx
│   │   │   ├── progress.jsx
│   │   │   └── profile.jsx
│   │   ├── _layout.jsx
│   │   ├── add-food.jsx
│   │   ├── ai-food-scan.jsx
│   │   ├── barcode-scanner.jsx
│   │   ├── create-workout.jsx
│   │   ├── custom-food.jsx
│   │   ├── reset-password.jsx
│   │   └── timer.jsx
│   ├── app.json
│   ├── babel.config.js
│   └── package.json
├── README.md
└── .gitignore

---

## Data Models

### User

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| email | String | Unique |
| name | String | |
| password | String | bcrypt hashed |
| age | Number | |
| height | Number | cm |
| currentWeight | Number | kg |
| goalWeight | Number | kg |
| activityLevel | String | sedentary / light / moderate / active / very active |
| dietPreference | String | Optional |
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
| date | String | YYYY-MM-DD |
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
| source | String | open_food_facts / ai_scan / custom |
| createdBy | ObjectId | Ref: User — null if from public DB |

### Recipe

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| user | ObjectId | Ref: User |
| name | String | |
| ingredients | Array | [{ foodId, name, quantity, unit }] |
| servings | Number | |
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

### Workout

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | PK |
| user | ObjectId | Ref: User |
| name | String | |
| type | String | HIIT / Tabata / circuit / custom |
| intervals | Array | [{ name, workSeconds, restSeconds }] |
| rounds | Number | |
| caloriesBurned | Number | Optional |
| completedAt | Date | |

---

## MVP Feature Build Roadmap

### Phase 1 — Nutrition Core

#### 1. Project Scaffold

| Feature | Description | Status |
|---------|-------------|--------|
| Expo App Setup | Expo + React Native Web with navigation | ✅ Done |
| Backend Server Setup | Express app with helmet, morgan, rate limiting | ✅ Done |
| MongoDB Connection | Mongoose connected to MongoDB Atlas free tier | ✅ Done |
| Environment Config | .env for DB URI, JWT secret, Groq API key, Gemini API key, email, frontend URL | ✅ Done |

#### 2. Authentication

| Feature | Description | Status |
|---------|-------------|--------|
| User Model | Mongoose schema with profile fields, goals, and password | ✅ Done |
| Registration Screen | Name, email, password, age, height, current weight, goal weight, activity level, diet preference, gender | ✅ Done |
| Auto Calorie Calculation | Calculate daily calorie and macro goals on registration using TDEE formula | ✅ Done |
| Login Screen | Email + password form with show/hide password | ✅ Done |
| JWT Middleware | Protect all API routes | ✅ Done |
| Session Persistence | JWT survives app restarts | ✅ Done |
| Password Reset | Forgot password flow via email using Gmail + Nodemailer | ✅ Done |
| Profile Screen | Update name, weight, goals — recalculates TDEE on save | ✅ Done |

#### 3. Food Tracking

| Feature | Description | Status |
|---------|-------------|--------|
| Food Model | Mongoose schema with nutrition fields and source tracking | ✅ Done |
| Meal Log Model | Daily meal log per user with meal types | ✅ Done |
| Daily Food Diary | Log food under breakfast, lunch, dinner, snacks | ✅ Done |
| Delete Food from Diary | Remove logged food items from any meal | ✅ Done |
| Edit Food in Diary | Edit quantity of logged food items with calorie preview | ✅ Done |
| Date Navigation | Navigate to any past or future date in the diary | ✅ Done |
| Copy Previous Day | Copy all meals from previous day to current date | ✅ Done |
| Barcode Scanner | Camera-based barcode scan via Open Food Facts API | ✅ Done |
| Web Barcode Scanner | Browser-based barcode scanning via ZXing library | ✅ Done |
| Manual Barcode Entry | Type barcode number manually if scan fails | ✅ Done |
| AI Food Photo Scan | Camera photo → Groq LLaMA Vision → food name + nutrition estimate | ✅ Done |
| Custom Food Entry | Manual entry form for foods not in any database | ✅ Done |
| My Foods | View and delete custom foods from the Add Food screen | ✅ Done |
| Quantity Picker | Select serving size before adding food to diary with calorie preview | ✅ Done |
| Recipe Builder | Build a recipe from multiple ingredients, set servings, auto-calculate macros | ✅ Done |
| Recipes Screen | View, delete, and add recipes to diary | ✅ Done |
| Multi-day Food Logging | Log same food across multiple days | ✅ Done |
| Food Search | Search food database — USDA FoodData Central + Open Food Facts + custom entries | ✅ Done |

#### 4. Nutrition Dashboard

| Feature | Description | Status |
|---------|-------------|--------|
| Daily Calorie Counter | Shows calories eaten vs remaining vs goal with progress bar | ✅ Done |
| Macros Tracking | Protein, carbs, fat progress bars vs goals | ✅ Done |
| Micronutrients | Sodium, sugar, fiber breakdown per day in diary | ✅ Done |
| Nutrition Summary | Per meal and per day breakdown | ✅ Done |
| Progress Dashboard | Visual overview of daily and weekly nutrition | ✅ Done |
| Weekly Weight Tracker | Log weight entries and view weekly trend chart | ✅ Done |
| Delete Weight Entries | Remove incorrect weight log entries | ✅ Done |
| Workout Calories Deducted | Calories burned from workouts added to remaining on dashboard | ✅ Done |
| Dashboard Focus Refresh | Dashboard re-fetches data every time user navigates to it | ✅ Done |
| Diary Focus Refresh | Diary re-fetches data every time user navigates to it | ✅ Done |

#### 5. Profile

| Feature | Description | Status |
|---------|-------------|--------|
| Profile Stats View | Shows current weight, goal weight, height, age, gender, activity level | ✅ Done |
| Weight Loss Plan | Shows daily deficit target, 500 kcal deficit, and estimated weeks to goal | ✅ Done |
| Macro Formula | Updated to 25% protein / 45% carbs / 30% fat industry standard split | ✅ Done |
| TDEE Formula | Mifflin-St Jeor with activity multiplier and gender | ✅ Done |
| Gender Field | Male/female selector on registration and profile for accurate TDEE | ✅ Done |
| Context Sync | User context updates immediately after profile save | ✅ Done |
| Logout | Moved to Profile tab only | ✅ Done |

---

### Phase 2 — Workout and Interval Timer

| Feature | Description | Status |
|---------|-------------|--------|
| Workout Model | Mongoose schema for interval and workout sessions | ✅ Done |
| Simple Mode | Single countdown timer for straightforward workouts | ✅ Done |
| Complex Mode | HIIT, Tabata, and circuit timer with work and rest periods | ✅ Done |
| Custom Intervals | Set work duration, rest duration, rounds, and sets | ✅ Done |
| Named Exercises | Label each interval with an exercise name | ✅ Done |
| MET Lookup Table | 50+ exercises with accurate MET values for calorie calculation | ✅ Done |
| MET-based Calorie Calc | Per-exercise MET values used for accurate calorie burn estimate | ✅ Done |
| Saved Workout Presets | Save and reuse custom timer configurations | ✅ Done |
| Voice Announcements | Audio cues for interval changes with countdown | ✅ Done |
| Voice Picker | Select from available system voices before starting workout | ✅ Done |
| Background Timer | Timer continues running when app is backgrounded | ⬜ Mobile only — deferred |
| Exercise Logging | Log workout type, duration, sets, reps | ✅ Done |
| Calories Burned | MET-based auto-estimate on completion, editable before saving | ✅ Done |
| Workout Settings Screen | Preview intervals and select voice before starting | ✅ Done |
| Delete Workouts | Remove saved workouts | ✅ Done |

---

### Phase 3 — Health Data Integration

#### iOS — Apple HealthKit

> ⚠️ Deferred — Expo SDK 55 is not yet compatible with iOS 26. Will resume once Expo releases a compatible SDK update.

| Feature | Description | Status |
|---------|-------------|--------|
| Apple HealthKit Setup | Request HealthKit permissions on first launch | ⏸ Deferred — iOS 26 incompatibility |
| Steps Tracking | Read daily step count from HealthKit | ⏸ Deferred |
| Active Calories | Read active calories burned from HealthKit | ⏸ Deferred |
| Heart Rate | Read heart rate data from HealthKit | ⏸ Deferred |
| Blood Oxygen | Read SpO2 data from HealthKit | ⏸ Deferred |
| Sleep Tracking | Read sleep duration from HealthKit | ⏸ Deferred |
| Distance | Read daily distance from HealthKit | ⏸ Deferred |
| Multi-sport Workout Sync | Sync completed workouts from HealthKit | ⏸ Deferred |
| Colmi Ring Integration | Colmi ring data flows via QRing app into HealthKit — no direct integration needed | ⏸ Deferred |
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
| Android APK Distribution | Build and distribute APK directly to users — no Google Play needed | ⬜ Not Built |

---

### Phase 4 — Deployment

| Feature | Description | Status |
|---------|-------------|--------|
| Backend Deployment | Deploy Express backend to Render free tier | ✅ Done |
| Frontend Deployment | Deploy Expo web to Vercel | ✅ Done |
| Environment Config (Production) | Set production env vars on Render and Vercel | ✅ Done |
| SPA Routing Fix | Vercel rewrite rules for client-side routing | ✅ Done |
| Cache Control | Static assets cached, HTML no-cache for instant updates | ✅ Done |
| Mobile Build | EAS build for iOS and Android native binary | ⬜ Not Built |

---

## Setup Instructions

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (free tier)
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app installed on your iPhone
- Groq account (free tier) for AI food scanning — https://console.groq.com
- Gmail account with app password enabled for password reset emails
- Open Food Facts API (no key required)

### 1. Clone the repo

git clone https://github.com/your-username/ltfi.git
cd ltfi

### 2. Install dependencies

cd backend && npm install
cd ../frontend && npm install

### 3. Configure environment variables

Create `backend/.env` and fill in your values:

MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_random_secret
FRONTEND_URL=http://localhost:8081
PORT=5000
GROQ_API_KEY=your_groq_api_key
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

### 4. Run locally

Terminal 1 — Backend:
cd backend && node server.js

Terminal 2 — Frontend:
cd frontend && npx expo start

Frontend (Web): http://localhost:8081
Frontend (Mobile): scan QR code with Expo Go on your iPhone
Backend: http://localhost:5000

---

## Sharing Without App Store

Use Expo Go to share the app with family and friends during development:

1. Run `npx expo start`
2. Share the generated QR code or Expo link
3. Recipients install Expo Go on their iPhone and scan the link

No Apple Developer account required for testing.

---

*Last updated: May 2026*