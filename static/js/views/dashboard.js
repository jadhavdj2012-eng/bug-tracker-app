/**
 * dashboard.js - View controller for the Dashboard
 */

const DashboardView = {
    render: async (containerId) => {
        const container = document.getElementById(containerId);
        UI.showLoader(container);

        try {
            // Fetch modules for dropdown
            let modules = [];
            try {
                modules = await api.get('/modules');
            } catch (e) {
                console.error("Failed to load modules", e);
            }

            // Build HTML
            const html = `
                <div class="dashboard-header" style="flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2>Dashboard Overview</h2>
                        <p>Real-time bug tracking statistics</p>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: flex-end;">
                        <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
                            <label style="font-size: 0.8rem; color: var(--text-secondary); display:block; margin-bottom:0.25rem;">Dashboard Module Filter</label>
                            <select id="global-module-filter" style="box-sizing: border-box; height: 38px; padding: 0.5rem; background: var(--bg-base); color: white; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); width: 100%;">
                                <option value="">All Modules</option>
                                ${modules.map(m => `<option value="${UI.escape(m)}">${UI.escape(m)}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="stats-grid" id="dashboard-stats-container">
                    <!-- Stats injected here -->
                </div>

                <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <div class="stat-card" style="display: flex; flex-direction: column; align-items: center;">
                        <h3 style="margin-bottom: 1rem;">Tickets by Status</h3>
                        <div style="position: relative; width: 100%; max-width: 250px; aspect-ratio: 1/1;">
                            <canvas id="chart-status"></canvas>
                        </div>
                    </div>
                    <div class="stat-card" style="display: flex; flex-direction: column; align-items: center;">
                        <h3 style="margin-bottom: 1rem;">Tickets by Priority</h3>
                        <div style="position: relative; width: 100%; max-width: 250px; aspect-ratio: 1/1;">
                            <canvas id="chart-priority"></canvas>
                        </div>
                    </div>
                    <div class="stat-card" style="display: flex; flex-direction: column; align-items: center;">
                        <h3 style="margin-bottom: 1rem;">Tickets by Assignee</h3>
                        <div style="position: relative; width: 100%; max-width: 250px; aspect-ratio: 1/1;">
                            <canvas id="chart-assignee"></canvas>
                        </div>
                    </div>
                </div>

                <div class="table-container">
                    <div class="table-header" style="flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3>Bugs List</h3>
                            <a href="/api/export?format=csv" class="btn btn-secondary" target="_blank">Export CSV</a>
                        </div>
                        <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 0.8rem; color: var(--text-secondary); display:block; margin-bottom:0.25rem;">From Date</label>
                                <input type="date" id="filter-date-from" style="box-sizing: border-box; height: 38px; padding: 0.5rem; background: var(--bg-base); color: white; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm);">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 0.8rem; color: var(--text-secondary); display:block; margin-bottom:0.25rem;">To Date</label>
                                <input type="date" id="filter-date-to" style="box-sizing: border-box; height: 38px; padding: 0.5rem; background: var(--bg-base); color: white; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm);">
                            </div>
                            <!-- Local module filter removed to use global -->
                            <button id="apply-filters-btn" class="btn btn-primary" disabled style="box-sizing: border-box; height: 38px; padding: 0 1rem; display: flex; align-items: center; justify-content: center; opacity: 0.5; cursor: not-allowed;">Filter</button>
                        </div>
                    </div>
                    <table id="recent-bugs-table">
                        <thead>
                            <tr>
                                <th class="col-bug-id">Bug ID</th>
                                <th class="col-title">Title</th>
                                <th class="col-status">Status</th>
                                <th class="col-severity">Severity</th>
                                <th class="col-module">Module</th>
                                <th class="col-reporter">Reporter</th>
                                <th class="col-date">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="7" style="text-align:center">Loading data...</td></tr>
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;

            const globalModuleFilter = document.getElementById('global-module-filter');

            const refreshDashboardData = async () => {
                const modVal = globalModuleFilter.value;
                let url = '/dashboard';
                if (modVal) url += `?module=${encodeURIComponent(modVal)}`;
                try {
                    const data = await api.get(url);
                    DashboardView.renderStats(data.summary);
                    DashboardView.renderCharts(data.summary);
                } catch (e) {
                    console.error("Error refreshing dashboard data", e);
                }
            };

            // Initial load
            await refreshDashboardData();
            await DashboardView.renderBugsTable();

            const filterBtn = document.getElementById('apply-filters-btn');
            const enableDashboardFilter = () => {
                filterBtn.disabled = false;
                filterBtn.style.opacity = '1';
                filterBtn.style.cursor = 'pointer';
            };

            document.getElementById('filter-date-from').addEventListener('change', enableDashboardFilter);
            document.getElementById('filter-date-to').addEventListener('change', enableDashboardFilter);

            // Bind events
            globalModuleFilter.addEventListener('change', async () => {
                await refreshDashboardData();
                await DashboardView.renderBugsTable();
            });

            filterBtn.addEventListener('click', async () => {
                await DashboardView.renderBugsTable();
                filterBtn.disabled = true;
                filterBtn.style.opacity = '0.5';
                filterBtn.style.cursor = 'not-allowed';
            });

        } catch (err) {
            container.innerHTML = `<div class="error-message" style="display:block">Failed to load dashboard: ${err.message}</div>`;
        }
    },

    renderStats: (summary) => {
        const statsHtml = `
            <div class="stat-card">
                <h3>Total Bugs</h3>
                <div class="val">${summary.total_bugs}</div>
            </div>
            <div class="stat-card">
                <h3>To Do</h3>
                <div class="val">${summary.by_status.to_do || 0}</div>
            </div>
            <div class="stat-card">
                <h3>In Progress</h3>
                <div class="val">${summary.by_status.in_progress || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Closed</h3>
                <div class="val" style="color: var(--success)">${summary.by_status.closed || 0}</div>
            </div>
        `;
        document.getElementById('dashboard-stats-container').innerHTML = statsHtml;
    },

    renderCharts: (summary) => {
        const createDonutChart = (canvasId, labels, data, bgColors) => {
            const canvasMap = DashboardView.chartInstances || {};
            DashboardView.chartInstances = canvasMap;

            if (canvasMap[canvasId]) {
                canvasMap[canvasId].destroy();
            }

            const ctx = document.getElementById(canvasId).getContext('2d');
            canvasMap[canvasId] = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: bgColors,
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    color: '#fff',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#a0aec0', padding: 20 } }
                    }
                }
            });
        };

        // 1. Status Chart
        const statusMap = summary.by_status || {};
        const statusColors = ['#a0aec0', '#4299e1', '#48bb78', '#ed8936', '#38b2ac', '#f56565'];
        const statusLabels = ['To Do', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Rejected'];
        const statusData = [
            statusMap.to_do || 0,
            statusMap.in_progress || 0,
            statusMap.fixed || 0,
            statusMap.retest || 0,
            statusMap.closed || 0,
            statusMap.rejected || 0
        ];
        createDonutChart('chart-status', statusLabels, statusData, statusColors);

        // 2. Priority Chart
        const pMap = summary.by_priority || {};
        const pColors = ['#fc8181', '#ed8936', '#ecc94b', '#48bb78'];
        const pLabels = ['P1', 'P2', 'P3', 'P4'];
        const pData = [pMap.p1 || 0, pMap.p2 || 0, pMap.p3 || 0, pMap.p4 || 0];
        createDonutChart('chart-priority', pLabels, pData, pColors);

        // 3. Assignee Chart
        const aMap = summary.by_assignee || {};
        const aLabels = Object.keys(aMap);
        const aData = Object.values(aMap);
        const aColors = ['#667eea', '#764ba2', '#ed8936', '#38b2ac', '#48bb78', '#e53e3e', '#ecc94b', '#a0aec0'];
        createDonutChart('chart-assignee', aLabels, aData, aColors);
    },

    renderBugsTable: async () => {
        const tbody = document.querySelector('#recent-bugs-table tbody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Loading data...</td></tr>';

        try {
            // Get filter values
            const dateFrom = document.getElementById('filter-date-from')?.value;
            const dateTo = document.getElementById('filter-date-to')?.value;
            const moduleStr = document.getElementById('global-module-filter')?.value;

            let query = '/bugs?limit=100';
            if (dateFrom) query += `&date_from=${dateFrom}`;
            if (dateTo) query += `&date_to=${dateTo}`;
            if (moduleStr) query += `&module=${encodeURIComponent(moduleStr)}`;

            const bugs = await api.get(query);

            if (bugs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No bugs matched the criteria.</td></tr>';
            } else {
                tbody.innerHTML = bugs.map(b => `
                    <tr>
                        <td class="col-bug-id"><a href="#bug/${b.id}" class="bug-link">${UI.escape(b.bug_id)}</a></td>
                        <td class="col-title" title="${UI.escape(b.title)}">${UI.escape(b.title)}</td>
                        <td class="col-status"><span class="badge-status" data-status="${UI.escape(b.status)}">${UI.escape(b.status)}</span></td>
                        <td class="col-severity"><span class="badge-severity" data-severity="${UI.escape(b.severity)}">${UI.escape(b.severity)}</span></td>
                        <td class="col-module">${UI.escape(b.module || '-')}</td>
                        <td class="col-reporter">${UI.escape(b.reporter_name)}</td>
                        <td class="col-date">${UI.formatDate(b.created_at)}</td>
                    </tr>
                `).join('');
            }
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="error-message">Failed to load bugs: ${e.message}</td></tr>`;
        }
    }
};
