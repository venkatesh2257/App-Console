const crypto = require('crypto');
const { query } = require('../config/db');
const { resolveProject } = require('./versionController');

function generateFingerprint(errorType, stackTrace) {
  const normalized = (stackTrace || '')
    .split('\n')
    .slice(0, 4)
    .map(line => line.trim().replace(/:[0-9]+:[0-9]+/g, ''))
    .join('|');
  return crypto.createHash('md5').update(`${errorType}_${normalized}`).digest('hex');
}

// 📱 Mobile API: Report a Crash for any app
exports.reportCrash = async (req, res) => {
  try {
    const project = await resolveProject(req);
    if (!project) return res.status(404).json({ status: 'error', message: 'Project not found' });

    const {
      error_type = 'FlutterError',
      error_message = 'Unknown Error',
      stack_trace = '',
      screen_name = 'Unknown',
      app_version = '1.0.0',
      build_number = 1,
      device_id,
      device_brand = 'Unknown',
      device_model = 'Unknown',
      os_version = 'Android',
      free_ram_mb = 0,
      total_ram_mb = 0,
      battery_percent = 0,
      is_background = 0,
      user_id = null,
      user_name = null,
      district = null,
      breadcrumbs = []
    } = req.body;

    if (!device_id || !stack_trace) {
      return res.status(400).json({ status: 'error', message: 'device_id and stack_trace are required' });
    }

    const fingerprint = generateFingerprint(error_type, stack_trace);

    const existing = await query.get(
      `SELECT id, occurrences_count FROM crashes WHERE project_id = ? AND issue_fingerprint = ?`,
      [project.id, fingerprint]
    );

    let crashId;
    if (existing) {
      crashId = existing.id;
      await query.run(
        `UPDATE crashes SET 
          occurrences_count = occurrences_count + 1,
          last_seen = CURRENT_TIMESTAMP,
          app_version = ?,
          device_id = ?,
          device_brand = ?,
          device_model = ?,
          os_version = ?,
          free_ram_mb = ?,
          battery_percent = ?,
          user_id = COALESCE(?, user_id),
          user_name = COALESCE(?, user_name)
         WHERE id = ?`,
        [app_version, device_id, device_brand, device_model, os_version, free_ram_mb, battery_percent, user_id, user_name, existing.id]
      );
    } else {
      const insertResult = await query.run(
        `INSERT INTO crashes (
          project_id, issue_fingerprint, error_type, error_message, stack_trace, screen_name,
          app_version, build_number, device_id, device_brand, device_model,
          os_version, free_ram_mb, total_ram_mb, battery_percent, is_background,
          user_id, user_name, district, status, occurrences_count, impacted_devices_count,
          first_seen, last_seen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          project.id, fingerprint, error_type, error_message, stack_trace, screen_name,
          app_version, build_number, device_id, device_brand, device_model,
          os_version, free_ram_mb, total_ram_mb, battery_percent, is_background ? 1 : 0,
          user_id, user_name, district
        ]
      );
      crashId = insertResult.lastID;
    }

    if (Array.isArray(breadcrumbs) && breadcrumbs.length > 0) {
      for (const crumb of breadcrumbs) {
        await query.run(
          `INSERT INTO device_logs (project_id, device_id, log_level, tag, message, metadata, created_at)
           VALUES (?, ?, 'CRUMB', ?, ?, ?, CURRENT_TIMESTAMP)`,
          [project.id, device_id, crumb.tag || 'Breadcrumb', crumb.message || '', JSON.stringify({ crash_id: crashId, ...crumb })]
        );
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Crash report recorded',
      data: { app_id: project.app_id, crash_id: crashId, fingerprint }
    });
  } catch (error) {
    console.error('❌ Error reporting crash:', error);
    res.status(500).json({ status: 'error', message: 'Failed to record crash' });
  }
};

// 💻 Admin API: List crashes (global or per project)
exports.getAllCrashes = async (req, res) => {
  try {
    const { projectId, status, version, search, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT c.*, p.app_name, p.app_id 
      FROM crashes c 
      JOIN projects p ON c.project_id = p.id 
      WHERE 1=1
    `;
    const params = [];

    if (projectId && projectId !== 'all') {
      sql += ` AND c.project_id = ?`;
      params.push(projectId);
    }

    if (status && status !== 'all') {
      sql += ` AND c.status = ?`;
      params.push(status);
    }

    if (version && version !== 'all') {
      sql += ` AND c.app_version = ?`;
      params.push(version);
    }

    if (search) {
      sql += ` AND (c.error_message LIKE ? OR c.error_type LIKE ? OR c.screen_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY c.last_seen DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const crashes = await query.all(sql, params);
    res.status(200).json({ status: 'success', data: crashes });
  } catch (error) {
    console.error('❌ Error fetching crashes:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve crashes' });
  }
};

// 💻 Admin API: Single crash inspection
exports.getCrashDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const crash = await query.get(
      `SELECT c.*, p.app_name, p.app_id FROM crashes c JOIN projects p ON c.project_id = p.id WHERE c.id = ?`,
      [id]
    );

    if (!crash) return res.status(404).json({ status: 'error', message: 'Crash not found' });

    const breadcrumbs = await query.all(
      `SELECT * FROM device_logs WHERE project_id = ? AND device_id = ? ORDER BY created_at DESC LIMIT 25`,
      [crash.project_id, crash.device_id]
    );

    res.status(200).json({ status: 'success', data: { crash, breadcrumbs: breadcrumbs.reverse() } });
  } catch (error) {
    console.error('❌ Error getting crash details:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve details' });
  }
};

// 💻 Admin API: Update status
exports.updateCrashStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await query.run(`UPDATE crashes SET status = ? WHERE id = ?`, [status, id]);
    const updated = await query.get(`SELECT * FROM crashes WHERE id = ?`, [id]);
    res.status(200).json({ status: 'success', message: `Status updated to ${status}`, data: updated });
  } catch (error) {
    console.error('❌ Error updating status:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update status' });
  }
};
