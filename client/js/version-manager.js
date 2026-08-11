// Version Control & Force Update Management Logic
let currentActiveVersion = null;

const VersionManager = {
  async loadVersions(projectId) {
    try {
      const targetId = projectId !== 'all' ? projectId : (activeProjectsList[0]?.id || 1);
      const res = await API.getVersions(targetId);
      const versions = res.data || [];
      const tbody = document.querySelector('#table-version-catalog tbody');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (versions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No versions configured for this app yet.</td></tr>`;
        return;
      }

      currentActiveVersion = versions.find(v => v.is_active === 1) || versions[0];
      this.updateMasterBanner(currentActiveVersion);

      versions.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">v${v.version_name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${v.title || ''}</div>
          </td>
          <td><span class="text-mono">#${v.build_number}</span></td>
          <td><span class="badge-pill ${v.min_supported_version === v.version_name ? 'badge-coral' : 'badge-muted'}">v${v.min_supported_version}</span></td>
          <td>
            <span class="badge-pill ${v.is_force_update ? 'badge-coral' : 'badge-emerald'}">
              ${v.is_force_update ? 'Mandatory' : 'Optional'}
            </span>
          </td>
          <td>
            <a href="${v.download_url}" target="_blank" class="text-emerald" style="font-size: 12px; text-decoration: none; max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <i class="fa-solid fa-link"></i> ${v.download_url}
            </a>
          </td>
          <td>
            <span class="badge-pill ${v.is_active ? 'badge-emerald' : 'badge-muted'}">
              ${v.is_active ? 'Active Gate' : 'Archived'}
            </span>
          </td>
          <td>
            <button class="btn-cred btn-cred-outline btn-cred-sm" onclick="VersionManager.toggleVersionRule(${v.id}, ${v.is_force_update ? 0 : 1})">
              ${v.is_force_update ? 'Set Optional' : 'Force Update'}
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.error('Error loading versions:', e);
    }
  },

  updateMasterBanner(version) {
    if (!version) return;
    const toggle = document.getElementById('toggle-force-update-master');
    const label = document.getElementById('active-force-update-label');
    const badge = document.getElementById('ver-active-project-badge');

    const curProj = activeProjectsList.find(p => p.id === version.project_id);
    if (badge) badge.textContent = curProj ? curProj.app_name : 'Selected App';

    if (toggle) toggle.checked = Boolean(version.is_force_update);
    if (label) label.textContent = version.is_force_update ? 'Mandatory Update Active' : 'Optional Update Mode';
  },

  async toggleVersionRule(id, newStatus) {
    try {
      await API.toggleForceUpdate(id, newStatus);
      this.loadVersions(selectedProjectId);
      App.loadOverview();
    } catch (e) {
      console.error('Error toggling version:', e);
    }
  },

  async handleMasterToggle(isChecked) {
    if (!currentActiveVersion) return;
    await this.toggleVersionRule(currentActiveVersion.id, isChecked ? 1 : 0);
  },

  openNewVersionModal() {
    const projId = selectedProjectId !== 'all' ? selectedProjectId : (activeProjectsList[0]?.id || 1);
    document.getElementById('ver-proj-id').value = projId;
    document.getElementById('ver-name').value = '';
    document.getElementById('ver-build').value = '';
    document.getElementById('ver-min').value = '1.1.0';
    document.getElementById('ver-force').value = '1';
    document.getElementById('ver-title').value = '';
    document.getElementById('ver-url').value = 'http://139.167.190.26/portal/app.apk';
    document.getElementById('ver-notes').value = '';
    openModal('modal-version');
  },

  async saveVersion() {
    const projId = document.getElementById('ver-proj-id').value;
    const data = {
      project_id: parseInt(projId, 10),
      version_name: document.getElementById('ver-name').value.trim(),
      build_number: parseInt(document.getElementById('ver-build').value, 10),
      min_supported_version: document.getElementById('ver-min').value.trim(),
      is_force_update: document.getElementById('ver-force').value === '1',
      title: document.getElementById('ver-title').value.trim(),
      download_url: document.getElementById('ver-url').value.trim(),
      release_notes: document.getElementById('ver-notes').value.trim()
    };

    if (!data.version_name || !data.build_number || !data.min_supported_version || !data.download_url) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      await API.saveVersion(data);
      closeModal('modal-version');
      this.loadVersions(selectedProjectId);
      App.loadOverview();
    } catch (e) {
      console.error('Error saving version:', e);
      alert('Failed to publish version release.');
    }
  }
};
