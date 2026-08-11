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
        (SELECT COUNT(*) FROM installations WHERE project_id = p.id) as total_installs,
        (SELECT COUNT(*) FROM crashes WHERE project_id = p.id AND status = 'open') as open_crashes,
        (SELECT version_name FROM app_versions WHERE project_id = p.id AND is_active = 1 ORDER BY build_number DESC LIMIT 1) as active_version,
        (SELECT is_force_update FROM app_versions WHERE project_id = p.id AND is_active = 1 ORDER BY build_number DESC LIMIT 1) as is_force_update
      FROM projects p
      ORDER BY p.created_at ASC
    `);

    res.status(200).json({ status: 'success', data: projects });
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch projects' });
  }
};

// 💻 Admin API: Register a new project/mobile app
exports.createProject = async (req, res) => {
  try {
    const { app_id, app_name, category = 'Government', platform = 'Android', icon_color = '#00F59B', description = '' } = req.body;

    if (!app_id || !app_name) {
      return res.status(400).json({ status: 'error', message: 'app_id and app_name are required' });
    }

    const cleanAppId = app_id.trim().toLowerCase();
    const apiKey = generateApiKey(cleanAppId);

    const result = await query.run(
      `INSERT INTO projects (app_id, app_name, category, platform, api_key, icon_color, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [cleanAppId, app_name.trim(), category, platform, apiKey, icon_color, description]
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
