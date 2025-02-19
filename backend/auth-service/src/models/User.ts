import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { sequelize } from '../config/database';

// Type Definitions
type UserRole = 'user' | 'admin' | 'moderator';

// Interfaces
interface IUserAttributes {
  id: string;
  username: string;
  email: string;
  password?: string | null;
  roles: UserRole[];
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string | null;
  lastLogin?: Date | null;
  loginAttempts: number;
  lastFailedLogin?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  emailVerified: boolean;
  emailVerificationToken?: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  twoFactorBackupCodes: string[];
  refreshToken?: string | null;
  googleId?: string | null;
  githubId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  verifyTwoFactorToken(token: string): Promise<boolean>;
  generateTwoFactorSecret(): Promise<string>;
}

type UserCreationAttributes = Optional<IUserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

class User extends Model<IUserAttributes, UserCreationAttributes> implements IUserMethods {
  declare id: string;
  declare username: string;
  declare email: string;
  declare password: string | null;
  declare roles: UserRole[];
  declare isActive: boolean;
  declare isSuspended: boolean;
  declare suspensionReason: string | null;
  declare lastLogin: Date | null;
  declare loginAttempts: number;
  declare lastFailedLogin: Date | null;
  declare passwordResetToken: string | null;
  declare passwordResetExpires: Date | null;
  declare emailVerified: boolean;
  declare emailVerificationToken: string | null;
  declare twoFactorEnabled: boolean;
  declare twoFactorSecret: string | null;
  declare twoFactorBackupCodes: string[];
  declare refreshToken: string | null;
  declare googleId: string | null;
  declare githubId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt: Date | null;

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return this.password ? bcrypt.compare(candidatePassword, this.password) : false;
  }

  toJSON(): Partial<IUserAttributes> {
    const values = { ...this.get() };
    return {
      ...values,
      password: undefined,
      refreshToken: undefined,
      twoFactorSecret: undefined
    };
  }

  async verifyTwoFactorToken(token: string): Promise<boolean> {
    if (!this.twoFactorSecret) return false;
    return authenticator.verify({
      token,
      secret: this.twoFactorSecret
    });
  }

  async generateTwoFactorSecret(): Promise<string> {
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
    allowNull: true,
    validate: {
      len: [8, 100]
    }
  },
  roles: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: ['user'],
    validate: {
      isValidRole(value: string[]) {
        const validRoles: UserRole[] = ['user', 'admin', 'moderator'];
        if (!value.every(role => validRoles.includes(role as UserRole))) {
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
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  githubId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
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
    beforeSave: async (user: User) => {
      if (user.changed('password') && user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

interface ISessionAttributes {
  id: string;
  userId: string;
  token: string;
  userAgent?: string | null;
  ip?: string | null;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type SessionCreationAttributes = Optional<ISessionAttributes, 'id' | 'createdAt' | 'updatedAt'>;

class Session extends Model<ISessionAttributes, SessionCreationAttributes> {
  declare id: string;
  declare userId: string;
  declare token: string;
  declare userAgent: string | null;
  declare ip: string | null;
  declare expiresAt: Date;
  declare isRevoked: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

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
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
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

export { User, Session };
export type { IUserAttributes, IUserMethods, UserRole, ISessionAttributes };