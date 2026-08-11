const { query } = require('../config/db');

// 💻 Admin API: Overview KPI Dashboard Summary (Global or Per-Project)
exports.getOverviewKPIs = async (req, res) => {
  try {
    const { projectId } = req.query;
    let projectFilter = "";
    const params = [];

    if (projectId && projectId !== 'all') {
      projectFilter = "WHERE project_id = ?";
      params.push(projectId);
    }

    // 1. Total & Period Installs
    const totalInstalls = (await query.get(`SELECT COUNT(*) as count FROM installations ${projectFilter}`, params)).count;
    const installsToday = (await query.get(`SELECT COUNT(*) as count FROM installations ${projectFilter ? projectFilter + " AND" : "WHERE"} DATE(installed_at) = DATE('now')`, params)).count;
    const installsThisWeek = (await query.get(`SELECT COUNT(*) as count FROM installations ${projectFilter ? projectFilter + " AND" : "WHERE"} installed_at >= DATE('now', '-7 days')`, params)).count;
    const installsThisMonth = (await query.get(`SELECT COUNT(*) as count FROM installations ${projectFilter ? projectFilter + " AND" : "WHERE"} installed_at >= DATE('now', '-30 days')`, params)).count;

    // 2. Active Devices (DAU, WAU, MAU)
    const activeToday = (await query.get(`SELECT COUNT(DISTINCT device_id) as count FROM installations ${projectFilter ? projectFilter + " AND" : "WHERE"} DATE(last_active_at) = DATE('now')`, params)).count;
    const activeThisWeek = (await query.get(`SELECT COUNT(DISTINCT device_id) as count FROM installations ${projectFilter ? projectFilter + " AND" : "WHERE"} last_active_at >= DATE('now', '-7 days')`, params)).count;
    const activeThisMonth = (await query.get(`SELECT COUNT(DISTINCT device_id) as count FROM installations ${projectFilter ? projectFilter + " AND" : "WHERE"} last_active_at >= DATE('now', '-30 days')`, params)).count;

    // 3. Crashes & Health
    const totalCrashes = (await query.get(`SELECT SUM(occurrences_count) as count FROM crashes ${projectFilter}`, params)).count || 0;
    const openCrashes = (await query.get(`SELECT COUNT(*) as count FROM crashes ${projectFilter ? projectFilter + " AND" : "WHERE"} status = 'open'`, params)).count;
    const devicesWithCrashes = (await query.get(`SELECT COUNT(DISTINCT device_id) as count FROM crashes ${projectFilter}`, params)).count || 0;

    const crashFreeUsersPercentage = totalInstalls > 0 
      ? (((totalInstalls - devicesWithCrashes) / totalInstalls) * 100).toFixed(1)
      : '100.0';

    // 4. Project breakdown (if viewing all)
    const projectsDistribution = await query.all(`
      SELECT p.id, p.app_id, p.app_name, p.icon_color, COUNT(i.id) as installs_count
      FROM projects p
      LEFT JOIN installations i ON p.id = i.project_id
      GROUP BY p.id
      ORDER BY installs_count DESC
    `);

    // 5. Version breakdown for selected project
    const versionDistribution = await query.all(`
      SELECT app_version, COUNT(*) as device_count
      FROM installations 
      ${projectFilter}
      GROUP BY app_version 
      ORDER BY device_count DESC
    `, params);

    // 6. Recent Crashes
    const recentCrashes = await query.all(`
      SELECT c.*, p.app_name, p.app_id 
      FROM crashes c 
      JOIN projects p ON c.project_id = p.id
      ${projectFilter ? "WHERE c.project_id = ?" : ""}
      ORDER BY c.last_seen DESC LIMIT 5
    `, params);

    // 7. Active Version Control status (if single project selected)
    let activeVersionConfig = null;
    if (projectId && projectId !== 'all') {
      activeVersionConfig = await query.get(
        `SELECT * FROM app_versions WHERE project_id = ? AND is_active = 1 ORDER BY build_number DESC LIMIT 1`,
        [projectId]
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        kpis: {
          total_installations: totalInstalls,
          installs_today: installsToday,
          installs_this_week: installsThisWeek,
          installs_this_month: installsThisMonth,
          dau: activeToday,
          wau: activeThisWeek,
          mau: activeThisMonth,
          total_crashes: totalCrashes,
          open_crash_issues: openCrashes,
          crash_free_users_percent: crashFreeUsersPercentage,
          total_apps_count: projectsDistribution.length
        },
        projects_distribution: projectsDistribution,
        version_control: activeVersionConfig,
        version_distribution: versionDistribution,
        recent_crashes: recentCrashes
      }
    });
  } catch (error) {
    console.error('❌ Error getting overview KPIs:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve metrics' });
  }
};

