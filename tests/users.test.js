const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');
const User = require('../models/User');

describe('Users Endpoints', () => {
  let testUser;
  let authToken;
  let testUser2;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.destroy({ where: { email: 'testuser@example.com' } });
    await User.destroy({ where: { email: 'testuser2@example.com' } });

    // Create test user
    const userData = {
      name: 'Test User',
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);

    testUser = registerResponse.body.data.user;
    authToken = registerResponse.body.data.token;

    // Create second test user
    const userData2 = {
      name: 'Test User 2',
      username: 'testuser2',
      email: 'testuser2@example.com',
      password: 'password123'
    };

    const registerResponse2 = await request(app)
      .post('/api/v1/auth/register')
      .send(userData2);

    testUser2 = registerResponse2.body.data.user;
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.destroy({ where: { email: 'testuser@example.com' } });
    await User.destroy({ where: { email: 'testuser2@example.com' } });
    await sequelize.close();
  });

  describe('GET /api/v1/users/search', () => {
    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'Test User' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.users[0]).toHaveProperty('id');
      expect(response.body.data.users[0]).toHaveProperty('name');
      expect(response.body.data.users[0]).toHaveProperty('username');
    });

    it('should search users by username', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'testuser' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'nonexistentuser' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBe(0);
    });

    it('should return error for missing query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('query');
    });

    it('should limit search results', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'Test', limit: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should get user by valid ID', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUser.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id', testUser.id);
      expect(response.body.data.user).toHaveProperty('name');
      expect(response.body.data.user).toHaveProperty('username');
      expect(response.body.data.user).toHaveProperty('imageUrl');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('email');
    });

    it('should return error for non-existent user ID', async () => {
      const response = await request(app)
        .get('/api/v1/users/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/profile', () => {
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id', testUser.id);
      expect(response.body.data.user).toHaveProperty('name');
      expect(response.body.data.user).toHaveProperty('username');
      expect(response.body.data.user).toHaveProperty('email');
      expect(response.body.data.user).toHaveProperty('imageUrl');
      expect(response.body.data.user).toHaveProperty('totalExp');
      expect(response.body.data.user).toHaveProperty('totalCoin');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Test User',
        username: 'updatedtestuser',
        bio: 'This is my updated bio'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.username).toBe(updateData.username);
      expect(response.body.data.user.bio).toBe(updateData.bio);
    });

    it('should return error for duplicate username', async () => {
      const updateData = {
        username: 'testuser2' // This username already exists
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('username');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/v1/users/profile')
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error for invalid data', async () => {
      const updateData = {
        name: '', // Empty name should fail validation
        username: 'ab' // Too short username
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/users/:id/stats', () => {
    it('should get user stats for valid user ID', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUser.id}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toHaveProperty('totalExp');
      expect(response.body.data.stats).toHaveProperty('totalCoin');
      expect(response.body.data.stats).toHaveProperty('totalCheckin');
      expect(response.body.data.stats).toHaveProperty('totalReview');
      expect(response.body.data.stats).toHaveProperty('totalPost');
      expect(response.body.data.stats).toHaveProperty('followersCount');
      expect(response.body.data.stats).toHaveProperty('followingCount');
    });

    it('should return error for non-existent user ID', async () => {
      const response = await request(app)
        .get('/api/v1/users/99999/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUser.id}/stats`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid-id/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});