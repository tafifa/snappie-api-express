const User = require('../models/User');
const PersonalAccessToken = require('../models/PersonalAccessToken');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');

/**
 * Register new user (Social Login)
 * @route POST /api/v1/auth/register
 * @access Public
 */
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, username, email, imageUrl, gender, place_value, food_type } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Email sudah terdaftar' 
          : 'Username sudah digunakan'
      });
    }

    // Create new user
    const newUser = await User.create({
      name,
      username,
      email: email.toLowerCase(),
      imageUrl: imageUrl || 'https://via.placeholder.com/150',
      additionalInfo: {
        user_detail: {
          gender: gender || '',
        },
        user_preferences: {
          food_type: food_type || '',
          place_value: place_value || ''
        },
        user_saved: {
          saved_places: [],
          saved_posts: [],
          saved_articles: []
        },
        user_settings: {
          language: 'id',
          theme: 'light'
        },
        user_notification: {
          push_notification: true
        }
      }
    });

    // Generate tokens
    // const accessToken = generateAccessToken(newUser);
    // const refreshToken = generateRefreshToken(newUser);

    res.status(201).json({
      success: true,
      message: 'User berhasil didaftarkan',
      data: {
        user: newUser.getProfile(),
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      return res.status(409).json({
        success: false,
        message: field === 'email' ? 'Email sudah terdaftar' : 'Username sudah digunakan'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

/**
 * Login user (Social Login)
 * @route POST /api/v1/auth/login
 * @access Public
 */
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, name, imageUrl } = req.body;

    // Find user by email
    let user = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    // If user doesn't exist, return error
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan. Silakan registrasi terlebih dahulu.'
      });
    } else {
      // Update user info if provided
      if (name && name !== user.name) {
        user.name = name;
      }
      if (imageUrl && imageUrl !== user.imageUrl) {
        user.imageUrl = imageUrl;
      }
      await user.save();
    }

    // Check if user is active
    if (!user.isActive()) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Check if user already has an active session
    const existingSession = await PersonalAccessToken.hasActiveSession(user.id);
    
    if (existingSession) {
      return res.status(409).json({
        success: false,
        message: 'Anda sudah login di perangkat lain. Silakan logout terlebih dahulu atau tunggu hingga token expired (1 hari).',
        data: {
          hasActiveSession: true,
          sessionCreatedAt: existingSession.created_at
        }
      });
    }

    // Generate tokens - create Sanctum-compatible token
    const accessToken = generateAccessToken(user);
    
    // Also create database token for Laravel Sanctum compatibility
    const tokenRecord = await PersonalAccessToken.createToken(user, 'API Login');

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: user.getProfile(),
        token: tokenRecord.token, // Gunakan token dari database untuk compatibility
        jwtToken: accessToken // Keep JWT for backward compatibility
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

/**
 * Logout user
 * @route POST /api/v1/auth/logout
 * @access Private
 */
const logout = async (req, res) => {
  try {
    const user = req.user;
    const token = req.token;

    // Delete the current token from database (Laravel Sanctum doesn't have 'revoked' column)
    if (token) {
      await PersonalAccessToken.destroy({ where: { token } });
    }

    console.log('User logged out successfully:', {
      userId: user.id,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Logout berhasil!',
      data: {
        loggedOutAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Logout error:', error);

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check authentication status
 * @route GET /api/v1/auth/status
 * @access Private
 */
const checkAuthStatus = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyToken(token);
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      if (!user.isActive()) {
        return res.status(403).json({
          success: false,
          message: 'Akun telah dinonaktifkan'
        });
      }

      res.json({
        success: true,
        message: 'Token valid',
        data: {
          user: user.getProfile()
        }
      });

    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid atau telah kedaluwarsa'
      });
    }

  } catch (error) {
    console.error('Check auth status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

/**
 * Get user profile
 * @route GET /api/v1/auth/profile
 * @access Private
 */
const getProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyToken(token);
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      if (!user.isActive()) {
        return res.status(403).json({
          success: false,
          message: 'Akun telah dinonaktifkan'
        });
      }

      res.json({
        success: true,
        message: 'Profile berhasil diambil',
        data: {
          user: user.getProfile()
        }
      });

    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid atau telah kedaluwarsa'
      });
    }

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/v1/auth/profile
 * @access Private
 */
const updateProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyToken(token);
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      if (!user.isActive()) {
        return res.status(403).json({
          success: false,
          message: 'Akun telah dinonaktifkan'
        });
      }

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, imageUrl, additionalInfo } = req.body;
      const updateData = {};

      // Update basic fields
      if (name !== undefined) updateData.name = name;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

      // Update additionalInfo by merging with existing data
      if (additionalInfo) {
        const currentAdditionalInfo = user.additionalInfo || {};
        updateData.additionalInfo = {
          ...currentAdditionalInfo,
          ...additionalInfo
        };
      }

      // Update user
      await user.update(updateData);

      res.json({
        success: true,
        message: 'Profile berhasil diperbarui',
        data: {
          user: user.getProfile()
        }
      });

    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid atau telah kedaluwarsa'
      });
    }

  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  checkAuthStatus,
  getProfile,
  updateProfile
};