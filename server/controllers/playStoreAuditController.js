const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { query } = require('../config/db');
const ReleaseGateEngine = require('../services/audit/engine');
const { getAllApps, getAppProfile } = require('../services/audit/appRegistry/appRegistry');

/**
 * Enterprise Google Play Release Gate Master Scan (V2 7-Stage Pipeline)
 */
exports.runMasterAuditScan = async (req, res) => {
  try {
    let fileBuffer = null;
    let fileName = 'app-release.aab';
    let policyUrl = null;
    let appId = null;
    let sourcePath = null;
    let humanSignoffs = {};

    const headerName = req.headers['x-file-name'];
    if (headerName) {
      try { fileName = decodeURIComponent(headerName); } catch(e) { fileName = headerName; }
    }

    const headerPolicy = req.headers['x-privacy-policy-source'];
    if (headerPolicy) {
      try { policyUrl = decodeURIComponent(headerPolicy); } catch(e) { policyUrl = headerPolicy; }
    }

    const headerApp = req.headers['x-app-id'];
    if (headerApp) {
      try { appId = decodeURIComponent(headerApp); } catch(e) { appId = headerApp; }
    }

    // 1. Check raw binary buffer
    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      fileBuffer = req.body;
    } 
    // 2. Check Base64 payload
    else if (req.body && req.body.fileBase64) {
      fileBuffer = Buffer.from(req.body.fileBase64, 'base64');
      if (req.body.fileName) fileName = req.body.fileName;
      if (req.body.policyUrl) policyUrl = req.body.policyUrl;
      if (req.body.appId) appId = req.body.appId;
      if (req.body.sourcePath) sourcePath = req.body.sourcePath;
      if (req.body.humanSignoffs) humanSignoffs = req.body.humanSignoffs;
    }
    // 3. Fallback: stream HTTP body
    else {
      fileBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', err => reject(err));
      });
    }

    // Multipart boundary stripping if needed
    if (fileBuffer && fileBuffer.length > 100) {
      const headerStr = fileBuffer.slice(0, 500).toString('latin1');
      if (headerStr.includes('Content-Disposition: form-data;')) {
        const match = headerStr.match(/filename="([^"]+)"/);
        if (match && match[1]) fileName = match[1];
        
        const delimiter = Buffer.from('\r\n\r\n');
        const delimIdx = fileBuffer.indexOf(delimiter);
        if (delimIdx !== -1) {
          const contentStart = delimIdx + 4;
          const boundaryIdx = fileBuffer.lastIndexOf(Buffer.from('\r\n--'));
          if (boundaryIdx > contentStart) {
            fileBuffer = fileBuffer.slice(contentStart, boundaryIdx);
          } else {
            fileBuffer = fileBuffer.slice(contentStart);
          }
        }
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No binary file data received.'
      });
    }

    // Fetch previous baseline from database for delta comparison
    let previousBuild = null;
    try {
      const prevRows = await query.all(`
        SELECT * FROM playstore_audits 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      if (prevRows && prevRows.length > 0) {
        const matching = prevRows.find(r => r.package_name && fileName.includes(r.package_name)) || prevRows[0];
        previousBuild = {
          metadata: {
            packageName: matching.package_name,
            versionCode: matching.version_code,
            versionName: matching.version_name,
            targetSdk: matching.target_sdk,
            permissions: matching.permissions_found ? JSON.parse(matching.permissions_found) : []
          },
          artifactHash: matching.file_name ? crypto.createHash('sha256').update(matching.file_name).digest('hex') : null
        };
      }
    } catch (e) {
      // Ignore baseline lookup failure
    }

    // Execute the Master 7-Stage Pipeline
    const report = await ReleaseGateEngine.runMasterAudit({
      fileBuffer,
      fileName,
      appId,
      policyUrl,
      sourcePath,
      previousBuild,
      humanSignoffs
    });

    // Save to database
    try {
      const insertSQL = `
        INSERT INTO playstore_audits (
          file_name, file_type, file_size_bytes, package_name, version_name,
          version_code, target_sdk, min_sdk, compliance_score, overall_status,
          checks_summary, permissions_found
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await query.run(insertSQL, [
        report.application ? report.application.fileName : fileName,
        report.application ? report.application.fileType : 'AAB',
        report.application ? report.application.fileSizeBytes : fileBuffer.length,
        report.application ? report.application.packageName : 'com.bavya.app',
        report.application ? report.application.versionName : '1.0.0',
        report.application ? report.application.versionCode : 1,
        report.application ? report.application.targetSdk : 36,
        report.application ? report.application.minSdk : 24,
        report.complianceScore || 0,
        report.verdict || 'BLOCKED',
        JSON.stringify(report.evidenceList || []),
        JSON.stringify(report.application ? report.application.permissions || [] : [])
      ]);
      report.id = result.lastID;
    } catch (dbErr) {
      console.warn('⚠️ Could not save audit record to SQLite:', dbErr.message);
    }

    return res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    console.error('❌ Master Release Gate Execution error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to complete Release Gate Audit: ' + error.message
    });
  }
};

/**
 * Controller for Google Play Store Pre-Submission Audit (Legacy / Direct Upload)
 */
exports.auditUploadedFile = async (req, res) => {
  return exports.runMasterAuditScan(req, res);
};

/**
 * Audit a file directly by local file path
 */
exports.auditLocalFile = async (req, res) => {
  try {
    const { filePath, privacyPolicySource, appId, sourcePath, humanSignoffs } = req.body;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: `File not found at specified path: ${filePath}`
      });
    }

    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    const report = await ReleaseGateEngine.runMasterAudit({
      fileBuffer,
      filePath,
      fileName,
      appId,
      policyUrl: privacyPolicySource,
      sourcePath,
      humanSignoffs: humanSignoffs || {}
    });

    return res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    console.error('❌ Local file audit error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to audit file: ' + error.message
    });
  }
};

/**
 * Get App Registry Profiles
 */
exports.getAppRegistry = async (req, res) => {
  try {
    const apps = getAllApps();
    return res.json({
      status: 'success',
      data: apps
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve app registry: ' + err.message
    });
  }
};

/**
 * Analyze a Privacy Policy document/URL standalone
 */
exports.analyzePolicy = async (req, res) => {
  try {
    const { policySource } = req.body;
    const resolved = await ReleaseGateEngine.resolvePrivacyPolicy(policySource);
    return res.json({
      status: 'success',
      data: resolved
    });
  } catch (err) {
    console.error('❌ Policy analysis error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to parse privacy policy: ' + err.message
    });
  }
};

/**
 * Cross-compare binary permissions and packages with privacy policy
 */
exports.comparePolicyWithBinary = async (req, res) => {
  try {
    const { packageName, permissions, policySource } = req.body;
    const resolved = await ReleaseGateEngine.resolvePrivacyPolicy(policySource);
    return res.json({
      status: 'success',
      data: resolved
    });
  } catch (err) {
    console.error('❌ Policy comparison error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to compare binary with privacy policy: ' + err.message
    });
  }
};

/**
 * Get audit history
 */
exports.getAuditHistory = async (req, res) => {
  try {
    const rows = await query.all(`
      SELECT * FROM playstore_audits
      ORDER BY created_at DESC
      LIMIT 25
    `);

    const audits = rows.map(r => ({
      ...r,
      checks_summary: r.checks_summary ? JSON.parse(r.checks_summary) : [],
      permissions_found: r.permissions_found ? JSON.parse(r.permissions_found) : []
    }));

    return res.json({
      status: 'success',
      data: audits
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve audit history: ' + error.message
    });
  }
};
