import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class ServerMember extends Model {}

ServerMember.init({
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'servers',
      key: 'server_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'member'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  modelName: 'ServerMember',
  tableName: 'server_members',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['serverId', 'userId']
    },
    // Performance index
    {
      fields: ['userId', 'serverId']
    }
  ]
});

export { ServerMember };
