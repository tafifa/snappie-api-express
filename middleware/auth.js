const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const PersonalAccessToken = require('../models/PersonalAccessToken');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan. Akses ditolak.'
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Format token tidak valid. Gunakan Bearer token.'
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan. Akses ditolak.'
      });
    }

    // First, check if token exists in database (compatible with Laravel Sanctum)
    const tokenRecord = await PersonalAccessToken.findOne({
      where: { 
        token,
        tokenable_type: 'App\\Models\\User'
      }
    });
    
    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan di database. Akses ditolak.'
      });
    }
    
    // Find the user associated with the token
    const user = await User.findByPk(tokenRecord.tokenable_id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan. Akses ditolak.'
      });
    }

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan di database. Akses ditolak.'
      });
    }

    // Check if token is expired (Laravel Sanctum doesn't have 'revoked' column)
    // Token management is done through deletion rather than revocation

    if (tokenRecord.expires_at && new Date() > tokenRecord.expires_at) {
      return res.status(401).json({
        success: false,
        message: 'Token sudah expired. Akses ditolak.'
      });
    }

    // Update last_used_at timestamp
    await tokenRecord.update({ last_used_at: new Date() });

    // Verify JWT token structure (optional, for backward compatibility)
    let decoded;
    try {
      decoded = verifyToken(token);
      
      // Check if token type is access token
      if (decoded.type !== 'access') {
        return res.status(401).json({
          success: false,
          message: 'Token type tidak valid.'
        });
      }

      // Verify user ID matches between JWT and database
    if (decoded.id !== user.id) {
      return res.status(401).json({
        success: false,
        message: 'Token user mismatch. Akses ditolak.'
      });
    }
    } catch (error) {
      // If JWT verification fails but token exists in DB, it might be a Sanctum token
      // We can still proceed with database validation only
      console.warn('JWT verification failed, but token valid in database:', error.message);
    }

    // Check if user is active
    if (!user.isActive()) {
      return res.status(401).json({
        success: false,
        message: 'Akun telah dinonaktifkan. Silakan hubungi admin.'
      });
    }

    // Update last used timestamp
    await tokenRecord.update({ last_used_at: new Date() });

    // Attach user to request
    req.user = user;
    req.token = token;
    req.tokenRecord = tokenRecord;

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token sudah expired.'
      });
    }

    return res.status(401).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat verifikasi token.'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    // Check if token exists in database
    const tokenRecord = await PersonalAccessToken.findOne({
      where: { 
        token,
        tokenable_type: 'App\\Models\\User'
      }
    });

    if (!tokenRecord || (tokenRecord.expires_at && new Date() > tokenRecord.expires_at)) {
      return next();
    }

    // Update last_used_at timestamp
    await tokenRecord.update({ last_used_at: new Date() });

    // Find the user associated with the token
    const user = await User.findByPk(tokenRecord.tokenable_id);
    
    // Check if user is active
    if (user && user.isActive()) {
      req.user = user;
      req.token = token;
      req.tokenRecord = tokenRecord;
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    console.warn('Optional auth error:', error.message);
    next();
  }
};

/**
 * Check if user has specific role (for future use)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Login diperlukan.'
      });
    }

    // For now, all authenticated users have access
    // This can be extended with role-based access control
    next();
  };
};

/**
 * Verify registration API key
 * Checks if the API key is valid for registration protection
 * IMPORTANT: Use REGISTRATION_API_KEY in .env, NOT JWT_SECRET
 */
const verifyRegistrationToken = (req, res, next) => {
  try {
    // Get API key from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'API key registrasi tidak ditemukan. Akses ditolak.'
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Format API key tidak valid. Gunakan Bearer token.'
      });
    }

    // Extract API key
    const apiKey = authHeader.substring(7);

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key registrasi tidak ditemukan. Akses ditolak.'
      });
    }

    // Check if REGISTRATION_API_KEY is configured
    if (!process.env.REGISTRATION_API_KEY) {
      console.error('REGISTRATION_API_KEY not configured in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi registrasi tidak valid. Hubungi administrator.'
      });
    }

    // Compare API key with REGISTRATION_API_KEY (NOT JWT_SECRET)
    // Using timing-safe comparison to prevent timing attacks
    const crypto = require('crypto');
    const expectedKey = Buffer.from(process.env.REGISTRATION_API_KEY);
    const providedKey = Buffer.from(apiKey);
    
    // Ensure both keys have the same length before comparison
    if (expectedKey.length !== providedKey.length) {
      return res.status(403).json({
        success: false,
        message: 'API key registrasi tidak valid. Akses ditolak.'
      });
    }

    // Timing-safe comparison
    if (!crypto.timingSafeEqual(expectedKey, providedKey)) {
      return res.status(403).json({
        success: false,
        message: 'API key registrasi tidak valid. Akses ditolak.'
      });
    }

    next();
  } catch (error) {
    console.error('Registration API key verification error:', error.message);
    
    return res.status(401).json({
      success: false,
      message: 'Terjadi kesalahan saat verifikasi API key registrasi.'
    });
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  verifyRegistrationToken
};