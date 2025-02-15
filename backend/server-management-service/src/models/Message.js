const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Channel = require('./Channel');

const Message = sequelize.define('Message', {
  message_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  channel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Channel,
      key: 'channel_id',
    },
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id',
    },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sent_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'messages',
  timestamps: false,
});

Message.belongsTo(Channel, { foreignKey: 'channel_id' });
Message.belongsTo(User, { foreignKey: 'sender_id' });

module.exports = Message;
