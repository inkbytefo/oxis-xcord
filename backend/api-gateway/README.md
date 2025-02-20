# API Gateway Service

A robust API Gateway service that handles routing, authentication, rate limiting, and other essential gateway functionalities for the XCord platform.

## Features

- **Routing & Load Balancing**
  - Dynamic service discovery and routing
  - Load balancing across service instances
  - WebSocket support for real-time services

- **Security**
  - JWT-based authentication
  - Role-based authorization
  - Rate limiting with Redis
  - CORS support
  - Security headers (Helmet)
  - Request size limits

- **Error Handling**
  - Centralized error handling
  - Custom error classes
  - Validation error formatting
  - Graceful error responses

- **Request Validation**
  - Request body validation
  - Parameter validation
  - Custom validation rules

## Configuration

The gateway can be configured using environment variables:

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-jwt-secret

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
MESSAGING_SERVICE_URL=http://localhost:3002
VOICE_SERVICE_URL=http://localhost:3003
SERVER_MANAGEMENT_SERVICE_URL=http://localhost:3004

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
CORS_ORIGIN=*
```

## API Routes

- `GET /health` - Health check endpoint
- `/auth/*` - Authentication service routes
- `/messages/*` - Messaging service routes (requires authentication)
- `/voice/*` - Voice service routes (requires authentication)
- `/servers/*` - Server management routes (requires authentication)

## Setup & Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example`

3. Start the service:
   ```bash
   npm start
   ```

## Development

1. Start in development mode:
   ```bash
   npm run dev
   ```

2. Run tests:
   ```bash
   npm test
   ```

## Architecture

The API Gateway follows a modular architecture:

- `middleware/` - Authentication, rate limiting, validation, and error handling
- `routes/` - Route definitions and proxy configurations
- `config/` - Configuration management
- `utils/` - Utility functions and error classes
- `types/` - TypeScript type definitions

## Error Handling

The gateway implements a comprehensive error handling system:

- Custom error classes for different scenarios
- Consistent error response format
- Development vs. production error details
- Request validation errors
- Service unavailability handling

## Monitoring & Logging

- Health check endpoint for monitoring
- Error logging
- Request/Response logging
- Performance metrics
