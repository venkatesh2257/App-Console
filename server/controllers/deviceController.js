const { query } = require('../config/db');

// 💻 Admin API: List devices (filtered by project or all)
exports.getAllDevices = async (req, res) => {
  try {
    const { projectId, search, version, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT i.*, p.app_name, p.app_id 
      FROM installations i 
      JOIN projects p ON i.project_id = p.id 
      WHERE 1=1
    `;
    const params = [];

    if (projectId && projectId !== 'all') {
      sql += ` AND i.project_id = ?`;
      params.push(projectId);
    }

    if (version && version !== 'all') {
      sql += ` AND i.app_version = ?`;
      params.push(version);
    }

    if (search) {
      sql += ` AND (i.device_id LIKE ? OR i.device_model LIKE ? OR i.district LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY i.last_active_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const devices = await query.all(sql, params);
    res.status(200).json({ status: 'success', data: devices });
  } catch (error) {
    console.error('❌ Error fetching devices:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch devices' });
  }
};

// 💻 Admin API: Get device logs
exports.getDeviceLogs = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { projectId } = req.query;

    let sql = `SELECT * FROM installations WHERE device_id = ?`;
    const params = [deviceId];
    if (projectId && projectId !== 'all') {
      sql += ` AND project_id = ?`;
      params.push(projectId);
    }

    const device = await query.get(sql, params);
    if (!device) return res.status(404).json({ status: 'error', message: 'Device not found' });

    const logs = await query.all(
      `SELECT * FROM device_logs WHERE device_id = ? ORDER BY created_at DESC LIMIT 100`,
      [deviceId]
    );

    res.status(200).json({ status: 'success', data: { device, logs: logs.reverse() } });
  } catch (error) {
    console.error('❌ Error fetching device logs:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch logs' });
  }
};
