const express = require('express');
const router = express.Router();

const projectController = require('../controllers/projectController');
const versionController = require('../controllers/versionController');
const crashController = require('../controllers/crashController');
const deviceController = require('../controllers/deviceController');
const reportsController = require('../controllers/reportsController');

// 💻 1. Projects Management (Multi-App Console)
router.get('/projects', projectController.getAllProjects);
router.post('/projects', projectController.createProject);
router.get('/projects/:id', projectController.getProjectDetails);

// 💻 2. Overview KPIs & Timeseries Analytics
router.get('/overview', reportsController.getOverviewKPIs);
router.get('/timeseries', reportsController.getTimeSeriesData);
router.get('/export', reportsController.exportReport);

// 💻 3. Version Control per Project
router.get('/versions/:projectId', versionController.getProjectVersions);
router.post('/versions', versionController.createVersion);
router.patch('/versions/:id/force-update', versionController.toggleForceUpdate);

// 💻 4. Crashlytics Error Tracking
router.get('/crashes', crashController.getAllCrashes);
router.get('/crashes/:id', crashController.getCrashDetails);
router.patch('/crashes/:id/status', crashController.updateCrashStatus);

// 💻 5. Device Inventory & Log Telemetry
router.get('/devices', deviceController.getAllDevices);
router.get('/devices/:deviceId/logs', deviceController.getDeviceLogs);

module.exports = router;
