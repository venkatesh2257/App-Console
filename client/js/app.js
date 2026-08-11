// Main App Console Coordinator
let currentPeriod = '30d';

const App = {
  async init() {
    this.bindEvents();
    await Projects.loadProjects();
    this.loadOverview();
    VersionManager.loadVersions(selectedProjectId);
    CrashViewer.loadCrashes(selectedProjectId);
    this.loadDevices();

    // ⚡ Real-Time Live Auto-Refresh every 6 seconds
    setInterval(() => {
      this.loadOverview();
    }, 6000);
  },

  bindEvents() {
    // 1. Sidebar Tab Switching
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        switchTab(tabId);
      });
    });

    // 2. Project Switcher in Header
    document.getElementById('select-active-project')?.addEventListener('change', (e) => {
      selectedProjectId = e.target.value;
      this.handleProjectChange();
    });

    // 3. Period Filter Pills
    document.querySelectorAll('#period-filters .period-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#period-filters .period-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentPeriod = pill.getAttribute('data-period');
        this.loadOverview();
      });
    });

    // 4. Modals & Actions
    document.getElementById('btn-open-new-app')?.addEventListener('click', () => openModal('modal-create-project'));
    document.getElementById('btn-save-project')?.addEventListener('click', () => Projects.createProject());
    document.getElementById('btn-create-version-modal')?.addEventListener('click', () => VersionManager.openNewVersionModal());
    document.getElementById('btn-save-version')?.addEventListener('click', () => VersionManager.saveVersion());
    document.getElementById('btn-refresh-data')?.addEventListener('click', () => this.refreshAll());

    // 5. Force Update Master Toggle
    document.getElementById('toggle-force-update-master')?.addEventListener('change', (e) => {
      VersionManager.handleMasterToggle(e.target.checked);
    });

    // 6. Crash Filters
    document.getElementById('search-crashes')?.addEventListener('input', debounce(() => CrashViewer.loadCrashes(selectedProjectId), 300));
    document.getElementById('filter-crash-status')?.addEventListener('change', () => CrashViewer.loadCrashes(selectedProjectId));

    // 7. Crash Modal Actions
    document.getElementById('btn-status-investigating')?.addEventListener('click', () => CrashViewer.updateStatus('investigating'));
    document.getElementById('btn-status-resolved')?.addEventListener('click', () => CrashViewer.updateStatus('resolved'));
    document.getElementById('btn-copy-stacktrace')?.addEventListener('click', () => {
      const text = document.getElementById('crash-modal-stacktrace').textContent;
      navigator.clipboard.writeText(text);
      alert('Stack trace copied to clipboard!');
    });

    // 8. Device Search
    document.getElementById('search-devices')?.addEventListener('input', debounce(() => this.loadDevices(), 300));
  },

  handleProjectChange() {
    this.loadOverview();
    VersionManager.loadVersions(selectedProjectId);
    CrashViewer.loadCrashes(selectedProjectId);
    this.loadDevices();
    this.updateExportLinks();
  },

  updateExportLinks() {
    const installsCsv = document.getElementById('btn-export-installs-csv');
    const installsJson = document.getElementById('btn-export-installs-json');
    const crashesCsv = document.getElementById('btn-export-crashes-csv');
    const crashesJson = document.getElementById('btn-export-crashes-json');

    if (installsCsv) installsCsv.href = `/api/v1/admin/export?type=installations&format=csv&projectId=${selectedProjectId}`;
    if (installsJson) installsJson.href = `/api/v1/admin/export?type=installations&format=json&projectId=${selectedProjectId}`;
    if (crashesCsv) crashesCsv.href = `/api/v1/admin/export?type=crashes&format=csv&projectId=${selectedProjectId}`;
    if (crashesJson) crashesJson.href = `/api/v1/admin/export?type=crashes&format=json&projectId=${selectedProjectId}`;
  },

  async loadOverview() {
    try {
      const [overviewRes, timeseriesRes] = await Promise.all([
        API.getOverview(selectedProjectId),
        API.getTimeSeries(currentPeriod, selectedProjectId)
      ]);

      const { kpis, projects_distribution = [], version_distribution = [], recent_crashes = [] } = overviewRes.data;

      // Update KPI Cards
      document.getElementById('kpi-total-installs').textContent = kpis.total_installations.toLocaleString();
      document.getElementById('kpi-installs-today').textContent = `+${kpis.installs_today} Today`;
      document.getElementById('kpi-active-dau').textContent = `${kpis.dau} DAU`;
      document.getElementById('kpi-active-mau').textContent = `MAU: ${kpis.mau}`;
      document.getElementById('kpi-crash-free').textContent = `${kpis.crash_free_users_percent}%`;
      document.getElementById('kpi-open-crashes').textContent = `${kpis.open_crash_issues} open issues`;
      document.getElementById('kpi-total-apps').textContent = kpis.total_apps_count || activeProjectsList.length;

      const isSingleApp = selectedProjectId !== 'all';
      document.getElementById('kpi-app-scope-label').textContent = isSingleApp ? 'Selected App' : 'Across Fleet';

      // Update Charts
      Charts.initActivityChart(timeseriesRes.data.installations || []);
      Charts.initAppsDistributionChart(isSingleApp ? version_distribution : projects_distribution, isSingleApp);

      // Render Recent Crashes
      this.renderRecentCrashesTable(recent_crashes);
    } catch (e) {
      console.error('Error loading overview:', e);
    }
  },

  renderRecentCrashesTable(crashes) {
    const tbody = document.querySelector('#table-recent-crashes tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (crashes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No recent crash events.</td></tr>`;
      return;
    }

    crashes.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span style="font-weight: 700; color: var(--text-primary);">${c.app_name}</span></td>
        <td><span class="text-coral" style="font-weight: 600;">${c.error_type}</span></td>
        <td><span class="badge-pill badge-muted">v${c.app_version}</span></td>
        <td><span class="text-mono" style="font-weight: 700;">${c.occurrences_count}</span></td>
        <td><span class="badge-pill ${c.status === 'resolved' ? 'badge-emerald' : 'badge-coral'}">${c.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  },

  async loadDevices() {
    try {
      const search = document.getElementById('search-devices')?.value || '';
      const res = await API.getDevices({ projectId: selectedProjectId, search });
      const devices = res.data || [];
      const tbody = document.querySelector('#table-devices-list tbody');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (devices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">No devices found.</td></tr>`;
        return;
      }

      devices.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span style="font-weight: 700; color: var(--text-primary);">${d.app_name}</span></td>
          <td><span class="text-mono" style="color: var(--cred-emerald);">${d.device_id}</span></td>
          <td>${d.device_brand || ''} ${d.device_model || 'Tablet'}</td>
          <td>${d.os_version || 'Android'}</td>
          <td><span class="badge-pill badge-muted">v${d.app_version}</span></td>
          <td>${d.district || 'Unassigned'}</td>
          <td><span style="font-size: 11px; color: var(--text-muted);">${new Date(d.last_active_at).toLocaleDateString()}</span></td>
          <td>
            <button class="btn-cred btn-cred-outline btn-cred-sm" onclick="App.openDeviceLogs('${d.device_id}')">
              <i class="fa-solid fa-list"></i> Logs
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.error('Error loading devices:', e);
    }
  },

  async openDeviceLogs(deviceId) {
    try {
      const res = await API.getDeviceLogs(deviceId, selectedProjectId);
      const { device, logs = [] } = res.data;
      document.getElementById('device-logs-title').textContent = `Logs for ${device.device_brand || ''} ${device.device_model || ''} (${deviceId})`;

      const tbody = document.querySelector('#table-device-raw-logs tbody');
      tbody.innerHTML = '';

      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No log breadcrumbs captured.</td></tr>`;
      } else {
        logs.forEach(l => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><span class="badge-pill badge-${l.log_level === 'ERROR' || l.log_level === 'CRUMB' ? 'coral' : 'emerald'}">${l.log_level}</span></td>
            <td><span class="text-mono">${l.tag || 'App'}</span></td>
            <td>${l.message}</td>
            <td><span style="font-size: 11px; color: var(--text-muted);">${new Date(l.created_at).toLocaleTimeString()}</span></td>
          `;
          tbody.appendChild(tr);
        });
      }

      openModal('modal-device-logs');
    } catch (e) {
      console.error('Error opening device logs:', e);
    }
  },

  refreshAll() {
    Projects.loadProjects();
    this.loadOverview();
    VersionManager.loadVersions(selectedProjectId);
    CrashViewer.loadCrashes(selectedProjectId);
    this.loadDevices();
  }
};

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  const targetNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);

  if (targetTab) targetTab.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('show');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('show');
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

document.addEventListener('DOMContentLoaded', () => App.init());
