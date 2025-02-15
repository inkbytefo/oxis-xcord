import { Server } from '../models/Server.js';
import { Channel } from '../models/Channel.js';
import { User } from '../models/User.js';
import { ServerMember } from '../models/ServerMember.js';

export const serverController = {
    // Yeni sunucu oluştur
    createServer: async (req, res) => {
        try {
            const { name, ownerId } = req.body;

            if (!name || !ownerId) {
                return res.status(400).json({ error: 'Sunucu adı ve sahibi gereklidir' });
            }

            const server = await Server.create({ name, ownerId });

            // Varsayılan olarak 'genel' kanalı oluştur
            const generalChannel = await Channel.create({ name: 'genel', type: 'text', serverId: server.id });

            res.status(201).json(server);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Sunucu oluşturulurken bir hata oluştu' });
        }
    },

    // Sunucu listesini getir
    listServers: async (req, res) => {
        try {
            const { userId } = req.query;
            let servers;

            if (userId) {
                // Belirli bir kullanıcının sunucularını getir
                servers = await Server.findAll({
                    include: [{
                        model: ServerMember,
                        where: { userId: userId }
                    }]
                });

            } else {
                // Tüm sunucuları getir
                servers = await Server.findAll();
            }

            res.json(servers);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Sunucular listelenirken bir hata oluştu' });
        }
    },

    // Belirli bir sunucuyu getir
    getServer: async (req, res) => {
        try {
            const { serverId } = req.params;
            const server = await Server.findByPk(serverId);

            if (!server) {
                return res.status(404).json({ error: 'Sunucu bulunamadı' });
            }

            res.json(server);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Sunucu bilgileri alınırken bir hata oluştu' });
        }
    },

    // Sunucu güncelle
    updateServer: async (req, res) => {
        try {
            const { serverId } = req.params;
            const updates = req.body;

            const server = await Server.findByPk(serverId);

            if (!server) {
                return res.status(404).json({ error: 'Sunucu bulunamadı' });
            }

            await server.update(updates);

            res.json(server);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Sunucu güncellenirken bir hata oluştu' });
        }
    },

    // Sunucu sil
    deleteServer: async (req, res) => {
        try {
            const { serverId } = req.params;
            const { userId } = req.body; // Silme işlemini yapan kullanıcı

            const server = await Server.findByPk(serverId);

            if (!server) {
                return res.status(404).json({ error: 'Sunucu bulunamadı' });
            }

            // Sadece sunucu sahibi silebilir
            if (server.ownerId !== userId) {
                return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
            }

            await server.destroy();
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Sunucu silinirken bir hata oluştu' });
        }
    },

    // Üye ekle
    addMember: async (req, res) => {
        try {
            const { serverId } = req.params;
            const { userId, role = 'member' } = req.body;

            const server = await Server.findByPk(serverId);
            if (!server) {
                return res.status(404).json({ error: 'Sunucu bulunamadı' });
            }

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
            }

            await ServerMember.create({ serverId, userId, role });

            res.status(201).json({ message: "User added to server successfully." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Üye eklenirken bir hata oluştu' });
        }
    },

    // Üye çıkar
    removeMember: async (req, res) => {
        try {
            const { serverId } = req.params;
            const { userId } = req.body;

            const serverMember = await ServerMember.findOne({
                where: { serverId, userId }
            });

            if (!serverMember) {
                return res.status(404).json({ error: 'Sunucu üyesi bulunamadı' });
            }

            await serverMember.destroy();

            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Üye çıkarılırken bir hata oluştu' });
        }
    }
};
