import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';

class User extends Model {
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    delete values.refreshToken;
    delete values.twoFactorSecret;
    return values;
  }

  async verifyTwoFactorToken(token) {
    if (!this.twoFactorSecret) return false;
    const { authenticator } = await import('otplib');
    return authenticator.verify({
      token,
      secret: this.twoFactorSecret
    });
  }

  async generateTwoFactorSecret() {
    const { authenticator } = await import('otplib');
    return authenticator.generateSecret();
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true, // OAuth kullanıcıları için null olabilir
    validate: {
      len: [8, 100]
    }
  },
  roles: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: ['user'],
    validate: {
      isValidRole(value) {
        const validRoles = ['user', 'admin', 'moderator'];
        if (!value.every(role => validRoles.includes(role))) {
          throw new Error('Geçersiz rol');
        }
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isSuspended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  suspensionReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastFailedLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  twoFactorBackupCodes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  refreshToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // OAuth bağlantıları
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  githubId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  }
}, {
  sequelize,
  modelName: 'User',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['email'] },
    { unique: true, fields: ['username'] },
    { unique: true, fields: ['google_id'] },
    { unique: true, fields: ['github_id'] }
  ],
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password') && user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Sessions tablosu için model
class Session extends Model {}

Session.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'Session',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token'] }
  ]
});

User.hasMany(Session);
Session.belongsTo(User);

export { User, Session, sequelize };
