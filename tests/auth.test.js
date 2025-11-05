const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');
const User = require('../models/User');

describe('Auth Endpoints', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.destroy({ where: { email: 'test@example.com' } });
    await User.destroy({ where: { email: 'testuser@example.com' } });
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.destroy({ where: { email: 'test@example.com' } });
    await User.destroy({ where: { email: 'testuser@example.com' } });
    await sequelize.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...userData,
          username: 'testuser2'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should return error for duplicate username', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Try to register with same username
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...userData,
          email: 'test2@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('username');
    });

    it('should return validation error for invalid email', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return validation error for short password', async () => {
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testUser = response.body.data.user;
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data).toHaveProperty('token');

      authToken = response.body.data.token;
    });

    it('should return error for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak valid');
    });

    it('should return error for invalid password', async () => {
      const loginData = {
        email: 'testuser@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak valid');
    });

    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/status', () => {
    beforeEach(async () => {
      // Create and login test user
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      authToken = loginResponse.body.data.token;
    });

    it('should return auth status for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/auth/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authenticated).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/auth/status')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/status')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    beforeEach(async () => {
      // Create and login test user
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      authToken = loginResponse.body.data.token;
    });

    it('should get user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('name');
      expect(response.body.data.user).toHaveProperty('email');
      expect(response.body.data.user).toHaveProperty('username');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    beforeEach(async () => {
      // Create and login test user
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      authToken = loginResponse.body.data.token;
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        username: 'updateduser'
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.username).toBe(updateData.username);
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    beforeEach(async () => {
      // Create and login test user
      const userData = {
        name: 'Test User',
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      authToken = loginResponse.body.data.token;
    });

    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});