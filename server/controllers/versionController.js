const { query } = require('../config/db');

function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const parts1 = v1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = v2.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

// Helper to resolve project ID from request
async function resolveProject(req) {
  const appId = req.headers['x-app-id'] || req.query.app_id || req.body.app_id;
  const apiKey = req.headers['x-api-key'] || req.query.api_key || req.body.api_key;

  if (apiKey) {
    const p = await query.get(`SELECT * FROM projects WHERE api_key = ?`, [apiKey]);
    if (p) return p;
  }
  if (appId) {
    const p = await query.get(`SELECT * FROM projects WHERE app_id = ?`, [appId]);
    if (p) return p;
  }
  // Default to first active project if not specified
  return await query.get(`SELECT * FROM projects WHERE is_active = 1 ORDER BY id ASC LIMIT 1`);
}

// 📱 Mobile API: Version Handshake per Project
exports.checkVersion = async (req, res) => {
  try {
    const project = await resolveProject(req);
    if (!project) {
      return res.status(404).json({ status: 'error', message: 'Target project / app_id not found' });
    }

    const clientVersion = req.query.version || req.body.version || '1.0.0';
    const clientBuild = parseInt(req.query.buildNumber || req.body.buildNumber || '1', 10);

    const latestConfig = await query.get(
      `SELECT * FROM app_versions WHERE project_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1`,
      [project.id]
    );

    if (!latestConfig) {
      return res.status(200).json({
        status: 'success',
        data: {
          app_id: project.app_id,
          app_name: project.app_name,
          client_version: clientVersion,
          latest_version: clientVersion,
          min_supported_version: clientVersion,
          is_update_required: false,
          is_force_update: false,
          download_url: '',
          title: 'App is up to date',
          release_notes: 'Running latest build.'
        }
      });
    }

    const isBelowMinimum = compareVersions(clientVersion, latestConfig.min_supported_version) < 0;
    const isBelowLatest = compareVersions(clientVersion, latestConfig.version_name) < 0;
    const forceUpdateMandatory = isBelowMinimum || Boolean(latestConfig.is_force_update && isBelowLatest);
    const updateAvailable = isBelowLatest;

    return res.status(200).json({
      status: 'success',
      data: {
        app_id: project.app_id,
        app_name: project.app_name,
        client_version: clientVersion,
        client_build_number: clientBuild,
        latest_version: latestConfig.version_name,
        latest_build_number: latestConfig.build_number,
        min_supported_version: latestConfig.min_supported_version,
        is_update_required: updateAvailable,
        is_force_update: forceUpdateMandatory,
        update_type: forceUpdateMandatory ? 'MANDATORY_FORCE_UPDATE' : (updateAvailable ? 'OPTIONAL_UPDATE' : 'NONE'),
        download_url: latestConfig.download_url,
        title: forceUpdateMandatory ? 'Critical Update Required' : (updateAvailable ? 'New Update Available' : 'Up to Date'),
        release_notes: latestConfig.release_notes || 'Performance improvements and bug fixes.',
        server_time: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Version check error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error during version check' });
  }
};

// 💻 Admin API: List versions for a project
exports.getProjectVersions = async (req, res) => {
  try {
    const { projectId } = req.params;
    const versions = await query.all(
      `SELECT * FROM app_versions WHERE project_id = ? ORDER BY build_number DESC, created_at DESC`,
      [projectId]
    );
    res.status(200).json({ status: 'success', data: versions });
  } catch (error) {
    console.error('❌ Error fetching versions:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch versions' });
  }
};

// 💻 Admin API: Create a version release for a project
exports.createVersion = async (req, res) => {
  try {
    const { project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url } = req.body;

    if (!project_id || !version_name || !build_number || !min_supported_version || !download_url) {
      return res.status(400).json({ status: 'error', message: 'Missing required version fields.' });
    }

    const result = await query.run(
      `INSERT INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [project_id, version_name, parseInt(build_number, 10), min_supported_version, is_force_update ? 1 : 0, title || `Version ${version_name}`, release_notes, download_url]
    );

    const newVersion = await query.get(`SELECT * FROM app_versions WHERE id = ?`, [result.lastID]);
    res.status(201).json({ status: 'success', message: 'Version release created', data: newVersion });
  } catch (error) {
    console.error('❌ Error creating version:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create version' });
  }
};

// 💻 Admin API: Quick toggle force update
exports.toggleForceUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_force_update, min_supported_version } = req.body;

    let sql = `UPDATE app_versions SET is_force_update = ?, updated_at = CURRENT_TIMESTAMP`;
    const params = [is_force_update ? 1 : 0];

    if (min_supported_version) {
      sql += `, min_supported_version = ?`;
      params.push(min_supported_version);
    }
    sql += ` WHERE id = ?`;
    params.push(id);

    await query.run(sql, params);
    const updated = await query.get(`SELECT * FROM app_versions WHERE id = ?`, [id]);
    res.status(200).json({ status: 'success', message: 'Force update rule updated', data: updated });
  } catch (error) {
    console.error('❌ Error toggling force update:', error);
    res.status(500).json({ status: 'error', message: 'Failed to toggle force update' });
  }
};

module.exports.resolveProject = resolveProject;
