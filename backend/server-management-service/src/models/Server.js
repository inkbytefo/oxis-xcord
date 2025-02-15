import { v4 as uuidv4 } from 'uuid';

export class Server {
  constructor(name, ownerId) {
    this.id = uuidv4();
    this.name = name;
    this.ownerId = ownerId;
    this.channels = [];
    this.members = [{ userId: ownerId, role: 'owner' }];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  addChannel(channel) {
    this.channels.push(channel);
    this.updatedAt = new Date();
  }

  removeChannel(channelId) {
    this.channels = this.channels.filter(channel => channel.id !== channelId);
    this.updatedAt = new Date();
  }

  addMember(userId, role = 'member') {
    if (!this.members.find(member => member.userId === userId)) {
      this.members.push({ userId, role });
      this.updatedAt = new Date();
    }
  }

  removeMember(userId) {
    this.members = this.members.filter(member => member.userId !== userId);
    this.updatedAt = new Date();
  }

  updateMemberRole(userId, newRole) {
    const member = this.members.find(member => member.userId === userId);
    if (member) {
      member.role = newRole;
      this.updatedAt = new Date();
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      ownerId: this.ownerId,
      channels: this.channels,
      members: this.members,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}