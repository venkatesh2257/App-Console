const { query } = require('../config/db');
const { resolveProject } = require('./versionController');

// 📱 Mobile API: Track Installation / First App Open for any of the 20 apps
exports.recordInstall = async (req, res) => {
  try {
    const project = await resolveProject(req);
    if (!project) {
      return res.status(404).json({ status: 'error', message: 'Project / App not found' });
    }

    const {
      device_id,
      device_brand,
      device_model,
      os_type = 'Android',
      os_version,
      sdk_int,
      app_version,
      build_number,
      district,
      zone_id
    } = req.body;

    if (!device_id || !app_version) {
      return res.status(400).json({ status: 'error', message: 'device_id and app_version are required' });
    }

    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    const existing = await query.get(
      `SELECT id, installed_at FROM installations WHERE project_id = ? AND device_id = ?`,
      [project.id, device_id]
    );

    let isNewInstall = false;

    if (existing) {
      await query.run(
        `UPDATE installations SET 
          app_version = ?, build_number = ?, os_version = ?, sdk_int = ?,
          device_brand = COALESCE(?, device_brand), device_model = COALESCE(?, device_model),
          district = COALESCE(?, district), zone_id = COALESCE(?, zone_id),
          ip_address = ?, last_active_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [app_version, build_number, os_version, sdk_int, device_brand, device_model, district, zone_id, ip_address, existing.id]
      );
    } else {
      isNewInstall = true;
      await query.run(
        `INSERT INTO installations (
          project_id, device_id, device_brand, device_model, os_type, os_version, sdk_int,
          app_version, build_number, ip_address, district, zone_id, installed_at, last_active_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [project.id, device_id, device_brand, device_model, os_type, os_version, sdk_int, app_version, build_number, ip_address, district, zone_id]
      );
    }

    return res.status(200).json({
      status: 'success',
      message: isNewInstall ? 'Installation recorded' : 'Device status updated',
      data: {
        app_id: project.app_id,
        is_new_install: isNewInstall,
        device_id: device_id
      }
    });
  } catch (error) {
    console.error('❌ Error recording install:', error);
    res.status(500).json({ status: 'error', message: 'Failed to record installation' });
  }
};

// 📱 Mobile API: Session Heartbeat
exports.recordSession = async (req, res) => {
  try {
    const project = await resolveProject(req);
    if (!project) return res.status(404).json({ status: 'error', message: 'Project not found' });

    const {
      session_id,
      device_id,
      app_version,
      user_id,
      user_name,
      role_id,
      district,
      duration_seconds = 30
    } = req.body;

    if (!session_id || !device_id) {
      return res.status(400).json({ status: 'error', message: 'session_id and device_id are required' });
    }

    await query.run(
      `UPDATE installations SET last_active_at = CURRENT_TIMESTAMP, app_version = COALESCE(?, app_version) 
       WHERE project_id = ? AND device_id = ?`,
      [app_version, project.id, device_id]
    );

    const existingSession = await query.get(
      `SELECT id, duration_seconds FROM sessions WHERE project_id = ? AND session_id = ?`,
      [project.id, session_id]
    );

    if (existingSession) {
      await query.run(
        `UPDATE sessions SET duration_seconds = duration_seconds + ?, last_ping_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [duration_seconds, existingSession.id]
      );
    } else {
      await query.run(
        `INSERT INTO sessions (project_id, session_id, device_id, app_version, user_id, user_name, role_id, district, duration_seconds, started_at, last_ping_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [project.id, session_id, device_id, app_version || '1.0.0', user_id, user_name, role_id, district, duration_seconds]
      );
    }

    res.status(200).json({ status: 'success', message: 'Heartbeat acknowledged' });
  } catch (error) {
    console.error('❌ Error recording session:', error);
    res.status(500).json({ status: 'error', message: 'Failed to record session' });
  }
};

// 📱 Mobile API: Device Logs
exports.recordDeviceLogs = async (req, res) => {
  try {
    const project = await resolveProject(req);
    if (!project) return res.status(404).json({ status: 'error', message: 'Project not found' });

    const { device_id, session_id, logs } = req.body;

    if (!device_id || !Array.isArray(logs)) {
      return res.status(400).json({ status: 'error', message: 'device_id and logs array are required' });
    }

    for (const log of logs) {
      await query.run(
        `INSERT INTO device_logs (project_id, device_id, session_id, log_level, tag, message, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          project.id,
          device_id,
          session_id || null,
          log.level || 'INFO',
          log.tag || 'App',
          log.message || '',
          log.metadata ? JSON.stringify(log.metadata) : null
        ]
      );
    }

    res.status(200).json({ status: 'success', message: `Logged ${logs.length} events` });
  } catch (error) {
    console.error('❌ Error saving device logs:', error);
    res.status(500).json({ status: 'error', message: 'Failed to save logs' });
  }
};
