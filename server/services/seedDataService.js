const { query } = require('../config/db');

async function seedDatabaseIfEmpty() {
  try {
    const projectCount = await query.get(`SELECT COUNT(*) as count FROM projects`);
    if (projectCount && projectCount.count > 0) {
      console.log('📦 Database already seeded with multi-app projects.');
      return;
    }

    console.log('🌱 Seeding multi-project enterprise apps catalog...');

    // 1. Projects Registry (Multiple Apps in the company)
    const apps = [
      {
        app_id: 'in.gov.telangana.vas1962',
        app_name: '1962 Mobile Veterinary Unit',
        category: 'Government',
        platform: 'Android',
        api_key: 'app_key_vas1962_a98f12c409e3',
        icon_color: '#00F59B',
        desc: 'Official Livestock Health & Field Operations Mobile Application'
      },
      {
        app_id: 'in.gov.attendance.erc',
        app_name: 'ERC Biometric Attendance',
        category: 'Government',
        platform: 'Android',
        api_key: 'app_key_erc_att_b78a99d231e4',
        icon_color: '#7952FF',
        desc: 'Facial & Fingerprint Staff Attendance System'
      },
      {
        app_id: 'in.gov.emergency.108',
        app_name: '108 Emergency Medical Response',
        category: 'Emergency',
        platform: 'Cross-Platform',
        api_key: 'app_key_emri108_c34e88f550a1',
        icon_color: '#FF4757',
        desc: 'Real-time Emergency Dispatch & Ambulance Navigation'
      },
      {
        app_id: 'in.gov.citizen.dial100',
        app_name: 'Dial 100 Citizen Safety',
        category: 'Public Safety',
        platform: 'Android',
        api_key: 'app_key_dial100_d12a77b889c2',
        icon_color: '#00F0FF',
        desc: 'Citizen SOS & Police Quick Response Mobile Portal'
      }
    ];

    for (const app of apps) {
      const res = await query.run(
        `INSERT INTO projects (app_id, app_name, category, platform, api_key, icon_color, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [app.app_id, app.app_name, app.category, app.platform, app.api_key, app.icon_color, app.desc]
      );
      const projId = res.lastID;

      // Seed Versions for each app
      if (app.app_id === 'in.gov.telangana.vas1962') {
        await query.run(
          `INSERT INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active)
           VALUES (?, '1.0.0', 1, '1.0.0', 0, 'Initial Release', 'Initial pilot release', 'http://139.167.190.26/portal/1962_v1.0.0.apk', 0)`,
          [projId]
        );
        await query.run(
          `INSERT INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active)
           VALUES (?, '1.1.0', 2, '1.1.0', 1, '1962 MVU Production Release', '• Biometric attendance sync\n• Camera memory fixes\n• Real-time trip route tracking', 'http://139.167.190.26/portal/1962_v1.1.0.apk', 1)`,
          [projId]
        );

        // Seed sample installations for VAS 1962
        const sampleDevices = [
          { id: 'DEV-VAS-001', brand: 'Samsung', model: 'Galaxy Tab A9', os: 'Android 14', v: '1.1.0', b: 2, dist: 'Hyderabad' },
          { id: 'DEV-VAS-002', brand: 'Samsung', model: 'Galaxy Tab A8', os: 'Android 13', v: '1.1.0', b: 2, dist: 'Rangareddy' },
          { id: 'DEV-VAS-003', brand: 'Redmi', model: 'Note 12 Pro', os: 'Android 13', v: '1.0.0', b: 1, dist: 'Warangal' },
          { id: 'DEV-VAS-004', brand: 'Realme', model: 'Narzo 60', os: 'Android 13', v: '1.0.0', b: 1, dist: 'Nalgonda' }
        ];

        for (const d of sampleDevices) {
          await query.run(
            `INSERT INTO installations (project_id, device_id, device_brand, device_model, os_type, os_version, sdk_int, app_version, build_number, district, installed_at, last_active_at)
             VALUES (?, ?, ?, ?, 'Android', ?, 34, ?, ?, ?, DATE('now', '-5 days'), CURRENT_TIMESTAMP)`,
            [projId, d.id, d.brand, d.model, d.os, d.v, d.b, d.dist]
          );
        }

        // Seed sample crash for VAS 1962
        await query.run(
          `INSERT INTO crashes (
            project_id, issue_fingerprint, error_type, error_message, stack_trace, screen_name,
            app_version, build_number, device_id, device_brand, device_model,
            os_version, free_ram_mb, total_ram_mb, battery_percent, status, occurrences_count, first_seen, last_seen
          ) VALUES (?, 'fp_vas_location_null', 'NullCheckError', 'Null check operator used on null value in TripController.getCurrentPosition()', '#0 TripController.updateLiveLocation\n#1 CustomLocationStreamState.onData', 'ManageTripScreen', '1.0.0', 1, 'DEV-VAS-003', 'Redmi', 'Note 12 Pro', 'Android 13', 420, 6144, 52, 'open', 8, DATE('now', '-3 days'), CURRENT_TIMESTAMP)`,
          [projId]
        );
      } else {
        // Default version for other apps
        await query.run(
          `INSERT INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active)
           VALUES (?, '1.0.0', 1, '1.0.0', 0, ?, 'Production Ready Build', 'http://139.167.190.26/portal/app.apk', 1)`,
          [projId, `${app.app_name} v1.0.0`]
        );

        // Seed 2 installs for each app
        await query.run(
          `INSERT INTO installations (project_id, device_id, device_brand, device_model, os_type, os_version, sdk_int, app_version, build_number, district, installed_at, last_active_at)
           VALUES (?, ?, 'Samsung', 'Galaxy Tab A9', 'Android', 'Android 14', 34, '1.0.0', 1, 'Hyderabad', DATE('now', '-2 days'), CURRENT_TIMESTAMP)`,
          [projId, `DEV-${app.app_id.substring(7, 12).toUpperCase()}-001`]
        );
      }
    }

    console.log('✅ Enterprise multi-app catalog seeded successfully.');
  } catch (error) {
    console.error('⚠️  Seed error:', error.message);
  }
}

module.exports = { seedDatabaseIfEmpty };
