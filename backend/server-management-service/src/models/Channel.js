import { v4 as uuidv4 } from 'uuid';

export class Channel {
  constructor(name, type = 'text', serverId) {
    this.id = uuidv4();
    this.name = name;
    this.type = type; // 'text' veya 'voice'
    this.serverId = serverId;
    this.permissions = {
      read: ['@everyone'], // Varsayılan olarak herkes okuyabilir
      write: ['@everyone'], // Varsayılan olarak herkes yazabilir
      manage: [] // Sadece yöneticiler düzenleyebilir
    };
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  setPermissions(permissionType, roles) {
    if (this.permissions.hasOwnProperty(permissionType)) {
      this.permissions[permissionType] = roles;
      this.updatedAt = new Date();
    }
  }

  hasPermission(userId, permissionType, userRoles) {
    if (!this.permissions.hasOwnProperty(permissionType)) {
      return false;
    }

    // '@everyone' rolü kontrolü
    if (this.permissions[permissionType].includes('@everyone')) {
      return true;
    }

    // Kullanıcının rollerinden herhangi biri izin listesinde var mı kontrol et
    return userRoles.some(role => this.permissions[permissionType].includes(role));
  }

  update(updates) {
    const allowedUpdates = ['name', 'type'];
    Object.keys(updates).forEach(update => {
      if (allowedUpdates.includes(update)) {
        this[update] = updates[update];
      }
    });
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      serverId: this.serverId,
      permissions: this.permissions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}