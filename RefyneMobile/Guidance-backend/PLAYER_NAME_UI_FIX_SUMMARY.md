# Player Name and UI Fix Summary

## Overview
Fixed the issue where player names were showing as "Player" instead of real names in the coaches messages screen, and improved the UI layout to ensure everything fits properly on screen.

## Changes Made

### 1. Database Schema Updates
- **Added `player_name` column** to the `conversations` table in all database setup files:
  - `backend/setup-conversations-database.sql`
  - `backend/setup-database.sql`
  - `backend/setup-database-safe.sql`
  - `backend/setup-database-step-by-step.sql`
  - `backend/services/database.js`

### 2. Backend Updates
- **Updated webhook handler** (`backend/routes/webhooks.js`):
  - Modified conversation creation to include `playerName` from payment metadata
  - Now stores actual player names when conversations are created

- **Updated database service** (`backend/services/database.js`):
  - Modified `createConversation` function to include `player_name` field
  - Ensures player names are stored in the database

### 3. Frontend Service Updates
- **Updated conversation service** (`services/conversationService.js`):
  - Modified `formatConversationForDisplay` to use `player_name` from database
  - Added fallback to `getPlayerName` for backward compatibility
  - Enhanced `getPlayerName` function to try Supabase auth metadata first
  - Improved error handling and fallback mechanisms

### 4. UI Layout Improvements
- **Updated CoachesMessagesScreen** (`screens/coaches/CoachesMessagesScreen.js`):
  - **Message bubbles**: Increased max width from 80% to 85% for better text display
  - **Message text**: Added `flexWrap: 'wrap'` to prevent text overflow
  - **Last message preview**: Added `flexWrap: 'wrap'` and `marginRight: 8` for better layout
  - **Conversation details**: Added `flex: 1` to ensure proper space distribution
  - **Conversation right section**: Added `minWidth: 40` to prevent layout issues
  - **Input container**: Added `maxHeight: 120` to prevent excessive height
  - **Message input**: Improved sizing with `maxHeight: 80`, `minHeight: 20`, and `paddingVertical: 8`

### 5. Migration Script
- **Created migration script** (`backend/add-player-name-migration.sql`):
  - Adds `player_name` column to existing conversations table
  - Updates existing records with default 'Player' name
  - Makes column NOT NULL after updating
  - Adds index for better performance

## How It Works Now

### Player Name Resolution Priority:
1. **Database**: Uses `player_name` from conversations table (primary source)
2. **Supabase Auth**: Falls back to user metadata if database name not available
3. **AsyncStorage**: Falls back to locally stored names
4. **Test Names**: Uses hardcoded test names for development
5. **Default**: Falls back to 'Player' if all else fails

### UI Improvements:
- **Better text wrapping**: Long messages now wrap properly instead of being truncated
- **Responsive layout**: Message bubbles and conversation cards adapt better to different screen sizes
- **Improved spacing**: Better margins and padding for cleaner appearance
- **Input area**: More controlled height and better text input experience

## Files Modified
- `backend/setup-conversations-database.sql`
- `backend/setup-database.sql`
- `backend/setup-database-safe.sql`
- `backend/setup-database-step-by-step.sql`
- `backend/services/database.js`
- `backend/routes/webhooks.js`
- `services/conversationService.js`
- `screens/coaches/CoachesMessagesScreen.js`
- `backend/add-player-name-migration.sql` (new)

## Next Steps
1. **Run the migration script** in your Supabase SQL Editor to add the `player_name` column
2. **Test the changes** by creating new conversations and verifying player names display correctly
3. **Verify UI improvements** by testing with long messages and different screen sizes

## Backward Compatibility
- The changes are backward compatible with existing conversations
- Fallback mechanisms ensure the app continues to work even if the database migration hasn't been run yet
- Existing conversations will show 'Player' until the migration is applied
