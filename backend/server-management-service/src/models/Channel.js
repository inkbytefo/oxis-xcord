const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Server = require('./Server');

const Channel = sequelize.define('Channel', {
  channel_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  server_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Server,
      key: 'server_id',
    },
  },
  channel_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  channel_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  topic: {
    type: DataTypes.TEXT,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  },
}, {
  tableName: 'channels',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
});

Channel.belongsTo(Server, { foreignKey: 'server_id' });

module.exports.Channel = Channel;
module.exports = Channel;
