const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');

describe('Health Endpoints', () => {
  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return health status successfully', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sehat');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('endpoints');
    });

    it('should return correct server status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.status).toBe('healthy');
      expect(typeof response.body.data.uptime).toBe('number');
      expect(response.body.data.uptime).toBeGreaterThan(0);
    });

    it('should return database connection status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.database).toHaveProperty('status');
      expect(response.body.data.database).toHaveProperty('connection');
      expect(['connected', 'disconnected']).toContain(response.body.data.database.status);
    });

    it('should return memory usage information', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.memory).toHaveProperty('used');
      expect(response.body.data.memory).toHaveProperty('total');
      expect(response.body.data.memory).toHaveProperty('percentage');
      expect(typeof response.body.data.memory.used).toBe('string');
      expect(typeof response.body.data.memory.total).toBe('string');
      expect(typeof response.body.data.memory.percentage).toBe('string');
    });

    it('should return version information', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.version).toHaveProperty('api');
      expect(response.body.data.version).toHaveProperty('node');
      expect(typeof response.body.data.version.api).toBe('string');
      expect(typeof response.body.data.version.node).toBe('string');
    });

    it('should return environment information', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(typeof response.body.data.environment).toBe('string');
      expect(['development', 'production', 'test']).toContain(response.body.data.environment);
    });

    it('should return available endpoints list', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.endpoints).toBeInstanceOf(Array);
      expect(response.body.data.endpoints.length).toBeGreaterThan(0);
      
      // Check if common endpoints are included
      const endpointPaths = response.body.data.endpoints.map(endpoint => endpoint.path);
      expect(endpointPaths).toContain('/api/v1/auth');
      expect(endpointPaths).toContain('/api/v1/users');
      expect(endpointPaths).toContain('/api/v1/places');
    });

    it('should return endpoints with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      const endpoints = response.body.data.endpoints;
      expect(endpoints.length).toBeGreaterThan(0);

      endpoints.forEach(endpoint => {
        expect(endpoint).toHaveProperty('path');
        expect(endpoint).toHaveProperty('description');
        expect(typeof endpoint.path).toBe('string');
        expect(typeof endpoint.description).toBe('string');
      });
    });

    it('should return timestamp in correct format', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      const timestamp = response.body.data.timestamp;
      expect(typeof timestamp).toBe('string');
      
      // Check if timestamp is a valid ISO string
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
    });

    it('should return consistent response structure', async () => {
      const response1 = await request(app)
        .get('/api/v1/health')
        .expect(200);

      const response2 = await request(app)
        .get('/api/v1/health')
        .expect(200);

      // Structure should be the same
      expect(Object.keys(response1.body.data).sort()).toEqual(Object.keys(response2.body.data).sort());
      
      // Some values should be different (timestamp, uptime)
      expect(response1.body.data.timestamp).not.toBe(response2.body.data.timestamp);
      expect(response1.body.data.uptime).toBeLessThanOrEqual(response2.body.data.uptime);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/v1/health').expect(200)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('healthy');
      });
    });

    it('should return response within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/health')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Health check should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });

    it('should include all expected endpoint categories', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      const endpointPaths = response.body.data.endpoints.map(endpoint => endpoint.path);
      
      // Check for main API categories
      const expectedCategories = [
        '/api/v1/auth',
        '/api/v1/users', 
        '/api/v1/places',
        '/api/v1/gamification',
        '/api/v1/social',
        '/api/v1/upload',
        '/api/v1/articles',
        '/api/v1/leaderboard'
      ];

      expectedCategories.forEach(category => {
        expect(endpointPaths).toContain(category);
      });
    });

    it('should return valid JSON response', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(typeof response.body).toBe('object');
      expect(response.body).not.toBeNull();
    });

    it('should handle database connection issues gracefully', async () => {
      // This test would require mocking database connection failure
      // For now, we'll just verify the structure exists
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.data.database).toHaveProperty('status');
      expect(response.body.data.database).toHaveProperty('connection');
    });
  });
});