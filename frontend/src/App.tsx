import React, { useState, useEffect, useRef } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import logger from './utils/logger';
import {
  RouterCapabilities,
  TransportParameters,
  ProducerDetails,
  PeerInfo,
  createSocket,
  SocketIO
} from './types/mediasoup';
import './App.css';

const SERVER_URL = 'http://localhost:3003';
const ROOM_ID = 'test-room';

interface DeviceState {
  loaded: boolean;
  device: mediasoupClient.Device | null;
  producing: boolean;
  consuming: boolean;
  producerId: string | null;
  consumers: Map<string, mediasoupClient.types.Consumer>;
}

function App() {
  const socketRef = useRef<SocketIO | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceState, setDeviceState] = useState<DeviceState>({
    loaded: false,
    device: null,
    producing: false,
    consuming: false,
    producerId: null,
    consumers: new Map()
  });
  const producerTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const consumerTransportRef = useRef<mediasoupClient.types.Transport | null>(null);

  useEffect(() => {
    const socket = createSocket(SERVER_URL);
    socketRef.current = socket;
    
    socket.on('connect', () => {
      logger.info('Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      logger.info('Disconnected from server');
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!isConnected || !socket) return;

    const initializeDevice = async () => {
      try {
        const device = new mediasoupClient.Device();
        
        // Join the room and get router RTP capabilities
        socket.emit('joinRoom', { roomId: ROOM_ID });
        
        socket.on('routerCapabilities', async (data: RouterCapabilities) => {
          await device.load({ routerRtpCapabilities: data.routerRtpCapabilities });
          setDeviceState(prev => ({ ...prev, loaded: true, device }));
          await createSendTransport();
        });

        socket.on('webRtcTransportCreated', async (params: TransportParameters) => {
          if (params.consuming) {
            await handleConsumerTransportCreated(params, device);
          } else {
            await handleProducerTransportCreated(params, device);
          }
        });

        socket.on('newProducer', async (params: ProducerDetails) => {
          await consumeStream(params.producerId, params.kind, params.rtpParameters);
        });

        socket.on('peerLeft', (params: PeerInfo) => {
          handlePeerLeave(params.peerId);
        });

      } catch (error) {
        logger.error('Failed to initialize device:', error);
      }
    };

    initializeDevice();

    // Cleanup event listeners when component unmounts or socket changes
    return () => {
      socket.removeAllListeners('routerCapabilities');
      socket.removeAllListeners('webRtcTransportCreated');
      socket.removeAllListeners('newProducer');
      socket.removeAllListeners('peerLeft');
    };
  }, [isConnected]);

  const createSendTransport = () => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit('createWebRtcTransport', {
      roomId: ROOM_ID,
      consuming: false
    });
  };

  const handleProducerTransportCreated = async (
    params: TransportParameters,
    device: mediasoupClient.Device
  ) => {
    const socket = socketRef.current;
    if (!socket) return;

    try {
      const transport = device.createSendTransport({
        id: params.id,
        iceParameters: params.iceParameters,
        iceCandidates: params.iceCandidates,
        dtlsParameters: params.dtlsParameters
      });

      transport.on('connect', ({ dtlsParameters }, callback) => {
        socket.emit('connectTransport', {
          roomId: ROOM_ID,
          transportId: transport.id,
          dtlsParameters
        });
        callback();
      });

      transport.on('produce', async ({ kind, rtpParameters, appData }, callback) => {
        try {
          socket.emit('produce', {
            roomId: ROOM_ID,
            transportId: transport.id,
            kind,
            rtpParameters,
            appData
          });

          socket.once('produced', ({ id }: { id: string }) => {
            callback({ id });
          });
        } catch (error) {
          logger.error('Failed to produce:', error);
        }
      });

      producerTransportRef.current = transport;
      await startStreaming(transport);

    } catch (error) {
      logger.error('Failed to create send transport:', error);
    }
  };

  const handleConsumerTransportCreated = async (
    params: TransportParameters,
    device: mediasoupClient.Device
  ) => {
    const socket = socketRef.current;
    if (!socket) return;

    try {
      const transport = device.createRecvTransport({
        id: params.id,
        iceParameters: params.iceParameters,
        iceCandidates: params.iceCandidates,
        dtlsParameters: params.dtlsParameters
      });

      transport.on('connect', ({ dtlsParameters }, callback) => {
        socket.emit('connectTransport', {
          roomId: ROOM_ID,
          transportId: transport.id,
          dtlsParameters
        });
        callback();
      });

      consumerTransportRef.current = transport;

    } catch (error) {
      logger.error('Failed to create receive transport:', error);
    }
  };

  const startStreaming = async (transport: mediasoupClient.types.Transport) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2,
          sampleRate: 48000,
          sampleSize: 16
        } as MediaTrackConstraints,
        video: false
      });

      const track = stream.getAudioTracks()[0];
      const producer = await transport.produce({
        track,
        codecOptions: {
          opusStereo: true,
          opusDtx: true
        }
      });

      setDeviceState(prev => ({
        ...prev,
        producing: true,
        producerId: producer.id
      }));

      producer.on('trackended', () => {
        logger.info('Track ended');
      });

    } catch (error) {
      logger.error('Failed to start streaming:', error);
    }
  };

  const consumeStream = async (
    producerId: string,
    kind: mediasoupClient.types.MediaKind,
    rtpParameters: mediasoupClient.types.RtpParameters
  ) => {
    const socket = socketRef.current;
    if (!socket || !consumerTransportRef.current || !deviceState.device) return;

    try {
      const consumer = await consumerTransportRef.current.consume({
        id: producerId,
        producerId,
        kind,
        rtpParameters
      });

      const mediaStream = new MediaStream();
      mediaStream.addTrack(consumer.track);

      const audioElement = new Audio();
      audioElement.srcObject = mediaStream;
      audioElement.play().catch((error) => logger.error('Failed to play audio:', error));

      setDeviceState(prev => {
        const newConsumers = new Map(prev.consumers);
        newConsumers.set(producerId, consumer);
        return { ...prev, consumers: newConsumers, consuming: true };
      });

      socket.emit('resumeConsumer', {
        roomId: ROOM_ID,
        consumerId: consumer.id
      });

    } catch (error) {
      logger.error('Failed to consume stream:', error);
    }
  };

  const handlePeerLeave = (peerId: string) => {
    setDeviceState(prev => {
      const newConsumers = new Map(prev.consumers);
      for (const [producerId, consumer] of newConsumers) {
        if ((consumer.appData as { peerId?: string }).peerId === peerId) {
          consumer.close();
          newConsumers.delete(producerId);
        }
      }
      return { ...prev, consumers: newConsumers };
    });
  };

  return (
    <div className="App">
      <h1>Voice Chat Room</h1>
      <div className="status">
        <p>Connection: {isConnected ? 'Connected' : 'Disconnected'}</p>
        <p>Device Loaded: {deviceState.loaded ? 'Yes' : 'No'}</p>
        <p>Producing: {deviceState.producing ? 'Yes' : 'No'}</p>
        <p>Consuming: {deviceState.consuming ? 'Yes' : 'No'}</p>
        <p>Active Consumers: {deviceState.consumers.size}</p>
      </div>
    </div>
  );
}

export default App;
