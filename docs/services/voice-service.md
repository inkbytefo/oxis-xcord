# Ses Servisi (Voice Service)

## Genel Bakış

Voice Service, XCord platformunun gerçek zamanlı ses iletişimi özelliklerini sağlayan servistir. WebRTC teknolojisini kullanarak düşük gecikmeli, yüksek kaliteli ses iletişimi sunar.

## Özellikler

- Düşük gecikmeli ses iletişimi (<100ms)
- Ses odası yönetimi
- Otomatik eko engelleme
- Gürültü bastırma
- Otomatik kazanç kontrolü
- Ses aygıtı yönetimi
- Ses kalitesi optimizasyonu
- Bağlantı durumu izleme

## Teknik Detaylar

### WebRTC Yapılandırması

```javascript
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.xcord.app:3478' },
    {
      urls: 'turn:turn.xcord.app:3478',
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_PASSWORD
    }
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 10
};

const audioConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
  sampleSize: 16
};
```

### Oda Yönetimi

```typescript
interface Room {
  id: string;
  name: string;
  participants: Map<string, Participant>;
  maxParticipants: number;
  createdAt: Date;
  settings: {
    bitrate: number;
    codec: 'opus' | 'pcm';
    quality: 'low' | 'medium' | 'high';
  };
}

interface Participant {
  id: string;
  username: string;
  peer: RTCPeerConnection;
  stream: MediaStream;
  isMuted: boolean;
  isDeafened: boolean;
  joinedAt: Date;
  lastPing: Date;
}
```

### WebSocket Events

```typescript
// Client -> Server
interface ClientEvents {
  'voice:join': (data: {
    roomId: string;
    deviceId?: string;
  }) => void;
  
  'voice:leave': (data: {
    roomId: string;
  }) => void;
  
  'voice:mute': (data: {
    roomId: string;
    muted: boolean;
  }) => void;
}

// Server -> Client
interface ServerEvents {
  'voice:participant-joined': (data: {
    roomId: string;
    participant: Participant;
  }) => void;
  
  'voice:participant-left': (data: {
    roomId: string;
    participantId: string;
  }) => void;
  
  'voice:state-changed': (data: {
    roomId: string;
    participantId: string;
    state: {
      muted?: boolean;
      deafened?: boolean;
    };
  }) => void;
}
```

## Ses Kalitesi Optimizasyonu

### Kodek Ayarları

```javascript
const audioCodecs = [
  {
    name: 'opus',
    clockRate: 48000,
    channels: 1,
    params: {
      minptime: 10,
      maxptime: 60,
      stereo: 0,
      maxplaybackrate: 48000,
      maxaveragebitrate: 64000,
      useinbandfec: 1
    }
  }
];
```

### Kalite Profilleri

```javascript
const qualityProfiles = {
  low: {
    bitrate: 32000,
    sampleRate: 24000,
    stereo: false
  },
  medium: {
    bitrate: 64000,
    sampleRate: 48000,
    stereo: false
  },
  high: {
    bitrate: 128000,
    sampleRate: 48000,
    stereo: true
  }
};
```

## İzleme ve Metrikler

### WebRTC İstatistikleri

```javascript
async function collectStats(peer: RTCPeerConnection) {
  const stats = await peer.getStats();
  const metrics = {
    jitter: 0,
    packetsLost: 0,
    roundTripTime: 0,
    audioLevel: 0
  };

  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      metrics.jitter = report.jitter;
      metrics.packetsLost = report.packetsLost;
    }
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      metrics.roundTripTime = report.currentRoundTripTime;
    }
  });

  return metrics;
}
```

### Prometheus Metrikleri

```javascript
const metrics = {
  activeRooms: new Gauge({
    name: 'voice_active_rooms_total',
    help: 'Aktif ses odası sayısı'
  }),
  
  participants: new Gauge({
    name: 'voice_participants_total',
    help: 'Toplam katılımcı sayısı'
  }),
  
  connectionQuality: new Histogram({
    name: 'voice_connection_quality',
    help: 'Bağlantı kalitesi dağılımı',
    buckets: [0.1, 0.3, 0.5, 0.7, 0.9]
  })
};
```

## Hata Yönetimi

### Bağlantı Yeniden Deneme Stratejisi

```javascript
class ConnectionRetryStrategy {
  private maxRetries = 3;
  private backoffMs = 1000;

  async retry(fn: () => Promise<void>) {
    let attempts = 0;
    
    while (attempts < this.maxRetries) {
      try {
        await fn();
        return;
      } catch (error) {
        attempts++;
        if (attempts === this.maxRetries) throw error;
        
        await new Promise(resolve => 
          setTimeout(resolve, this.backoffMs * Math.pow(2, attempts))
        );
      }
    }
  }
}
```

### ICE Bağlantı Hata Yönetimi

```javascript
class IceConnectionManager {
  handleIceConnectionStateChange(peer: RTCPeerConnection) {
    peer.oniceconnectionstatechange = () => {
      switch (peer.iceConnectionState) {
        case 'failed':
          this.restartIce(peer);
          break;
        case 'disconnected':
          this.scheduleReconnect(peer);
          break;
      }
    };
  }

  private async restartIce(peer: RTCPeerConnection) {
    try {
      const offer = await peer.createOffer({ iceRestart: true });
      await peer.setLocalDescription(offer);
    } catch (error) {
      logger.error('ICE restart failed:', error);
    }
  }
}
```

## Geliştirme Kılavuzu

### Kurulum

```bash
cd backend/voice-service
npm install
```

### Ortam Değişkenleri

```env
NODE_ENV=development
PORT=3003
REDIS_URL=redis://localhost:6379
TURN_USERNAME=your_turn_username
TURN_PASSWORD=your_turn_password
METRICS_PORT=9090
```

### Test

```bash
# Birim testleri çalıştır
npm run test

# WebRTC testleri
npm run test:webrtc

# Yük testleri
npm run test:load
```

## Sorun Giderme

### Sık Karşılaşılan Sorunlar

1. **ICE Bağlantı Hataları**
   - STUN/TURN sunucu erişimini kontrol edin
   - Ağ güvenlik duvarı ayarlarını kontrol edin
   - UDP portlarının açık olduğunu doğrulayın

2. **Ses Kalitesi Sorunları**
   - Ağ bant genişliğini kontrol edin
   - CPU kullanımını kontrol edin
   - Ses aygıtı ayarlarını kontrol edin

3. **Bağlantı Kesintileri**
   - WebSocket bağlantı durumunu kontrol edin
   - ICE adaylarının başarıyla değişildiğini doğrulayın
   - Ağ kararlılığını kontrol edin

### Performans İyileştirme İpuçları

1. **Ağ Optimizasyonu**
   - UDP trafiğine öncelik verin
   - TURN sunucularını coğrafi olarak dağıtın
   - Bant genişliği kullanımını optimize edin

2. **Ses Kalitesi**
   - Opus codec parametrelerini ayarlayın
   - Gürültü bastırma seviyesini optimize edin
   - Otomatik kazanç kontrolünü hassas ayarlayın