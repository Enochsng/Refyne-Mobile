# DM Creation After Payment Implementation

This document describes the implementation of automatic DM creation between players and coaches after successful payment.

## Overview

When a player completes a successful payment for coaching services, the system now automatically:
1. Creates a coaching session in the database
2. Creates a DM conversation between the player and coach
3. Adds a welcome message to the conversation
4. Makes the conversation visible on both player and coach message pages

## Implementation Details

### 1. Database Schema

Two new tables have been added:

#### Conversations Table
- Stores conversation metadata between players and coaches
- Links to coaching sessions
- Tracks unread message counts for both parties
- Includes last message information for display

#### Messages Table
- Stores individual messages within conversations
- Supports different message types (text, image, video, file)
- Links to conversations with foreign key relationship
- Supports system messages (welcome messages, notifications)

### 2. Backend Changes

#### Database Service (`backend/services/database.js`)
- Added conversation management functions:
  - `createConversation()` - Create new conversations
  - `getConversations()` - Get conversations for a user
  - `getConversation()` - Get specific conversation
  - `addMessageToConversation()` - Add messages to conversations
  - `getConversationMessages()` - Get messages for a conversation
  - `markConversationAsRead()` - Mark conversations as read

#### Webhook Handler (`backend/routes/webhooks.js`)
- Updated `handlePaymentIntentSucceeded()` to:
  - Extract player information from payment intent metadata
  - Create a conversation between player and coach
  - Add a welcome message to the conversation
  - Handle errors gracefully without failing the payment process

#### Payment Routes (`backend/routes/payments.js`)
- Updated payment intent creation to include player information
- Added `playerId` and `playerName` to payment intent metadata
- Updated both real and mock payment intents

#### New Conversations API (`backend/routes/conversations.js`)
- RESTful API endpoints for conversation management:
  - `GET /api/conversations/:userId/:userType` - Get user's conversations
  - `GET /api/conversations/:conversationId` - Get specific conversation
  - `GET /api/conversations/:conversationId/messages` - Get conversation messages
  - `POST /api/conversations/:conversationId/messages` - Send message
  - `POST /api/conversations/:conversationId/read` - Mark as read

### 3. Frontend Changes

#### Payment Service (`services/paymentService.js`)
- Updated to include player information in payment requests
- Added `playerId`, `playerName`, and `playerEmail` to payment data

#### Payment Screen (`screens/player/StripePaymentScreen.js`)
- Added placeholder player information to payment data
- TODO: Replace with actual user authentication data

#### New Conversation Service (`services/conversationService.js`)
- Complete service for interacting with conversations API
- Functions for getting conversations, sending messages, marking as read
- Data formatting utilities for display

## Setup Instructions

### 1. Database Setup

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(255) PRIMARY KEY,
  player_id VARCHAR(255) NOT NULL,
  coach_id VARCHAR(255) NOT NULL,
  coach_name VARCHAR(255) NOT NULL,
  sport VARCHAR(50) NOT NULL,
  session_id VARCHAR(255),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  player_unread_count INTEGER DEFAULT 0,
  coach_unread_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, coach_id, session_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) NOT NULL,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('player', 'coach', 'system')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_player_id ON conversations(player_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_id ON conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
```

### 2. Backend Setup

1. Restart your backend server to load the new routes
2. The new conversation API endpoints will be available at `/api/conversations/*`

### 3. Frontend Integration

To integrate the conversation system into your existing message screens:

1. Import the conversation service:
```javascript
import { getConversations, formatConversationForDisplay } from '../services/conversationService';
```

2. Replace mock data with real API calls:
```javascript
// In CoachesMessagesScreen.js and CoachFeedbackScreen.js
const [conversations, setConversations] = useState([]);

useEffect(() => {
  const loadConversations = async () => {
    try {
      const convos = await getConversations('coach_123', 'coach'); // Replace with actual coach ID
      const formattedConversations = convos.map(conv => formatConversationForDisplay(conv, 'coach'));
      setConversations(formattedConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };
  
  loadConversations();
}, []);
```

## Testing the Implementation

### 1. Test Payment Flow

1. Start your backend server
2. Navigate to a coach's payment screen in the app
3. Complete a payment (use test mode)
4. Check the backend logs for:
   - "Coaching session saved to database"
   - "DM conversation created"
   - "Welcome message added to conversation"

### 2. Test Database

Check your Supabase database for:
- New entry in `coaching_sessions` table
- New entry in `conversations` table
- New entry in `messages` table with welcome message

### 3. Test API Endpoints

```bash
# Get conversations for a player
curl http://localhost:3001/api/conversations/player_123/player

# Get conversations for a coach
curl http://localhost:3001/api/conversations/coach_123/coach

# Get messages for a conversation
curl http://localhost:3001/api/conversations/conv_1234567890_abc123/messages
```

## Current Limitations

1. **Player Authentication**: Currently using placeholder player IDs. Need to integrate with actual user authentication system.

2. **Message UI**: The existing message screens use mock data. Need to update them to use the real conversation API.

3. **Real-time Updates**: No real-time messaging implemented yet. Messages are fetched on demand.

4. **File Attachments**: Message system supports file types but no upload functionality implemented.

## Next Steps

1. **Integrate with Authentication**: Replace placeholder player IDs with actual user authentication
2. **Update Message Screens**: Replace mock data with real API calls in message screens
3. **Add Real-time Messaging**: Implement WebSocket or polling for real-time message updates
4. **Add File Upload**: Implement file attachment functionality for messages
5. **Add Push Notifications**: Notify users of new messages
6. **Add Message Status**: Show read receipts and message delivery status

## API Reference

### Conversations Endpoints

- `GET /api/conversations/:userId/:userType` - Get conversations for user
- `GET /api/conversations/:conversationId` - Get specific conversation
- `GET /api/conversations/:conversationId/messages` - Get conversation messages
- `POST /api/conversations/:conversationId/messages` - Send message
- `POST /api/conversations/:conversationId/read` - Mark as read

### Request/Response Examples

#### Get Conversations
```bash
GET /api/conversations/player_123/player
```

Response:
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_1234567890_abc123",
      "player_id": "player_123",
      "coach_id": "coach_456",
      "coach_name": "John Coach",
      "sport": "golf",
      "session_id": "session_1234567890_xyz789",
      "last_message": "🎉 Your coaching session with John Coach for golf has been activated!",
      "last_message_at": "2024-01-15T10:30:00Z",
      "player_unread_count": 0,
      "coach_unread_count": 1,
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Send Message
```bash
POST /api/conversations/conv_1234567890_abc123/messages
Content-Type: application/json

{
  "senderId": "player_123",
  "senderType": "player",
  "content": "Hello coach! I'm excited to start working with you.",
  "messageType": "text"
}
```

Response:
```json
{
  "success": true,
  "message": {
    "id": "msg_1234567890_def456",
    "conversation_id": "conv_1234567890_abc123",
    "sender_id": "player_123",
    "sender_type": "player",
    "content": "Hello coach! I'm excited to start working with you.",
    "message_type": "text",
    "metadata": {},
    "created_at": "2024-01-15T10:35:00Z"
  }
}
```
