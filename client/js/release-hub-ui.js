/**
 * ReleaseHubUI - Mobile Release Command Center UI Coordinator
 * Handles Command Palette (Cmd+K), 3-Step Release Wizard, App Switching,
 * and deep-linking between governance and analysis tabs.
 */

const ReleaseHubUI = {
  currentWizardStep: 1,
  wizardData: {
    appId: 'btgs',
    scanMode: 'aab_only',
    file: null,
    sampleType: 'aab',
    policyUrl: '/privacy-policy.html'
  },

  init() {
    console.log('⚡ [ReleaseHubUI] Initializing Command Center UI & Shortcuts...');
    this.bindKeyboardShortcuts();
    this.setupCommandPalette();
    this.setupWizard();
    this.loadCommandCenterStats();
  },

  // -------------------------------------------------------------
  // KEYBOARD SHORTCUTS (⌘ K / Ctrl + K / ESC)
  // -------------------------------------------------------------
  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // ⌘ K or Ctrl + K -> Open Command Palette
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        this.openCommandModal();
      }

      // ESC -> Close open modals
      if (e.key === 'Escape') {
        this.closeCommandModal();
        this.closeNewReleaseWizard();
      }
    });
  },

  // -------------------------------------------------------------
  // COMMAND PALETTE MODAL (⌘ K)
  // -------------------------------------------------------------
  openCommandModal() {
    const modal = document.getElementById('modal-command-palette');
    if (!modal) return;
    modal.style.display = 'flex';
    const input = document.getElementById('rc-command-search-input');
    if (input) {
      input.value = '';
      input.focus();
      this.filterCommands('');
    }
  },

  closeCommandModal() {
    const modal = document.getElementById('modal-command-palette');
    if (modal) modal.style.display = 'none';
  },

  setupCommandPalette() {
    const input = document.getElementById('rc-command-search-input');
    if (input) {
      input.addEventListener('input', (e) => {
        this.filterCommands(e.target.value.trim().toLowerCase());
      });
    }

    const modal = document.getElementById('modal-command-palette');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeCommandModal();
      });
    }
  },

  filterCommands(query) {
    const container = document.getElementById('rc-command-results-list');
    if (!container) return;

    const commands = [
      {
        id: 'new-release',
        title: 'Start New Release Scan',
        sub: 'Launch the 3-step release validation wizard',
        icon: 'fa-solid fa-plus text-emerald',
        action: () => { this.closeCommandModal(); this.openNewReleaseWizard(); }
      },
      {
        id: 'quick-aab',
        title: 'Quick Scan Sample AAB (BTGS v41)',
        sub: 'Run full 7-stage release check on app-release.aab',
        icon: 'fa-solid fa-file-zipper text-cyan',
        action: () => { this.closeCommandModal(); this.viewAppRelease('btgs', 'aab'); }
      },
      {
        id: 'quick-apk',
        title: 'Quick Scan Sample APK',
        sub: 'Run binary checks on app-release.apk',
        icon: 'fa-brands fa-android text-emerald',
        action: () => { this.closeCommandModal(); this.viewAppRelease('btgs', 'apk'); }
      },
      {
        id: 'app-btgs',
        title: 'App: Travelite Ground Staff (BTGS)',
        sub: 'com.bavya.btgs • Target SDK 36 • 16 KB Aligned',
        icon: 'fa-solid fa-plane-departure text-cyan',
        action: () => { this.closeCommandModal(); this.viewAppRelease('btgs'); }
      },
      {
        id: 'app-vas1962',
        title: 'App: VAS 1962 Veterinary Ops',
        sub: 'in.gov.telangana.vas1962 • Target SDK 36',
        icon: 'fa-solid fa-shield-heart text-emerald',
        action: () => { this.closeCommandModal(); this.viewAppRelease('bh1962'); }
      },
      {
        id: 'app-ops108',
        title: 'App: 108 Emergency Ambulance Ops',
        sub: 'in.bhspl.ops108 • 2 Blockers Identified',
        icon: 'fa-solid fa-truck-medical text-coral',
        action: () => { this.closeCommandModal(); this.viewAppRelease('ops108'); }
      },
      {
        id: 'app-citizen104',
        title: 'App: 104 Health Grievance System',
        sub: 'in.bhspl.citizen104 • Zero Open Defects',
        icon: 'fa-solid fa-heart-pulse text-violet',
        action: () => { this.closeCommandModal(); this.viewAppRelease('citizen104'); }
      },
      {
        id: 'nav-overview',
        title: 'Go to Overview',
        sub: 'High-level release health and active release cards',
        icon: 'fa-solid fa-gauge text-cyan',
        action: () => { this.closeCommandModal(); switchTab('tab-overview'); }
      },
      {
        id: 'nav-releases',
        title: 'Go to Release',
        sub: 'Inspect active binary verification gates',
        icon: 'fa-solid fa-rocket text-emerald',
        action: () => { this.closeCommandModal(); switchTab('tab-playstore-audit'); }
      },
      {
        id: 'nav-engines',
        title: 'Go to Audit Engines Status',
        sub: 'bundletool, Greenlight, MobSF, and App Registry',
        icon: 'fa-solid fa-microchip text-cyan',
        action: () => { this.closeCommandModal(); switchTab('tab-engines'); }
      },
      {
        id: 'nav-findings',
        title: 'Go to Release Findings & Remediation',
        sub: 'Engineering tickets and actionable fix instructions',
        icon: 'fa-solid fa-triangle-exclamation text-coral',
        action: () => { this.closeCommandModal(); switchTab('tab-findings'); }
      },
      {
        id: 'nav-delta',
        title: 'Go to Release-to-Release Delta',
        sub: 'v40 ➔ v41 continuity, SDK bump, and permission diffs',
        icon: 'fa-solid fa-code-compare text-violet',
        action: () => { this.closeCommandModal(); switchTab('tab-delta'); }
      },
      {
        id: 'nav-policies',
        title: 'Go to Policy Governance',
        sub: 'Google Play 2026.09 compliance matrix and horizons',
        icon: 'fa-solid fa-shield-halved text-emerald',
        action: () => { this.closeCommandModal(); switchTab('tab-policies'); }
      }
    ];

    const filtered = query 
      ? commands.filter(c => c.title.toLowerCase().includes(query) || c.sub.toLowerCase().includes(query))
      : commands;

    if (filtered.length === 0) {
      container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--rc-text-muted);">No commands or releases matching "${query}"</div>`;
      return;
    }

    container.innerHTML = filtered.map((c, idx) => `
      <div class="rc-command-item ${idx === 0 ? 'active' : ''}" onclick="ReleaseHubUI.runCommandAction('${c.id}')">
        <div style="width: 28px; text-align: center;"><i class="${c.icon}"></i></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: var(--rc-text-primary); font-size: 13.5px;">${c.title}</div>
          <div style="font-size: 11.5px; color: var(--rc-text-muted); margin-top: 1px;">${c.sub}</div>
        </div>
        <i class="fa-solid fa-chevron-right" style="font-size: 11px; opacity: 0.4;"></i>
      </div>
    `).join('');

    window._rcCommands = filtered;
  },

  runCommandAction(id) {
    const item = (window._rcCommands || []).find(c => c.id === id);
    if (item && typeof item.action === 'function') {
      item.action();
    }
  },

  // -------------------------------------------------------------
  // 3-STEP RELEASE WIZARD
  // -------------------------------------------------------------
  openNewReleaseWizard() {
    const modal = document.getElementById('modal-new-release-wizard');
    if (!modal) return;
    this.currentWizardStep = 1;
    this.renderWizardStep(1);
    modal.style.display = 'flex';
  },

  closeNewReleaseWizard() {
    const modal = document.getElementById('modal-new-release-wizard');
    if (modal) modal.style.display = 'none';
  },

  setupWizard() {
    const modal = document.getElementById('modal-new-release-wizard');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeNewReleaseWizard();
      });
    }

    const dropZone = document.getElementById('wizard-drop-zone');
    const fileInput = document.getElementById('wizard-file-input');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.wizardData.file = e.dataTransfer.files[0];
          this.updateWizardFileInfo();
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.wizardData.file = e.target.files[0];
          this.updateWizardFileInfo();
        }
      });
    }
  },

  renderWizardStep(step) {
    this.currentWizardStep = step;
    document.querySelectorAll('.rc-wiz-step-pane').forEach((pane, idx) => {
      pane.style.display = (idx + 1 === step) ? 'block' : 'none';
    });

    document.querySelectorAll('.rc-wiz-stepper-item').forEach((item, idx) => {
      item.classList.remove('active', 'completed');
      if (idx + 1 === step) item.classList.add('active');
      else if (idx + 1 < step) item.classList.add('completed');
    });

    const btnBack = document.getElementById('btn-wizard-back');
    const btnNext = document.getElementById('btn-wizard-next');

    if (btnBack) btnBack.style.visibility = (step === 1) ? 'hidden' : 'visible';
    if (btnNext) {
      if (step === 3) {
        btnNext.innerHTML = '<i class="fa-solid fa-play"></i> Run 7-Stage Release Gate';
      } else {
        btnNext.innerHTML = 'Continue <i class="fa-solid fa-arrow-right"></i>';
      }
    }
  },

  nextWizardStep() {
    if (this.currentWizardStep === 1) {
      const appSelect = document.getElementById('wizard-select-app');
      const modeSelect = document.querySelector('input[name="wizard-mode"]:checked');
      if (appSelect) this.wizardData.appId = appSelect.value;
      if (modeSelect) this.wizardData.scanMode = modeSelect.value;
      this.renderWizardStep(2);
    } else if (this.currentWizardStep === 2) {
      const sampleOption = document.querySelector('input[name="wizard-source-type"]:checked');
      if (sampleOption) this.wizardData.sampleType = sampleOption.value;

      const policyInput = document.getElementById('wizard-input-policy');
      if (policyInput && policyInput.value) this.wizardData.policyUrl = policyInput.value;

      this.renderWizardStep(3);
      this.renderWizardSummary();
    } else if (this.currentWizardStep === 3) {
      this.executeWizardReleaseScan();
    }
  },

  prevWizardStep() {
    if (this.currentWizardStep > 1) {
      this.renderWizardStep(this.currentWizardStep - 1);
    }
  },

  updateWizardFileInfo() {
    const info = document.getElementById('wizard-selected-file-info');
    if (!info) return;
    if (this.wizardData.file) {
      info.innerHTML = `
        <div style="background: rgba(22, 163, 74, 0.1); border: 1px solid var(--rc-pass); padding: 10px 14px; border-radius: 6px; color: var(--rc-pass); font-size: 13px; margin-top: 10px;">
          <i class="fa-solid fa-file-circle-check"></i> <strong>${this.wizardData.file.name}</strong> (${(this.wizardData.file.size / (1024*1024)).toFixed(2)} MB)
        </div>
      `;
    }
  },

  renderWizardSummary() {
    const summaryContainer = document.getElementById('wizard-step3-summary');
    if (!summaryContainer) return;

    const appMap = {
      btgs: { name: 'Travelite Ground Staff (BTGS)', pkg: 'com.bavya.btgs' },
      bh1962: { name: 'VAS 1962 Veterinary Ops', pkg: 'in.gov.telangana.vas1962' },
      ops108: { name: '108 Emergency Ambulance Ops', pkg: 'in.bhspl.ops108' },
      citizen104: { name: '104 Health Grievance System', pkg: 'in.bhspl.citizen104' }
    };

    const currentApp = appMap[this.wizardData.appId] || { name: 'Travelite Ground Staff', pkg: 'com.bavya.btgs' };

    summaryContainer.innerHTML = `
      <div style="background: var(--rc-bg-subtle); border: 1px solid var(--rc-border-base); border-radius: 8px; padding: 16px 20px; font-size: 13px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div>
            <div style="color: var(--rc-text-muted); font-size: 11px; text-transform: uppercase;">Target Application</div>
            <div style="font-weight: 700; color: var(--rc-text-primary); font-size: 14px; margin-top: 2px;">${currentApp.name}</div>
            <code style="font-size: 11px; color: var(--rc-text-secondary);">${currentApp.pkg}</code>
          </div>
          <div>
            <div style="color: var(--rc-text-muted); font-size: 11px; text-transform: uppercase;">Verification Mode</div>
            <div style="font-weight: 700; color: var(--rc-pass); font-size: 14px; margin-top: 2px;">
              ${this.wizardData.scanMode === 'source_aab' ? 'Full Verification (Source + AAB)' : 'AAB Only (Partial Source)'}
            </div>
            <div style="font-size: 11px; color: var(--rc-text-secondary);">16KB + SDK 36 + SHA-256 Lock</div>
          </div>
          <div>
            <div style="color: var(--rc-text-muted); font-size: 11px; text-transform: uppercase;">Artifact Source</div>
            <div style="font-weight: 600; color: var(--rc-text-primary); margin-top: 2px;">
              ${this.wizardData.file ? this.wizardData.file.name : (this.wizardData.sampleType === 'apk' ? 'Local Sample APK' : 'Local Sample AAB (v41)')}
            </div>
          </div>
          <div>
            <div style="color: var(--rc-text-muted); font-size: 11px; text-transform: uppercase;">Privacy Policy Source</div>
            <div style="font-weight: 600; color: var(--rc-text-primary); margin-top: 2px;">${this.wizardData.policyUrl || '/privacy-policy.html'}</div>
          </div>
        </div>
      </div>
    `;
  },

  async executeWizardReleaseScan() {
    this.closeNewReleaseWizard();
    switchTab('tab-playstore-audit');

    if (window.PlayStoreAuditor) {
      PlayStoreAuditor.selectedAppId = this.wizardData.appId;
      PlayStoreAuditor.scanMode = this.wizardData.scanMode;

      const appProfileSelect = document.getElementById('select-app-profile');
      if (appProfileSelect) appProfileSelect.value = this.wizardData.appId;

      if (this.wizardData.file) {
        PlayStoreAuditor.handleFileUpload(this.wizardData.file);
      } else {
        PlayStoreAuditor.scanLocalSample(this.wizardData.sampleType || 'aab');
      }
    }
  },

  // -------------------------------------------------------------
  // VIEW APP RELEASE ACTION (from Command Center & Cards)
  // -------------------------------------------------------------
  viewAppRelease(appId, sampleType = 'aab') {
    switchTab('tab-playstore-audit');
    if (window.PlayStoreAuditor) {
      PlayStoreAuditor.selectedAppId = appId;
      const appProfileSelect = document.getElementById('select-app-profile');
      if (appProfileSelect) appProfileSelect.value = appId;
      PlayStoreAuditor.scanLocalSample(sampleType);
    }
  },

  // -------------------------------------------------------------
  // LOAD OVERVIEW COMMAND CENTER STATS
  // -------------------------------------------------------------
  loadCommandCenterStats() {}
};

window.ReleaseHubUI = ReleaseHubUI;
document.addEventListener('DOMContentLoaded', () => ReleaseHubUI.init());
