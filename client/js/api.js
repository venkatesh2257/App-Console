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
  },

  async uploadPlayStoreAuditFile(file, policySource = '') {
    const headers = {
      'Content-Type': 'application/octet-stream',
      'x-file-name': encodeURIComponent(file.name)
    };
    if (policySource) {
      headers['x-privacy-policy-source'] = encodeURIComponent(policySource);
    }
    const res = await fetch(`${this.baseUrl}/admin/playstore-audit/upload`, {
      method: 'POST',
      headers,
      body: file
    });
    return await res.json();
  },

  async uploadPlayStoreAudit(fileBase64, fileName, policySource = '') {
    const res = await fetch(`${this.baseUrl}/admin/playstore-audit/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64, fileName, privacyPolicySource: policySource })
    });
    return await res.json();
  },

  async scanPlayStoreAuditPath(filePath, policySource = '') {
    const res = await fetch(`${this.baseUrl}/admin/playstore-audit/scan-path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, privacyPolicySource: policySource })
    });
    return await res.json();
  },

  async analyzePrivacyPolicy(policySource) {
    try {
      const res = await fetch(`${this.baseUrl}/admin/playstore-audit/analyze-policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policySource })
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        return json;
      } catch (e) {
        console.warn('API returned non-JSON text:', text);
        return { status: 'fallback', message: 'Non-JSON response', policySource };
      }
    } catch (err) {
      console.warn('Fetch error for analyzePrivacyPolicy:', err);
      return { status: 'fallback', message: err.message, policySource };
    }
  },

  async comparePrivacyPolicy(packageName, permissions, policySource) {
    try {
      const res = await fetch(`${this.baseUrl}/admin/playstore-audit/compare-policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName, permissions, policySource })
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        return json;
      } catch (e) {
        console.warn('API returned non-JSON text:', text);
        return { status: 'fallback', message: 'Non-JSON response', packageName, permissions, policySource };
      }
    } catch (err) {
      console.warn('Fetch error for comparePrivacyPolicy:', err);
      return { status: 'fallback', message: err.message, packageName, permissions, policySource };
    }
  },

  async getAppRegistry() {
    try {
      const res = await fetch(`${this.baseUrl}/admin/playstore-audit/app-registry`);
      return await res.json();
    } catch (e) {
      return { status: 'error', data: [] };
    }
  },

  async runMasterAuditScan(file, options = {}) {
    const headers = {
      'Content-Type': 'application/octet-stream',
      'x-file-name': encodeURIComponent(file.name)
    };
    if (options.policyUrl) headers['x-privacy-policy-source'] = encodeURIComponent(options.policyUrl);
    if (options.appId) headers['x-app-id'] = encodeURIComponent(options.appId);

    const res = await fetch(`${this.baseUrl}/admin/playstore-audit/scan`, {
      method: 'POST',
      headers,
      body: file
    });
    return await res.json();
  },

  async getPlayStoreAuditHistory() {
    const res = await fetch(`${this.baseUrl}/admin/playstore-audit/history`);
    return await res.json();
  }
};
