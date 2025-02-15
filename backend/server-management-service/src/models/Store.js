export class Store {
  constructor() {
    this.servers = new Map();
  }

  // Sunucu işlemleri
  createServer(server) {
    this.servers.set(server.id, server);
    return server;
  }

  getServer(serverId) {
    return this.servers.get(serverId);
  }

  listServers() {
    return Array.from(this.servers.values());
  }

  updateServer(serverId, updates) {
    const server = this.servers.get(serverId);
    if (server) {
      Object.assign(server, updates);
      server.updatedAt = new Date();
      return server;
    }
    return null;
  }

  deleteServer(serverId) {
    return this.servers.delete(serverId);
  }

  // Kanal işlemleri
  addChannel(serverId, channel) {
    const server = this.servers.get(serverId);
    if (server) {
      server.addChannel(channel);
      return channel;
    }
    return null;
  }

  getChannel(serverId, channelId) {
    const server = this.servers.get(serverId);
    if (server) {
      return server.channels.find(channel => channel.id === channelId);
    }
    return null;
  }

  updateChannel(serverId, channelId, updates) {
    const server = this.servers.get(serverId);
    if (server) {
      const channel = server.channels.find(channel => channel.id === channelId);
      if (channel) {
        channel.update(updates);
        return channel;
      }
    }
    return null;
  }

  deleteChannel(serverId, channelId) {
    const server = this.servers.get(serverId);
    if (server) {
      server.removeChannel(channelId);
      return true;
    }
    return false;
  }

  // Üye işlemleri
  addMember(serverId, userId, role = 'member') {
    const server = this.servers.get(serverId);
    if (server) {
      server.addMember(userId, role);
      return true;
    }
    return false;
  }

  removeMember(serverId, userId) {
    const server = this.servers.get(serverId);
    if (server) {
      server.removeMember(userId);
      return true;
    }
    return false;
  }

  updateMemberRole(serverId, userId, newRole) {
    const server = this.servers.get(serverId);
    if (server) {
      server.updateMemberRole(userId, newRole);
      return true;
    }
    return false;
  }

  // Sunucu arama
  findServersByName(name) {
    return Array.from(this.servers.values())
      .filter(server => server.name.toLowerCase().includes(name.toLowerCase()));
  }

  // Kullanıcının üye olduğu sunucuları bulma
  getUserServers(userId) {
    return Array.from(this.servers.values())
      .filter(server => server.members.some(member => member.userId === userId));
  }
}

// Singleton store instance
export const store = new Store();