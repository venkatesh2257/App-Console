// Multi-App Projects Manager & Google Play Console Apps Home Screen
let activeProjectsList = [];
let selectedProjectId = 'all';
let currentSearchQuery = '';
let currentStatusFilter = 'all';

const Projects = {
  async loadProjects() {
    try {
      const res = await API.getProjects();
      activeProjectsList = res.data || [];

      this.populateProjectSwitcher(activeProjectsList);
      this.renderPlayStoreAppsTable(activeProjectsList);
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

  getAppIconHtml(p, size = 40) {
    if (!p) p = {};
    const name = p.app_name || 'App';
    const cleanId = (p.app_id || '').toLowerCase();
    const cleanName = (p.app_name || '').toLowerCase();
    const radius = Math.round(size * 0.22);
    const fontSize = Math.round(size * 0.38);

    // 1. If custom image logo exists (uploaded base64 or URL)
    if (p.icon_url && p.icon_url.trim() !== '') {
      return `
        <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 2px 6px rgba(0,0,0,0.08); flex-shrink: 0; background: #FFFFFF; display: flex; align-items: center; justify-content: center;">
          <img src="${p.icon_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="${name} logo" onerror="this.parentElement.innerHTML='<span style=\\'font-weight:800;font-size:${fontSize}px;color:#4F46E5;\\'>${name.substring(0,2).toUpperCase()}</span>'">
        </div>
      `;
    }

    // 2. Travelite Ground Staff (BTGS) - Aviation Royal Navy & Cyan Wing
    if (cleanId.includes('btgs') || cleanName.includes('btgs') || cleanName.includes('travelite')) {
      return `
        <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #008DDA 100%); color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,141,218,0.25); border: 1px solid rgba(255,255,255,0.18); position: relative; overflow: hidden;">
          <i class="fa-solid fa-plane-departure" style="font-size: ${Math.round(size * 0.42)}px; color: #60A5FA; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));"></i>
          <span style="font-size: ${Math.max(8, Math.round(size * 0.2))}px; font-weight: 900; letter-spacing: 0.05em; color: #F8FAFC; line-height: 1; margin-top: 2px;">BTGS</span>
        </div>
      `;
    }

    // 3. VAS 1962 Veterinary Operations - Govt Amber Gold & Vet Cattle Shield
    if (cleanId.includes('1962') || cleanName.includes('1962') || cleanName.includes('veterinary') || cleanName.includes('vas')) {
      return `
        <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: linear-gradient(135deg, #78350F 0%, #D97706 50%, #EA580C 100%); color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(234,88,12,0.3); border: 1px solid rgba(255,255,255,0.2); position: relative; overflow: hidden;">
          <i class="fa-solid fa-shield-cat" style="font-size: ${Math.round(size * 0.38)}px; color: #FEF3C7; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));"></i>
          <span style="font-size: ${Math.max(8, Math.round(size * 0.22))}px; font-weight: 900; letter-spacing: 0.04em; color: #FFFFFF; line-height: 1; margin-top: 1px;">1962</span>
        </div>
      `;
    }

    // 4. 108 Emergency Ambulance Ops - Emergency Crimson Siren
    if (cleanId.includes('108') || cleanName.includes('108') || cleanName.includes('ambulance') || cleanName.includes('emergency')) {
      return `
        <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #EF4444 100%); color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(220,38,38,0.35); border: 1px solid rgba(255,255,255,0.2); position: relative; overflow: hidden;">
          <i class="fa-solid fa-truck-medical" style="font-size: ${Math.round(size * 0.38)}px; color: #FEE2E2; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));"></i>
          <span style="font-size: ${Math.max(8, Math.round(size * 0.22))}px; font-weight: 900; letter-spacing: 0.04em; color: #FFFFFF; line-height: 1; margin-top: 1px;">108</span>
        </div>
      `;
    }

    // 5. 104 Health Grievance System - Deep Slate Navy & Medical Care Stethoscope
    if (cleanId.includes('104') || cleanName.includes('104') || cleanName.includes('grievance')) {
      return `
        <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: linear-gradient(135deg, #0F172A 0%, #0369A1 60%, #0284C7 100%); color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(2,132,199,0.3); border: 1px solid rgba(255,255,255,0.2); position: relative; overflow: hidden;">
          <i class="fa-solid fa-stethoscope" style="font-size: ${Math.round(size * 0.38)}px; color: #E0F2FE; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));"></i>
          <span style="font-size: ${Math.max(8, Math.round(size * 0.22))}px; font-weight: 900; letter-spacing: 0.04em; color: #FFFFFF; line-height: 1; margin-top: 1px;">104</span>
        </div>
      `;
    }

    // 6. Bavya Capture / Clinozen - Magenta Clinical EMR
    if (cleanId.includes('clinozen') || cleanId.includes('capture') || cleanName.includes('capture') || cleanName.includes('clinozen')) {
      return `
        <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: linear-gradient(135deg, #701A75 0%, #C026D3 50%, #DB2777 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(192,38,211,0.3); border: 1px solid rgba(255,255,255,0.2);">
          <i class="fa-solid fa-notes-medical" style="color: #FDF4FF;"></i>
        </div>
      `;
    }

    // 7. Bavya Consumption - Pharma Amber
    if (cleanId.includes('consumption') || cleanName.includes('consumption')) {
      return `
        <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: linear-gradient(135deg, #451A03 0%, #B45309 60%, #F59E0B 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(245,158,11,0.3); border: 1px solid rgba(255,255,255,0.2);">
          <i class="fa-solid fa-pills" style="color: #FEF3C7;"></i>
        </div>
      `;
    }

    // 8. BHSPL ONE / Unified Portal - Indigo Enterprise
    if (cleanId.includes('bhspl') || cleanId.includes('best') || cleanName.includes('bhspl')) {
      return `
        <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: linear-gradient(135deg, #312E81 0%, #4F46E5 50%, #7C3AED 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: ${fontSize}px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(79,70,229,0.3); border: 1px solid rgba(255,255,255,0.2);">
          <span>BH</span>
        </div>
      `;
    }

    // 9. Mobile Veterinary Unit (MVU) - Emerald Fleet
    if (cleanId.includes('mvu') || cleanId.includes('tracker')) {
      return `
        <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: linear-gradient(135deg, #064E3B 0%, #059669 60%, #10B981 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(5,150,105,0.3); border: 1px solid rgba(255,255,255,0.2);">
          <i class="fa-solid fa-truck-field" style="color: #ECFDF5;"></i>
        </div>
      `;
    }

    // Default icon badge
    const color = p.icon_color || '#4F46E5';
    return `
      <div style="width: ${size}px; height: ${size}px; border-radius: ${radius}px; background: linear-gradient(135deg, ${color}33, ${color}11); border: 1.5px solid ${color}; color: ${color}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: ${fontSize}px; flex-shrink: 0;">
        ${name.substring(0, 2).toUpperCase()}
      </div>
    `;
  },

  handleSearch(query) {
    currentSearchQuery = (query || '').toLowerCase().trim();
    this.renderPlayStoreAppsTable(activeProjectsList);
  },

  handleStatusFilter(status) {
    currentStatusFilter = status;
    this.renderPlayStoreAppsTable(activeProjectsList);
  },

  renderPlayStoreAppsTable(projects) {
    const container = document.getElementById('playstore-apps-table-container');
    if (!container) return;

    let filtered = projects.filter(p => {
      const matchSearch = !currentSearchQuery || 
        (p.app_name && p.app_name.toLowerCase().includes(currentSearchQuery)) ||
        (p.app_id && p.app_id.toLowerCase().includes(currentSearchQuery));

      let matchStatus = true;
      if (currentStatusFilter === 'production') matchStatus = p.app_status === 'Production';
      else if (currentStatusFilter === 'draft') matchStatus = p.app_status === 'Draft';
      else if (currentStatusFilter === 'in_review') matchStatus = p.update_status === 'In review';

      return matchSearch && matchStatus;
    });

    const totalCount = filtered.length;
    const countBadge = document.getElementById('playstore-apps-count');
    if (countBadge) countBadge.textContent = `${totalCount} apps`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: #64748B;">
          <i class="fa-solid fa-folder-open" style="font-size: 32px; color: #CBD5E1; margin-bottom: 12px;"></i>
          <div style="font-size: 15px; font-weight: 600; color: #334155;">No applications match your filter</div>
          <div style="font-size: 13px; color: #94A3B8; margin-top: 4px;">Try searching for a different app name or package identifier.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid #E2E8F0; color: #64748B; font-weight: 600; font-size: 12px;">
              <th style="padding: 12px 16px; min-width: 280px;">App</th>
              <th style="padding: 12px 16px; text-align: right; min-width: 130px;">Installed audience</th>
              <th style="padding: 12px 16px; min-width: 120px;">App status</th>
              <th style="padding: 12px 16px; min-width: 130px;">Update status</th>
              <th style="padding: 12px 16px; min-width: 120px;">Last updated</th>
              <th style="padding: 12px 16px; text-align: right; min-width: 140px;"></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(p => {
              const iconHtml = this.getAppIconHtml(p);
              const installs = p.installed_audience || p.total_installs || 0;
              const isPinned = p.is_pinned === 1;
              const isDraft = p.app_status === 'Draft';
              const inReview = p.update_status === 'In review';

              return `
                <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s ease; cursor: pointer;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'" onclick="Projects.openAppScreen(${p.id})">
                  <!-- App Name & Package -->
                  <td style="padding: 14px 16px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                      ${iconHtml}
                      <div>
                        <div style="font-weight: 600; color: #0F172A; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                          <span>${p.app_name}</span>
                          ${isPinned ? `<i class="fa-solid fa-thumbtack" style="color: #2563EB; font-size: 11px;" title="Pinned App"></i>` : ''}
                          ${(p.app_id && p.app_id.includes('btgs')) 
                            ? `<span style="font-size: 10px; background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; padding: 1px 6px; border-radius: 4px; font-weight: 600;">Play Store Public</span>`
                            : `<span style="font-size: 10px; background: #F5F3FF; color: #6D28D9; border: 1px solid #DDD6FE; padding: 1px 6px; border-radius: 4px; font-weight: 600;">Enterprise Monitoring Module</span>`
                          }
                        </div>
                        <div style="font-size: 12px; color: #64748B; font-family: var(--font-mono, monospace); margin-top: 2px;">
                          ${p.app_id}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Installed Audience -->
                  <td style="padding: 14px 16px; text-align: right; font-weight: 500; color: #0F172A; font-size: 13.5px;">
                    ${installs.toLocaleString()}
                  </td>

                  <!-- App Status -->
                  <td style="padding: 14px 16px;">
                    <span style="color: ${isDraft ? '#64748B' : '#0F172A'}; font-weight: 500;">
                      ${p.app_status || 'Production'}
                    </span>
                  </td>

                  <!-- Update Status -->
                  <td style="padding: 14px 16px;">
                    ${inReview ? `
                      <span style="display: inline-flex; align-items: center; gap: 6px; color: #0284C7; font-weight: 500; font-size: 12.5px;">
                        <i class="fa-regular fa-clock"></i> In review
                      </span>
                    ` : `
                      <span style="color: #94A3B8;">—</span>
                    `}
                  </td>

                  <!-- Last Updated -->
                  <td style="padding: 14px 16px; color: #475569; font-size: 12.5px;">
                    ${p.last_updated_date || 'Recently'}
                  </td>

                  <!-- Action Buttons -->
                  <td style="padding: 14px 16px; text-align: right;" onclick="event.stopPropagation()">
                    <div style="display: inline-flex; align-items: center; gap: 10px;">
                      ${isDraft ? `
                        <button onclick="Projects.deleteApp(${p.id}, '${p.app_name}')" style="background: none; border: none; color: #94A3B8; cursor: pointer; padding: 4px;" title="Delete draft app">
                          <i class="fa-regular fa-trash-can" style="font-size: 14px;"></i>
                        </button>
                      ` : ''}

                      <button onclick="Projects.togglePin(${p.id})" style="background: none; border: none; color: ${isPinned ? '#2563EB' : '#94A3B8'}; cursor: pointer; padding: 4px;" title="${isPinned ? 'Unpin app' : 'Pin app'}">
                        <i class="${isPinned ? 'fa-solid' : 'fa-regular'} fa-thumbtack" style="font-size: 14px;"></i>
                      </button>

                      <button onclick="Projects.openAppScreen(${p.id})" style="background: none; border: none; color: #1A73E8; font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px;" onmouseover="this.style.background='#EFF6FF'" onmouseout="this.style.background='transparent'">
                        <span>View app</span>
                        <i class="fa-solid fa-arrow-right" style="font-size: 11px;"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Google Play Pagination Bar -->
      <div style="display: flex; justify-content: flex-end; align-items: center; gap: 24px; padding: 14px 20px; border-top: 1px solid #E2E8F0; font-size: 12.5px; color: #475569;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>Show rows:</span>
          <select style="border: 1px solid #CBD5E1; border-radius: 4px; padding: 3px 8px; font-size: 12px; color: #334155; background: #FFFFFF;">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
        <div>
          1 – ${filtered.length} of ${filtered.length}
        </div>
        <div style="display: flex; gap: 4px;">
          <button style="background: none; border: none; color: #CBD5E1; cursor: not-allowed; padding: 4px 6px;"><i class="fa-solid fa-backward-step"></i></button>
          <button style="background: none; border: none; color: #CBD5E1; cursor: not-allowed; padding: 4px 6px;"><i class="fa-solid fa-chevron-left"></i></button>
          <button style="background: none; border: none; color: #CBD5E1; cursor: not-allowed; padding: 4px 6px;"><i class="fa-solid fa-chevron-right"></i></button>
          <button style="background: none; border: none; color: #CBD5E1; cursor: not-allowed; padding: 4px 6px;"><i class="fa-solid fa-forward-step"></i></button>
        </div>
      </div>
    `;
  },

  renderActiveProjectsSummary(projects) {
    const tbody = document.querySelector('#table-active-projects-summary tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    projects.slice(0, 6).forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${p.app_name}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${p.app_id}</div>
        </td>
        <td><span class="badge-pill badge-muted">${p.category || 'App'}</span></td>
        <td><span class="text-mono" style="font-weight: 700; color: var(--cred-emerald);">${(p.installed_audience || p.total_installs || 0).toLocaleString()}</span></td>
        <td><span class="badge-pill ${p.is_force_update ? 'badge-coral' : 'badge-emerald'}">v${p.active_version || '1.0.0'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  },

  async togglePin(id) {
    try {
      await API.togglePinProject(id);
      await this.loadProjects();
    } catch (e) {
      console.error('Error toggling pin:', e);
    }
  },

  async deleteApp(id, appName) {
    if (confirm(`Are you sure you want to delete "${appName}"?`)) {
      try {
        await API.deleteProject(id);
        await this.loadProjects();
      } catch (e) {
        console.error('Error deleting project:', e);
      }
    }
  },

  openAppDrawer(id) {
    const project = activeProjectsList.find(p => p.id === id);
    if (!project) return;

    this.currentDrawerProjectId = project.id;
    this.currentDrawerAppId = project.app_id;

    const modal = document.getElementById('modal-app-details-drawer');
    if (!modal) {
      this.selectAndSwitchProject(id);
      return;
    }

    const iconEl = document.getElementById('drawer-app-icon-container');
    if (iconEl) iconEl.innerHTML = this.getAppIconHtml(project, 44);

    document.getElementById('drawer-app-name').textContent = project.app_name;
    document.getElementById('drawer-app-pkg').textContent = project.app_id;
    document.getElementById('drawer-app-status').textContent = project.app_status || 'Production';
    document.getElementById('drawer-app-installs').textContent = (project.installed_audience || project.total_installs || 0).toLocaleString();
    document.getElementById('drawer-app-version').textContent = `v${project.active_version || '1.0.0'} (Build ${project.active_build_number || 1})`;
    document.getElementById('drawer-app-apikey').value = project.api_key || 'No key generated';
    document.getElementById('drawer-app-desc').textContent = project.description || 'Enterprise mobile application.';

    // Load All Saved Bundles For This App
    this.loadDrawerBundles(project.id, project.app_id);

    // Configure Audit Launch Button
    const auditBtn = document.getElementById('drawer-btn-launch-audit');
    if (auditBtn) {
      auditBtn.onclick = () => {
        closeModal('modal-app-details-drawer');
        const select = document.getElementById('select-app-profile');
        if (select) {
          select.value = project.app_id;
          if (PlayStoreAuditor) PlayStoreAuditor.selectedAppId = project.app_id;
        }
        switchTab('tab-playstore-audit');
      };
    }

    // Configure Switch Dashboard Button
    const dashBtn = document.getElementById('drawer-btn-open-dash');
    if (dashBtn) {
      dashBtn.onclick = () => {
        closeModal('modal-app-details-drawer');
        this.selectAndSwitchProject(project.id);
      };
    }

    openModal('modal-app-details-drawer');
  },

  async loadDrawerBundles(projectId, pkgName) {
    const tbody = document.getElementById('drawer-bundles-tbody');
    const countEl = document.getElementById('drawer-bundles-count');
    if (!tbody) return;

    try {
      const res = await API.getVersions(projectId);
      const versions = (res && res.data) ? res.data : [];
      if (countEl) countEl.textContent = versions.length;

      if (versions.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="padding: 16px; text-align: center; color: #94A3B8;">
              No bundles saved yet. Click "Upload New Bundle" to add an .aab or .apk.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = versions.map((v, idx) => {
        const isLatest = idx === 0;
        const score = v.compliance_score !== undefined ? v.compliance_score : 100;
        const verdict = v.verdict || 'READY';
        const isReady = verdict === 'READY' || score >= 90;

        return `
          <tr style="border-bottom: 1px solid #E2E8F0; background: ${isLatest ? '#FFFFFF' : 'transparent'};">
            <td style="padding: 10px 12px; font-weight: 600; color: #0F172A;">
              v${v.version_name}
              ${isLatest ? '<span class="badge-pill badge-emerald" style="font-size: 9.5px; margin-left: 4px;">ACTIVE</span>' : ''}
            </td>
            <td style="padding: 10px 12px; font-family: monospace; color: #475569;">${v.build_number}</td>
            <td style="padding: 10px 12px; color: #475569;">API ${v.target_sdk || 36}</td>
            <td style="padding: 10px 12px;">
              <span class="badge-pill ${isReady ? 'badge-emerald' : 'badge-coral'}" style="font-size: 10px;">
                ${score}% ${verdict}
              </span>
            </td>
            <td style="padding: 10px 12px; text-align: right;">
              <button type="button" class="btn-cred btn-cred-outline btn-cred-sm" style="padding: 2px 8px; font-size: 11px;" onclick="Projects.auditSpecificVersion('${pkgName}')">
                <i class="fa-solid fa-shield-halved"></i> Audit
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.error('Error loading drawer bundles:', e);
    }
  },

  async openAppScreen(id) {
    const project = activeProjectsList.find(p => p.id === id || p.app_id === id);
    if (!project) return;

    this.currentAppScreenProject = project;
    this.currentDrawerProjectId = project.id;
    this.currentDrawerAppId = project.app_id;

    // Set Header
    const iconContainer = document.getElementById('app-screen-icon-container');
    if (iconContainer) {
      iconContainer.innerHTML = `
        <div style="position: relative; display: inline-block; cursor: pointer;" onclick="Projects.openEditLogoModalForCurrentApp()" title="Click to change or upload app logo">
          ${this.getAppIconHtml(project, 52)}
          <div style="position: absolute; right: -4px; bottom: -4px; width: 22px; height: 22px; border-radius: 50%; background: #4F46E5; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 11px; border: 2px solid #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,0.25); transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
            <i class="fa-solid fa-camera"></i>
          </div>
        </div>
      `;
    }

    const nameEl = document.getElementById('app-screen-name');
    if (nameEl) nameEl.textContent = project.app_name;

    const pkgEl = document.getElementById('app-screen-pkg');
    if (pkgEl) pkgEl.textContent = project.app_id;

    const statusBadge = document.getElementById('app-screen-status-badge');
    if (statusBadge) {
      statusBadge.textContent = project.app_status || 'Production';
      statusBadge.className = project.app_status === 'Draft' ? 'badge-pill badge-muted' : 'badge-pill badge-emerald';
    }

    // Set SHA-1 and SHA-256 for App Integrity subtab
    const sha1El = document.getElementById('app-screen-sha1');
    const sha256El = document.getElementById('app-screen-sha256');
    const pkg = (project.app_id || '').toLowerCase();
    
    if (project.signing_sha1) {
      if (sha1El) sha1El.innerHTML = `<span style="color: #059669; font-weight: 700;">[Official Saved Keystore]</span> ${project.signing_sha1}`;
      if (sha256El) sha256El.textContent = project.signing_sha256 || '3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C';
    } else if (pkg.includes('btgs')) {
      if (sha1El) sha1El.innerHTML = `<span style="color: #1D4ED8; font-weight: 700;">[Upload Key]</span> 83:98:58:F4:D7:22:67:CE:4D:9B:45:A3:2E:A5:1C:1A:D6:42:F8:77<br><span style="color: #059669; font-weight: 700;">[Play Store Signing Key]</span> 66:C8:DE:EC:54:EA:27:17:B5:DB:24:05:B6:9F:B5:ED:5D:68:1B:38`;
      if (sha256El) sha256El.textContent = '3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C';
    } else if (pkg.includes('1962')) {
      if (sha1El) sha1El.innerHTML = `<span style="color: #6D28D9; font-weight: 700;">[Independent Keystore]</span> 4D:5E:6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70`;
      if (sha256El) sha256El.textContent = '5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A';
    } else if (pkg.includes('108')) {
      if (sha1El) sha1El.innerHTML = `<span style="color: #059669; font-weight: 700;">[Play Store Release Key]</span> 49:07:E4:89:1C:B3:68:81:80:8C:00:6A:A3:60:D9:B0:0C:83:50:5E<br><span style="color: #6D28D9; font-weight: 700;">[Fleet Keystore]</span> 6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70:81:92`;
      if (sha256El) sha256El.textContent = '7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F';
    } else if (pkg.includes('104')) {
      if (sha1El) sha1El.innerHTML = `<span style="color: #6D28D9; font-weight: 700;">[Independent Keystore]</span> 81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70:81:92:A3:B4`;
      if (sha256El) sha256El.textContent = '9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A';
    } else {
      if (sha1El) sha1El.innerHTML = `<span style="color: #475569; font-weight: 700;">[Independent Keystore]</span> 4D:5E:6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70`;
      if (sha256El) sha256El.textContent = '5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A';
    }

    // Fetch and populate Releases and App Bundles
    await this.renderAppScreenReleasesAndBundles(project);

    // Switch to tab-app-screen
    switchTab('tab-app-screen');
    this.switchAppSubTab('releases');
  },

  async renderAppScreenReleasesAndBundles(project) {
    const releasesTbody = document.getElementById('app-screen-releases-tbody');
    const bundlesTbody = document.getElementById('app-screen-bundles-tbody');
    if (!releasesTbody || !bundlesTbody) return;

    try {
      const res = await API.getVersions(project.id);
      const versions = (res && res.data && res.data.length > 0) ? res.data : [
        {
          version_name: project.active_version || '6.0.3',
          build_number: project.active_build_number || 11,
          target_sdk: 36,
          compliance_score: 100,
          verdict: 'READY',
          file_name: `${project.app_id}-release.aab`,
          created_at: project.last_updated_date || 'Sep 22, 2026, 7:54 AM'
        }
      ];

      // 1. Render Releases Section
      const latestVer = versions[0];
      const isApproved = latestVer.verdict === 'READY' || (latestVer.compliance_score && latestVer.compliance_score >= 90);

      releasesTbody.innerHTML = `
        <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s ease;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
          <td style="padding: 14px 16px; font-weight: 600; color: #0F172A;">
            ${latestVer.build_number} (${latestVer.version_name})
          </td>
          <td style="padding: 14px 16px; color: #334155; font-family: monospace; font-size: 13px;">
            ${latestVer.build_number}
          </td>
          <td style="padding: 14px 16px; font-weight: 500; color: #0F172A;">
            Production
          </td>
          <td style="padding: 14px 16px;">
            ${isApproved ? `
              <span style="display: inline-flex; align-items: center; gap: 6px; color: #059669; font-weight: 600; font-size: 12.5px;">
                <i class="fa-solid fa-circle-check" style="font-size: 11px;"></i> Active (Full rollout)
              </span>
            ` : `
              <span style="display: inline-flex; align-items: center; gap: 6px; color: #DC2626; font-weight: 600; font-size: 12.5px;">
                <i class="fa-solid fa-circle-xmark" style="font-size: 11px;"></i> Release not approved
              </span>
            `}
          </td>
          <td style="padding: 14px 16px; color: #64748B; font-size: 12.5px;">
            ${latestVer.created_at || 'Sep 22, 2026, 1:25 PM'}
          </td>
          <td style="padding: 14px 16px; color: #475569; font-size: 12.5px;">
            1 of 178
          </td>
          <td style="padding: 14px 16px; text-align: right; color: #0F172A; font-weight: 600; font-size: 12.5px;">
            ${isApproved ? '100.00%' : '0.00%'}
          </td>
          <td style="padding: 14px 16px; text-align: right;">
            <button type="button" onclick="Projects.launchAuditForCurrentApp()" style="background: none; border: none; color: #1A73E8; font-size: 14px; cursor: pointer; padding: 4px;" title="Inspect & Audit Release">
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </td>
        </tr>
      `;

      // 2. Render App Bundles Section
      bundlesTbody.innerHTML = versions.map((v, idx) => {
        const isLatest = idx === 0;
        return `
          <tr style="border-bottom: 1px solid #F1F5F9; transition: background 0.15s ease;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
            <td style="padding: 14px 16px; font-weight: 600; color: #0F172A; font-family: monospace;">
              ${v.build_number}
            </td>
            <td style="padding: 14px 16px; font-weight: 600; color: #0F172A;">
              ${v.version_name}
            </td>
            <td style="padding: 14px 16px;">
              <span style="background: #E6F4EA; color: #137333; padding: 3px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                App bundle <span style="background: #CEEAD6; color: #0D652D; padding: 1px 5px; border-radius: 6px; font-size: 9.5px;">Enhanced</span>
              </span>
            </td>
            <td style="padding: 14px 16px; color: #64748B; font-size: 12.5px;">
              ${v.created_at || 'Sep 22, 2026, 7:54 AM'}
            </td>
            <td style="padding: 14px 16px; color: #475569; font-size: 12.5px;">
              ≤ 100
            </td>
            <td style="padding: 14px 16px;">
              <span style="font-weight: 600; color: ${isLatest ? '#059669' : '#64748B'}; font-size: 12.5px;">
                ${isLatest ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td style="padding: 14px 16px; text-align: right;">
              <div style="display: inline-flex; align-items: center; gap: 8px;">
                <button type="button" class="btn-cred btn-cred-outline btn-cred-sm" style="padding: 3px 10px; font-size: 11.5px; border-color: #059669; color: #059669; font-weight: 600;" onclick="Projects.auditSpecificVersion('${project.app_id}')">
                  <i class="fa-solid fa-shield-halved"></i> Audit
                </button>
                <button type="button" onclick="Projects.auditSpecificVersion('${project.app_id}')" style="background: none; border: none; color: #1A73E8; font-size: 13px; cursor: pointer; padding: 4px;" title="View Bundle Details">
                  <i class="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error rendering app screen releases:', err);
    }
  },

  switchAppSubTab(tabName) {
    const subviews = {
      releases: document.getElementById('app-subview-releases'),
      integrity: document.getElementById('app-subview-integrity'),
      declarations: document.getElementById('app-subview-declarations')
    };

    const navs = {
      releases: document.getElementById('app-nav-releases'),
      production: document.getElementById('app-nav-production'),
      testing: document.getElementById('app-nav-testing'),
      integrity: document.getElementById('app-nav-integrity'),
      declarations: document.getElementById('app-nav-declarations')
    };

    Object.values(subviews).forEach(v => { if (v) v.style.display = 'none'; });
    Object.values(navs).forEach(n => {
      if (n) {
        n.style.background = 'transparent';
        n.style.color = '#475569';
        n.style.fontWeight = '500';
      }
    });

    if (tabName === 'releases' || tabName === 'production' || tabName === 'testing') {
      if (subviews.releases) subviews.releases.style.display = 'block';
      const activeNav = navs[tabName] || navs.releases;
      if (activeNav) {
        activeNav.style.background = '#E8F0FE';
        activeNav.style.color = '#1A73E8';
        activeNav.style.fontWeight = '600';
      }
    } else if (tabName === 'integrity') {
      if (subviews.integrity) subviews.integrity.style.display = 'block';
      if (navs.integrity) {
        navs.integrity.style.background = '#E8F0FE';
        navs.integrity.style.color = '#1A73E8';
        navs.integrity.style.fontWeight = '600';
      }
    } else if (tabName === 'declarations') {
      if (subviews.declarations) subviews.declarations.style.display = 'block';
      if (navs.declarations) {
        navs.declarations.style.background = '#E8F0FE';
        navs.declarations.style.color = '#1A73E8';
        navs.declarations.style.fontWeight = '600';
      }
    }
  },

  launchAuditForCurrentApp() {
    const pkg = (this.currentAppScreenProject && this.currentAppScreenProject.app_id) || 'com.bavya.btgs';
    const select = document.getElementById('select-app-profile');
    if (select) {
      select.value = pkg;
      if (window.PlayStoreAuditor) window.PlayStoreAuditor.selectedAppId = pkg;
    }
    switchTab('tab-playstore-audit');
    if (window.PlayStoreAuditor) {
      window.PlayStoreAuditor.scanLocalSample('aab');
    }
  },

  auditSpecificVersion(pkgName) {
    closeModal('modal-app-details-drawer');
    const select = document.getElementById('select-app-profile');
    if (select) {
      select.value = pkgName;
      if (window.PlayStoreAuditor) window.PlayStoreAuditor.selectedAppId = pkgName;
    }
    switchTab('tab-playstore-audit');
    if (window.PlayStoreAuditor) {
      window.PlayStoreAuditor.scanLocalSample('aab');
    }
  },

  triggerUploadBundle() {
    const fileInput = document.getElementById('drawer-bundle-file-input') || document.getElementById('input-direct-audit-file');
    if (fileInput) fileInput.click();
  },

  triggerNewRelease() {
    openModal('modal-create-version');
  },

  copyApiKey(key) {
    navigator.clipboard.writeText(key);
    alert('API Key copied to clipboard! Use this key in your Flutter / Android app.');
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

    const iconUrl = (document.getElementById('proj-icon-url')?.value || '').trim();

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
        icon_url: iconUrl || null,
        description,
        app_status: 'Production'
      });
      closeModal('modal-create-project');
      await this.loadProjects();
      alert(`App "${name}" registered successfully! API Key generated.`);
    } catch (e) {
      console.error('Error creating project:', e);
      alert('Failed to register app.');
    }
  },

  // =========================================================
  // APP LOGO CUSTOMIZATION & UPLOAD SYSTEM
  // =========================================================
  openEditLogoModal(projectId) {
    const project = activeProjectsList.find(p => String(p.id) === String(projectId) || p.app_id === projectId);
    if (!project) return;

    this.editingLogoProjectId = project.id;
    this.currentLogoPreviewUrl = project.icon_url || '';

    const nameEl = document.getElementById('edit-logo-app-name');
    const pkgEl = document.getElementById('edit-logo-app-pkg');
    const inputUrl = document.getElementById('input-app-logo-url');
    const projIdInput = document.getElementById('edit-logo-project-id');

    if (nameEl) nameEl.textContent = project.app_name;
    if (pkgEl) pkgEl.textContent = project.app_id;
    if (inputUrl) inputUrl.value = project.icon_url || '';
    if (projIdInput) projIdInput.value = project.id;

    this.updateEditLogoPreview(project.icon_url, project);
    openModal('modal-edit-app-logo');
  },

  openEditLogoModalForCurrentApp() {
    let project = this.currentAppScreenProject;
    if (!project) {
      const pkg = document.getElementById('app-screen-pkg')?.textContent?.trim();
      const name = document.getElementById('app-screen-name')?.textContent?.trim();
      project = activeProjectsList.find(p => p.app_id === pkg || p.app_name === name || (pkg && p.app_id.includes(pkg)));
    }
    if (!project && activeProjectsList.length > 0) {
      project = activeProjectsList[0];
    }
    if (project) {
      this.openEditLogoModal(project.id);
    }
  },

  updateEditLogoPreview(url, project = null) {
    const previewEl = document.getElementById('edit-logo-preview');
    if (!previewEl) return;
    const p = project || activeProjectsList.find(x => x.id === this.editingLogoProjectId) || {};
    const mockP = { ...p, icon_url: url };
    previewEl.innerHTML = this.getAppIconHtml(mockP, 56);
  },

  handleLogoFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      this.currentLogoPreviewUrl = event.target.result;
      const inputUrl = document.getElementById('input-app-logo-url');
      if (inputUrl) inputUrl.value = '';
      this.updateEditLogoPreview(this.currentLogoPreviewUrl);
    };
    reader.readAsDataURL(file);
  },

  previewCustomLogoUrl(url) {
    this.currentLogoPreviewUrl = (url || '').trim();
    this.updateEditLogoPreview(this.currentLogoPreviewUrl);
  },

  applyLogoPreset(presetKey) {
    const inputUrl = document.getElementById('input-app-logo-url');
    if (inputUrl) inputUrl.value = '';
    this.currentLogoPreviewUrl = ''; 
    const p = activeProjectsList.find(x => x.id === this.editingLogoProjectId) || {};
    const mockP = { ...p, app_id: presetKey, icon_url: '' };
    this.updateEditLogoPreview('', mockP);
  },

  resetAppLogoToDefault() {
    this.currentLogoPreviewUrl = '';
    const inputUrl = document.getElementById('input-app-logo-url');
    if (inputUrl) inputUrl.value = '';
    this.updateEditLogoPreview('');
  },

  async saveEditedAppLogo() {
    if (!this.editingLogoProjectId) return;
    try {
      await API.updateProject(this.editingLogoProjectId, {
        icon_url: this.currentLogoPreviewUrl || null
      });

      // Update in memory list
      const project = activeProjectsList.find(p => p.id === this.editingLogoProjectId);
      if (project) {
        project.icon_url = this.currentLogoPreviewUrl || null;
      }
      
      // Update app screen icon if active
      if (this.currentAppScreenProject && this.currentAppScreenProject.id === this.editingLogoProjectId) {
        this.currentAppScreenProject.icon_url = this.currentLogoPreviewUrl || null;
        const iconContainer = document.getElementById('app-screen-icon-container');
        if (iconContainer) {
          iconContainer.innerHTML = `
            <div style="position: relative; display: inline-block; cursor: pointer;" onclick="Projects.openEditLogoModalForCurrentApp()" title="Click to change or upload app logo">
              ${this.getAppIconHtml(this.currentAppScreenProject, 52)}
              <div style="position: absolute; right: -4px; bottom: -4px; width: 22px; height: 22px; border-radius: 50%; background: #4F46E5; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 11px; border: 2px solid #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,0.25); transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                <i class="fa-solid fa-camera"></i>
              </div>
            </div>
          `;
        }
      }

      closeModal('modal-edit-app-logo');
      await this.loadProjects();
    } catch (err) {
      console.error('Error saving logo:', err);
      alert('Failed to save logo.');
    }
  },

  // =========================================================
  // APP SIGNING KEY CUSTOMIZATION & MULTI-APP ISOLATION
  // =========================================================
  openEditSigningKeyModal() {
    const project = this.currentAppScreenProject || activeProjectsList.find(p => String(p.id) === String(selectedProjectId)) || activeProjectsList[0];
    if (!project) return;

    const titleEl = document.getElementById('modal-signing-app-name');
    if (titleEl) {
      titleEl.textContent = `${project.app_name} (${project.app_id})`;
    }

    const sha1Input = document.getElementById('input-signing-sha1');
    const sha256Input = document.getElementById('input-signing-sha256');

    if (sha1Input) {
      const pkg = (project.app_id || '').toLowerCase();
      if (project.signing_sha1) {
        sha1Input.value = project.signing_sha1;
      } else if (pkg.includes('108')) {
        sha1Input.value = '49:07:E4:89:1C:B3:68:81:80:8C:00:6A:A3:60:D9:B0:0C:83:50:5E';
      } else if (pkg.includes('btgs')) {
        sha1Input.value = '83:98:58:F4:D7:22:67:CE:4D:9B:45:A3:2E:A5:1C:1A:D6:42:F8:77';
      } else if (pkg.includes('1962')) {
        sha1Input.value = '4D:5E:6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70';
      } else if (pkg.includes('104')) {
        sha1Input.value = '81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70:81:92:A3:B4';
      } else {
        sha1Input.value = '';
      }
    }

    if (sha256Input) {
      sha256Input.value = project.signing_sha256 || '';
    }

    openModal('modal-edit-signing-key');
  },

  fillSigningPreset(presetKey) {
    const sha1Input = document.getElementById('input-signing-sha1');
    const sha256Input = document.getElementById('input-signing-sha256');
    if (!sha1Input) return;

    if (presetKey === 'ops108_play') {
      sha1Input.value = '49:07:E4:89:1C:B3:68:81:80:8C:00:6A:A3:60:D9:B0:0C:83:50:5E';
      if (sha256Input) sha256Input.value = '7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F';
    } else if (presetKey === 'btgs_play') {
      sha1Input.value = '66:C8:DE:EC:54:EA:27:17:B5:DB:24:05:B6:9F:B5:ED:5D:68:1B:38';
      if (sha256Input) sha256Input.value = '3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C';
    } else if (presetKey === '1962_mvu') {
      sha1Input.value = '4D:5E:6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70';
      if (sha256Input) sha256Input.value = '5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A';
    }
  },

  async saveEditedSigningKey() {
    const project = this.currentAppScreenProject || activeProjectsList.find(p => String(p.id) === String(selectedProjectId)) || activeProjectsList[0];
    if (!project) return;

    const sha1Input = document.getElementById('input-signing-sha1');
    const sha256Input = document.getElementById('input-signing-sha256');

    const sha1 = sha1Input ? sha1Input.value.trim() : '';
    const sha256 = sha256Input ? sha256Input.value.trim() : '';

    if (!sha1 && !sha256) {
      alert('Please enter a SHA-1 or SHA-256 fingerprint.');
      return;
    }

    try {
      const res = await API.registerSigningKey(project.app_id, sha1, sha256, project.app_id);
      if (res && res.status === 'success') {
        alert(`✅ Signing Key Saved!\n\nRegistered for ${project.app_name} (${project.app_id}).`);
        project.signing_sha1 = sha1;
        project.signing_sha256 = sha256;
        
        closeModal('modal-edit-signing-key');
        await this.loadProjects();
        this.openAppScreen(project.id);
      } else {
        alert('Failed to save signing key: ' + (res ? res.message : 'Unknown error'));
      }
    } catch (e) {
      console.error('Error saving signing key:', e);
      alert('Error saving signing key: ' + e.message);
    }
  }
};



