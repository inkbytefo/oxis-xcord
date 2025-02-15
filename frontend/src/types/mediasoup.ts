import { types as mediasoupTypes } from 'mediasoup-client';

export interface RouterCapabilities {
  routerRtpCapabilities: mediasoupTypes.RtpCapabilities;
}

export interface TransportParameters {
  id: string;
  iceParameters: mediasoupTypes.IceParameters;
  iceCandidates: mediasoupTypes.IceCandidate[];
  dtlsParameters: mediasoupTypes.DtlsParameters;
  consuming?: boolean;
}

export interface ProducerDetails {
  peerId: string;
  producerId: string;
  kind: mediasoupTypes.MediaKind;
  rtpParameters: mediasoupTypes.RtpParameters;
}

export interface ConsumerDetails {
  id: string;
  transportId: string;
  producerId: string;
  kind: mediasoupTypes.MediaKind;
  rtpParameters: mediasoupTypes.RtpParameters;
}

export interface PeerInfo {
  peerId: string;
}

export interface ProducedResponse {
  id: string;
}

// Socket Event Names and their corresponding data types
export interface SocketEvents {
  // Connection events
  connect: void;
  disconnect: void;

  // Incoming events (server to client)
  routerCapabilities: RouterCapabilities;
  webRtcTransportCreated: TransportParameters;
  newProducer: ProducerDetails;
  peerLeft: PeerInfo;
  produced: ProducedResponse;
  
  // Outgoing events (client to server)
  joinRoom: {
    roomId: string;
    rtpCapabilities?: mediasoupTypes.RtpCapabilities;
  };
  createWebRtcTransport: {
    roomId: string;
    consuming?: boolean;
  };
  connectTransport: {
    roomId: string;
    transportId: string;
    dtlsParameters: mediasoupTypes.DtlsParameters;
  };
  produce: {
    roomId: string;
    transportId: string;
    kind: mediasoupTypes.MediaKind;
    rtpParameters: mediasoupTypes.RtpParameters;
    appData?: Record<string, unknown>;
  };
  resumeConsumer: {
    roomId: string;
    consumerId: string;
  };
}

export type SocketEventMap = {
  [K in keyof SocketEvents]: SocketEvents[K] extends void
    ? () => void
    : (data: SocketEvents[K]) => void;
};

export interface Socket {
  emit<E extends keyof SocketEvents>(
    event: E,
    ...args: SocketEvents[E] extends void ? [] : [SocketEvents[E]]
  ): void;
  on<E extends keyof SocketEvents>(
    event: E,
    callback: SocketEvents[E] extends void ? () => void : (data: SocketEvents[E]) => void
  ): void;
  once<E extends keyof SocketEvents>(
    event: E,
    callback: SocketEvents[E] extends void ? () => void : (data: SocketEvents[E]) => void
  ): void;
  disconnect(): void;
  removeAllListeners(event?: keyof SocketEvents): void;
}

// Helper type to handle socket.io instance
export interface SocketIO extends Socket {
  connected: boolean;
  removeAllListeners(event?: string): this;
}

export function createSocket(url: string): SocketIO {
  const socket = io(url) as unknown as SocketIO;
  return socket;
}
