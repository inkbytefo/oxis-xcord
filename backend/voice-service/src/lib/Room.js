import mediasoup from 'mediasoup';
import { config } from '../config.js';

export class Room {
  constructor(roomId, worker) {
    this.id = roomId;
    this.worker = worker;
    this.router = null;
    this.peers = new Map(); // socketId -> peer data
    this.transports = new Map(); // transportId -> transport
    this.producers = new Map(); // producerId -> producer
    this.consumers = new Map(); // consumerId -> consumer
  }

  async init() {
    this.router = await this.worker.createRouter({
      mediaCodecs: config.mediasoup.router.mediaCodecs
    });
    return this.router;
  }

  async createWebRtcTransport(socket) {
    const transport = await this.router.createWebRtcTransport(
      config.mediasoup.webRtcTransport
    );

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    transport.on('close', () => {
      console.log('Transport closed', { transportId: transport.id });
    });

    this.transports.set(transport.id, transport);
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  }

  async connectTransport(transportId, dtlsParameters) {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`Transport not found: ${transportId}`);
    await transport.connect({ dtlsParameters });
    return transport;
  }

  async produce(transportId, kind, rtpParameters, appData) {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`Transport not found: ${transportId}`);

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, streamId: appData.streamId }
    });

    producer.on('transportclose', () => {
      producer.close();
      this.producers.delete(producer.id);
    });

    this.producers.set(producer.id, producer);
    return producer;
  }

  async consume(transportId, producerId, rtpCapabilities) {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`Transport not found: ${transportId}`);

    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume');
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true // We always start paused
    });

    consumer.on('transportclose', () => {
      consumer.close();
      this.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      consumer.close();
      this.consumers.delete(consumer.id);
    });

    this.consumers.set(consumer.id, consumer);

    return {
      id: consumer.id,
      producerId: producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      producerPaused: consumer.producerPaused
    };
  }

  async handlePeerLeave(socketId) {
    const peer = this.peers.get(socketId);
    if (!peer) return;

    this.peers.delete(socketId);

    // Close transports
    for (const [transportId, transport] of this.transports) {
      if (transport.appData.socketId === socketId) {
        transport.close();
        this.transports.delete(transportId);
      }
    }
  }

  getPeers() {
    return Array.from(this.peers.values());
  }

  addPeer(socketId, peer) {
    this.peers.set(socketId, peer);
  }

  removePeer(socketId) {
    this.peers.delete(socketId);
  }

  async close() {
    this.producers.forEach(producer => producer.close());
    this.consumers.forEach(consumer => consumer.close());
    this.transports.forEach(transport => transport.close());
    this.peers.clear();
    if (this.router) {
      await this.router.close();
    }
  }
}
