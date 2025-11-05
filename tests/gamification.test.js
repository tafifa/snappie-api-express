const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Place = require('../models/Place');

describe('Gamification Endpoints', () => {
  let testUser;
  let authToken;
  let testPlace;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.destroy({ where: { email: 'testuser@example.com' } });
    await Place.destroy({ where: { name: 'Test Place' } });

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

    // Create test place
    const placeData = {
      name: 'Test Place',
      description: 'A test place for gamification',
      address: 'Test Address',
      latitude: -6.2088,
      longitude: 106.8456,
      category: 'restaurant'
    };

    const placeResponse = await request(app)
      .post('/api/v1/places')
      .set('Authorization', `Bearer ${authToken}`)
      .send(placeData);

    testPlace = placeResponse.body.data.place;
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.destroy({ where: { email: 'testuser@example.com' } });
    await Place.destroy({ where: { name: 'Test Place' } });
    await sequelize.close();
  });

  describe('POST /api/v1/gamification/checkin', () => {
    it('should create checkin successfully', async () => {
      const checkinData = {
        placeId: testPlace.id,
        latitude: -6.2088,
        longitude: 106.8456
      };

      const response = await request(app)
        .post('/api/v1/gamification/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkinData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.checkin).toHaveProperty('id');
      expect(response.body.data.checkin).toHaveProperty('userId', testUser.id);
      expect(response.body.data.checkin).toHaveProperty('placeId', testPlace.id);
      expect(response.body.data.rewards).toBeDefined();
      expect(response.body.data.rewards).toHaveProperty('exp');
      expect(response.body.data.rewards).toHaveProperty('coin');
    });

    it('should return error for missing placeId', async () => {
      const checkinData = {
        latitude: -6.2088,
        longitude: 106.8456
      };

      const response = await request(app)
        .post('/api/v1/gamification/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkinData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for invalid placeId', async () => {
      const checkinData = {
        placeId: 99999,
        latitude: -6.2088,
        longitude: 106.8456
      };

      const response = await request(app)
        .post('/api/v1/gamification/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkinData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for missing coordinates', async () => {
      const checkinData = {
        placeId: testPlace.id
      };

      const response = await request(app)
        .post('/api/v1/gamification/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkinData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for unauthenticated request', async () => {
      const checkinData = {
        placeId: testPlace.id,
        latitude: -6.2088,
        longitude: 106.8456
      };

      const response = await request(app)
        .post('/api/v1/gamification/checkin')
        .send(checkinData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/gamification/review', () => {
    it('should create review successfully', async () => {
      const reviewData = {
        placeId: testPlace.id,
        rating: 5,
        comment: 'Great place!',
        latitude: -6.2088,
        longitude: 106.8456
      };

      const response = await request(app)
        .post('/api/v1/gamification/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.review).toHaveProperty('id');
      expect(response.body.data.review).toHaveProperty('userId', testUser.id);
      expect(response.body.data.review).toHaveProperty('placeId', testPlace.id);
      expect(response.body.data.review).toHaveProperty('rating', reviewData.rating);
      expect(response.body.data.review).toHaveProperty('comment', reviewData.comment);
      expect(response.body.data.rewards).toBeDefined();
      expect(response.body.data.rewards).toHaveProperty('exp');
      expect(response.body.data.rewards).toHaveProperty('coin');
    });

    it('should return error for missing placeId', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Great place!',
        latitude: -6.2088,
        longitude: 106.8456
      };

      const response = await request(app)
        .post('/api/v1/gamification/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for invalid rating', async () => {
      const reviewData = {
        placeId: testPlace.id,
        rating: 6, // Invalid rating (should be 1-5)
        comment: 'Great place!',
        latitude: -6.2088,
        longitude: 106.8456
      };

      const response = await request(app)
        .post('/api/v1/gamification/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for missing rating', async () => {
      const reviewData = {
        placeId: testPlace.id,
        comment: 'Great place!',
        latitude: -6.2088,
        longitude: 106.8456
      };

      const response = await request(app)
        .post('/api/v1/gamification/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for unauthenticated request', async () => {
      const reviewData = {
        placeId: testPlace.id,
        rating: 5,
        comment: 'Great place!',
        latitude: -6.2088,
        longitude: 106.8456
      };

      const response = await request(app)
        .post('/api/v1/gamification/review')
        .send(reviewData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/gamification/coins/transactions', () => {
    it('should get coin transactions for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/coins/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/coins/transactions')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/coins/transactions')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/v1/gamification/exp/transactions', () => {
    it('should get experience transactions for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/exp/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/exp/transactions')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/exp/transactions')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/v1/gamification/achievements', () => {
    it('should get user achievements', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/achievements')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.achievements).toBeInstanceOf(Array);
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/achievements')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/gamification/challenges', () => {
    it('should get available challenges', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/challenges')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.challenges).toBeInstanceOf(Array);
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/challenges')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/gamification/rewards', () => {
    it('should get available rewards', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/rewards')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rewards).toBeInstanceOf(Array);
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/gamification/rewards')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});