// 💻 Admin API: Timeseries Chart Data
exports.getTimeSeriesData = async (req, res) => {
  try {
    const { projectId, period = '30d' } = req.query;

    let groupFormat = '%Y-%m-%d';
    let sqlCondition = "installed_at >= DATE('now', '-30 days')";
    let crashCondition = "first_seen >= DATE('now', '-30 days')";

    if (period === 'today') {
      groupFormat = '%H:00';
      sqlCondition = "DATE(installed_at) = DATE('now')";
      crashCondition = "DATE(first_seen) = DATE('now')";
    } else if (period === '7d') {
      groupFormat = '%Y-%m-%d';
      sqlCondition = "installed_at >= DATE('now', '-7 days')";
      crashCondition = "first_seen >= DATE('now', '-7 days')";
    } else if (period === '1y') {
      groupFormat = '%Y-%m';
      sqlCondition = "installed_at >= DATE('now', '-365 days')";
      crashCondition = "first_seen >= DATE('now', '-365 days')";
    } else if (period === 'all') {
      groupFormat = '%Y-%m';
      sqlCondition = "1=1";
      crashCondition = "1=1";
    }

    const params = [];
    if (projectId && projectId !== 'all') {
      sqlCondition += " AND project_id = ?";
      crashCondition += " AND project_id = ?";
      params.push(projectId);
    }

    const installTrend = await query.all(`
      SELECT STRFTIME('${groupFormat}', installed_at) as time_label, COUNT(*) as count
      FROM installations
      WHERE ${sqlCondition}
      GROUP BY time_label ORDER BY time_label ASC
    `, params);

    const crashTrend = await query.all(`
      SELECT STRFTIME('${groupFormat}', first_seen) as time_label, SUM(occurrences_count) as count
      FROM crashes
      WHERE ${crashCondition}
      GROUP BY time_label ORDER BY time_label ASC
    `, params);

    res.status(200).json({
      status: 'success',
      data: {
        period,
        installations: installTrend,
        crashes: crashTrend
      }
    });
  } catch (error) {
    console.error('❌ Error getting timeseries data:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve timeseries data' });
  }
};

// 💻 Admin API: Export Comprehensive Gov Audit Report as CSV or JSON
exports.exportReport = async (req, res) => {
  try {
    const { projectId, format = 'csv', type = 'installations' } = req.query;

    let filter = "";
    const params = [];
    if (projectId && projectId !== 'all') {
      filter = "WHERE i.project_id = ?";
      params.push(projectId);
    }

    if (type === 'crashes') {
      const crashes = await query.all(`
        SELECT c.*, p.app_name, p.app_id 
        FROM crashes c 
        JOIN projects p ON c.project_id = p.id 
        ${projectId && projectId !== 'all' ? 'WHERE c.project_id = ?' : ''}
        ORDER BY c.occurrences_count DESC
      `, params);

      if (format === 'json') return res.json(crashes);

      let csv = 'App Name,App ID,Error Type,Error Message,Screen,App Version,Device Model,OS Version,Status,Occurrences,First Seen,Last Seen\n';
      crashes.forEach(c => {
        csv += `"${c.app_name}","${c.app_id}","${(c.error_type || '').replace(/"/g, '""')}","${(c.error_message || '').replace(/"/g, '""')}","${c.screen_name || ''}","${c.app_version}","${c.device_model || ''}","${c.os_version || ''}","${c.status}","${c.occurrences_count}","${c.first_seen}","${c.last_seen}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="multi_app_crashes_report.csv"');
      return res.send(csv);
    } else {
      const installs = await query.all(`
        SELECT i.*, p.app_name, p.app_id 
        FROM installations i 
        JOIN projects p ON i.project_id = p.id 
        ${filter} 
        ORDER BY i.installed_at DESC
      `, params);

      if (format === 'json') return res.json(installs);

      let csv = 'App Name,App ID,Device ID,Brand,Model,OS Version,SDK,App Version,Build,District,Zone,Installed At,Last Active\n';
      installs.forEach(i => {
        csv += `"${i.app_name}","${i.app_id}","${i.device_id}","${i.device_brand || ''}","${i.device_model || ''}","${i.os_version || ''}","${i.sdk_int || ''}","${i.app_version}","${i.build_number || ''}","${i.district || ''}","${i.zone_id || ''}","${i.installed_at}","${i.last_active_at}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="multi_app_installations_kpi.csv"');
      return res.send(csv);
    }
  } catch (error) {
    console.error('❌ Error exporting report:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate export report' });
  }
};
