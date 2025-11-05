const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Article = require('../models/Article');

describe('Articles Endpoints', () => {
  let testUser;
  let authToken;
  let testArticle;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up test data
    await Article.destroy({ where: {} });
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

    // Create test article
    const articleData = {
      title: 'Test Article',
      content: 'This is a test article content',
      excerpt: 'Test excerpt',
      category: 'Technology',
      tags: ['test', 'article'],
      published: true
    };

    const articleResponse = await request(app)
      .post('/api/v1/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send(articleData);

    testArticle = articleResponse.body.data.article;
  });

  afterAll(async () => {
    // Clean up test data and close database connection
    await Article.destroy({ where: {} });
    await User.destroy({ where: { email: 'testuser@example.com' } });
    await sequelize.close();
  });

  describe('GET /api/v1/articles', () => {
    it('should get all articles successfully', async () => {
      const response = await request(app)
        .get('/api/v1/articles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toBeInstanceOf(Array);
      expect(response.body.data.articles.length).toBeGreaterThan(0);
      expect(response.body.data.articles[0]).toHaveProperty('id');
      expect(response.body.data.articles[0]).toHaveProperty('title');
      expect(response.body.data.articles[0]).toHaveProperty('excerpt');
      expect(response.body.data.articles[0]).toHaveProperty('category');
      expect(response.body.data.articles[0]).toHaveProperty('author');
      expect(response.body.data.articles[0]).toHaveProperty('publishedAt');
    });

    it('should get articles with pagination', async () => {
      // Create more test articles
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/v1/articles')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Test Article ${i}`,
            content: `Content for article ${i}`,
            excerpt: `Excerpt ${i}`,
            category: 'Technology',
            published: true
          });
      }

      const response = await request(app)
        .get('/api/v1/articles?page=1&limit=3')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toBeInstanceOf(Array);
      expect(response.body.data.articles.length).toBeLessThanOrEqual(3);
      expect(response.body.data.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.data.pagination).toHaveProperty('totalPages');
      expect(response.body.data.pagination).toHaveProperty('totalItems');
    });

    it('should filter articles by category', async () => {
      // Create article with different category
      await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Health Article',
          content: 'Health content',
          excerpt: 'Health excerpt',
          category: 'Health',
          published: true
        });

      const response = await request(app)
        .get('/api/v1/articles?category=Health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toBeInstanceOf(Array);
      expect(response.body.data.articles.every(article => article.category === 'Health')).toBe(true);
    });

    it('should search articles by title', async () => {
      const response = await request(app)
        .get('/api/v1/articles?search=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toBeInstanceOf(Array);
      expect(response.body.data.articles.some(article => 
        article.title.toLowerCase().includes('test')
      )).toBe(true);
    });

    it('should only return published articles', async () => {
      // Create unpublished article
      await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Draft Article',
          content: 'Draft content',
          excerpt: 'Draft excerpt',
          category: 'Technology',
          published: false
        });

      const response = await request(app)
        .get('/api/v1/articles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles.every(article => article.published === true)).toBe(true);
    });

    it('should return empty array when no articles exist', async () => {
      // Delete all articles
      await Article.destroy({ where: {} });

      const response = await request(app)
        .get('/api/v1/articles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toBeInstanceOf(Array);
      expect(response.body.data.articles.length).toBe(0);
    });
  });

  describe('GET /api/v1/articles/:id', () => {
    it('should get article by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/articles/${testArticle.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.article).toHaveProperty('id', testArticle.id);
      expect(response.body.data.article).toHaveProperty('title');
      expect(response.body.data.article).toHaveProperty('content');
      expect(response.body.data.article).toHaveProperty('excerpt');
      expect(response.body.data.article).toHaveProperty('category');
      expect(response.body.data.article).toHaveProperty('tags');
      expect(response.body.data.article).toHaveProperty('author');
      expect(response.body.data.article).toHaveProperty('publishedAt');
      expect(response.body.data.article).toHaveProperty('views');
    });

    it('should increment view count when getting article', async () => {
      const initialResponse = await request(app)
        .get(`/api/v1/articles/${testArticle.id}`)
        .expect(200);

      const initialViews = initialResponse.body.data.article.views;

      const secondResponse = await request(app)
        .get(`/api/v1/articles/${testArticle.id}`)
        .expect(200);

      expect(secondResponse.body.data.article.views).toBe(initialViews + 1);
    });

    it('should return error for non-existent article', async () => {
      const response = await request(app)
        .get('/api/v1/articles/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for invalid article ID format', async () => {
      const response = await request(app)
        .get('/api/v1/articles/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not return unpublished article to public', async () => {
      // Create unpublished article
      const draftResponse = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Draft Article',
          content: 'Draft content',
          excerpt: 'Draft excerpt',
          category: 'Technology',
          published: false
        });

      const draftArticle = draftResponse.body.data.article;

      const response = await request(app)
        .get(`/api/v1/articles/${draftArticle.id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/articles', () => {
    it('should create article successfully', async () => {
      const articleData = {
        title: 'New Test Article',
        content: 'This is new article content',
        excerpt: 'New excerpt',
        category: 'Technology',
        tags: ['new', 'test'],
        published: true
      };

      const response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.article).toHaveProperty('id');
      expect(response.body.data.article).toHaveProperty('title', articleData.title);
      expect(response.body.data.article).toHaveProperty('content', articleData.content);
      expect(response.body.data.article).toHaveProperty('excerpt', articleData.excerpt);
      expect(response.body.data.article).toHaveProperty('category', articleData.category);
      expect(response.body.data.article).toHaveProperty('tags');
      expect(response.body.data.article).toHaveProperty('published', articleData.published);
      expect(response.body.data.article).toHaveProperty('authorId', testUser.id);
    });

    it('should create draft article successfully', async () => {
      const articleData = {
        title: 'Draft Article',
        content: 'Draft content',
        excerpt: 'Draft excerpt',
        category: 'Technology',
        published: false
      };

      const response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.article).toHaveProperty('published', false);
    });

    it('should return error for missing required fields', async () => {
      const articleData = {
        content: 'Content without title'
      };

      const response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validasi');
    });

    it('should return error for unauthenticated request', async () => {
      const articleData = {
        title: 'Unauthorized Article',
        content: 'Content',
        excerpt: 'Excerpt',
        category: 'Technology'
      };

      const response = await request(app)
        .post('/api/v1/articles')
        .send(articleData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for invalid token', async () => {
      const articleData = {
        title: 'Invalid Token Article',
        content: 'Content',
        excerpt: 'Excerpt',
        category: 'Technology'
      };

      const response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', 'Bearer invalid-token')
        .send(articleData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty tags array', async () => {
      const articleData = {
        title: 'Article without tags',
        content: 'Content',
        excerpt: 'Excerpt',
        category: 'Technology',
        tags: [],
        published: true
      };

      const response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.article.tags).toEqual([]);
    });
  });

  describe('PUT /api/v1/articles/:id', () => {
    it('should update article successfully', async () => {
      const updateData = {
        title: 'Updated Article Title',
        content: 'Updated content',
        excerpt: 'Updated excerpt',
        category: 'Health',
        tags: ['updated', 'article'],
        published: false
      };

      const response = await request(app)
        .put(`/api/v1/articles/${testArticle.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.article).toHaveProperty('title', updateData.title);
      expect(response.body.data.article).toHaveProperty('content', updateData.content);
      expect(response.body.data.article).toHaveProperty('excerpt', updateData.excerpt);
      expect(response.body.data.article).toHaveProperty('category', updateData.category);
      expect(response.body.data.article).toHaveProperty('published', updateData.published);
    });

    it('should update only provided fields', async () => {
      const updateData = {
        title: 'Partially Updated Title'
      };

      const response = await request(app)
        .put(`/api/v1/articles/${testArticle.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.article).toHaveProperty('title', updateData.title);
      expect(response.body.data.article).toHaveProperty('content', testArticle.content);
    });

    it('should return error for non-existent article', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put('/api/v1/articles/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/v1/articles/${testArticle.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for unauthorized update', async () => {
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

      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/v1/articles/${testArticle.id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak diizinkan');

      // Clean up
      await User.destroy({ where: { email: 'testuser2@example.com' } });
    });

    it('should return error for invalid article ID format', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put('/api/v1/articles/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/articles/:id', () => {
    it('should delete article successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/articles/${testArticle.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');

      // Verify article is deleted
      const getResponse = await request(app)
        .get(`/api/v1/articles/${testArticle.id}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('should return error for non-existent article', async () => {
      const response = await request(app)
        .delete('/api/v1/articles/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .delete(`/api/v1/articles/${testArticle.id}`)
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

      const response = await request(app)
        .delete(`/api/v1/articles/${testArticle.id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak diizinkan');

      // Clean up
      await User.destroy({ where: { email: 'testuser2@example.com' } });
    });

    it('should return error for invalid article ID format', async () => {
      const response = await request(app)
        .delete('/api/v1/articles/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});