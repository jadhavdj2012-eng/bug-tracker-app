/**
 * ui.js - Shared DOM manipulation utilities
 */

const UI = {
    // Escape HTML to prevent XSS
    escape: (str) => {
        if (!str) return '';
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    },

    // Format Date string
    formatDate: (dateStr) => {
        if (!dateStr) return '';
        // SQLite returns UTC format 'YYYY-MM-DD HH:MM:SS'. For correct local display, append 'Z'
        let isoStr = dateStr;
        if (dateStr.indexOf(' ') !== -1 && !dateStr.endsWith('Z')) {
            isoStr = dateStr.replace(' ', 'T') + 'Z';
        }
        const d = new Date(isoStr);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    // Loading indicator
    showLoader: (container) => {
        container.innerHTML = '<div class="loading-state">Loading...</div>';
    },

    // Get color class for severity
    getSeverityClass: (severity) => {
        return `badge-severity[data-severity="${severity}"]`;
    },

    // Create Avatar initials
    getInitials: (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    },

    // Clear container
    clear: (containerId) => {
        const c = document.getElementById(containerId);
        if (c) c.innerHTML = '';
        return c;
    }
};
