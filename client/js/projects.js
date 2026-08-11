// Multi-App Projects Manager & Project Switcher
let activeProjectsList = [];
let selectedProjectId = 'all';

const Projects = {
  async loadProjects() {
    try {
      const res = await API.getProjects();
      activeProjectsList = res.data || [];

      this.populateProjectSwitcher(activeProjectsList);
      this.renderProjectsGrid(activeProjectsList);
      this.renderActiveProjectsSummary(activeProjectsList);
    } catch (e) {
      console.error('Error loading projects:', e);
    }
  },

  populateProjectSwitcher(projects) {
    const select = document.getElementById('select-active-project');
    if (!select) return;

    select.innerHTML = '<option value="all">🌐 All Projects (Global Fleet)</option>';
    projects.forEach(p => {
      select.innerHTML += `<option value="${p.id}">${p.app_name} (${p.app_id})</option>`;
    });

    select.value = selectedProjectId;
  },

  renderProjectsGrid(projects) {
    const grid = document.getElementById('grid-projects-cards');
    if (!grid) return;

    grid.innerHTML = '';
    projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'cred-card';
      card.style.borderColor = p.icon_color ? `${p.icon_color}40` : 'var(--border-card)';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${p.icon_color || '#00f59b'}20; border: 1px solid ${p.icon_color || '#00f59b'}; display: flex; align-items: center; justify-content: center; font-weight: 800; color: ${p.icon_color || '#00f59b'};">
              ${p.app_name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 style="font-size: 16px; margin-bottom: 2px;">${p.app_name}</h3>
              <span class="text-mono" style="font-size: 11px; color: var(--text-muted);">${p.app_id}</span>
            </div>
          </div>
          <span class="badge-pill badge-muted">${p.category || 'App'}</span>
        </div>

        <p class="text-secondary" style="font-size: 12px; margin-bottom: 16px; min-height: 36px;">
          ${p.description || 'Enterprise mobile application for government operations.'}
        </p>

        <!-- Stats Bar -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: var(--bg-black); padding: 10px; border-radius: 10px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Installs</div>
            <div style="font-size: 14px; font-weight: 700;" class="text-emerald">${p.total_installs || 0}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Version</div>
            <div style="font-size: 14px; font-weight: 700;">v${p.active_version || '1.0.0'}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Crashes</div>
            <div style="font-size: 14px; font-weight: 700; color: ${p.open_crashes > 0 ? 'var(--cred-coral)' : 'var(--text-muted)'};">${p.open_crashes || 0}</div>
          </div>
        </div>

        <!-- API Key Box -->
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <span class="text-mono" style="font-size: 11px; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${p.api_key}
          </span>
          <button class="btn-cred btn-cred-outline btn-cred-sm" style="padding: 2px 8px; font-size: 10px;" onclick="Projects.copyApiKey('${p.api_key}')">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn-cred btn-cred-primary btn-cred-sm" style="flex: 1;" onclick="Projects.selectAndSwitchProject(${p.id})">
            Open Dashboard
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  },

  renderActiveProjectsSummary(projects) {
    const tbody = document.querySelector('#table-active-projects-summary tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    projects.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${p.app_name}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${p.app_id}</div>
        </td>
        <td><span class="badge-pill badge-muted">${p.category}</span></td>
        <td><span class="text-mono" style="font-weight: 700; color: var(--cred-emerald);">${p.total_installs || 0}</span></td>
        <td><span class="badge-pill ${p.is_force_update ? 'badge-coral' : 'badge-emerald'}">v${p.active_version || '1.0.0'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  },

  copyApiKey(key) {
    navigator.clipboard.writeText(key);
    alert('API Key copied to clipboard! Use this key in your Flutter app.');
  },

  selectAndSwitchProject(id) {
    selectedProjectId = String(id);
    const select = document.getElementById('select-active-project');
    if (select) select.value = selectedProjectId;
    App.handleProjectChange();
    switchTab('tab-overview');
  },

  async createProject() {
    const name = document.getElementById('proj-name').value.trim();
    const appId = document.getElementById('proj-appid').value.trim();
    const category = document.getElementById('proj-category').value;
    const platform = document.getElementById('proj-platform').value;
    const description = document.getElementById('proj-desc').value.trim();

    if (!name || !appId) {
      alert('Please provide App Name and Application ID');
      return;
    }

    try {
      await API.createProject({
        app_name: name,
        app_id: appId,
        category,
        platform,
        description
      });
      closeModal('modal-create-project');
      await this.loadProjects();
      alert(`App "${name}" registered successfully! API Key generated.`);
    } catch (e) {
      console.error('Error creating project:', e);
      alert('Failed to register app.');
    }
  }
};
