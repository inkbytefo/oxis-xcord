const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Server = require('./Server');

const ServerMember = sequelize.define('ServerMember', {
  server_member_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id',
    },
  },
  server_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Server,
      key: 'server_id',
    },
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  role: {
    type: DataTypes.STRING, // e.g., 'admin', 'member'
  },
}, {
  tableName: 'server_members',
  timestamps: false,
});

ServerMember.belongsTo(User, { foreignKey: 'user_id' });
ServerMember.belongsTo(Server, { foreignKey: 'server_id' });

module.exports = ServerMember;
