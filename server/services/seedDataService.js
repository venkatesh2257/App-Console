const { query } = require('../config/db');

async function seedDatabaseIfEmpty() {
  try {
    const projectCount = await query.get(`SELECT COUNT(*) as count FROM projects`);
    if (projectCount && projectCount.count > 0) {
      return;
    }

    console.log('🌱 Initializing clean production database with 1962 VAS App (Zero dummy data)...');

    // 1. Register only the real 1962 VAS App
    const res = await query.run(
      `INSERT INTO projects (app_id, app_name, category, platform, api_key, icon_color, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        'in.gov.telangana.vas1962',
        '1962 Mobile Veterinary Unit',
        'Government',
        'Android',
        'app_key_vas1962_a98f12c409e3',
        '#00F59B',
        'Official Livestock Health & Field Operations Mobile Application'
      ]
    );
    const projId = res.lastID;

    // 2. Set Version 1.1.0 as the active baseline release with force update enabled
    await query.run(
      `INSERT INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active)
       VALUES (?, '1.1.0', 2, '1.1.0', 1, '1962 MVU Production Release v1.1.0', '• Live GPS Tracking & Trip Mapping\n• Enhanced offline biometric sync\n• Performance optimizations', 'http://139.167.190.26/portal/1962_v1.1.0.apk', 1)`,
      [projId]
    );

    // No dummy installations
    // No dummy crashes
    // No dummy device logs
    console.log('✅ Clean database ready: 1 Real Project (1962 VAS), 0 Mock Crashes, 0 Mock Installs.');
  } catch (error) {
    console.error('⚠️ App setup warning:', error.message);
  }
}

module.exports = { seedDatabaseIfEmpty };
