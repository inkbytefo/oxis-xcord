import { Channel } from '../models/Channel.js';
import { store } from '../models/Store.js';

export const channelController = {
  // Yeni kanal oluştur
  createChannel: (req, res) => {
    try {
      const { serverId } = req.params;
      const { name, type = 'text' } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Kanal adı gereklidir' });
      }

      const server = store.getServer(serverId);
      if (!server) {
        return res.status(404).json({ error: 'Sunucu bulunamadı' });
      }

      const channel = new Channel(name, type, serverId);
      const result = store.addChannel(serverId, channel);

      if (!result) {
        return res.status(500).json({ error: 'Kanal oluşturulamadı' });
      }

      res.status(201).json(channel.toJSON());
    } catch (error) {
      res.status(500).json({ error: 'Kanal oluşturulurken bir hata oluştu' });
    }
  },

  // Sunucudaki kanalları listele
  listChannels: (req, res) => {
    try {
      const { serverId } = req.params;
      const server = store.getServer(serverId);

      if (!server) {
        return res.status(404).json({ error: 'Sunucu bulunamadı' });
      }

      res.json(server.channels.map(channel => channel.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Kanallar listelenirken bir hata oluştu' });
    }
  },

  // Belirli bir kanalı getir
  getChannel: (req, res) => {
    try {
      const { serverId, channelId } = req.params;
      const channel = store.getChannel(serverId, channelId);

      if (!channel) {
        return res.status(404).json({ error: 'Kanal bulunamadı' });
      }

      res.json(channel.toJSON());
    } catch (error) {
      res.status(500).json({ error: 'Kanal bilgileri alınırken bir hata oluştu' });
    }
  },

  // Kanal güncelle
  updateChannel: (req, res) => {
    try {
      const { serverId, channelId } = req.params;
      const updates = req.body;

      const channel = store.updateChannel(serverId, channelId, updates);
      
      if (!channel) {
        return res.status(404).json({ error: 'Kanal bulunamadı' });
      }

      res.json(channel.toJSON());
    } catch (error) {
      res.status(500).json({ error: 'Kanal güncellenirken bir hata oluştu' });
    }
  },

  // Kanal sil
  deleteChannel: (req, res) => {
    try {
      const { serverId, channelId } = req.params;
      const success = store.deleteChannel(serverId, channelId);

      if (!success) {
        return res.status(404).json({ error: 'Kanal bulunamadı' });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Kanal silinirken bir hata oluştu' });
    }
  },

  // Kanal izinlerini güncelle
  updateChannelPermissions: (req, res) => {
    try {
      const { serverId, channelId } = req.params;
      const { permissionType, roles } = req.body;

      if (!permissionType || !Array.isArray(roles)) {
        return res.status(400).json({ error: 'Geçersiz izin parametreleri' });
      }

      const channel = store.getChannel(serverId, channelId);
      
      if (!channel) {
        return res.status(404).json({ error: 'Kanal bulunamadı' });
      }

      channel.setPermissions(permissionType, roles);
      res.json(channel.toJSON());
    } catch (error) {
      res.status(500).json({ error: 'Kanal izinleri güncellenirken bir hata oluştu' });
    }
  },

  // Kanal iznini kontrol et
  checkPermission: (req, res) => {
    try {
      const { serverId, channelId } = req.params;
      const { userId, permissionType } = req.query;

      if (!userId || !permissionType) {
        return res.status(400).json({ error: 'Kullanıcı ID ve izin tipi gereklidir' });
      }

      const server = store.getServer(serverId);
      if (!server) {
        return res.status(404).json({ error: 'Sunucu bulunamadı' });
      }

      const channel = store.getChannel(serverId, channelId);
      if (!channel) {
        return res.status(404).json({ error: 'Kanal bulunamadı' });
      }

      const member = server.members.find(m => m.userId === userId);
      if (!member) {
        return res.status(403).json({ error: 'Kullanıcı bu sunucunun üyesi değil' });
      }

      const hasPermission = channel.hasPermission(userId, permissionType, [member.role]);
      res.json({ hasPermission });
    } catch (error) {
      res.status(500).json({ error: 'İzin kontrolü yapılırken bir hata oluştu' });
    }
  }
};