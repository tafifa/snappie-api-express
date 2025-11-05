const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Post = require('../models/Post');

describe('Social Media Endpoints', () => {
  let testUser1;
  let testUser2;
  let authToken1;
  let authToken2;
  let testPost;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.destroy({ where: { email: { [require('sequelize').Op.like]: 'testuser%@example.com' } } });
    await Post.destroy({ where: { content: { [require('sequelize').Op.like]: 'Test post%' } } });

    // Create test users
    const userData1 = {
      name: 'Test User 1',
      username: 'testuser1',
      email: 'testuser1@example.com',
      password: 'password123'
    };

    const userData2 = {
      name: 'Test User 2',
      username: 'testuser2',
      email: 'testuser2@example.com',
      password: 'password123'
    };

    const registerResponse1 = await request(app)
      .post('/api/v1/auth/register')
      .send(userData1);

    const registerResponse2 = await request(app)
      .post('/api/v1/auth/register')
      .send(userData2);

    testUser1 = registerResponse1.body.data.user;
    testUser2 = registerResponse2.body.data.user;
    authToken1 = registerResponse1.body.data.token;
    authToken2 = registerResponse2.body.data.token;
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.destroy({ where: { email: { [require('sequelize').Op.like]: 'testuser%@example.com' } } });
    await Post.destroy({ where: { content: { [require('sequelize').Op.like]: 'Test post%' } } });
    await sequelize.close();
  });

  describe('POST /api/v1/social/follow/:userId', () => {
    it('should follow user successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/social/follow/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data).toHaveProperty('isFollowing', true);
    });

    it('should return error when trying to follow self', async () => {
      const response = await request(app)
        .post(`/api/v1/social/follow/${testUser1.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('diri sendiri');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/social/follow/99999')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .post(`/api/v1/social/follow/${testUser2.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle already following user', async () => {
      // First follow
      await request(app)
        .post(`/api/v1/social/follow/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`);

      // Try to follow again
      const response = await request(app)
        .post(`/api/v1/social/follow/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('sudah mengikuti');
    });
  });

  describe('DELETE /api/v1/social/unfollow/:userId', () => {
    beforeEach(async () => {
      // Make user1 follow user2
      await request(app)
        .post(`/api/v1/social/follow/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`);
    });

    it('should unfollow user successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/social/unfollow/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data).toHaveProperty('isFollowing', false);
    });

    it('should return error when trying to unfollow self', async () => {
      const response = await request(app)
        .delete(`/api/v1/social/unfollow/${testUser1.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('diri sendiri');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/v1/social/unfollow/99999')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .delete(`/api/v1/social/unfollow/${testUser2.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle not following user', async () => {
      // First unfollow
      await request(app)
        .delete(`/api/v1/social/unfollow/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`);

      // Try to unfollow again
      const response = await request(app)
        .delete(`/api/v1/social/unfollow/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak mengikuti');
    });
  });

  describe('GET /api/v1/social/followers/:userId', () => {
    beforeEach(async () => {
      // Make user1 follow user2
      await request(app)
        .post(`/api/v1/social/follow/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`);
    });

    it('should get user followers', async () => {
      const response = await request(app)
        .get(`/api/v1/social/followers/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.followers).toBeInstanceOf(Array);
      expect(response.body.data.followers.length).toBeGreaterThan(0);
      expect(response.body.data.followers[0]).toHaveProperty('id');
      expect(response.body.data.followers[0]).toHaveProperty('name');
      expect(response.body.data.followers[0]).toHaveProperty('username');
      expect(response.body.data.followers[0]).toHaveProperty('imageUrl');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/social/followers/99999')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get(`/api/v1/social/followers/${testUser2.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/social/followers/${testUser2.id}`)
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/v1/social/following/:userId', () => {
    beforeEach(async () => {
      // Make user1 follow user2
      await request(app)
        .post(`/api/v1/social/follow/${testUser2.id}`)
        .set('Authorization', `Bearer ${authToken1}`);
    });

    it('should get user following', async () => {
      const response = await request(app)
        .get(`/api/v1/social/following/${testUser1.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.following).toBeInstanceOf(Array);
      expect(response.body.data.following.length).toBeGreaterThan(0);
      expect(response.body.data.following[0]).toHaveProperty('id');
      expect(response.body.data.following[0]).toHaveProperty('name');
      expect(response.body.data.following[0]).toHaveProperty('username');
      expect(response.body.data.following[0]).toHaveProperty('imageUrl');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/social/following/99999')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get(`/api/v1/social/following/${testUser1.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/social/posts', () => {
    it('should create post successfully', async () => {
      const postData = {
        content: 'Test post content',
        imageUrl: 'https://example.com/image.jpg'
      };

      const response = await request(app)
        .post('/api/v1/social/posts')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.post).toHaveProperty('id');
      expect(response.body.data.post.content).toBe(postData.content);
      expect(response.body.data.post.imageUrl).toBe(postData.imageUrl);
      expect(response.body.data.post).toHaveProperty('userId', testUser1.id);

      testPost = response.body.data.post;
    });

    it('should create post without image', async () => {
      const postData = {
        content: 'Test post without image'
      };

      const response = await request(app)
        .post('/api/v1/social/posts')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post.content).toBe(postData.content);
      expect(response.body.data.post.imageUrl).toBeNull();
    });

    it('should return error for empty content', async () => {
      const postData = {
        content: ''
      };

      const response = await request(app)
        .post('/api/v1/social/posts')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(postData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for unauthenticated request', async () => {
      const postData = {
        content: 'Test post content'
      };

      const response = await request(app)
        .post('/api/v1/social/posts')
        .send(postData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/social/feed', () => {
    beforeEach(async () => {
      // Create a post
      const postData = {
        content: 'Test post for feed'
      };

      const postResponse = await request(app)
        .post('/api/v1/social/posts')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(postData);

      testPost = postResponse.body.data.post;
    });

    it('should get user feed', async () => {
      const response = await request(app)
        .get('/api/v1/social/feed')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('pagination');

      if (response.body.data.posts.length > 0) {
        expect(response.body.data.posts[0]).toHaveProperty('id');
        expect(response.body.data.posts[0]).toHaveProperty('content');
        expect(response.body.data.posts[0]).toHaveProperty('imageUrl');
        expect(response.body.data.posts[0]).toHaveProperty('userId');
        expect(response.body.data.posts[0]).toHaveProperty('user');
        expect(response.body.data.posts[0]).toHaveProperty('likesCount');
        expect(response.body.data.posts[0]).toHaveProperty('commentsCount');
        expect(response.body.data.posts[0]).toHaveProperty('isLiked');
      }
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/social/feed')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/social/feed')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('POST /api/v1/social/posts/:postId/like', () => {
    beforeEach(async () => {
      // Create a post
      const postData = {
        content: 'Test post for liking'
      };

      const postResponse = await request(app)
        .post('/api/v1/social/posts')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(postData);

      testPost = postResponse.body.data.post;
    });

    it('should like post successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/social/posts/${testPost.id}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data).toHaveProperty('isLiked', true);
      expect(response.body.data).toHaveProperty('likesCount');
    });

    it('should return error for non-existent post', async () => {
      const response = await request(app)
        .post('/api/v1/social/posts/99999/like')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .post(`/api/v1/social/posts/${testPost.id}/like`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle already liked post', async () => {
      // First like
      await request(app)
        .post(`/api/v1/social/posts/${testPost.id}/like`)
        .set('Authorization', `Bearer ${authToken2}`);

      // Try to like again
      const response = await request(app)
        .post(`/api/v1/social/posts/${testPost.id}/like`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('sudah menyukai');
    });
  });

  describe('DELETE /api/v1/social/posts/:postId/unlike', () => {
    beforeEach(async () => {
      // Create a post and like it
      const postData = {
        content: 'Test post for unliking'
      };

      const postResponse = await request(app)
        .post('/api/v1/social/posts')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(postData);

      testPost = postResponse.body.data.post;

      // Like the post
      await request(app)
        .post(`/api/v1/social/posts/${testPost.id}/like`)
        .set('Authorization', `Bearer ${authToken2}`);
    });

    it('should unlike post successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/social/posts/${testPost.id}/unlike`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data).toHaveProperty('isLiked', false);
      expect(response.body.data).toHaveProperty('likesCount');
    });

    it('should return error for non-existent post', async () => {
      const response = await request(app)
        .delete('/api/v1/social/posts/99999/unlike')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .delete(`/api/v1/social/posts/${testPost.id}/unlike`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/social/posts/:postId/comments', () => {
    beforeEach(async () => {
      // Create a post
      const postData = {
        content: 'Test post for commenting'
      };

      const postResponse = await request(app)
        .post('/api/v1/social/posts')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(postData);

      testPost = postResponse.body.data.post;
    });

    it('should create comment successfully', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/v1/social/posts/${testPost.id}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('berhasil');
      expect(response.body.data.comment).toHaveProperty('id');
      expect(response.body.data.comment.content).toBe(commentData.content);
      expect(response.body.data.comment).toHaveProperty('userId', testUser2.id);
      expect(response.body.data.comment).toHaveProperty('postId', testPost.id);
    });

    it('should return error for empty comment', async () => {
      const commentData = {
        content: ''
      };

      const response = await request(app)
        .post(`/api/v1/social/posts/${testPost.id}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(commentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return error for non-existent post', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post('/api/v1/social/posts/99999/comments')
        .set('Authorization', `Bearer ${authToken2}`)
        .send(commentData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/v1/social/posts/${testPost.id}/comments`)
        .send(commentData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/social/posts/:postId/comments', () => {
    beforeEach(async () => {
      // Create a post and comment
      const postData = {
        content: 'Test post for getting comments'
      };

      const postResponse = await request(app)
        .post('/api/v1/social/posts')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(postData);

      testPost = postResponse.body.data.post;

      // Create a comment
      const commentData = {
        content: 'This is a test comment'
      };

      await request(app)
        .post(`/api/v1/social/posts/${testPost.id}/comments`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(commentData);
    });

    it('should get post comments', async () => {
      const response = await request(app)
        .get(`/api/v1/social/posts/${testPost.id}/comments`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comments).toBeInstanceOf(Array);
      expect(response.body.data.comments.length).toBeGreaterThan(0);
      expect(response.body.data.comments[0]).toHaveProperty('id');
      expect(response.body.data.comments[0]).toHaveProperty('content');
      expect(response.body.data.comments[0]).toHaveProperty('userId');
      expect(response.body.data.comments[0]).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should return error for non-existent post', async () => {
      const response = await request(app)
        .get('/api/v1/social/posts/99999/comments')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tidak ditemukan');
    });

    it('should return error for unauthenticated request', async () => {
      const response = await request(app)
        .get(`/api/v1/social/posts/${testPost.id}/comments`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/social/posts/${testPost.id}/comments`)
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });
});