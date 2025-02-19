import { Sequelize } from 'sequelize';
import { config } from './index.js';

export const sequelize = new Sequelize(config.database.url, {
  ...config.database.options,
  logging: (msg: string) => {
    if (config.env === 'development') {
      console.log(msg);
    }
  },
  define: {
    underscored: true,
    timestamps: true,
    paranoid: true
  }
});