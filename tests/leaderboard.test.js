const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');
const User = require('../models/User');

describe('Leaderboard Endpoints', () => {
  let testUsers = [];
  let authToken;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.destroy({ where: { email: { [require('sequelize').Op.like]: 'testuser%@example.com' } } });

    // Create multiple test users with different stats
    const usersData = [
      {
        name: 'Test User 1',
        username: 'testuser1',
        email: 'testuser1@example.com',
        password: 'password123',
        totalExp: 1000,
        totalCoin: 500,
        totalCheckin: 10,
        totalReview: 5,
        totalPost: 3
      },
      {
        name: 'Test User 2',
        username: 'testuser2',
        email: 'testuser2@example.com',
        password: 'password123',
        totalExp: 1500,
        totalCoin: 750,
        totalCheckin: 15,
        totalReview: 8,
        totalPost: 5
      },
      {
        name: 'Test User 3',
        username: 'testuser3',
        email: 'testuser3@example.com',
        password: 'password123',
        totalExp: 800,
        totalCoin: 400,
        totalCheckin: 8,
        totalReview: 3,
        totalPost: 2
      }
    ];

    for (const userData of usersData) {
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testUsers.push(registerResponse.body.data.user);

      // Update user stats directly in database
      await User.update({
        totalExp: userData.totalExp,
        totalCoin: userData.totalCoin,
        totalCheckin: userData.totalCheckin,
        totalReview: userData.totalReview,
        totalPost: userData.totalPost
      }, {
        where: { id: registerResponse.body.data.user.id }
      });
    }

    // Get auth token from first user
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: usersData[0].email,
        password: usersData[0].password
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.destroy({ where: { email: { [require('sequelize').Op.like]: 'testuser%@example.com' } } });
    await sequelize.close();
  });

  describe('GET /api/v1/leaderboard/top-users', () => {
    it('should get top users by totalExp', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'totalExp', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.users[0]).toHaveProperty('id');
      expect(response.body.data.users[0]).toHaveProperty('name');
      expect(response.body.data.users[0]).toHaveProperty('username');
      expect(response.body.data.users[0]).toHaveProperty('imageUrl');
      expect(response.body.data.users[0]).toHaveProperty('totalExp');
      expect(response.body.data.users[0]).toHaveProperty('rank');

      // Check if users are sorted by totalExp in descending order
      for (let i = 0; i < response.body.data.users.length - 1; i++) {
        expect(response.body.data.users[i].totalExp).toBeGreaterThanOrEqual(
          response.body.data.users[i + 1].totalExp
        );
      }
    });

    it('should get top users by totalCoin', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'totalCoin', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users[0]).toHaveProperty('totalCoin');

      // Check if users are sorted by totalCoin in descending order
      for (let i = 0; i < response.body.data.users.length - 1; i++) {
        expect(response.body.data.users[i].totalCoin).toBeGreaterThanOrEqual(
          response.body.data.users[i + 1].totalCoin
        );
      }
    });

    it('should get top users by totalCheckin', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'totalCheckin', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users[0]).toHaveProperty('totalCheckin');

      // Check if users are sorted by totalCheckin in descending order
      for (let i = 0; i < response.body.data.users.length - 1; i++) {
        expect(response.body.data.users[i].totalCheckin).toBeGreaterThanOrEqual(
          response.body.data.users[i + 1].totalCheckin
        );
      }
    });

    it('should get top users by totalReview', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'totalReview', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users[0]).toHaveProperty('totalReview');

      // Check if users are sorted by totalReview in descending order
      for (let i = 0; i < response.body.data.users.length - 1; i++) {
        expect(response.body.data.users[i].totalReview).toBeGreaterThanOrEqual(
          response.body.data.users[i + 1].totalReview
        );
      }
    });

    it('should get top users by totalPost', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'totalPost', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users[0]).toHaveProperty('totalPost');

      // Check if users are sorted by totalPost in descending order
      for (let i = 0; i < response.body.data.users.length - 1; i++) {
        expect(response.body.data.users[i].totalPost).toBeGreaterThanOrEqual(
          response.body.data.users[i + 1].totalPost
        );
      }
    });

    it('should return error for invalid metric', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'invalidMetric', limit: 5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid metric');
    });

    it('should use default limit when not specified', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'totalExp' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBeLessThanOrEqual(10); // Default limit is 10
    });

    it('should respect custom limit', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'totalExp', limit: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBeLessThanOrEqual(2);
    });

    it('should return error for invalid limit', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'totalExp', limit: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error for limit exceeding maximum', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .query({ metric: 'totalExp', limit: 101 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('maksimal');
    });

    it('should return error when metric is missing', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/top-users')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('metric');
    });
  });

  describe('GET /api/v1/leaderboard/categories', () => {
    it('should get leaderboard categories', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toBeInstanceOf(Array);
      expect(response.body.data.categories.length).toBeGreaterThan(0);

      // Check if all expected categories are present
      const categories = response.body.data.categories;
      const categoryNames = categories.map(cat => cat.key);

      expect(categoryNames).toContain('totalExp');
      expect(categoryNames).toContain('totalCoin');
      expect(categoryNames).toContain('totalCheckin');
      expect(categoryNames).toContain('totalReview');
      expect(categoryNames).toContain('totalPost');

      // Check category structure
      categories.forEach(category => {
        expect(category).toHaveProperty('key');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('icon');
      });
    });

    it('should return categories with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/leaderboard/categories')
        .expect(200);

      const categories = response.body.data.categories;
      const expCategory = categories.find(cat => cat.key === 'totalExp');

      expect(expCategory).toBeDefined();
      expect(expCategory.name).toBe('Total Experience');
      expect(expCategory.description).toContain('experience');
      expect(expCategory.icon).toBeDefined();
    });
  });
});