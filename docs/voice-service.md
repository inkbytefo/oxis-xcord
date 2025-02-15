# Voice Service Documentation

The Voice Service is responsible for handling real-time audio communication using WebRTC technology through mediasoup. It provides high-quality audio streaming with features like noise suppression and room management.

## Features

- Real-time audio communication using WebRTC
- Noise suppression and audio optimization
- Multi-room support
- Scalable architecture with multiple mediasoup workers
- Structured logging and error handling
- Automatic cleanup of empty rooms
- Graceful shutdown management

## Architecture

The service uses a modular architecture with the following components:

- `Room`: Manages individual voice rooms and their participants
- `RoomManager`: Handles multiple rooms and worker allocation
- `mediasoup`: Provides WebRTC capabilities and audio optimization
- `Socket.IO`: Handles real-time signaling between clients

### Audio Quality Settings

The service is configured to provide high-quality audio with the following optimizations:

- Opus codec with 48kHz sampling rate
- Stereo support
- Built-in noise suppression
- Adaptive bitrate (48-128 kbps)
- Forward Error Correction (FEC)
- Discontinuous Transmission (DTX) for bandwidth efficiency

## WebSocket Events

### Client to Server

- `joinRoom`: Join a voice room
  ```typescript
  socket.emit('joinRoom', {
    roomId: string,
    rtpCapabilities: RtpCapabilities
  });
  ```

- `createWebRtcTransport`: Request WebRTC transport creation
  ```typescript
  socket.emit('createWebRtcTransport', {
    roomId: string,
    consuming: boolean
  });
  ```

- `connectTransport`: Connect WebRTC transport
  ```typescript
  socket.emit('connectTransport', {
    roomId: string,
    transportId: string,
    dtlsParameters: DtlsParameters
  });
  ```

- `produce`: Start producing audio
  ```typescript
  socket.emit('produce', {
    roomId: string,
    transportId: string,
    kind: 'audio',
    rtpParameters: RtpParameters,
    appData: any
  });
  ```

- `consume`: Start consuming audio from a producer
  ```typescript
  socket.emit('consume', {
    roomId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities
  });
  ```

- `resumeConsumer`: Resume a paused consumer
  ```typescript
  socket.emit('resumeConsumer', {
    roomId: string,
    consumerId: string
  });
  ```

### Server to Client

- `peerJoined`: New peer joined the room
- `routerCapabilities`: Router RTP capabilities
- `webRtcTransportCreated`: Transport created successfully
- `transportConnected`: Transport connection established
- `produced`: Audio production started
- `newProducer`: New audio producer available
- `consumed`: Audio consumption started
- `consumerResumed`: Consumer resumed
- `peerLeft`: Peer left the room
- `error`: Error notification

## Environment Configuration

The service can be configured through environment variables:

```env
PORT=3003
NODE_ENV=development
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
MEDIASOUP_LISTEN_IP=127.0.0.1
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=49999
AUDIO_MAX_BITRATE=128000
AUDIO_MIN_BITRATE=48000
MEDIASOUP_NUM_WORKERS=4
```

## Error Handling

The service implements comprehensive error handling:

- Socket event errors are caught and logged
- Failed connections trigger cleanup
- Worker failures trigger graceful shutdown
- All errors are logged with context

## Scaling Considerations

The service is designed to scale horizontally:

- Multiple mediasoup workers for CPU distribution
- Room-based architecture for easy sharding
- Stateless design (except for active room state)
- Configurable worker count based on hardware

## Best Practices

1. Always handle disconnect events properly
2. Implement client-side reconnection logic
3. Use error events for user feedback
4. Monitor room lifecycle events
5. Implement proper cleanup on the client side

## Monitoring

The service provides logging at multiple levels:

- Info: Connection events, room creation/deletion
- Debug: Transport and media events
- Error: Failed operations, worker issues
- Warn: Non-critical issues

Logs are written to:
- Console (development)
- Files (production)
  - error.log: Error-level messages
  - combined.log: All messages
  - exceptions.log: Uncaught exceptions
