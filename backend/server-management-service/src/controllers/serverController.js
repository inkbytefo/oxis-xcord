import { Server } from '../models/Server.js';
import { Channel } from '../models/Channel.js';
import { store } from '../models/Store.js';

export const serverController = {
  // Yeni sunucu oluştur
  createServer: (req, res) => {
    try {
      const { name, ownerId } = req.body;
      
      if (!name || !ownerId) {
        return res.status(400).json({ error: 'Sunucu adı ve sahibi gereklidir' });
      }

      const server = new Server(name, ownerId);
      
      // Varsayılan olarak 'genel' kanalı oluştur
      const generalChannel = new Channel('genel', 'text', server.id);
      server.addChannel(generalChannel);

      store.createServer(server);
      
      res.status(201).json(server.toJSON());
    } catch (error) {
      res.status(500).json({ error: 'Sunucu oluşturulurken bir hata oluştu' });
    }
  },

  // Sunucu listesini getir
  listServers: (req, res) => {
    try {
      const { userId } = req.query;
      let servers;

      if (userId) {
        // Belirli bir kullanıcının sunucularını getir
        servers = store.getUserServers(userId);
      } else {
        // Tüm sunucuları getir
        servers = store.listServers();
      }

      res.json(servers.map(server => server.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Sunucular listelenirken bir hata oluştu' });
    }
  },

  // Belirli bir sunucuyu getir
  getServer: (req, res) => {
    try {
      const { serverId } = req.params;
      const server = store.getServer(serverId);

      if (!server) {
        return res.status(404).json({ error: 'Sunucu bulunamadı' });
      }

      res.json(server.toJSON());
    } catch (error) {
      res.status(500).json({ error: 'Sunucu bilgileri alınırken bir hata oluştu' });
    }
  },

  // Sunucu güncelle
  updateServer: (req, res) => {
    try {
      const { serverId } = req.params;
      const updates = req.body;
      
      const server = store.updateServer(serverId, updates);
      
      if (!server) {
        return res.status(404).json({ error: 'Sunucu bulunamadı' });
      }

      res.json(server.toJSON());
    } catch (error) {
      res.status(500).json({ error: 'Sunucu güncellenirken bir hata oluştu' });
    }
  },

  // Sunucu sil
  deleteServer: (req, res) => {
    try {
      const { serverId } = req.params;
      const { userId } = req.body; // Silme işlemini yapan kullanıcı

      const server = store.getServer(serverId);
      
      if (!server) {
        return res.status(404).json({ error: 'Sunucu bulunamadı' });
      }

      // Sadece sunucu sahibi silebilir
      if (server.ownerId !== userId) {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      }

      store.deleteServer(serverId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Sunucu silinirken bir hata oluştu' });
    }
  },

  // Üye ekle
  addMember: (req, res) => {
    try {
      const { serverId } = req.params;
      const { userId, role = 'member' } = req.body;

      const success = store.addMember(serverId, userId, role);
      
      if (!success) {
        return res.status(404).json({ error: 'Sunucu bulunamadı' });
      }

      const server = store.getServer(serverId);
      res.json(server.toJSON());
    } catch (error) {
      res.status(500).json({ error: 'Üye eklenirken bir hata oluştu' });
    }
  },

  // Üye çıkar
  removeMember: (req, res) => {
    try {
      const { serverId } = req.params;
      const { userId } = req.body;

      const success = store.removeMember(serverId, userId);
      
      if (!success) {
        return res.status(404).json({ error: 'Sunucu bulunamadı' });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Üye çıkarılırken bir hata oluştu' });
    }
  }
};