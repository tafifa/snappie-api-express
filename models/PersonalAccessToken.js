const { DataTypes, Model, Op } = require('sequelize');
const { sequelize } = require('../config/database');

class PersonalAccessToken extends Model {
  // Instance methods
  isValid() {
    // Laravel Sanctum doesn't have 'revoked' column, check only expiration
    return !this.expires_at || new Date() < this.expires_at;
  }

  markAsRevoked() {
    // Since Laravel Sanctum doesn't have 'revoked' column, we can delete the token
    return this.destroy();
  }

  // Static methods
  static async findByToken(token) {
    return await PersonalAccessToken.findOne({
      where: { token },
      include: [{
        association: 'user',
        required: true
      }]
    });
  }

  static async revokeAllUserTokens(userId) {
    // Since Laravel Sanctum doesn't have 'revoked' column, delete all user tokens
    return await PersonalAccessToken.destroy({
      where: { tokenable_id: userId, tokenable_type: 'App\\Models\\User' }
    });
  }

  static async createToken(user, name = 'API Token', abilities = ['*']) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex'); // Reduced from 40 to 32 bytes (64 chars)
    
    // Set expiration to 1 day (24 hours)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    
    return await PersonalAccessToken.create({
      tokenable_type: 'App\\Models\\User',
      tokenable_id: user.id,
      name,
      token,
      abilities: abilities.join(','),
      expires_at: expiresAt,
      last_used_at: new Date()
    });
  }
  
  // Revoke all other active tokens for this user (single session)
  static async revokeOtherTokens(userId, currentTokenId = null) {
    const whereClause = {
      tokenable_id: userId,
      tokenable_type: 'App\\Models\\User',
    };
    
    if (currentTokenId) {
      whereClause.id = { [Op.ne]: currentTokenId };
    }
    
    // Delete all other tokens for this user
    return await PersonalAccessToken.destroy({
      where: whereClause
    });
  }
  
  // Check if user has any active session
  static async hasActiveSession(userId) {
    return await PersonalAccessToken.findOne({
      where: {
        tokenable_id: userId,
        tokenable_type: 'App\\Models\\User',
        expires_at: {
          [Op.gt]: new Date()
        }
      }
    });
  }
}

// Define the model
PersonalAccessToken.init({
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  tokenable_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tokenable_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  abilities: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Note: Laravel Sanctum doesn't have 'revoked' column, it uses timestamps for management
}, {
  sequelize,
  modelName: 'PersonalAccessToken',
  tableName: 'personal_access_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['token']
    },
    {
      fields: ['tokenable_type', 'tokenable_id']
    }
  ]
});

// Associations
PersonalAccessToken.associate = (models) => {
  PersonalAccessToken.belongsTo(models.User, {
    foreignKey: 'tokenable_id',
    constraints: false,
    as: 'user',
    scope: {
      tokenable_type: 'App\\Models\\User'
    }
  });
};

module.exports = PersonalAccessToken;