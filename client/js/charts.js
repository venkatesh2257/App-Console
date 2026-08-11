// Chart.js Real-Time Live Manager for Multi-App Console
let activityChart = null;
let appsDistributionChart = null;

const Charts = {
  initActivityChart(timelineData = []) {
    const ctx = document.getElementById('chart-activity-timeline');
    if (!ctx) return;

    let labels = [];
    let counts = [];

    if (timelineData && timelineData.length > 0) {
      labels = timelineData.map(d => d.time_label || '');
      counts = timelineData.map(d => d.count || 0);
    } else {
      // Real dynamic date labels for current week / month with 0 values
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        counts.push(0);
      }
    }

    if (activityChart) activityChart.destroy();

    activityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Live Installations & First Opens',
          data: counts,
          borderColor: '#00f59b',
          backgroundColor: 'rgba(0, 245, 155, 0.06)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#00f59b',
          pointBorderColor: '#08090c',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#13161f',
            titleColor: '#ffffff',
            bodyColor: '#00f59b',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => ` ${context.parsed.y} Installs`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#64748b', font: { family: 'Inter', size: 11 }, precision: 0, stepSize: 1 },
            beginAtZero: true,
            suggestedMax: Math.max(...counts, 5)
          }
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

    let labels = [];
    let data = [];
    let bgColors = ['#00f59b', '#7952ff', '#00f0ff', '#ffb800', '#ff4757'];

    const totalInstalls = projectsData.reduce((acc, p) => acc + (p.installs_count || p.device_count || 0), 0);

    if (projectsData && projectsData.length > 0 && totalInstalls > 0) {
      labels = projectsData.map(d => d.app_name || `v${d.app_version}`);
      data = projectsData.map(d => d.installs_count || d.device_count || 0);
    } else {
      // Clean real registered apps state (showing 0 installs)
      labels = projectsData.length > 0 ? projectsData.map(d => `${d.app_name} (0 Installs)`) : ['1962 Mobile Veterinary Unit (0 Installs)'];
      data = [1];
      bgColors = ['rgba(255, 255, 255, 0.08)'];
    }

    appsDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors,
          borderColor: '#0d0f14',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 12 }
          },
          tooltip: {
            enabled: totalInstalls > 0
          }
        },
        cutout: '70%'
      }
    });
  }
};
