/**
 * bugDetail.js - View controller for Single Bug details
 */

const BugDetailView = {
    render: async (containerId, bugId) => {
        const container = document.getElementById(containerId);
        UI.showLoader(container);

        try {
            const bug = await api.get(`/bugs/${bugId}`);

            // Map users to "Team" representatives
            const fDev = AppState.users.find(u => u.role === 'Frontend Developer');
            const bDev = AppState.users.find(u => u.role === 'Backend Developer');

            // Layout setup
            let html = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2rem;">
                    <div>
                        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.5rem">
                            <h2 style="margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:800px;" title="${UI.escape(bug.title)}">${UI.escape(bug.title)}</h2>
                            <span class="badge-status" data-status="${UI.escape(bug.status)}">${UI.escape(bug.status)}</span>
                        </div>
                        <p style="color:var(--text-secondary)">${UI.escape(bug.bug_id)} • Reported by ${UI.escape(bug.reporter_name)} on ${UI.formatDate(bug.created_at)}</p>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        ${AppState.currentUser.role === 'QA' ? `<button class="btn btn-secondary" onclick="BugDetailView.deleteBug(${bug.id})" style="border-color:var(--danger); color:var(--danger)">Delete</button>` : ''}
                        <a href="#edit/${bug.id}" class="btn btn-secondary">Edit</a>
                        <button class="btn btn-primary" onclick="BugDetailView.toggleStatusPrompt(${bug.id})">Update Status</button>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: 2fr 1fr; gap:2rem;">
                    
                    <!-- Left Column: Details -->
                    <div>
                        <div class="stat-card" style="margin-bottom:1.5rem">
                            <h3>Description</h3>
                            <div style="white-space: pre-wrap; font-size:1rem; line-height:1.6">${UI.escape(bug.description)}</div>
                        </div>
                        
                        <div class="stat-card" style="margin-bottom:1.5rem">
                            <h3>Steps to Reproduce</h3>
                            <div style="white-space: pre-wrap; font-size:0.95rem; line-height:1.6">${UI.escape(bug.steps_to_reproduce)}</div>
                            
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1.5rem; border-top:1px solid var(--border-color); padding-top:1rem;">
                                <div>
                                    <h4 style="color:var(--text-secondary); font-size:0.875rem">Expected Result</h4>
                                    <div style="white-space: pre-wrap; font-size:0.95rem">${UI.escape(bug.expected_result)}</div>
                                </div>
                                <div>
                                    <h4 style="color:var(--text-secondary); font-size:0.875rem">Actual Result</h4>
                                    <div style="white-space: pre-wrap; font-size:0.95rem">${UI.escape(bug.actual_result)}</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Screenshots section -->
                        ${bug.screenshots && bug.screenshots.length > 0 ? `
                        <div class="stat-card" style="margin-bottom:1.5rem">
                            <h3>Screenshots</h3>
                            <div style="display:flex; gap:1rem; overflow-x:auto; padding-top:1rem;">
                                ${bug.screenshots.map(s => `
                                    <a href="${s.url}" target="_blank" style="border:1px solid var(--border-color); border-radius:var(--border-radius-sm); padding:0.25rem; display:inline-block">
                                        <img src="${s.url}" alt="${s.filename}" style="max-height:150px; display:block">
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- Comments section -->
                        <div class="stat-card">
                            <h3>Comments</h3>
                            <div style="margin-bottom:1.5rem">
                                ${bug.comments && bug.comments.length > 0 ? bug.comments.map(c => `
                                    <div style="padding:1rem; border-bottom:1px solid var(--border-color)">
                                        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem">
                                            <span style="font-weight:600">${UI.escape(c.author_name)}</span>
                                            <span style="color:var(--text-muted); font-size:0.8rem">${UI.formatDate(c.timestamp)}</span>
                                        </div>
                                        <div style="white-space:pre-wrap; font-size:0.95rem">${UI.escape(c.text)}</div>
                                    </div>
                                `).join('') : '<p style="padding:1rem">No comments yet.</p>'}
                            </div>
                            
                            <!-- Add Comment form -->
                            <form id="comment-form" style="display:flex; flex-direction:column; gap:0.5rem">
                                <textarea id="comment-text" required placeholder="Add a comment..." style="width:100%; min-height:80px; padding:0.5rem; background:var(--bg-base); color:white; border:1px solid var(--border-color); border-radius:var(--border-radius-sm)"></textarea>
                                <button type="submit" class="btn btn-secondary" style="align-self:flex-end">Post Comment</button>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Right Column: Meta & Audit -->
                    <div>
                        <div class="stat-card" style="margin-bottom:1.5rem">
                            <h3>Details</h3>
                            <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:1rem;">
                                <li>
                                    <span style="color:var(--text-secondary); display:block; font-size:0.8rem">Severity</span>
                                    <span class="badge-severity" data-severity="${UI.escape(bug.severity)}">${UI.escape(bug.severity)}</span>
                                </li>
                                <li>
                                    <span style="color:var(--text-secondary); display:block; font-size:0.8rem">Priority</span>
                                    <span>${UI.escape(bug.priority)}</span>
                                </li>
                                <li>
                                    <span style="color:var(--text-secondary); display:block; font-size:0.8rem">Assignee</span>
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.25rem">
                                        <div style="display:flex; align-items:center; gap:0.5rem;">
                                            <div class="assignee-avatar">${UI.getInitials(bug.assignee_name)}</div>
                                            <span>${bug.assignee_name ? UI.escape(bug.assignee_name) : 'Unassigned'}</span>
                                        </div>
                                        <button class="btn btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem" onclick="BugDetailView.toggleAssigneePrompt(${bug.id})">Assign</button>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        
                        <div class="stat-card">
                            <h3>History</h3>
                            <ul style="list-style:none; padding:0; margin-top:1rem; border-left:2px solid var(--border-color); margin-left:0.5rem;">
                                ${bug.audit_history.map(a => `
                                    <li style="position:relative; padding-left:1.5rem; padding-bottom:1rem;">
                                        <div style="position:absolute; left:-6px; top:0; width:10px; height:10px; border-radius:50%; background:var(--text-muted)"></div>
                                        <div style="font-size:0.85rem; padding-bottom:0.25rem">
                                            <strong>${UI.escape(a.changed_by_name)}</strong> changed <em>${UI.escape(a.field_changed)}</em>
                                        </div>
                                        <div style="font-size:0.8rem; color:var(--text-muted)">
                                            <span style="text-decoration:line-through">${UI.escape(a.old_value || 'None')}</span> → 
                                            <span style="color:var(--primary)">${UI.escape(a.new_value)}</span>
                                        </div>
                                        <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.25rem">${UI.formatDate(a.changed_at)}</div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- Simple Status Modal inside the view -->
                <div id="status-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:50; justify-content:center; align-items:center;">
                    <div style="background:var(--bg-surface); padding:2rem; border-radius:var(--border-radius-md); width:400px; max-width:90%">
                        <h3>Update Status</h3>
                        <p style="margin-bottom:1rem; color:var(--text-muted)">Select a new status for this bug.</p>
                        <select id="new-status" style="width:100%; padding:0.5rem; background:var(--bg-base); color:white; border:1px solid var(--border-color); margin-bottom:1.5rem">
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Fixed">Fixed</option>
                            <option value="Retest">Retest</option>
                            <option value="Closed">Closed</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <div style="display:flex; justify-content:flex-end; gap:1rem">
                            <button class="btn btn-secondary" onclick="document.getElementById('status-modal').style.display='none'">Cancel</button>
                            <button class="btn btn-primary" onclick="BugDetailView.submitStatus(${bug.id})">Save</button>
                        </div>
                    </div>
                </div>

                <!-- Assignee Modal inside the view -->
                <div id="assignee-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:50; justify-content:center; align-items:center;">
                    <div style="background:var(--bg-surface); padding:2rem; border-radius:var(--border-radius-md); width:400px; max-width:90%">
                        <h3>Assign to Team Member</h3>
                        <p style="margin-bottom:1rem; color:var(--text-muted)">Select a developer or QA member to assign.</p>
                        <select id="new-assignee" style="width:100%; padding:0.5rem; background:var(--bg-base); color:white; border:1px solid var(--border-color); margin-bottom:1.5rem">
                            <option value="">Unassigned</option>
                            ${fDev ? `<option value="${fDev.id}" ${bug.assignee_id === fDev.id ? 'selected' : ''}>Team Frontend</option>` : ''}
                            ${bDev ? `<option value="${bDev.id}" ${bug.assignee_id === bDev.id ? 'selected' : ''}>Team Backend</option>` : ''}
                        </select>
                        <div style="display:flex; justify-content:flex-end; gap:1rem">
                            <button class="btn btn-secondary" onclick="document.getElementById('assignee-modal').style.display='none'">Cancel</button>
                            <button class="btn btn-primary" onclick="BugDetailView.submitAssignee(${bug.id})">Save</button>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;

            // Set current status in modal
            const modalSelect = document.getElementById('new-status');
            if (modalSelect) modalSelect.value = bug.status;

            // Handle Comment Form
            const commentForm = document.getElementById('comment-form');
            if (commentForm) {
                commentForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const text = document.getElementById('comment-text').value;
                    try {
                        await api.post(`/bugs/${bugId}/comments`, { text });
                        // Simple refresh
                        window.location.reload();
                    } catch (err) {
                        alert('Error adding comment: ' + err.message);
                    }
                });
            }

        } catch (err) {
            // Unauth or Not Found - silently redirect to safe dashboard
            window.location.hash = '#dashboard';
        }
    },

    toggleStatusPrompt: (bugId) => {
        document.getElementById('status-modal').style.display = 'flex';
    },

    submitStatus: async (bugId) => {
        const newStatus = document.getElementById('new-status').value;
        try {
            await api.put(`/bugs/${bugId}`, { status: newStatus });
            window.location.reload();
        } catch (err) {
            alert('Error updating status: ' + err.message);
        }
    },

    toggleAssigneePrompt: (bugId) => {
        document.getElementById('assignee-modal').style.display = 'flex';
    },

    submitAssignee: async (bugId) => {
        const selectedId = document.getElementById('new-assignee').value;
        const newAssigneeId = selectedId ? parseInt(selectedId) : null;

        try {
            await api.put(`/bugs/${bugId}`, { assignee_id: newAssigneeId });
            window.location.reload();
        } catch (err) {
            alert('Error updating assignee: ' + err.message);
        }
    },

    deleteBug: async (bugId) => {
        if (!confirm('Are you sure you want to delete this bug? This action cannot be undone.')) return;

        try {
            await api.del(`/bugs/${bugId}`);
            window.location.hash = '#dashboard';
        } catch (err) {
            alert('Error deleting ticket: ' + err.message);
        }
    }
};
