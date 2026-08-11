const { query } = require('../config/db');

async function seedDatabaseIfEmpty() {
  try {
    const projectCount = await query.get(`SELECT COUNT(*) as count FROM projects`);
    if (projectCount && projectCount.count > 0) {
      return;
    }

    console.log('🌱 Initializing clean enterprise app projects (Zero dummy crashes/installs)...');

    // Register Official Government & Enterprise Applications (Clean slate)
    const apps = [
      {
        app_id: 'in.gov.telangana.vas1962',
        app_name: '1962 Mobile Veterinary Unit',
        category: 'Government',
        platform: 'Android',
        api_key: 'app_key_vas1962_a98f12c409e3',
        icon_color: '#00F59B',
        desc: 'Official Livestock Health & Field Operations Mobile Application',
        version: '1.1.0',
        min_version: '1.1.0',
        build: 2,
        force_update: 1,
        download_url: 'http://139.167.190.26/portal/1962_v1.1.0.apk',
        release_notes: '• Production Release v1.1.0\n• Live GPS Tracking & Route Mapping\n• Enhanced offline sync'
      },
      {
        app_id: 'in.gov.attendance.erc',
        app_name: 'ERC Biometric Attendance',
        category: 'Government',
        platform: 'Android',
        api_key: 'app_key_erc_att_b78a99d231e4',
        icon_color: '#7952FF',
        desc: 'Facial & Fingerprint Staff Attendance System',
        version: '1.0.0',
        min_version: '1.0.0',
        build: 1,
        force_update: 0,
        download_url: 'http://139.167.190.26/portal/erc_attendance.apk',
        release_notes: '• Initial Production Build'
      },
      {
        app_id: 'in.gov.emergency.108',
        app_name: '108 Emergency Medical Response',
        category: 'Emergency',
        platform: 'Cross-Platform',
        api_key: 'app_key_emri108_c34e88f550a1',
        icon_color: '#FF4757',
        desc: 'Real-time Emergency Dispatch & Ambulance Navigation',
        version: '1.0.0',
        min_version: '1.0.0',
        build: 1,
        force_update: 0,
        download_url: 'http://139.167.190.26/portal/108_response.apk',
        release_notes: '• Initial Emergency Dispatch Release'
      }
    ];

    for (const app of apps) {
      const res = await query.run(
        `INSERT INTO projects (app_id, app_name, category, platform, api_key, icon_color, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [app.app_id, app.app_name, app.category, app.platform, app.api_key, app.icon_color, app.desc]
      );
      const projId = res.lastID;

      // Register official baseline version for each app
      await query.run(
        `INSERT INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          projId,
          app.version,
          app.build,
          app.min_version,
          app.force_update,
          `${app.app_name} Release`,
          app.release_notes,
          app.download_url
        ]
      );
    }

    console.log('✅ Real app projects registered with clean tables (0 fake installs, 0 fake crashes).');
  } catch (error) {
    console.error('⚠️  App setup warning:', error.message);
  }
}

module.exports = { seedDatabaseIfEmpty };
