/**
 * dashboard.js - View controller for the Dashboard
 */

const DashboardView = {
    render: async (containerId) => {
        const container = document.getElementById(containerId);
        UI.showLoader(container);

        try {
            const data = await api.get('/dashboard');
            const summary = data.summary;

            // Fetch modules for dropdown
            let modules = [];
            try {
                modules = await api.get('/modules');
            } catch (e) {
                console.error("Failed to load modules", e);
            }

            // Build HTML
            const html = `
                <div class="dashboard-header">
                    <div>
                        <h2>Dashboard Overview</h2>
                        <p>Real-time bug tracking statistics</p>
                    </div>
                </div>

                <div class="stats-grid">
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
                        <h3>Major</h3>
                        <div class="val" style="color: var(--warning)">${summary.by_severity.major || 0}</div>
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
                            <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
                                <label style="font-size: 0.8rem; color: var(--text-secondary); display:block; margin-bottom:0.25rem;">Module</label>
                                <select id="filter-module" style="box-sizing: border-box; height: 38px; padding: 0.5rem; background: var(--bg-base); color: white; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); width: 100%;">
                                    <option value="">All Modules</option>
                                    ${modules.map(m => `<option value="${UI.escape(m)}">${UI.escape(m)}</option>`).join('')}
                                </select>
                            </div>
                            <button id="apply-filters-btn" class="btn btn-primary" style="box-sizing: border-box; height: 38px; padding: 0 1rem; display: flex; align-items: center; justify-content: center;">Filter</button>
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

            // Render initial table
            await DashboardView.renderBugsTable();

            // Attach event listener to filter button
            document.getElementById('apply-filters-btn').addEventListener('click', DashboardView.renderBugsTable);

        } catch (err) {
            container.innerHTML = `<div class="error-message" style="display:block">Failed to load dashboard: ${err.message}</div>`;
        }
    },

    renderBugsTable: async () => {
        const tbody = document.querySelector('#recent-bugs-table tbody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Loading data...</td></tr>';

        try {
            // Get filter values
            const dateFrom = document.getElementById('filter-date-from').value;
            const dateTo = document.getElementById('filter-date-to').value;
            const moduleStr = document.getElementById('filter-module').value;

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
