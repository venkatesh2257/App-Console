// Multi-App Developer Console API Connector
const API = {
  baseUrl: window.location.origin + '/api/v1',

  async getProjects() {
    const res = await fetch(`${this.baseUrl}/admin/projects`);
    return await res.json();
  },

  async createProject(data) {
    const res = await fetch(`${this.baseUrl}/admin/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async getOverview(projectId = 'all') {
    const res = await fetch(`${this.baseUrl}/admin/overview?projectId=${projectId}`);
    return await res.json();
  },

  async getTimeSeries(period = '30d', projectId = 'all') {
    const res = await fetch(`${this.baseUrl}/admin/timeseries?period=${period}&projectId=${projectId}`);
    return await res.json();
  },

  async getVersions(projectId) {
    const res = await fetch(`${this.baseUrl}/admin/versions/${projectId}`);
    return await res.json();
  },

  async saveVersion(data) {
    const res = await fetch(`${this.baseUrl}/admin/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async toggleForceUpdate(id, isForceUpdate, minSupportedVersion) {
    const res = await fetch(`${this.baseUrl}/admin/versions/${id}/force-update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_force_update: isForceUpdate, min_supported_version: minSupportedVersion })
    });
    return await res.json();
  },

  async getCrashes(filters = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${this.baseUrl}/admin/crashes?${params.toString()}`);
    return await res.json();
  },

  async getCrashDetail(id) {
    const res = await fetch(`${this.baseUrl}/admin/crashes/${id}`);
    return await res.json();
  },

  async updateCrashStatus(id, status) {
    const res = await fetch(`${this.baseUrl}/admin/crashes/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await res.json();
  },

  async getDevices(filters = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${this.baseUrl}/admin/devices?${params.toString()}`);
    return await res.json();
  },

  async getDeviceLogs(deviceId, projectId = 'all') {
    const res = await fetch(`${this.baseUrl}/admin/devices/${deviceId}/logs?projectId=${projectId}`);
    return await res.json();
  }
};
