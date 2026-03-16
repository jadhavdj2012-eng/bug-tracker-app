/**
 * kanban.js - View controller for the Status Board
 */

const KanbanView = {
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

            // Define expected columns based on state machine
            const columns = ['To Do', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Rejected'];

            const html = `
                <div class="dashboard-header" style="flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2>Status Board</h2>
                        <p>Drag and drop cards to update bug status</p>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.8rem; color: var(--text-secondary); display:block; margin-bottom:0.25rem;">From Date</label>
                            <input type="date" id="kb-filter-date-from" style="box-sizing: border-box; height: 38px; padding: 0.5rem; background: var(--bg-base); color: white; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm);">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.8rem; color: var(--text-secondary); display:block; margin-bottom:0.25rem;">To Date</label>
                            <input type="date" id="kb-filter-date-to" style="box-sizing: border-box; height: 38px; padding: 0.5rem; background: var(--bg-base); color: white; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm);">
                        </div>
                        <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
                            <label style="font-size: 0.8rem; color: var(--text-secondary); display:block; margin-bottom:0.25rem;">Module</label>
                            <select id="kb-filter-module" style="box-sizing: border-box; height: 38px; padding: 0.5rem; background: var(--bg-base); color: white; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); width: 100%;">
                                <option value="">All Modules</option>
                                ${modules.map(m => `<option value="${UI.escape(m)}">${UI.escape(m)}</option>`).join('')}
                            </select>
                        </div>
                        <button id="kb-apply-filters-btn" class="btn btn-primary" disabled style="box-sizing: border-box; height: 38px; padding: 0 1rem; display: flex; align-items: center; justify-content: center; opacity: 0.5; cursor: not-allowed;">Filter</button>
                    </div>
                </div>
                
                <div class="kanban-board" id="board-container">
                    ${columns.map(col => `
                        <div class="kanban-column col-${col.toLowerCase().replace(' ', '')}" data-status="${col}">
                            <div class="kanban-header">
                                <h4>${col}</h4>
                                <span class="kanban-count" id="count-${col.replace(' ', '-')}">0</span>
                            </div>
                            <div class="kanban-cards" id="list-${col.replace(' ', '-')}">
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.innerHTML = html;

            // Setup Drag & Drop
            KanbanView.setupDragAndDrop();

            // Enable filter button only when user changes something
            const filterBtn = document.getElementById('kb-apply-filters-btn');
            const enableFilterBtn = () => {
                filterBtn.disabled = false;
                filterBtn.style.opacity = '1';
                filterBtn.style.cursor = 'pointer';
            };

            document.getElementById('kb-filter-date-from').addEventListener('change', enableFilterBtn);
            document.getElementById('kb-filter-date-to').addEventListener('change', enableFilterBtn);
            document.getElementById('kb-filter-module').addEventListener('change', () => {
                enableFilterBtn();
                // Also immediately fetch bugs when module changes
                KanbanView.fetchBugs().then(() => {
                    filterBtn.disabled = true;
                    filterBtn.style.opacity = '0.5';
                    filterBtn.style.cursor = 'not-allowed';
                });
            });

            // Attach filter button click
            filterBtn.addEventListener('click', async () => {
                await KanbanView.fetchBugs();
                filterBtn.disabled = true;
                filterBtn.style.opacity = '0.5';
                filterBtn.style.cursor = 'not-allowed';
            });

            // Fetch initial bugs
            await KanbanView.fetchBugs();

        } catch (err) {
            container.innerHTML = `<div class="error-message" style="display:block">Failed to load board: ${err.message}</div>`;
        }
    },

    fetchBugs: async () => {
        // Clear all lists
        const columns = ['To Do', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Rejected'];
        columns.forEach(col => {
            const list = document.getElementById(`list-${col.replace(' ', '-')}`);
            if (list) list.innerHTML = '';
        });

        try {
            const dateFrom = document.getElementById('kb-filter-date-from').value;
            const dateTo = document.getElementById('kb-filter-date-to').value;
            const moduleStr = document.getElementById('kb-filter-module').value;

            let query = '/bugs?limit=200';
            if (dateFrom) query += `&date_from=${dateFrom}`;
            if (dateTo) query += `&date_to=${dateTo}`;
            if (moduleStr) query += `&module=${encodeURIComponent(moduleStr)}`;

            const bugs = await api.get(query);

            // Populate columns
            bugs.forEach(bug => {
                const listId = `list-${bug.status.replace(' ', '-')}`;
                const list = document.getElementById(listId);
                if (list) {
                    list.appendChild(KanbanView.createCard(bug));
                }
            });

            // Update Counts
            KanbanView.updateCounts();
        } catch (err) {
            console.error("Failed to fetch kanban bugs:", err);
        }
    },

    createCard: (bug) => {
        const el = document.createElement('div');
        el.className = 'kanban-card';
        el.draggable = true;
        el.dataset.id = bug.id;
        el.dataset.status = bug.status;

        const avatar = bug.assignee_name ? `<div class="assignee-avatar" title="Assignee: ${bug.assignee_name}">${UI.getInitials(bug.assignee_name)}</div>` : '';

        el.innerHTML = `
            <div class="card-header">
                <span class="card-id">${UI.escape(bug.bug_id)}</span>
                <span class="badge-severity" data-severity="${UI.escape(bug.severity)}">${UI.escape(bug.severity)}</span>
            </div>
            <div class="card-title" title="${UI.escape(bug.title)}"><a href="#bug/${bug.id}" style="color:inherit;text-decoration:none">${UI.escape(bug.title)}</a></div>
            <div class="card-footer">
                <span style="font-size:0.75rem; color:var(--text-muted)">${UI.escape(bug.module || 'System')}</span>
                ${avatar}
            </div>
        `;

        el.addEventListener('dragstart', (e) => {
            el.classList.add('dragging');
            e.dataTransfer.setData('text/plain', bug.id);
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
        });

        return el;
    },

    setupDragAndDrop: () => {
        const columns = document.querySelectorAll('.kanban-cards');

        columns.forEach(col => {
            col.addEventListener('dragover', e => {
                e.preventDefault(); // Allows drop
            });

            col.addEventListener('drop', async e => {
                e.preventDefault();
                const bugId = e.dataTransfer.getData('text/plain');
                const card = document.querySelector(`.kanban-card[data-id="${bugId}"]`);
                const newStatus = col.parentElement.dataset.status;
                const oldStatus = card.dataset.status;

                if (!card || oldStatus === newStatus) return;

                // --- MVP Simple Validation ---
                // Full validation should run in backend checking State Machine rules
                const currentRole = AppState.currentUser.role;
                if (newStatus === 'Closed' && currentRole !== 'QA' && currentRole !== 'Admin') {
                    alert('Only QA can mark bugs as Closed.');
                    return;
                }

                // Move UI temporarily
                col.appendChild(card);
                card.dataset.status = newStatus;
                KanbanView.updateCounts();

                // Send DB Update
                try {
                    await api.put(`/bugs/${bugId}`, { status: newStatus });
                } catch (err) {
                    alert('Failed to update status: ' + err.message);
                    // Revert UI on failure
                    document.getElementById(`list-${oldStatus.replace(' ', '-')}`).appendChild(card);
                    card.dataset.status = oldStatus;
                    KanbanView.updateCounts();
                }
            });
        });
    },

    updateCounts: () => {
        const columns = ['To Do', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Rejected'];
        columns.forEach(col => {
            const list = document.getElementById(`list-${col.replace(' ', '-')}`);
            const countBadge = document.getElementById(`count-${col.replace(' ', '-')}`);
            if (list && countBadge) {
                countBadge.textContent = list.children.length;
            }
        });
    }
};
