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

        // Try parsing directly (works for ISO strings from Postgres)
        let d = new Date(dateStr);

        // If invalid, try fallback for SQLite format 'YYYY-MM-DD HH:MM:SS'
        if (isNaN(d.getTime())) {
            let isoStr = dateStr;
            if (dateStr.indexOf(' ') !== -1 && !dateStr.endsWith('Z')) {
                isoStr = dateStr.replace(' ', 'T') + 'Z';
            }
            d = new Date(isoStr);
        }

        if (isNaN(d.getTime())) return dateStr; // Fallback to raw string

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
