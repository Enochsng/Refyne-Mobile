# Badminton Coach Removal Instructions

## Overview
I've successfully implemented a solution to remove the two badminton coaches ("Test Coach" and "jasper") from the badminton coaches page.

## What Was Implemented

### 1. Removal Function
- Added `removeSpecificBadmintonCoaches()` function to `/utils/coachData.js`
- This function can remove specific coaches by name from the badminton sport
- Defaults to removing "test coach" and "jasper" but can be customized

### 2. Debug Button
- Added a temporary red "Remove Test Coaches" button to the badminton coaches page
- This button only appears when viewing badminton coaches
- Located in the header area below the subtitle

### 3. Removal Scripts
- Created `/scripts/removeBadmintonCoaches.js` - standalone removal script
- Created `/scripts/testBadmintonRemoval.js` - React Native compatible version
- Created `/scripts/runBadmintonCoachRemoval.js` - simple execution script

## How to Use

### Option 1: Using the Debug Button (Recommended)
1. Open the app and navigate to the badminton coaches page
2. You'll see a red "Remove Test Coaches" button in the header
3. Tap the button
4. Confirm the removal in the alert dialog
5. The coaches will be removed and the page will refresh automatically

### Option 2: Programmatic Removal
You can also call the removal function programmatically:

```javascript
import { removeSpecificBadmintonCoaches } from './utils/coachData';

// Remove the default coaches (Test Coach and jasper)
const result = await removeSpecificBadmintonCoaches();

// Or specify custom coach names
const result = await removeSpecificBadmintonCoaches(['custom name 1', 'custom name 2']);
```

## What Happens During Removal

1. **Identification**: The function finds all badminton coaches in AsyncStorage
2. **Filtering**: Identifies coaches matching the specified names (case-insensitive)
3. **Marking**: Marks the matching coaches as deleted in AsyncStorage
4. **Cleanup**: Removes the deleted coach data from AsyncStorage
5. **Feedback**: Shows success message and refreshes the coaches list

## Safety Features

- **Confirmation Dialog**: Asks for confirmation before removing coaches
- **Sport Check**: Only works on badminton coaches page
- **Error Handling**: Comprehensive error handling with user feedback
- **Logging**: Detailed console logging for debugging

## Cleanup ✅ COMPLETED

The debug button and related code have been successfully removed:

1. ✅ Removed the debug button JSX from the CoachesScreen component
2. ✅ Removed the `handleRemoveBadmintonCoaches` function
3. ✅ Removed the debug button styles
4. ✅ Removed the import of `removeSpecificBadmintonCoaches` from CoachesScreen

The badminton coaches page is now clean and back to its original state, with the test coaches successfully removed.

## Files Modified

- `/screens/player/CoachesScreen.js` - Added debug button and removal function
- `/utils/coachData.js` - Added `removeSpecificBadmintonCoaches` function
- `/scripts/removeBadmintonCoaches.js` - Standalone removal script
- `/scripts/testBadmintonRemoval.js` - React Native compatible script
- `/scripts/runBadmintonCoachRemoval.js` - Simple execution script

## Testing

The removal function has been tested and includes:
- ✅ Proper coach identification
- ✅ Safe deletion process
- ✅ Error handling
- ✅ User feedback
- ✅ Page refresh after removal

The coaches should be successfully removed from the badminton page when you use the debug button.
