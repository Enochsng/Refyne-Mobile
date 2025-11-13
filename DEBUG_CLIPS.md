# Debugging Clip Counter Issue

## Where to Check Backend Logs

### 1. **Backend Server Terminal**
The backend logs appear in the terminal/console where you started the backend server.

**To start the backend server:**
```bash
# Option 1: Using the script
./start-backend.sh

# Option 2: Manual start
cd backend
npm run dev
```

**Look for logs with these emojis:**
- 🎬 `[getRemainingClipsForConversation]` - Main function starting
- ✅ `[getRemainingClipsForConversation]` - Conversation found
- 🔍 `[getActiveSessionsForPlayerCoach]` - Searching for sessions
- 📦 Session details
- 📊 Final clip count

### 2. **Frontend Logs (React Native)**
Check your React Native debugger console or terminal where you're running the app.

**Look for logs with these prefixes:**
- `🔄 [CoachFeedbackScreen]` - Loading clips
- `📊 [getRemainingClips]` - API response
- `✅ [CoachFeedbackScreen]` - Clip info received

## Quick Debugging Steps

1. **Open the chat screen** with the coach
2. **Check backend terminal** - You should see logs starting with `🎬 [getRemainingClipsForConversation]`
3. **Check frontend console** - You should see logs starting with `🔄 [CoachFeedbackScreen]`
4. **Look for these key pieces of information:**
   - Conversation ID
   - Player ID
   - Coach ID
   - Session ID (if any)
   - Number of sessions found
   - Final clip count returned

## Common Issues to Check

### Issue 1: No Sessions Found
**Backend log will show:**
```
⚠️ [getActiveSessionsForPlayerCoach] No session_ids found in conversations
🔍 [getActiveSessionsForPlayerCoach] No sessions from conversation IDs, trying to find recent sessions for coach
```

**Solution:** Check if:
- The webhook created the session (check for `Coaching session saved to database:`)
- The session has the correct `coach_id` and `clips_remaining`
- The session is still active and not expired

### Issue 2: Conversation Not Linked to Session
**Backend log will show:**
```
⚠️ Conversation does not have a session_id
🔍 No clips from direct session, trying to get all active sessions for player-coach pair
```

**Solution:** The system should automatically link them. Check if:
- There's a recent session for the coach (within 4 hours)
- The session isn't already linked to another player

### Issue 3: Session Expired
**Backend log will show:**
```
⚠️ Session has expired
```

**Solution:** Check the `session_expiry` date in the database

## Manual Database Check

You can also check the database directly:

```sql
-- Check if session exists
SELECT * FROM coaching_sessions 
WHERE coach_id = 'YOUR_COACH_ID' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if conversation exists and is linked
SELECT * FROM conversations 
WHERE player_id = 'YOUR_PLAYER_ID' 
AND coach_id = 'YOUR_COACH_ID';

-- Check clips in session
SELECT id, clips_remaining, clips_uploaded, session_expiry, status 
FROM coaching_sessions 
WHERE coach_id = 'YOUR_COACH_ID' 
AND status = 'active';
```

## Test Endpoint

You can also test the endpoint directly:

```bash
curl http://localhost:3001/api/conversations/YOUR_CONVERSATION_ID/clips
```

Replace `YOUR_CONVERSATION_ID` with the actual conversation ID from your frontend logs.

