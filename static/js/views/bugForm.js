/**
 * bugForm.js - View controller for Creating and Editing Bugs
 */
const BugFormView = {
    render: async (containerId, bugId = null) => {
        const container = document.getElementById(containerId);
        UI.showLoader(container);

        try {
            // Load users for assignee dropdown
            let users = [];
            try { users = await api.get('/users'); } catch (e) { console.error("Could not load users", e); }

            let bug = null;
            if (bugId) {
                bug = await api.get(`/bugs/${bugId}`);
            }

            const isEdit = !!bug;

            // Map users to "Team" representatives
            const fDev = users.find(u => u.role === 'Frontend Developer');
            const bDev = users.find(u => u.role === 'Backend Developer');

            const html = `
                <div class="form-container">
                    <div class="form-header">
                        <h2>${isEdit ? `Edit ${bug.bug_id}` : 'Report a New Bug'}</h2>
                        <p>Fill out the details below as completely as possible.</p>
                    </div>

                    <form id="bug-form">
                        <div class="form-group">
                            <label for="title">Bug Title *</label>
                            <input type="text" id="title" required value="${isEdit ? UI.escape(bug.title) : ''}" placeholder="e.g., Login button unresponsive on mobile Safari">
                        </div>

                        <div class="form-group">
                            <label for="description">Detailed Description *</label>
                            <textarea id="description" required placeholder="Describe the issue in detail...">${isEdit ? UI.escape(bug.description) : ''}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="steps">Steps to Reproduce *</label>
                            <textarea id="steps" required placeholder="1. Go to...\n2. Click on...\n3. See error...">${isEdit ? UI.escape(bug.steps_to_reproduce) : ''}</textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="expected">Expected Result *</label>
                                <textarea id="expected" required>${isEdit ? UI.escape(bug.expected_result) : ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label for="actual">Actual Result *</label>
                                <textarea id="actual" required>${isEdit ? UI.escape(bug.actual_result) : ''}</textarea>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="severity">Severity *</label>
                                <select id="severity" required>
                                    <option value="Major" ${isEdit && bug.severity === 'Major' ? 'selected' : ''}>Major</option>
                                    <option value="Minor" ${!isEdit || bug.severity === 'Minor' ? 'selected' : ''}>Minor</option>
                                    <option value="Trivial" ${isEdit && bug.severity === 'Trivial' ? 'selected' : ''}>Trivial</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="priority">Priority *</label>
                                <select id="priority" required>
                                    <option value="P1" ${isEdit && bug.priority === 'P1' ? 'selected' : ''}>P1 (Highest)</option>
                                    <option value="P2" ${isEdit && bug.priority === 'P2' ? 'selected' : ''}>P2</option>
                                    <option value="P3" ${!isEdit || bug.priority === 'P3' ? 'selected' : ''}>P3</option>
                                    <option value="P4" ${isEdit && bug.priority === 'P4' ? 'selected' : ''}>P4 (Lowest)</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="module">Module</label>
                                <input type="text" id="module" value="${isEdit && bug.module ? UI.escape(bug.module) : ''}" placeholder="e.g., Auth, Cart">
                            </div>
                            <div class="form-group">
                                <label for="assignee_id">Assignee</label>
                                <select id="assignee_id">
                                    <option value="">Unassigned</option>
                                    ${fDev ? `<option value="${fDev.id}" ${isEdit && bug.assignee_id === fDev.id ? 'selected' : ''}>Team Frontend</option>` : ''}
                                    ${bDev ? `<option value="${bDev.id}" ${isEdit && bug.assignee_id === bDev.id ? 'selected' : ''}>Team Backend</option>` : ''}
                                </select>
                            </div>
                        </div>
                        
                        <!-- Uploads -->
                        ${!isEdit ? `
                        <h3 style="margin-top:2rem; margin-bottom:1rem; font-size:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem">Screenshots</h3>
                        <div class="form-group">
                            <input type="file" id="screenshot-upload" accept="image/*" multiple style="display:none">
                            <div class="file-upload" onclick="document.getElementById('screenshot-upload').click()">
                                <div><span style="font-size:2rem">📸</span></div>
                                <p style="margin-top:1rem">Click to browse or drag and drop screenshots here</p>
                                <div id="file-names" class="file-name"></div>
                            </div>
                        </div>` : ''}

                        <div id="form-error" class="error-message"></div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="window.location.hash='#dashboard'">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="submit-btn">${isEdit ? 'Save Changes' : 'Submit Bug Report'}</button>
                        </div>
                    </form>
                </div>
            `;

            container.innerHTML = html;

            // Handle file selection display
            const fileInput = document.getElementById('screenshot-upload');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    const names = Array.from(e.target.files).map(f => f.name).join(', ');
                    document.getElementById('file-names').textContent = names;
                });
            }

            // Handle submission
            document.getElementById('bug-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('submit-btn');
                const errBox = document.getElementById('form-error');

                btn.disabled = true;
                btn.textContent = 'Saving...';
                errBox.style.display = 'none';

                const payload = {
                    title: document.getElementById('title').value,
                    description: document.getElementById('description').value,
                    steps_to_reproduce: document.getElementById('steps').value,
                    expected_result: document.getElementById('expected').value,
                    actual_result: document.getElementById('actual').value,
                    severity: document.getElementById('severity').value,
                    priority: document.getElementById('priority').value,
                    module: document.getElementById('module').value
                };

                const assignee = document.getElementById('assignee_id').value;
                if (assignee) payload.assignee_id = parseInt(assignee);

                try {
                    let resultBug;
                    if (isEdit) {
                        resultBug = await api.put(`/bugs/${bugId}`, payload);
                    } else {
                        resultBug = await api.post('/bugs', payload);

                        // Handle initial file uploads
                        const files = document.getElementById('screenshot-upload').files;
                        if (files && files.length > 0) {
                            for (let i = 0; i < files.length; i++) {
                                await api.upload(`/bugs/${resultBug.id}/screenshots`, files[i]);
                            }
                        }
                    }

                    // Redirect to bug detail view
                    window.location.hash = `#bug/${resultBug.id}`;

                } catch (err) {
                    errBox.textContent = `Error: ${err.message}`;
                    errBox.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = isEdit ? 'Save Changes' : 'Submit Bug Report';
                }
            });

        } catch (err) {
            container.innerHTML = `<div class="error-message" style="display:block">Failed to load form: ${err.message}</div>`;
        }
    }
};
