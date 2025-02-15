# Messaging Service Documentation

## Overview
The messaging service provides real-time messaging capabilities with secure message handling, delivery status tracking, and message history management.

## Features
- Real-time WebSocket messaging
- Room-based messaging
- Direct messaging between users
- Message encryption
- Read receipts and delivery status
- Message history with pagination
- Rate limiting and security measures

## Technical Details

### Authentication
- Uses JWT tokens for authentication
- Integrates with auth-service for token verification
- Required for all WebSocket connections and API endpoints

### Message Security
- End-to-end encryption using AES-256-GCM
- Secure key management via environment variables
- Input validation for all messages
- Rate limiting to prevent abuse

### Message Storage
- MongoDB for persistent storage
- Redis for message caching
- Encrypted message content
- Status tracking for delivery and read receipts

## WebSocket Events

### Client to Server

1. `join_room`
   - Parameters: `room` (string)
   - Joins a specific chat room
   - Automatically marks messages as delivered

2. `leave_room`
   - Parameters: `room` (string)
   - Leaves a chat room

3. `send_message`
   - Parameters:
     ```json
     {
       "content": "message text",
       "receiver": "userId or null for room messages",
       "room": "roomId or null for direct messages"
     }
     ```
   - Sends a new message
   - Messages are automatically encrypted

4. `mark_as_read`
   - Parameters: `messageId` (string)
   - Marks a message as read
   - Triggers read receipt notifications

### Server to Client

1. `new_message`
   - Emitted when a new message is received
   - Includes encrypted message content and metadata

2. `message_read`
   - Emitted when a message is read
   - Includes messageId, userId, and timestamp

3. `error`
   - Emitted when an error occurs
   - Includes error message

## REST API Endpoints

### GET `/api/messages/:room`
Retrieves messages for a room with pagination.

Parameters:
- `room`: Room ID (path parameter)
- `page`: Page number (query parameter, default: 1)
- `limit`: Messages per page (query parameter, default: 50)

Response:
```json
{
  "messages": [
    {
      "id": "messageId",
      "content": "decrypted message",
      "sender": "userId",
      "timestamp": "ISO date",
      "status": "sent|delivered|read",
      "readBy": [
        {
          "userId": "userId",
          "timestamp": "ISO date"
        }
      ],
      "deliveredTo": [
        {
          "userId": "userId",
          "timestamp": "ISO date"
        }
      ]
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 10,
    "total": 495
  }
}
```

### GET `/api/messages/direct/:sender/:receiver`
Retrieves direct messages between two users.

Parameters:
- `sender`: Sender user ID
- `receiver`: Receiver user ID

Response: Same as room messages.

### POST `/api/messages/:messageId/read`
Marks a message as read.

Parameters:
- `messageId`: Message ID to mark as read

Response:
```json
{
  "status": "success"
}
```

## Environment Variables

```env
PORT=3002
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/messaging

# Redis
REDIS_URL=redis://localhost:6379

# Security
ENCRYPTION_KEY=your-32-byte-encryption-key
JWT_SECRET=your-jwt-secret

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001

# Rate Limiting
MAX_MESSAGES_PER_MINUTE=30
RATE_LIMIT_WINDOW_MS=60000
```

## Rate Limiting

- WebSocket messages: 30 messages per minute per user
- API endpoints: 30 requests per minute per user
- Separate limits for room and direct messages
- Configurable via environment variables

## Error Handling

- All errors are logged with Winston
- WebSocket errors emitted to client
- HTTP errors return appropriate status codes
- Encrypted error messages for security

## Dependencies

- express: Web framework
- socket.io: WebSocket server
- mongoose: MongoDB ODM
- redis: Redis client
- express-validator: Input validation
- winston: Logging
