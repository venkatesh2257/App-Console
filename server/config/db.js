const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'console_multi_app.sqlite');
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
  `;

  await query.exec(schemaSQL);
  console.log('🏛️  Multi-Project Database schema initialized successfully');
}

module.exports = { db, query, initSchema };
