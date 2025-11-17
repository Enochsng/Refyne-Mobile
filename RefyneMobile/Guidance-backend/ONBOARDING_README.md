# Coach Onboarding Flow

This document describes the coach onboarding flow implemented for the Refyne mobile app.

## Overview

When a user signs up as a coach, they are taken through a 5-step onboarding process to collect essential information about their coaching background and expertise.

## Onboarding Steps

### Step 1: Sport Selection
- **Screen**: `SportSelectionScreen.js`
- **Purpose**: Select primary sport to coach
- **Options**: Golf, Badminton, Weight Lifting
- **UI**: Dropdown menu with sport icons
- **Validation**: Must select one sport to continue

### Step 2: Language
- **Screen**: `LanguageScreen.js`
- **Purpose**: Specify written communication language
- **Input**: Free text input
- **Validation**: Must enter a language

### Step 3: Experience
- **Screen**: `ExperienceScreen.js`
- **Purpose**: Years of coaching experience
- **Options**: 
  - 0-1 years (Just starting out)
  - 2-5 years (Building experience)
  - 6-10 years (Experienced coach)
  - 11-15 years (Senior coach)
  - 15+ years (Expert coach)
- **UI**: Multiple choice cards
- **Validation**: Must select one option

### Step 4: Areas of Expertise
- **Screen**: `ExpertiseScreen.js`
- **Purpose**: Select coaching specializations
- **Options**: 
  - Beginner Training
  - Intermediate Training
  - Advanced Training
  - Technique Improvement
  - Fitness & Conditioning
  - Mental Game
  - Competition Prep
  - Injury Rehabilitation
  - Youth Coaching
  - Adult Coaching
- **UI**: Multi-select cards with checkboxes
- **Validation**: Must select at least one area

### Step 5: Bio
- **Screen**: `BioScreen.js`
- **Purpose**: Write a short bio about coaching experience
- **Input**: Multi-line text input
- **Validation**: Minimum 50 characters, maximum 500 characters
- **Features**: Character counter, real-time validation

## Technical Implementation

### Navigation
- **Navigator**: `CoachOnboardingNavigator.js`
- **Type**: Stack Navigator with disabled back gestures
- **Flow**: Linear progression through all 5 steps

### Data Storage
- **Method**: Supabase user metadata
- **Structure**: 
  ```javascript
  {
    sport: 'golf|badminton|weightlifting',
    language: 'string',
    experience: '0-1|2-5|6-10|11-15|15+',
    expertise: ['array', 'of', 'selected', 'areas'],
    bio: 'string',
    completed_at: 'ISO timestamp',
    user_id: 'uuid'
  }
  ```

### App Integration
- **Entry Point**: `App.js` checks `onboarding_completed` flag
- **Flow**: 
  - Coach signs up → Onboarding flow
  - Onboarding completed → Main coach app
  - Existing coaches → Direct to main app

### UI/UX Features
- **Design**: Consistent with app's gradient theme
- **Animations**: Fade, slide, and scale animations
- **Progress**: Visual progress bar across all steps
- **Validation**: Real-time feedback and error handling
- **Accessibility**: Clear labels and intuitive navigation

## File Structure

```
RefyneMobile/
├── navigation/
│   └── CoachOnboardingNavigator.js
├── screens/
│   └── onboarding/
│       ├── SportSelectionScreen.js
│       ├── LanguageScreen.js
│       ├── ExperienceScreen.js
│       ├── ExpertiseScreen.js
│       └── BioScreen.js
└── App.js (updated)
```

## Usage

1. User signs up as a coach in `AuthScreen.js`
2. App automatically redirects to onboarding flow
3. User completes all 5 steps
4. Data is saved to Supabase user metadata
5. User is redirected to main coach app

## Future Enhancements

- Add profile photo upload step
- Include certification/license upload
- Add location/availability preferences
- Implement onboarding data editing in profile
- Add analytics tracking for onboarding completion rates
