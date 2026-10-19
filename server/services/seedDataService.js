const crypto = require('crypto');
const { query } = require('../config/db');

function generateApiKey(appId) {
  const hash = crypto.randomBytes(16).toString('hex');
  return `app_key_${appId.replace(/[^a-zA-Z0-9]/g, '_')}_${hash}`;
}

const ENTERPRISE_APPS_FLEET = [
  {
    app_id: 'com.bhspl.citizenapp104.citizenapp104',
    app_name: 'AP 104 Citizen App',
    category: 'Healthcare',
    platform: 'Android',
    app_status: 'Production',
    update_status: null,
    installed_audience: 19,
    is_pinned: 0,
    last_updated_date: 'Jan 13, 2026',
    icon_color: '#0284C7',
    description: 'Citizen grievance and health consultation mobile application for Andhra Pradesh.'
  },
  {
    app_id: 'com.bhspl.inspectionapp104',
    app_name: 'AP 104 Inspection App',
    category: 'Healthcare',
    platform: 'Android',
    app_status: 'Production',
    update_status: null,
    installed_audience: 291,
    is_pinned: 0,
    last_updated_date: 'Mar 5, 2026',
    icon_color: '#F59E0B',
    description: 'Field inspection and PHC telemetry monitoring application for 104 health teams.'
  },
  {
    app_id: 'trinity.ap.safecity',
    app_name: 'AP 108 Citizen APP',
    category: 'Emergency',
    platform: 'Android',
    app_status: 'Draft',
    update_status: null,
    installed_audience: 0,
    is_pinned: 0,
    last_updated_date: 'Nov 5, 2025',
    icon_color: '#DC2626',
    description: 'Citizen emergency ambulance dispatch and emergency SOS mobile service.'
  },
  {
    app_id: 'trinity.Ap108SafeCity.InspectionTool',
    app_name: 'AP 108 Inspection Tool',
    category: 'Emergency',
    platform: 'Android',
    app_status: 'Production',
    update_status: null,
    installed_audience: 289,
    is_pinned: 0,
    last_updated_date: 'Feb 12, 2026',
    icon_color: '#2563EB',
    description: 'Field quality assurance and ambulance vehicle inventory inspection tool.'
  },
  {
    app_id: 'com.bhspl.best',
    app_name: 'BHSPL - ONE',
    category: 'Enterprise',
    platform: 'Android',
    app_status: 'Production',
    update_status: null,
    installed_audience: 949,
    is_pinned: 0,
    last_updated_date: 'Jun 10, 2026',
    icon_color: '#7C3AED',
    description: 'Unified enterprise employee portal, HR attendance, and operations management.'
  },
  {
    app_id: 'in.bhspl.ops108',
    app_name: 'BHSPL Ops 108',
    category: 'Emergency Ops',
    platform: 'Android',
    app_status: 'Production',
    update_status: null,
    installed_audience: 134,
    is_pinned: 1,
    last_updated_date: 'Sep 28, 2026',
    icon_color: '#EA580C',
    description: 'Real-time emergency dispatch and ambulance telemetry coordination platform.'
  },
  {
    app_id: 'com.mvu.tracker',
    app_name: 'BHSPL-MVU-FA',
    category: 'Veterinary Ops',
    platform: 'Android',
    app_status: 'Production',
    update_status: null,
    installed_audience: 695,
    is_pinned: 0,
    last_updated_date: 'Feb 9, 2025',
    icon_color: '#059669',
    description: 'Mobile Veterinary Unit vehicle fleet tracking and field livestock telemetry.'
  },
  {
    app_id: 'in.bhspl.bavya1962',
    app_name: 'BIHAR 1962 Ops',
    category: 'Government Ops',
    platform: 'Android',
    app_status: 'Draft',
    update_status: 'In review',
    installed_audience: 0,
    is_pinned: 1,
    last_updated_date: 'Sep 23, 2026',
    icon_color: '#4F46E5',
    description: 'Bihar Mobile Veterinary Unit field doctor and clinical operation hub.'
  },
  {
    app_id: 'in.apems.clinozen.deo',
    app_name: 'Bavya Capture',
    category: 'Healthcare',
    platform: 'Android',
    app_status: 'Production',
    update_status: null,
    installed_audience: 267,
    is_pinned: 1,
    last_updated_date: 'Aug 13, 2026',
    icon_color: '#DB2777',
    description: 'Clinical electronic medical records capture and diagnostic telemetry tool.'
  },
  {
    app_id: 'com.consumption.bavya.consumptionapp',
    app_name: 'Bavya Consumption',
    category: 'Healthcare',
    platform: 'Android',
    app_status: 'Production',
    update_status: null,
    installed_audience: 227,
    is_pinned: 0,
    last_updated_date: 'Jul 27, 2026',
    icon_color: '#D97706',
    description: 'Pharmaceutical inventory, clinical supplies, and medicine consumption tracker.'
  },
  {
    app_id: 'com.bavya.btgs',
    app_name: 'Travelite BTGS',
    category: 'Logistics',
    platform: 'Android',
    app_status: 'Production',
    update_status: null,
    installed_audience: 512,
    is_pinned: 1,
    last_updated_date: 'Sep 29, 2026',
    icon_color: '#2563EB',
    description: 'Travelite ground operations, flight crew telemetry, and fleet management system.'
  }
];

