const crypto = require('crypto');
const { query } = require('../config/db');

// Helper to generate secure API keys for mobile apps
function generateApiKey(appId) {
  const hash = crypto.randomBytes(16).toString('hex');
  return `app_key_${appId.replace(/[^a-zA-Z0-9]/g, '_')}_${hash}`;
}

// 💻 Admin API: List all registered apps/projects
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await query.all(`
      SELECT p.*, 
        COALESCE(p.installed_audience, (SELECT COUNT(*) FROM installations WHERE project_id = p.id), 0) as total_installs,
        (SELECT COUNT(*) FROM crashes WHERE project_id = p.id AND status = 'open') as open_crashes,
        (SELECT version_name FROM app_versions WHERE project_id = p.id AND is_active = 1 ORDER BY build_number DESC LIMIT 1) as active_version,
        (SELECT build_number FROM app_versions WHERE project_id = p.id AND is_active = 1 ORDER BY build_number DESC LIMIT 1) as active_build_number,
        (SELECT is_force_update FROM app_versions WHERE project_id = p.id AND is_active = 1 ORDER BY build_number DESC LIMIT 1) as is_force_update
      FROM projects p
      ORDER BY p.is_pinned DESC, p.created_at ASC
    `);

    res.status(200).json({ status: 'success', data: projects });
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch projects' });
  }
};

// 💻 Admin API: Toggle Pin / Favorite on App
exports.togglePinProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await query.get(`SELECT id, is_pinned FROM projects WHERE id = ?`, [id]);
    if (!project) {
      return res.status(404).json({ status: 'error', message: 'Project not found' });
    }

    const newPinStatus = project.is_pinned ? 0 : 1;
    await query.run(`UPDATE projects SET is_pinned = ? WHERE id = ?`, [newPinStatus, id]);

    res.status(200).json({ status: 'success', message: 'Pin updated', is_pinned: newPinStatus });
  } catch (error) {
    console.error('❌ Error toggling pin:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update pin' });
  }
};

// 💻 Admin API: Delete a project / draft app
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await query.run(`DELETE FROM projects WHERE id = ?`, [id]);
    res.status(200).json({ status: 'success', message: 'Project deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting project:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete project' });
  }
};

// 💻 Admin API: Register a new project/mobile app
exports.createProject = async (req, res) => {
  try {
    const { app_id, app_name, category = 'Government', platform = 'Android', icon_color = '#00F59B', description = '', app_status = 'Production' } = req.body;

    if (!app_id || !app_name) {
      return res.status(400).json({ status: 'error', message: 'app_id and app_name are required' });
    }

    const cleanAppId = app_id.trim().toLowerCase();
    const apiKey = generateApiKey(cleanAppId);

    const result = await query.run(
      `INSERT INTO projects (app_id, app_name, category, platform, api_key, icon_color, app_status, installed_audience, is_pinned, last_updated_date, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 1)`,
      [cleanAppId, app_name.trim(), category, platform, apiKey, icon_color, app_status, 'Today', description]
    );

    // Create initial default version v1.0.0 for this app
    await query.run(
      `INSERT INTO app_versions (project_id, version_name, build_number, min_supported_version, is_force_update, title, release_notes, download_url, is_active)
       VALUES (?, '1.0.0', 1, '1.0.0', 0, ?, 'Initial Release', 'http://139.167.190.26/portal/app_v1.0.0.apk', 1)`,
      [result.lastID, `${app_name.trim()} v1.0.0`]
    );

    const newProject = await query.get(`SELECT * FROM projects WHERE id = ?`, [result.lastID]);
    res.status(201).json({ status: 'success', message: 'Project registered successfully', data: newProject });
  } catch (error) {
    console.error('❌ Error creating project:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create project' });
  }
};

// 💻 Admin API: Update project metadata, logo/icon_url, app_name, description
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { app_name, category, platform, icon_url, icon_color, description, app_status } = req.body;

    const project = await query.get(`SELECT id FROM projects WHERE id = ?`, [id]);
    if (!project) {
      return res.status(404).json({ status: 'error', message: 'Project not found' });
    }

    await query.run(
      `UPDATE projects 
       SET app_name = COALESCE(?, app_name),
           category = COALESCE(?, category),
           platform = COALESCE(?, platform),
           icon_url = COALESCE(?, icon_url),
           icon_color = COALESCE(?, icon_color),
           description = COALESCE(?, description),
           app_status = COALESCE(?, app_status),
           last_updated_date = 'Today'
       WHERE id = ?`,
      [app_name, category, platform, icon_url, icon_color, description, app_status, id]
    );

    const updated = await query.get(`SELECT * FROM projects WHERE id = ?`, [id]);
    res.status(200).json({ status: 'success', message: 'Project updated successfully', data: updated });
  } catch (error) {
    console.error('❌ Error updating project:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update project' });
  }
};

// 💻 Admin API: Get single project details
exports.getProjectDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await query.get(`SELECT * FROM projects WHERE id = ? OR app_id = ?`, [id, id]);

    if (!project) {
      return res.status(404).json({ status: 'error', message: 'Project not found' });
    }

    const versions = await query.all(`SELECT * FROM app_versions WHERE project_id = ? ORDER BY build_number DESC`, [project.id]);
    const stats = {
      total_installs: (await query.get(`SELECT COUNT(*) as c FROM installations WHERE project_id = ?`, [project.id])).c,
      total_crashes: (await query.get(`SELECT SUM(occurrences_count) as c FROM crashes WHERE project_id = ?`, [project.id])).c || 0,
      open_crashes: (await query.get(`SELECT COUNT(*) as c FROM crashes WHERE project_id = ? AND status = 'open'`, [project.id])).c,
    };

    res.status(200).json({ status: 'success', data: { project, versions, stats } });
  } catch (error) {
    console.error('❌ Error fetching project details:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch project details' });
  }
};
