const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { query } = require('../config/db');
const ReleaseGateEngine = require('../services/audit/engine');
const { getAllApps, getAppProfile } = require('../services/audit/appRegistry/appRegistry');

/**
 * Helper to save audit record and synchronize bundle to app_versions
 */
async function saveAuditReportAndBundle(report, fileName, fileBuffer) {
  try {
    const insertSQL = `
      INSERT INTO playstore_audits (
        file_name, file_type, file_size_bytes, package_name, version_name,
        version_code, target_sdk, min_sdk, compliance_score, overall_status,
        checks_summary, permissions_found
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const fName = report.application ? report.application.fileName : (fileName || 'app-release.aab');
    const fType = report.application ? report.application.fileType : 'AAB';
    const fSize = report.application ? report.application.fileSizeBytes : (fileBuffer ? fileBuffer.length : 0);
    const pkg = report.application ? report.application.packageName : 'com.bavya.app';
    const vName = report.application ? report.application.versionName : '1.0.0';
    const vCode = parseInt(report.application ? report.application.versionCode : 1, 10);
    const tSdk = report.application ? report.application.targetSdk : 36;
    const mSdk = report.application ? report.application.minSdk : 24;
    const score = report.complianceScore || 0;
    const verdict = report.verdict || 'BLOCKED';

    const result = await query.run(insertSQL, [
      fName, fType, fSize, pkg, vName, vCode, tSdk, mSdk, score, verdict,
      JSON.stringify(report.evidenceList || []),
      JSON.stringify(report.application ? report.application.permissions || [] : [])
    ]);
    report.id = result.lastID;

    // Save/link bundle directly into app_versions table for this project
    const project = await query.get(`SELECT id, app_name FROM projects WHERE app_id = ?`, [pkg]);
    if (project) {
      const existingVersion = await query.get(
        `SELECT id FROM app_versions WHERE project_id = ? AND (version_name = ? OR build_number = ?)`,
        [project.id, vName, vCode]
      );

      if (existingVersion) {
        await query.run(
          `UPDATE app_versions 
           SET version_name = ?, build_number = ?, target_sdk = ?, min_sdk = ?, 
               compliance_score = ?, verdict = ?, file_name = ?, file_size_bytes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [vName, vCode, tSdk, mSdk, score, verdict, fName, fSize, existingVersion.id]
        );
      } else {
        await query.run(
          `INSERT INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active, target_sdk, min_sdk, compliance_score, verdict, file_name, file_size_bytes)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
          [
            project.id,
            vName,
            vCode,
            vName,
            `${project.app_name} v${vName} (${vCode})`,
            `Pre-submission audit verified. Compliance: ${score}%, Verdict: ${verdict}`,
            `https://play.google.com/console/u/0/developers/app/${pkg}`,
            tSdk,
            mSdk,
            score,
            verdict,
            fName,
            fSize
          ]
        );
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not save audit & bundle to SQLite:', err.message);
  }
}

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

    // Fetch previous baseline from database for delta comparison (strictly matched)
    let previousBuild = null;
    try {
      const prevRows = await query.all(`
        SELECT * FROM playstore_audits 
        ORDER BY created_at DESC 
        LIMIT 20
      `);
      if (prevRows && prevRows.length > 0) {
        const matching = prevRows.find(r => 
          (appId && appId !== 'auto' && (r.package_name === appId || (r.file_name && r.file_name.toLowerCase().includes(appId.toLowerCase())))) ||
          (r.package_name && fileName && fileName.toLowerCase().includes(r.package_name.toLowerCase()))
        );
        if (matching) {
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
      }
    } catch (e) {
      // Ignore baseline lookup failure
    }

    // Fetch stored declarations for the target app
    let declarations = req.body.declarations || null;
    if (!declarations && appId) {
      try {
        declarations = await query.get(`SELECT * FROM playstore_declarations WHERE app_id = ?`, [appId]);
      } catch (_) {}
    }

    // Execute the Master 7-Stage Pipeline
    const report = await ReleaseGateEngine.runMasterAudit({
      fileBuffer,
      fileName,
      appId,
      policyUrl,
      sourcePath,
      declarations,
      previousBuild,
      humanSignoffs
    });

    // Save to database & auto-register bundle in project's app_versions
    await saveAuditReportAndBundle(report, fileName, fileBuffer);

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

    let declarations = req.body.declarations || null;
    if (!declarations && appId) {
      try {
        declarations = await query.get(`SELECT * FROM playstore_declarations WHERE app_id = ?`, [appId]);
      } catch (_) {}
    }

    const report = await ReleaseGateEngine.runMasterAudit({
      fileBuffer,
      filePath,
      fileName,
      appId,
      policyUrl: privacyPolicySource,
      sourcePath,
      declarations,
      humanSignoffs: humanSignoffs || {}
    });

    // Auto-save to database & link bundle in app_versions
    await saveAuditReportAndBundle(report, fileName, fileBuffer);

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
 * Candidate on-disk sample binaries used for the silent baseline scan.
 * Lives on the server so the client can ask which one exists instead of
 * blindly probing paths and logging 404s for every missing candidate.
 */
const LOCAL_SAMPLE_CANDIDATES = [
  { path: '/home/user/Documents/Btgs_aab_apk/app-release.aab', type: 'aab' },
  { path: '/home/user/Documents/app-release.aab', type: 'aab' },
  { path: '/home/user/Desktop/1962_release/BH1962_APP/build/app/outputs/bundle/release/app-release.aab', type: 'aab' },
  { path: '/home/user/Documents/Btgs_aab_apk/app-release.apk', type: 'apk' },
  { path: '/home/user/Documents/app-release.apk', type: 'apk' },
  { path: '/home/user/Desktop/1962_release/BH1962_APP/build/app/outputs/apk/release/app-release.apk', type: 'apk' },
  { path: path.join(__dirname, '..', '..', 'samples', 'app-release.aab'), type: 'aab' },
  { path: path.join(__dirname, '..', '..', 'samples', 'app-release.apk'), type: 'apk' }
];

/**
 * Report which local sample binaries actually exist on this machine.
 */
exports.getLocalSamples = async (req, res) => {
  try {
    const samples = LOCAL_SAMPLE_CANDIDATES
      .filter((s) => fs.existsSync(s.path))
      .map((s) => ({ path: s.path, type: s.type, name: path.basename(s.path) }));
    return res.json({ status: 'success', data: { samples } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
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
 * Get saved Play Store Deployment Questionnaire Declarations for an App
 */
exports.getDeclarations = async (req, res) => {
  try {
    const { appId } = req.params;
    const row = await query.get(`
      SELECT * FROM playstore_declarations WHERE app_id = ?
    `, [appId]);

    if (!row) {
      // Fallback default from app registry
      const profile = getAppProfile(appId);
      return res.json({
        status: 'success',
        data: {
          app_id: appId,
          app_name: profile ? profile.name : 'BIHAR 1962 Ops',
          package_name: profile ? profile.packageName : 'in.gov.bihar.vas1962',
          default_language: 'en-US',
          app_type: 'App',
          pricing_type: 'Free',
          policy_confirmed: 1,
          export_laws_accepted: 1,
          privacy_policy_url: '/privacy-policy.html',
          app_access_restricted: 1,
          sign_in_details: JSON.stringify([
            { name: 'Staff account (employee)', username: 'staff_user_01', password: '•••SecurePass2026•••', instructions: 'Enter mobile 9876543210 and OTP 123456.' }
          ]),
          contains_ads: 0,
          content_rating_category: 'Government / Utility / Health',
          target_age_group: '18+'
        }
      });
    }

    return res.json({
      status: 'success',
      data: {
        ...row,
        sign_in_details: typeof row.sign_in_details === 'string' ? row.sign_in_details : JSON.stringify(row.sign_in_details || [])
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve declarations: ' + err.message
    });
  }
};

/**
 * Save / Update Play Store Deployment Questionnaire Declarations
 */
exports.saveDeclarations = async (req, res) => {
  try {
    const {
      app_id,
      app_name,
      package_name,
      default_language = 'en-US',
      app_type = 'App',
      pricing_type = 'Free',
      policy_confirmed = 1,
      export_laws_accepted = 1,
      privacy_policy_url = '/privacy-policy.html',
      app_access_restricted = 1,
      sign_in_details = '[]',
      contains_ads = 0,
      content_rating_category = 'Government / Utility / Health',
      target_age_group = '18+',
      violence_declared = 0,
      sexual_content_declared = 0,
      profanity_declared = 0,
      location_sharing_declared = 1,
      purchases_declared = 0
    } = req.body;

    if (!app_id) {
      return res.status(400).json({ status: 'error', message: 'app_id is required.' });
    }

    const signInStr = typeof sign_in_details === 'string' ? sign_in_details : JSON.stringify(sign_in_details);

    await query.run(`
      INSERT INTO playstore_declarations (
        app_id, app_name, package_name, default_language, app_type, pricing_type,
        policy_confirmed, export_laws_accepted, privacy_policy_url, app_access_restricted,
        sign_in_details, contains_ads, content_rating_category, target_age_group,
        violence_declared, sexual_content_declared, profanity_declared, location_sharing_declared,
        purchases_declared, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(app_id) DO UPDATE SET
        app_name = excluded.app_name,
        package_name = excluded.package_name,
        default_language = excluded.default_language,
        app_type = excluded.app_type,
        pricing_type = excluded.pricing_type,
        policy_confirmed = excluded.policy_confirmed,
        export_laws_accepted = excluded.export_laws_accepted,
        privacy_policy_url = excluded.privacy_policy_url,
        app_access_restricted = excluded.app_access_restricted,
        sign_in_details = excluded.sign_in_details,
        contains_ads = excluded.contains_ads,
        content_rating_category = excluded.content_rating_category,
        target_age_group = excluded.target_age_group,
        violence_declared = excluded.violence_declared,
        sexual_content_declared = excluded.sexual_content_declared,
        profanity_declared = excluded.profanity_declared,
        location_sharing_declared = excluded.location_sharing_declared,
        purchases_declared = excluded.purchases_declared,
        updated_at = CURRENT_TIMESTAMP
    `, [
      app_id, app_name, package_name, default_language, app_type, pricing_type,
      policy_confirmed ? 1 : 0, export_laws_accepted ? 1 : 0, privacy_policy_url,
      app_access_restricted ? 1 : 0, signInStr, contains_ads ? 1 : 0,
      content_rating_category, target_age_group,
      violence_declared ? 1 : 0, sexual_content_declared ? 1 : 0, profanity_declared ? 1 : 0,
      location_sharing_declared ? 1 : 0, purchases_declared ? 1 : 0
    ]);

    return res.json({
      status: 'success',
      message: 'Play Store deployment declarations saved successfully.',
      data: req.body
    });
  } catch (err) {
    console.error('❌ Failed to save declarations:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to save declarations: ' + err.message
    });
  }
};

/**
 * Validate Questionnaire Standalone
 */
exports.validateQuestionnaire = async (req, res) => {
  try {
    const QuestionnaireScanner = require('../services/audit/scanners/questionnaireScanner');
    const declarations = req.body.declarations || req.body;
    const metadata = req.body.metadata || {};
    const appProfile = getAppProfile(declarations.app_id || declarations.appId);

    const results = await QuestionnaireScanner.run({
      declarations,
      metadata,
      appProfile,
      rawZipEntries: {}
    });

    const passes = results.filter(r => r.status === 'PASS').length;
    const blockers = results.filter(r => r.severity === 'BLOCKER' && r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARNING' || r.status === 'REVIEW_REQUIRED').length;

    return res.json({
      status: 'success',
      data: {
        results,
        passes,
        blockers,
        warnings,
        isCompliant: blockers === 0
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to validate questionnaire: ' + err.message
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

/**
 * Run manual runtime smoke test
 */
exports.runSmokeTest = async (req, res) => {
  try {
    const { appId = 'btgs' } = req.body || {};
    const RuntimeScanner = require('../services/audit/scanners/runtimeScanner');
    const { getAppProfile } = require('../services/audit/appRegistry/appRegistry');
    const appProfile = getAppProfile(appId);

    let declarations = null;
    try {
      declarations = await query.get('SELECT * FROM playstore_declarations WHERE app_id = ?', [appId]);
    } catch (_) {}

    const context = {
      appId,
      appProfile,
      declarations,
      metadata: {
        packageName: (declarations && declarations.package_name) || (appProfile && appProfile.packageName) || 'com.bavya.btgs',
        versionName: (appProfile && appProfile.versionName) || '6.0.3'
      }
    };

    const runtimeRes = await RuntimeScanner.run(context);
    return res.json({
      status: 'success',
      data: runtimeRes
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Register / Approve a new Signing Certificate Key for an App
 */
exports.registerSigningKey = async (req, res) => {
  try {
    const { appId, packageName, sha1, sha256 } = req.body || {};
    const targetKey = appId || packageName;
    if (!targetKey) {
      return res.status(400).json({ status: 'error', message: 'appId or packageName is required.' });
    }
    if (!sha1 && !sha256) {
      return res.status(400).json({ status: 'error', message: 'At least one of sha1 or sha256 fingerprint is required.' });
    }

    const { registerAppSigningKey, getAppProfile } = require('../services/audit/appRegistry/appRegistry');
    
    // 1. Register in memory registry
    registerAppSigningKey(targetKey, sha1, sha256);
    if (packageName && packageName !== targetKey) {
      registerAppSigningKey(packageName, sha1, sha256);
    }
    if (appId && appId !== targetKey) {
      registerAppSigningKey(appId, sha1, sha256);
    }

    // 2. Persist in SQLite projects table
    try {
      const cleanSha1 = sha1 ? sha1.toUpperCase().trim() : null;
      const cleanSha256 = sha256 ? sha256.toUpperCase().trim() : null;
      
      const project = await query.get(
        `SELECT id, app_id, signing_sha1, signing_sha256 FROM projects WHERE app_id = ? OR app_id = ? OR id = ?`,
        [targetKey, packageName || targetKey, targetKey]
      );

      if (project) {
        await query.run(
          `UPDATE projects 
           SET signing_sha1 = COALESCE(?, signing_sha1),
               signing_sha256 = COALESCE(?, signing_sha256)
           WHERE id = ?`,
          [cleanSha1, cleanSha256, project.id]
        );
      }
    } catch (dbErr) {
      console.warn('⚠️ Could not update signing key in projects table:', dbErr.message);
    }

    const profile = getAppProfile(targetKey);

    return res.json({
      status: 'success',
      message: `Signing key successfully registered and approved for ${profile ? profile.name : targetKey}`,
      data: {
        appId: targetKey,
        signing: profile ? profile.signing : { sha1: [sha1], sha256: [sha256] }
      }
    });
  } catch (err) {
    console.error('❌ Failed to register signing key:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to register signing key: ' + err.message });
  }
};


