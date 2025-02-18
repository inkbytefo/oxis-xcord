import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class ServerMember extends Model {}

ServerMember.init({
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Servers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'member'
  }
}, {
  sequelize,
  modelName: 'ServerMember',
  timestamps: true,
    indexes: [
    {
      unique: true,
      fields: ['serverId', 'userId']
    },
    // Performans için eklenen index
    {
      fields: ['userId', 'serverId']
    }
  ]
});

export { ServerMember, sequelize };
