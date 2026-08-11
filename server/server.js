require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initSchema } = require('./config/db');
const { seedDatabaseIfEmpty } = require('./services/seedDataService');

const mobileRoutes = require('./routes/mobileRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.startsWith('/css') && !req.url.startsWith('/js') && !req.url.startsWith('/assets')) {
      console.log(`[${req.method}] ${req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/v1/app', mobileRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Enterprise Multi-App Developer Console & Version Control Hub',
    timestamp: new Date().toISOString()
  });
});

// Serve Web Console
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ status: 'error', message: 'Endpoint not found' });
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

async function startServer() {
  try {
    await initSchema();
    if (process.env.ENABLE_AUTO_SEED !== 'false') {
      await seedDatabaseIfEmpty();
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log('================================================================');
      console.log(`🚀 ENTERPRISE DEVELOPER CONSOLE (MULTI-APP HUB) RUNNING ON:`);
      console.log(`   👉 Web Console    : http://localhost:${PORT}`);
      console.log(`   👉 Mobile API Host: http://localhost:${PORT}/api/v1/app`);
      console.log(`   👉 Multi-Tenant   : Ready for 20+ Enterprise/Gov Applications`);
      console.log('================================================================');
    });
  } catch (error) {
    console.error('❌ Server startup failure:', error);
    process.exit(1);
  }
}

startServer();
