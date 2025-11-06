const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Place = require('./Place');
const Article = require('./Article');
const Post = require('./Post');
const Review = require('./Review');
const Checkin = require('./Checkin');
const UserFollow = require('./UserFollow');
const UserLike = require('./UserLike');
const UserComment = require('./UserComment');
const CoinTransaction = require('./CoinTransaction');
const ExpTransaction = require('./ExpTransaction');
const Achievement = require('./Achievement');
const Challenge = require('./Challenge');
const Reward = require('./Reward');
const UserAchievement = require('./UserAchievement');
const UserChallenge = require('./UserChallenge');
const UserReward = require('./UserReward');
const Leaderboard = require('./Leaderboard');
const PersonalAccessToken = require('./PersonalAccessToken');

// Create models object
const models = {
  User,
  Place,
  Article,
  Post,
  Review,
  Checkin,
  UserFollow,
  UserLike,
  UserComment,
  CoinTransaction,
  ExpTransaction,
  Achievement,
  Challenge,
  Reward,
  UserAchievement,
  UserChallenge,
  UserReward,
  Leaderboard,
  PersonalAccessToken,
  sequelize
};

// Initialize associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;