async function seedDatabaseIfEmpty() {
  try {
    for (const app of ENTERPRISE_APPS_FLEET) {
      const existing = await query.get(`SELECT * FROM projects WHERE app_id = ?`, [app.app_id]);
      if (!existing) {
        const apiKey = generateApiKey(app.app_id);
        const res = await query.run(
          `INSERT INTO projects (app_id, app_name, category, platform, api_key, icon_color, app_status, update_status, installed_audience, is_pinned, last_updated_date, description, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            app.app_id,
            app.app_name,
            app.category,
            app.platform,
            apiKey,
            app.icon_color,
            app.app_status,
            app.update_status,
            app.installed_audience,
            app.is_pinned,
            app.last_updated_date,
            app.description
          ]
        );

        // Add version entry
        const isBtgs = app.app_id === 'com.bavya.btgs';
        const vName = isBtgs ? '6.0.3' : '1.0.0';
        const vBuild = isBtgs ? 11 : 1;
        const vTitle = isBtgs ? 'Travelite BTGS v6.0.3 (Build 11)' : `${app.app_name} v1.0.0`;
        const vNotes = isBtgs ? 'Production Release (Bundle 6.0.3+11 with Photo Picker & 16KB support)' : 'Production Release';
        const vFile = isBtgs ? 'app-release.aab' : 'app-release.apk';

        await query.run(
          `INSERT OR IGNORE INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active, target_sdk, min_sdk, compliance_score, verdict, file_name)
           VALUES (?, ?, ?, ?, 0, ?, ?, 'http://139.167.190.26/portal/app.aab', 1, 36, 24, 100, 'READY', ?)`,
          [res.lastID, vName, vBuild, vName, vTitle, vNotes, vFile]
        );
      } else {
        // Update metadata if columns were newly added
        await query.run(
          `UPDATE projects 
           SET app_status = COALESCE(app_status, ?),
               update_status = COALESCE(update_status, ?),
               installed_audience = CASE WHEN installed_audience = 0 THEN ? ELSE installed_audience END,
               is_pinned = COALESCE(is_pinned, ?),
               last_updated_date = COALESCE(last_updated_date, ?)
           WHERE app_id = ?`,
          [app.app_status, app.update_status, app.installed_audience, app.is_pinned, app.last_updated_date, app.app_id]
        );

        // Ensure BTGS has version 6.0.3 build 11
        if (app.app_id === 'com.bavya.btgs') {
          const btgsV6 = await query.get(`SELECT id FROM app_versions WHERE project_id = ? AND version_name = '6.0.3'`, [existing.id]);
          if (!btgsV6) {
            await query.run(
              `INSERT INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active, target_sdk, min_sdk, compliance_score, verdict, file_name)
               VALUES (?, '6.0.3', 11, '6.0.3', 0, 'Travelite BTGS v6.0.3', 'Production Release (Bundle 6.0.3+11)', 'http://139.167.190.26/portal/app.aab', 1, 36, 24, 100, 'READY', 'app-release.aab')`,
              [existing.id]
            );
          }
          await query.run(`UPDATE app_versions SET is_active = 1 WHERE project_id = ? AND version_name = '6.0.3'`, [existing.id]);
        }
      }
    }
    console.log(`✅ Enterprise Apps Fleet seeded: ${ENTERPRISE_APPS_FLEET.length} Google Play apps ready.`);
  } catch (error) {
    console.error('⚠️ App setup warning:', error.message);
  }
}

module.exports = { seedDatabaseIfEmpty, ENTERPRISE_APPS_FLEET };

