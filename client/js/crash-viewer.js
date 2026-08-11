// Crashlytics Inspector & Error Manager
let selectedCrashId = null;

const CrashViewer = {
  async loadCrashes(projectId = 'all') {
    try {
      const search = document.getElementById('search-crashes')?.value || '';
      const status = document.getElementById('filter-crash-status')?.value || 'all';

      const res = await API.getCrashes({ projectId, search, status });
      const crashes = res.data || [];
      const tbody = document.querySelector('#table-crash-issues tbody');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (crashes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px;">No crash reports matching criteria.</td></tr>`;
        return;
      }

      crashes.forEach(c => {
        const tr = document.createElement('tr');
        const statusBadge = c.status === 'resolved' ? 'badge-emerald' : (c.status === 'investigating' ? 'badge-amber' : 'badge-coral');

        tr.innerHTML = `
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">${c.app_name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${c.app_id}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #ff8591;">${c.error_type}</div>
            <div style="font-size: 12px; color: var(--text-secondary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.error_message}</div>
          </td>
          <td><span class="text-mono">${c.screen_name || 'Global'}</span></td>
          <td><span class="badge-pill badge-muted">v${c.app_version}</span></td>
          <td><span class="text-mono" style="font-weight: 700;">${c.occurrences_count}</span></td>
          <td><span class="text-mono">${c.impacted_devices_count || 1} units</span></td>
          <td><span style="font-size: 11px; color: var(--text-muted);">${new Date(c.last_seen).toLocaleDateString()}</span></td>
          <td><span class="badge-pill ${statusBadge}">${c.status}</span></td>
          <td>
            <button class="btn-cred btn-cred-outline btn-cred-sm" onclick="CrashViewer.inspectCrash(${c.id})">
              <i class="fa-solid fa-code"></i> Inspect
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.error('Error loading crashes:', e);
    }
  },

  async inspectCrash(id) {
    selectedCrashId = id;
    try {
      const res = await API.getCrashDetail(id);
      const { crash, breadcrumbs = [] } = res.data;

      document.getElementById('crash-badge-type').textContent = crash.error_type;
      document.getElementById('crash-modal-title').textContent = crash.error_message;
      document.getElementById('crash-modal-app').textContent = `${crash.app_name} (v${crash.app_version})`;
      document.getElementById('crash-modal-device').textContent = `${crash.device_brand} ${crash.device_model} (${crash.os_version})`;
      document.getElementById('crash-modal-ram').textContent = `${crash.free_ram_mb || 'N/A'} MB`;
      document.getElementById('crash-modal-user').textContent = `${crash.district || 'Gov'} (${crash.user_id || 'Device'})`;
      
      document.getElementById('crash-modal-stacktrace').textContent = crash.stack_trace || 'No stack trace available.';

      const timelineBox = document.getElementById('crash-modal-breadcrumbs');
      timelineBox.innerHTML = '';

      if (breadcrumbs.length === 0) {
        timelineBox.innerHTML = '<div style="font-size: 12px; color: var(--text-muted);">No breadcrumbs captured.</div>';
      } else {
        breadcrumbs.forEach(b => {
          const item = document.createElement('div');
          item.className = 'timeline-item';
          item.innerHTML = `
            <div class="timeline-title">[${b.tag || 'Action'}] ${b.message}</div>
            <div class="timeline-time">${new Date(b.created_at).toLocaleTimeString()}</div>
          `;
          timelineBox.appendChild(item);
        });
      }

      openModal('modal-crash-detail');
    } catch (e) {
      console.error('Error inspecting crash:', e);
    }
  },

  async updateStatus(status) {
    if (!selectedCrashId) return;
    try {
      await API.updateCrashStatus(selectedCrashId, status);
      closeModal('modal-crash-detail');
      this.loadCrashes(selectedProjectId);
      App.loadOverview();
    } catch (e) {
      console.error('Error updating status:', e);
    }
  }
};
