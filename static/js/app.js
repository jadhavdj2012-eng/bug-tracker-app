/**
 * app.js - Main Application Entry and Router
 */

const AppState = {
    currentUser: null,
    users: []
};

const App = {
    init: async () => {
        console.log("BugTracker MVP Initializing...");

        // Load global user data for the mock auth switcher
        try {
            AppState.users = await api.get('/users');
            if (AppState.users.length > 0) {
                App.setCurrentUser(AppState.users[0]); // Default to Admin
                App.renderUserSwitcher();
            }
        } catch (e) {
            console.error("Failed to load initial user context", e);
        }

        // Setup Routing Listener
        window.addEventListener('hashchange', App.router);

        // Trigger initial route
        if (!window.location.hash) {
            window.location.hash = '#dashboard';
        } else {
            App.router();
        }
    },

    router: () => {
        const hash = window.location.hash.substring(1) || 'dashboard';
        const container = 'app-container';

        // Parse route parameters (e.g. bug/123)
        const parts = hash.split('/');
        const route = parts[0];
        const param = parts.length > 1 ? parts[1] : null;

        // Update nav active state
        document.querySelectorAll('.nav-links a').forEach(a => {
            if (a.href.includes(`#${route}`)) a.classList.add('active');
            else a.classList.remove('active');
        });

        // Route dispatcher
        switch (route) {
            case 'dashboard':
                DashboardView.render(container);
                break;
            case 'board':
                KanbanView.render(container);
                break;
            case 'create':
                BugFormView.render(container);
                break;
            case 'bug':
                if (param) BugDetailView.render(container, parseInt(param));
                else window.location.hash = '#dashboard';
                break;
            case 'edit':
                if (param) BugFormView.render(container, parseInt(param));
                else window.location.hash = '#dashboard';
                break;
            default:
                DashboardView.render(container);
        }
    },

    setCurrentUser: (user) => {
        AppState.currentUser = user;
        document.getElementById('current-user-name').textContent = user.name;
        document.getElementById('current-user-role').textContent = user.role;
        document.getElementById('current-user-avatar').textContent = UI.getInitials(user.name);
    },

    renderUserSwitcher: () => {
        const switcher = document.getElementById('user-switcher');
        switcher.innerHTML = AppState.users.map(u =>
            `<option value="${u.id}" ${AppState.currentUser && AppState.currentUser.id === u.id ? 'selected' : ''}>${u.name}</option>`
        ).join('');

        switcher.addEventListener('change', (e) => {
            const selectedId = parseInt(e.target.value);
            const user = AppState.users.find(u => u.id === selectedId);
            if (user) {
                App.setCurrentUser(user);
                // Refresh current view to apply any role-based UI changes
                App.router();
            }
        });
    }
};

// Start app on DOM load
document.addEventListener('DOMContentLoaded', App.init);
