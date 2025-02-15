# Development Guide

## Service Setup

### Prerequisites
- Node.js 18+ 
- MongoDB 
- Redis
- Docker (optional)

### Environment Setup
1. Clone the repository
2. Copy `.env.example` to `.env` in each service directory
3. Configure environment variables as needed
4. Install dependencies in each service: `npm install`

## Running Services

### Development Mode
Each service can be run individually in development mode:

```bash
cd backend/[service-name]
npm run dev
```

### Using Docker
```bash
docker-compose up
```

## Service-Specific Guidelines

### API Gateway (Port 3000)
- Entry point for all external requests
- Configure routes in `src/routes/`
- Add new service proxies in `src/config.js`

### Auth Service (Port 3001)
- Handles user authentication
- JWT token validation
- User management APIs
- Configure JWT settings in `.env`

### Messaging Service (Port 3002)

#### Setup
1. Configure environment variables:
   ```
   PORT=3002
   MONGODB_URI=mongodb://localhost:27017/messaging
   REDIS_URL=redis://localhost:6379
   ENCRYPTION_KEY=your-32-byte-key
   AUTH_SERVICE_URL=http://localhost:3001
   ```

2. Start dependencies:
   ```bash
   # Start MongoDB
   mongod

   # Start Redis
   redis-server
   ```

#### Features
- Real-time messaging using WebSocket
- Message encryption
- Room-based and direct messaging
- Message delivery status and read receipts

#### Development Guidelines

1. **WebSocket Events**
   - Use Socket.IO for real-time communication
   - Handle events in `socket.on()` handlers
   - Implement proper error handling
   - Use rate limiting for message sending

2. **Security**
   - All messages must be encrypted
   - Validate user authentication
   - Implement rate limiting
   - Sanitize user inputs

3. **Message Storage**
   - Use MongoDB for persistence
   - Use Redis for caching
   - Implement proper indexes
   - Handle large message volumes

4. **Testing**
   ```bash
   # Run tests
   npm test

   # Test WebSocket connections
   wscat -c ws://localhost:3002
   ```

#### Common Tasks

1. Implementing new message types:
   ```javascript
   // Add to messageSchema in models
   // Add validation in middleware
   // Add handler in socket events
   ```

2. Adding new API endpoints:
   ```javascript
   // Add validation middleware
   // Add rate limiting
   // Add route handler
   // Add error handling
   ```

3. Monitoring:
   - Check logs in `error.log` and `combined.log`
   - Monitor Redis memory usage
   - Check MongoDB performance

### Voice Service (Port 3003)

#### Setup
1. Configure environment variables:
   ```
   PORT=3003
   ```

2. Start the service:
   ```bash
   cd backend/voice-service
   npm install
   npm run dev
   ```

#### Features
- Real-time voice communication using WebRTC
- Peer-to-peer audio streaming
- Room-based user management
- Optimized audio quality:
  - Echo cancellation
  - Noise suppression
  - Auto gain control
  - High-quality audio settings (48kHz, 16-bit)

#### Development Guidelines

1. **WebRTC Integration**
   - Use Socket.IO for signaling
   - Handle peer connections with simple-peer
   - Manage room-based peer groups
   - Implement proper connection cleanup

2. **Audio Quality**
   - Configure audio constraints:
   ```javascript
   const audioConstraints = {
     echoCancellation: true,
     noiseSuppression: true,
     autoGainControl: true,
     channelCount: 1,
     sampleRate: 48000,
     sampleSize: 16
   };
   ```
   - Monitor audio stream quality
   - Handle audio device changes

3. **Connection Management**
   - Handle peer connection states
   - Implement reconnection logic
   - Clean up resources on disconnect
   - Monitor connection quality

4. **Testing Voice Features**
   ```bash
   # Run service tests
   npm test

   # Test WebRTC connection
   npm run test:webrtc

   # Monitor audio metrics
   npm run metrics
   ```

5. **Common Tasks**
   - Adding new room features:
   ```javascript
   // Add room management logic
   // Handle room events
   // Implement room state management
   ```
   
   - Implementing audio controls:
   ```javascript
   // Add mute/unmute functionality
   // Handle audio device selection
   // Implement volume controls
   ```

6. **Monitoring**
   - Check WebRTC connection stats
   - Monitor audio quality metrics
   - Track room participation
   - Log connection issues

7. **Security Considerations**
   - Validate room access
   - Secure WebRTC connections
   - Rate limit connection attempts
   - Implement proper authentication

### Server Management Service (Port 3004)
- Server provisioning
- Resource monitoring
- Configuration management

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run test:load
```

## Common Development Tasks

### Adding New Features
1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Create pull request

### Debugging
- Check service logs
- Use debugging tools
- Monitor service metrics
- Check error tracking

### Performance Optimization
- Use profiling tools
- Monitor database queries
- Optimize API responses
- Use caching effectively

## Best Practices

### Code Style
- Follow ESLint configuration
- Use TypeScript types
- Write clear comments
- Follow naming conventions

### API Design
- Use RESTful conventions
- Document all endpoints
- Include error responses
- Version APIs appropriately

### Security
- Validate all inputs
- Use proper authentication
- Implement rate limiting
- Follow security best practices

### Logging
- Use appropriate log levels
- Include relevant context
- Monitor error rates
- Rotate log files

## Deployment

### Staging
1. Build services
2. Run integration tests
3. Deploy to staging
4. Verify functionality

### Production
1. Create release
2. Update documentation
3. Deploy services
4. Monitor performance

## Troubleshooting

### Common Issues
1. Connection errors
   - Check service availability
   - Verify network settings
   - Check credentials

2. Performance issues
   - Monitor resource usage
   - Check database queries
   - Analyze API response times

3. Authentication problems
   - Verify JWT tokens
   - Check service configuration
   - Validate user credentials
