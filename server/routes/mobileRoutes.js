const express = require('express');
const router = express.Router();

const versionController = require('../controllers/versionController');
const telemetryController = require('../controllers/telemetryController');
const crashController = require('../controllers/crashController');

// 📱 1. Version Handshake & Force Update Check
router.get('/version-check', versionController.checkVersion);
router.post('/version-check', versionController.checkVersion);

// 📱 2. Installation Telemetry
router.post('/telemetry/install', telemetryController.recordInstall);

// 📱 3. Active Session Heartbeat
router.post('/telemetry/session', telemetryController.recordSession);

// 📱 4. Crash Ingestion
router.post('/telemetry/crash', crashController.reportCrash);

// 📱 5. Batch Diagnostic Logs
router.post('/telemetry/logs', telemetryController.recordDeviceLogs);

module.exports = router;
