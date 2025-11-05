const express = require('express');
const { sequelize } = require('../config/database');
const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (req, res) => {
  const startTime = process.hrtime();
  
  try {
    // Check database connection
    let dbStatus = 'disconnected';
    let dbPingTime = 0;
    
    try {
      const dbStartTime = process.hrtime();
      await sequelize.authenticate();
      const dbEndTime = process.hrtime(dbStartTime);
      dbPingTime = Math.round((dbEndTime[0] * 1000) + (dbEndTime[1] / 1000000)); // Convert to milliseconds
      dbStatus = 'connected';
    } catch (dbError) {
      dbStatus = 'disconnected';
    }
    
    const healthData = {
      success: true,
      message: 'Snappie API Server is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: {
        status: dbStatus,
        type: 'PostgreSQL'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      },
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth/*'
      }
    };

    // Calculate total response time
    const endTime = process.hrtime(startTime);
    const responseTime = Math.round((endTime[0] * 1000) + (endTime[1] / 1000000)); // Convert to milliseconds
    
    // Add response time to health data
    healthData.response_time_ms = responseTime;
    healthData.database.ping_time_ms = dbPingTime;

    res.status(200).json(healthData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;