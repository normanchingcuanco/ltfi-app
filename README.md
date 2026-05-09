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

| Layer | Technology |
|-------|------------|
| Mobile + Web | Expo + React Native Web |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT + Email/Password |
| Barcode Scanning | Open Food Facts API (free) |
| AI Food Scanning | Anthropic API — personal account free tier |
| Health Data | Apple HealthKit |
| Wearable | Colmi Ring via QRing → HealthKit pipeline |
| Hosting (Frontend) | TBD |
| Hosting (Backend) | TBD |

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
│   │   ├── components/
│   │   │   ├── common/
│   │   │   └── layout/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── LoginScreen.jsx
│   │   │   │   └── RegisterScreen.jsx
│   │   │   ├── nutrition/
│   │   │   │   ├── DashboardScreen.jsx
│   │   │   │   ├── FoodDiaryScreen.jsx
│   │   │   │   ├── BarcodeScannerScreen.jsx
│   │   │   │   ├── AIFoodScanScreen.jsx
│   │   │   │   ├── CustomFoodScreen.jsx
│   │   │   │   └── RecipeBuilderScreen.jsx
│   │   │   ├── progress/
│   │   │   │   └── WeightTrackerScreen.jsx
│   │   │   └── workout/
│   │   │       ├── IntervalTimerScreen.jsx
│   │   │       └── WorkoutLogScreen.jsx
│   │   ├── navigation/
│   │   │   └── AppNavigator.jsx
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   └── constants.js
│   │   └── App.jsx
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
| date | Date | |
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
| Expo App Setup | Expo + React Native Web with navigation | ⬜ Not Built |
| Backend Server Setup | Express app with helmet, morgan, rate limiting | ⬜ Not Built |
| MongoDB Connection | Mongoose connected to MongoDB Atlas free tier | ⬜ Not Built |
| Environment Config | .env for DB URI, JWT secret, Anthropic API key, frontend URL | ⬜ Not Built |

#### 2. Authentication

| Feature | Description | Status |
|---------|-------------|--------|
| User Model | Mongoose schema with profile fields, goals, and password | ⬜ Not Built |
| Registration Screen | Name, email, password, age, height, current weight, goal weight, activity level, diet preference | ⬜ Not Built |
| Auto Calorie Calculation | Calculate daily calorie and macro goals on registration using TDEE formula | ⬜ Not Built |
| Login Screen | Email + password form | ⬜ Not Built |
| JWT Middleware | Protect all API routes | ⬜ Not Built |
| Session Persistence | JWT survives app restarts | ⬜ Not Built |
| Password Reset | Forgot password flow via email | ⬜ Not Built |
| Profile Screen | Update name, weight, and goals | ⬜ Not Built |

#### 3. Food Tracking

| Feature | Description | Status |
|---------|-------------|--------|
| Food Model | Mongoose schema with nutrition fields and source tracking | ⬜ Not Built |
| Meal Log Model | Daily meal log per user with meal types | ⬜ Not Built |
| Daily Food Diary | Log food under breakfast, lunch, dinner, snacks | ⬜ Not Built |
| Barcode Scanner | Camera-based barcode scan via Open Food Facts API | ⬜ Not Built |
| AI Food Photo Scan | Camera photo → Anthropic API → food name + nutrition estimate | ⬜ Not Built |
| Custom Food Entry | Manual entry form for foods not in any database | ⬜ Not Built |
| Recipe Builder | Build a recipe from multiple ingredients, set servings, auto-calculate macros | ⬜ Not Built |
| Multi-day Food Logging | Log same food across multiple days | ⬜ Not Built |
| Food Search | Search food database — Open Food Facts + custom entries | ⬜ Not Built |

#### 4. Nutrition Dashboard

| Feature | Description | Status |
|---------|-------------|--------|
| Daily Calorie Counter | Shows calories consumed vs goal | ⬜ Not Built |
| Macros Tracking | Protein, carbs, fat progress bars vs goals | ⬜ Not Built |
| Micronutrients | Sodium, sugar, fiber breakdown per day | ⬜ Not Built |
| Nutrition Summary | Per meal and per day breakdown | ⬜ Not Built |
| Progress Dashboard | Visual overview of daily and weekly nutrition | ⬜ Not Built |
| Weekly Weight Tracker | Log weight entries and view weekly trend chart | ⬜ Not Built |

---

### Phase 2 — Workout and Interval Timer

| Feature | Description | Status |
|---------|-------------|--------|
| Workout Model | Mongoose schema for interval and workout sessions | ⬜ Not Built |
| Interval Timer | HIIT, Tabata, and circuit timer with work and rest periods | ⬜ Not Built |
| Custom Intervals | Set work duration, rest duration, rounds, and sets | ⬜ Not Built |
| Named Exercises | Label each interval with an exercise name | ⬜ Not Built |
| Saved Workout Presets | Save and reuse custom timer configurations | ⬜ Not Built |
| Voice Announcements | Audio cues for interval changes | ⬜ Not Built |
| Background Timer | Timer continues running when app is backgrounded | ⬜ Not Built |
| Exercise Logging | Log workout type, duration, sets, reps | ⬜ Not Built |
| Calories Burned | Estimate and log calories burned per workout | ⬜ Not Built |

---

### Phase 3 — Health Data Integration

| Feature | Description | Status |
|---------|-------------|--------|
| Apple HealthKit Setup | Request HealthKit permissions on first launch | ⬜ Not Built |
| Steps Tracking | Read daily step count from HealthKit | ⬜ Not Built |
| Active Calories | Read active calories burned from HealthKit | ⬜ Not Built |
| Heart Rate | Read heart rate data from HealthKit | ⬜ Not Built |
| Blood Oxygen | Read SpO2 data from HealthKit | ⬜ Not Built |
| Sleep Tracking | Read sleep duration from HealthKit | ⬜ Not Built |
| Distance | Read daily distance from HealthKit | ⬜ Not Built |
| Multi-sport Workout Sync | Sync completed workouts from HealthKit | ⬜ Not Built |
| Colmi Ring Integration | Colmi ring data flows via QRing app into HealthKit — no direct integration needed | ⬜ Not Built |

---

## Setup Instructions

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (free tier)
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app installed on your iPhone
- Anthropic account (personal, free tier) for AI food scanning
- Open Food Facts API (no key required)

### 1. Clone the repo

git clone https://github.com/your-username/ltfi.git
cd ltfi

### 2. Install dependencies

npm run install:all

### 3. Configure environment variables

Copy `backend/.env` and fill in your values:

MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_random_secret
FRONTEND_URL=http://localhost:8081
ANTHROPIC_API_KEY=your_anthropic_personal_api_key

### 4. Run locally

npm run dev

Frontend (Expo): scan QR code with Expo Go on your iPhone
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
