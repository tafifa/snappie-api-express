const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Place = require('../models/Place');

describe('Places Endpoints', () => {
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
    await Place.destroy({ where: { name: { [require('sequelize').Op.like]: 'Test Place%' } } });

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
      description: 'A test place for testing',
      address: 'Test Address, Jakarta',
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
    await Place.destroy({ where: { name: { [require('sequelize').Op.like]: 'Test Place%' } } });
    await sequelize.close();
  });

  describe('GET /api/v1/places', () => {
    it('should get all places', async () => {
      const response = await request(app)
        .get('/api/v1/places')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.places).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');

      if (response.body.data.places.length > 0) {
        expect(response.body.data.places[0]).toHaveProperty('id');
        expect(response.body.data.places[0]).toHaveProperty('name');
        expect(response.body.data.places[0]).toHaveProperty('description');
        expect(response.body.data.places[0]).toHaveProperty('address');
        expect(response.body.data.places[0]).toHaveProperty('latitude');
        expect(response.body.data.places[0]).toHaveProperty('longitude');
        expect(response.body.data.places[0]).toHaveProperty('category');
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/places')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/v1/places')
        .query({ category: 'restaurant' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.places).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/places/search', () => {
    it('should search places by name', async () => {
      const response = await request(app)
        .get('/api/v1/places/search')
        .query({ q: 'Test Place' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.places).toBeInstanceOf(Array);
      expect(response.body.data.places.length).toBeGreaterThan(0);
      expect(response.body.data.places[0].name).toContain('Test Place');
    });

    it('should search places by address', async () => {
      const response = await request(app)
        .get('/api/v1/places/search')
        .query({ q: 'Jakarta' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.places).toBeInstanceOf(Array);
    });

    it('should return empty array for non-existent place', async () => {
      const response = await request(app)
        .get('/api/v1/places/search')
        .query({ q: 'NonExistentPlace12345' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.places).toBeInstanceOf(Array);
      expect(response.body.data.places.length).toBe(0);
    });

    it('should return error for missing query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/places/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('query');
    });

    it('should support pagination in search', async () => {
      const response = await request(app)
        .get('/api/v1/places/search')
        .query({ q: 'Test', page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/v1/places/nearby', () => {
    it('should get nearby places', async () => {
      const response = await request(app)
        .get('/api/v1/places/nearby')
        .query({ 
          latitude: -6.2088, 
          longitude: 106.8456, 
          radius: 5000 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.places).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('pagination');

      if (response.body.data.places.length > 0) {
        expect(response.body.data.places[0]).toHaveProperty('distance');
      }
    });

    it('should return error for missing latitude', async () => {
      const response = await request(app)
        .get('/api/v1/places/nearby')
        .query({ longitude: 106.8456, radius: 5000 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for missing longitude', async () => {
      const response = await request(app)
        .get('/api/v1/places/nearby')
        .query({ latitude: -6.2088, radius: 5000 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should use default radius when not specified', async () => {
      const response = await request(app)
        .get('/api/v1/places/nearby')
        .query({ latitude: -6.2088, longitude: 106.8456 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.places).toBeInstanceOf(Array);
    });

    it('should filter by category in nearby search', async () => {
      const response = await request(app)
        .get('/api/v1/places/nearby')
        .query({ 
          latitude: -6.2088, 
          longitude: 106.8456, 
          radius: 5000,
          category: 'restaurant'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.places).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/places/:id', () => {
    it('should get place by valid ID', async () => {
      const response = await request(app)
        .get(`/api/v1/places/${testPlace.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.place).toHaveProperty('id', testPlace.id);
      expect(response.body.data.place).toHaveProperty('name');
      expect(response.body.data.place).toHaveProperty('description');
      expect(response.body.data.place).toHaveProperty('address');
      expect(response.body.data.place).toHaveProperty('latitude');
      expect(response.body.data.place).toHaveProperty('longitude');
      expect(response.body.data.place).toHaveProperty('category');
      expect(response.body.data.place).toHaveProperty('imageUrl');
      expect(response.body.data.place).toHaveProperty('averageRating');
      expect(response.body.data.place).toHaveProperty('totalReviews');
    });

    it('should return error for non-existent place ID', async () => {
      const response = await request(app)
        .get('/api/v1/places/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for invalid place ID format', async () => {
      const response = await request(app)
        .get('/api/v1/places/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/places', () => {
    it('should create place successfully', async () => {
      const placeData = {
        name: 'Test Place 2',
        description: 'Another test place',
        address: 'Test Address 2, Jakarta',
        latitude: -6.2100,
        longitude: 106.8500,
        category: 'cafe'
      };

      const response = await request(app)
        .post('/api/v1/places')
        .set('Authorization', `Bearer ${authToken}`)
        .send(placeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.place).toHaveProperty('id');
      expect(response.body.data.place.name).toBe(placeData.name);
      expect(response.body.data.place.description).toBe(placeData.description);
      expect(response.body.data.place.address).toBe(placeData.address);
      expect(response.body.data.place.latitude).toBe(placeData.latitude);
      expect(response.body.data.place.longitude).toBe(placeData.longitude);
      expect(response.body.data.place.category).toBe(placeData.category);
    });

    it('should return error for missing required fields', async () => {
      const placeData = {
        name: 'Test Place 3',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/places')
        .set('Authorization', `Bearer ${authToken}`)
        .send(placeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for invalid latitude', async () => {
      const placeData = {
        name: 'Test Place 4',
        description: 'Test description',
        address: 'Test Address',
        latitude: 91, // Invalid latitude (should be -90 to 90)
        longitude: 106.8456,
        category: 'restaurant'
      };

      const response = await request(app)
        .post('/api/v1/places')
        .set('Authorization', `Bearer ${authToken}`)
        .send(placeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for invalid longitude', async () => {
      const placeData = {
        name: 'Test Place 5',
        description: 'Test description',
        address: 'Test Address',
        latitude: -6.2088,
        longitude: 181, // Invalid longitude (should be -180 to 180)
        category: 'restaurant'
      };

      const response = await request(app)
        .post('/api/v1/places')
        .set('Authorization', `Bearer ${authToken}`)
        .send(placeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for unauthenticated request', async () => {
      const placeData = {
        name: 'Test Place 6',
        description: 'Test description',
        address: 'Test Address',
        latitude: -6.2088,
        longitude: 106.8456,
        category: 'restaurant'
      };

      const response = await request(app)
        .post('/api/v1/places')
        .send(placeData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for duplicate place name at same location', async () => {
      const placeData = {
        name: 'Test Place', // Same name as existing place
        description: 'Test description',
        address: 'Test Address',
        latitude: -6.2088, // Same coordinates
        longitude: 106.8456,
        category: 'restaurant'
      };

      const response = await request(app)
        .post('/api/v1/places')
        .set('Authorization', `Bearer ${authToken}`)
        .send(placeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('sudah ada');
    });
  });
});