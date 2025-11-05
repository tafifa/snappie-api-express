require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/database');

// Initialize models and associations
require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Terlalu banyak request dari IP ini, coba lagi nanti.'
  }
});

app.use(limiter);

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded images
app.use('/uploads', express.static('uploads'));

// API routes
const API_PREFIX = process.env.NODE_ENV === 'production' ? '/v1' : '/api/v1';

app.use(`${API_PREFIX}/health`, require('./routes/health'));
app.use(`${API_PREFIX}/auth`, require('./routes/auth'));
app.use(`${API_PREFIX}/places`, require('./routes/places'));
app.use(`${API_PREFIX}/articles`, require('./routes/articles'));
app.use(`${API_PREFIX}/users`, require('./routes/users'));
app.use(`${API_PREFIX}/gamification`, require('./routes/gamification'));
app.use(`${API_PREFIX}/social`, require('./routes/social'));
app.use(`${API_PREFIX}/leaderboard`, require('./routes/leaderboard'));
app.use(`${API_PREFIX}/upload`, require('./routes/upload'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Snappie API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${API_PREFIX}/health`,
      auth: `${API_PREFIX}/auth/*`
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Snappie API Server berjalan di port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}${API_PREFIX}/health`);
});

module.exports = app;