import { Channel } from '../models/Channel.js';
import { Server } from '../models/Server.js';

export const channelController = {
    // Yeni kanal oluştur
    createChannel: async (req, res) => {
        try {
            const { serverId } = req.params;
            const { name, type = 'text' } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Kanal adı gereklidir' });
            }

            const server = await Server.findByPk(serverId);
            if (!server) {
                return res.status(404).json({ error: 'Sunucu bulunamadı' });
            }

            const channel = await Channel.create({ name, type, serverId });

            res.status(201).json(channel);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Kanal oluşturulurken bir hata oluştu' });
        }
    },

    // Sunucudaki kanalları listele
    listChannels: async (req, res) => {
        try {
            const { serverId } = req.params;

            const channels = await Channel.findAll({ where: { serverId } });

            res.json(channels);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Kanallar listelenirken bir hata oluştu' });
        }
    },

    // Belirli bir kanalı getir
    getChannel: async (req, res) => {
        try {
            const { serverId, channelId } = req.params;
            const channel = await Channel.findOne({ where: { id: channelId, serverId } });

            if (!channel) {
                return res.status(404).json({ error: 'Kanal bulunamadı' });
            }

            res.json(channel);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Kanal bilgileri alınırken bir hata oluştu' });
        }
    },

    // Kanal güncelle
    updateChannel: async (req, res) => {
        try {
            const { serverId, channelId } = req.params;
            const updates = req.body;

            const channel = await Channel.findOne({ where: { id: channelId, serverId } });

            if (!channel) {
                return res.status(404).json({ error: 'Kanal bulunamadı' });
            }

            await channel.update(updates);

            res.json(channel);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Kanal güncellenirken bir hata oluştu' });
        }
    },

    // Kanal sil
    deleteChannel: async (req, res) => {
        try {
            const { serverId, channelId } = req.params;
            const channel = await Channel.findOne({ where: { id: channelId, serverId } });

            if (!channel) {
                return res.status(404).json({ error: 'Kanal bulunamadı' });
            }

            await channel.destroy();
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Kanal silinirken bir hata oluştu' });
        }
    },
};
