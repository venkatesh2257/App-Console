// Chart.js Manager for Multi-App Console
let activityChart = null;
let appsDistributionChart = null;

const Charts = {
  initActivityChart(timelineData = []) {
    const ctx = document.getElementById('chart-activity-timeline');
    if (!ctx) return;

    const labels = timelineData.map(d => d.time_label || '');
    const counts = timelineData.map(d => d.count || 0);

    if (activityChart) activityChart.destroy();

    activityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
        datasets: [{
          label: 'Installations & First Opens',
          data: counts.length ? counts : [4, 8, 12, 18, 24],
          borderColor: '#00f59b',
          backgroundColor: 'rgba(0, 245, 155, 0.08)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#00f59b',
          pointBorderColor: '#08090c',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#13161f',
            titleColor: '#ffffff',
            bodyColor: '#00f59b',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 }, precision: 0 }, beginAtZero: true }
        }
      }
    });
  },

  initAppsDistributionChart(projectsData = [], isSingleApp = false) {
    const ctx = document.getElementById('chart-apps-distribution');
    if (!ctx) return;

    if (appsDistributionChart) appsDistributionChart.destroy();

    const titleEl = document.getElementById('chart-breakdown-title');
    if (titleEl) {
      titleEl.textContent = isSingleApp ? 'Version Adoption' : 'App Fleet Share';
    }

    const labels = projectsData.map(d => d.app_name || `v${d.app_version}`);
    const data = projectsData.map(d => d.installs_count || d.device_count || 1);

    appsDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['VAS 1962', 'ERC Attendance', '108 Ambulance'],
        datasets: [{
          data: data.length ? data : [12, 4, 3],
          backgroundColor: ['#00f59b', '#7952ff', '#00f0ff', '#ffb800', '#ff4757'],
          borderColor: '#0d0f14',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 12 } }
        },
        cutout: '70%'
      }
    });
  }
};
