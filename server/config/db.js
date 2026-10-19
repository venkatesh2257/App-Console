const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const os = require('os');

const dbDir = path.join(__dirname, '../../data');
const defaultDbPath = path.join(dbDir, 'console_multi_app.sqlite');
const tmpDbPath = path.join(os.tmpdir(), 'console_multi_app.sqlite');

let dbPath = process.env.DATABASE_PATH || tmpDbPath;
if (!fs.existsSync(dbPath) && fs.existsSync(defaultDbPath)) {
  try {
    fs.copyFileSync(defaultDbPath, dbPath);
    fs.chmodSync(dbPath, 0o666);
  } catch (_) {}
} else if (fs.existsSync(dbPath)) {
  try {
    fs.chmodSync(dbPath, 0o666);
  } catch (_) {}
}





const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log('✅ SQLite Connected successfully to:', dbPath);
  }
});


// Promisified helper methods
const query = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  exec: (sql) => {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Initialize schema tables for Multi-Project Support
async function initSchema() {
  const schemaSQL = `
    -- Multi-App Projects Registry
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL UNIQUE,          -- e.g. 'in.gov.telangana.vas1962'
      app_name TEXT NOT NULL,                -- e.g. '1962 Mobile Veterinary Unit'
      category TEXT DEFAULT 'Government',    -- 'Government', 'Healthcare', 'Emergency', 'Utilities'
      platform TEXT DEFAULT 'Android',       -- 'Android', 'iOS', 'Cross-Platform'
      api_key TEXT NOT NULL UNIQUE,          -- Secret key used by mobile apps for ingestion
      icon_color TEXT DEFAULT '#00F59B',     -- Hex accent color
      icon_url TEXT DEFAULT NULL,
      app_status TEXT DEFAULT 'Production',
      update_status TEXT DEFAULT NULL,
      installed_audience INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      last_updated_date TEXT DEFAULT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- App Versions Table (Per Project)
    CREATE TABLE IF NOT EXISTS app_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      version_name TEXT NOT NULL,
      build_number INTEGER NOT NULL,
      min_supported_version TEXT NOT NULL,
      is_force_update INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      release_notes TEXT,
      download_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, version_name)
    );

    -- Device Installations Table (Per Project)
    CREATE TABLE IF NOT EXISTS installations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      device_brand TEXT,
      device_model TEXT,
      os_type TEXT DEFAULT 'Android',
      os_version TEXT,
      sdk_int INTEGER,
      app_version TEXT NOT NULL,
      build_number INTEGER,
      ip_address TEXT,
      district TEXT,
      zone_id TEXT,
      installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, device_id)
    );

    -- Active Sessions / Heartbeats Table (Per Project)
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      app_version TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      role_id TEXT,
      district TEXT,
      duration_seconds INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_ping_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- Crash Reports Table (Per Project - Firebase Crashlytics Style)
    CREATE TABLE IF NOT EXISTS crashes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      issue_fingerprint TEXT NOT NULL,
      error_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      stack_trace TEXT NOT NULL,
      screen_name TEXT,
      app_version TEXT NOT NULL,
      build_number INTEGER,
      device_id TEXT NOT NULL,
      device_brand TEXT,
      device_model TEXT,
      os_version TEXT,
      free_ram_mb INTEGER,
      total_ram_mb INTEGER,
      battery_percent INTEGER,
      is_background INTEGER DEFAULT 0,
      user_id TEXT,
      user_name TEXT,
      district TEXT,
      status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'ignored'
      occurrences_count INTEGER DEFAULT 1,
      impacted_devices_count INTEGER DEFAULT 1,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, issue_fingerprint)
    );

    -- Device Logs / Telemetry Breadcrumbs Table (Per Project)
    CREATE TABLE IF NOT EXISTS device_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      session_id TEXT,
      log_level TEXT DEFAULT 'INFO', -- 'INFO', 'WARN', 'ERROR', 'DEBUG', 'CRUMB'
      tag TEXT,
      message TEXT NOT NULL,
      metadata TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- Play Store Pre-Submission Compliance Audits Table
    CREATE TABLE IF NOT EXISTS playstore_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL, -- 'AAB' or 'APK'
      file_size_bytes INTEGER,
      package_name TEXT NOT NULL,
      version_name TEXT,
      version_code INTEGER,
      target_sdk INTEGER,
      min_sdk INTEGER,
      compliance_score INTEGER DEFAULT 100,
      overall_status TEXT DEFAULT 'PASSED', -- 'PASSED', 'WARNING', 'FAILED'
      checks_summary TEXT, -- JSON string of all test results
      permissions_found TEXT, -- JSON array of detected permissions
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    -- Play Store Pre-Deployment Setup & Questionnaire Declarations Table
    CREATE TABLE IF NOT EXISTS playstore_declarations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL UNIQUE,
      app_name TEXT NOT NULL,
      package_name TEXT NOT NULL,
      default_language TEXT DEFAULT 'en-US',
      app_type TEXT DEFAULT 'App',
      pricing_type TEXT DEFAULT 'Free',
      policy_confirmed INTEGER DEFAULT 1,
      export_laws_accepted INTEGER DEFAULT 1,
      privacy_policy_url TEXT DEFAULT '/privacy-policy.html',
      app_access_restricted INTEGER DEFAULT 1,
      sign_in_details TEXT, -- JSON array string
      contains_ads INTEGER DEFAULT 0,
      content_rating_category TEXT DEFAULT 'Government / Utility / Health',
      target_age_group TEXT DEFAULT '18+',
      violence_declared INTEGER DEFAULT 0,
      sexual_content_declared INTEGER DEFAULT 0,
      profanity_declared INTEGER DEFAULT 0,
      location_sharing_declared INTEGER DEFAULT 1,
      purchases_declared INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await query.exec(schemaSQL);

  // Column migrations for projects table
  try { await query.run(`ALTER TABLE projects ADD COLUMN icon_url TEXT DEFAULT NULL`); } catch (_) {}
  try { await query.run(`ALTER TABLE projects ADD COLUMN app_status TEXT DEFAULT 'Production'`); } catch (_) {}
  try { await query.run(`ALTER TABLE projects ADD COLUMN update_status TEXT DEFAULT NULL`); } catch (_) {}
  try { await query.run(`ALTER TABLE projects ADD COLUMN installed_audience INTEGER DEFAULT 0`); } catch (_) {}
  try { await query.run(`ALTER TABLE projects ADD COLUMN is_pinned INTEGER DEFAULT 0`); } catch (_) {}
  try { await query.run(`ALTER TABLE projects ADD COLUMN last_updated_date TEXT DEFAULT NULL`); } catch (_) {}

  // Column migrations for app_versions table (Bundle details)
  try { await query.run(`ALTER TABLE app_versions ADD COLUMN target_sdk INTEGER DEFAULT 36`); } catch (_) {}
  try { await query.run(`ALTER TABLE app_versions ADD COLUMN min_sdk INTEGER DEFAULT 24`); } catch (_) {}
  try { await query.run(`ALTER TABLE app_versions ADD COLUMN compliance_score INTEGER DEFAULT 100`); } catch (_) {}
  try { await query.run(`ALTER TABLE app_versions ADD COLUMN verdict TEXT DEFAULT 'READY'`); } catch (_) {}
  try { await query.run(`ALTER TABLE app_versions ADD COLUMN file_name TEXT DEFAULT NULL`); } catch (_) {}
  try { await query.run(`ALTER TABLE app_versions ADD COLUMN file_size_bytes INTEGER DEFAULT NULL`); } catch (_) {}
  try { await query.run(`ALTER TABLE app_versions ADD COLUMN release_track TEXT DEFAULT 'Production'`); } catch (_) {}

  // Seed default declarations for core enterprise apps if not existing
  const existingDeclarations = await query.all(`SELECT app_id FROM playstore_declarations`);
  if (!existingDeclarations || existingDeclarations.length === 0) {
    const defaultSignInsBtgs = JSON.stringify([
      { name: 'Staff account (employee)', username: 'staff_pilot_99', password: '•••SecureOtp99•••', instructions: 'Enter mobile 9876543210. Use default testing OTP 123456 to log into Ground Staff portal.' },
      { name: 'Employee ID tab', username: 'EMP-77012', password: '•••BavyaEmp77012•••', instructions: 'Select Employee ID sign-in tab, select Hyderabad Hub, bypass biometrics with Skip button.' },
      { name: 'Manager account', username: 'mgr_dispatch_ops', password: '•••GroundOps2026•••', instructions: 'Full access supervisor account for testing dispatch and flight telemetry rosters.' }
    ]);

    const defaultSignIns1962 = JSON.stringify([
      { name: 'Veterinary Doctor Account', username: 'doc_vas_bihar_01', password: '•••VasBiharDoc2026•••', instructions: 'Use Doctor portal tab. OTP auto-filled in staging mode for emergency dispatch.' },
      { name: 'Ambulance Pilot / Driver', username: 'driver_mvu_88', password: '•••MvuDriver1962•••', instructions: 'Mobile Veterinary Unit vehicle driver dashboard with emergency GPS routing.' }
    ]);

    await query.run(`
      INSERT OR IGNORE INTO playstore_declarations 
      (app_id, app_name, package_name, default_language, app_type, pricing_type, policy_confirmed, export_laws_accepted, privacy_policy_url, app_access_restricted, sign_in_details, contains_ads, content_rating_category, target_age_group)
      VALUES 
      ('btgs', 'Travelite Ground Staff', 'com.bavya.btgs', 'en-US', 'App', 'Free', 1, 1, '/privacy-policy.html', 1, ?, 0, 'Government / Utility / Health', '18+'),
      ('bh1962', 'BIHAR 1962 Ops', 'in.gov.bihar.vas1962', 'en-US', 'App', 'Free', 1, 1, '/privacy-policy.html', 1, ?, 0, 'Government / Utility / Health', '18+'),
      ('ops108', '108 Emergency Ops', 'in.bhspl.ops108', 'en-US', 'App', 'Free', 1, 1, '/privacy-policy.html', 1, ?, 0, 'Emergency Services / Health', '18+'),
      ('citizen104', '104 Health Grievance', 'in.bhspl.citizen104', 'en-US', 'App', 'Free', 1, 1, '/privacy-policy.html', 0, '[]', 0, 'Health & Medical', 'All Ages (3+)')
    `, [defaultSignInsBtgs, defaultSignIns1962, defaultSignIns1962]);
  }

  console.log('🏛️  Multi-Project Database schema initialized successfully');
}

module.exports = { db, query, initSchema };
