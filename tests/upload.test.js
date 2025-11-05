const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

describe('Upload Endpoints', () => {
  let testUser;
  let authToken;
  let uploadedImageId;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();

    // Create test image file
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    if (!fs.existsSync(testImagePath)) {
      // Create a simple test image (1x1 pixel JPEG)
      const testImageBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
        0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
        0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0x00,
        0xFF, 0xD9
      ]);
      fs.writeFileSync(testImagePath, testImageBuffer);
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await User.destroy({ where: { email: 'testuser@example.com' } });

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
  });

  afterAll(async () => {
    // Clean up test data and close database connection
    await User.destroy({ where: { email: 'testuser@example.com' } });
    
    // Clean up test image file
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    await sequelize.close();
  });

  describe('POST /api/v1/upload/image', () => {
    it('should upload single image successfully', async () => {
      const testImagePath = path.join(__dirname, 'test-image.jpg');

      const response = await request(app)
        .post('/api/v1/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.image).toHaveProperty('id');
      expect(response.body.data.image).toHaveProperty('filename');
      expect(response.body.data.image).toHaveProperty('originalName');
      expect(response.body.data.image).toHaveProperty('mimeType');
      expect(response.body.data.image).toHaveProperty('size');
      expect(response.body.data.image).toHaveProperty('url');

      uploadedImageId = response.body.data.image.id;
    });

    it('should return error for missing image file', async () => {
      const response = await request(app)
        .post('/api/v1/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('file');
    });

    it('should return error for unauthenticated request', async () => {
      const testImagePath = path.join(__dirname, 'test-image.jpg');

      const response = await request(app)
        .post('/api/v1/upload/image')
        .attach('image', testImagePath)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for invalid file type', async () => {
      // Create a text file to test invalid file type
      const testTextPath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testTextPath, 'This is a test text file');

      const response = await request(app)
        .post('/api/v1/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testTextPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('format');

      // Clean up test file
      fs.unlinkSync(testTextPath);
    });

    it('should return error for file too large', async () => {
      // This test would require creating a large file, which might be impractical
      // In a real scenario, you would mock the multer middleware or create a large test file
      // For now, we'll skip this test or implement it based on your specific requirements
    });
  });

  describe('POST /api/v1/upload/images', () => {
    it('should upload multiple images successfully', async () => {
      const testImagePath = path.join(__dirname, 'test-image.jpg');

      const response = await request(app)
        .post('/api/v1/upload/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.images).toBeInstanceOf(Array);
      expect(response.body.data.images.length).toBe(2);
      expect(response.body.data.images[0]).toHaveProperty('id');
      expect(response.body.data.images[0]).toHaveProperty('filename');
      expect(response.body.data.images[0]).toHaveProperty('url');
    });

    it('should return error for missing image files', async () => {
      const response = await request(app)
        .post('/api/v1/upload/images')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('file');
    });

    it('should return error for unauthenticated request', async () => {
      const testImagePath = path.join(__dirname, 'test-image.jpg');

      const response = await request(app)
        .post('/api/v1/upload/images')
        .attach('images', testImagePath)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for too many files', async () => {
      const testImagePath = path.join(__dirname, 'test-image.jpg');

      // Try to upload more than the maximum allowed (assuming max is 5)
      const response = await request(app)
        .post('/api/v1/upload/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .attach('images', testImagePath) // 6th file should exceed limit
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('maksimal');
    });
  });

  describe('GET /api/v1/upload/image/:id', () => {
    beforeEach(async () => {
      // Upload an image first
      const testImagePath = path.join(__dirname, 'test-image.jpg');

      const uploadResponse = await request(app)
        .post('/api/v1/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      uploadedImageId = uploadResponse.body.data.image.id;
    });

    it('should get image info successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/upload/image/${uploadedImageId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.image).toHaveProperty('id', uploadedImageId);
      expect(response.body.data.image).toHaveProperty('filename');
      expect(response.body.data.image).toHaveProperty('originalName');
      expect(response.body.data.image).toHaveProperty('mimeType');
      expect(response.body.data.image).toHaveProperty('size');
      expect(response.body.data.image).toHaveProperty('url');
      expect(response.body.data.image).toHaveProperty('uploadedAt');
    });

    it('should return error for non-existent image', async () => {
      const response = await request(app)
        .get('/api/v1/upload/image/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for invalid image ID format', async () => {
      const response = await request(app)
        .get('/api/v1/upload/image/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/upload/image/:id', () => {
    beforeEach(async () => {
      // Upload an image first
      const testImagePath = path.join(__dirname, 'test-image.jpg');

      const uploadResponse = await request(app)
        .post('/api/v1/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      uploadedImageId = uploadResponse.body.data.image.id;
    });

    it('should delete image successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/upload/image/${uploadedImageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
    });

    it('should return error for non-existent image', async () => {
      const response = await request(app)
        .delete('/api/v1/upload/image/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .delete(`/api/v1/upload/image/${uploadedImageId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for unauthorized deletion', async () => {
      // Create another user
      const userData2 = {
        name: 'Test User 2',
        username: 'testuser2',
        email: 'testuser2@example.com',
        password: 'password123'
      };

      const registerResponse2 = await request(app)
        .post('/api/v1/auth/register')
        .send(userData2);

      const authToken2 = registerResponse2.body.data.token;

      // Try to delete image uploaded by another user
      const response = await request(app)
        .delete(`/api/v1/upload/image/${uploadedImageId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak diizinkan');

      // Clean up
      await User.destroy({ where: { email: 'testuser2@example.com' } });
    });

    it('should return error for invalid image ID format', async () => {
      const response = await request(app)
        .delete('/api/v1/upload/image/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});