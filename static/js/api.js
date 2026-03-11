/**
 * api.js - Simple Fetch wrapper for backend communication
 */

const API_BASE_URL = '/api';

const api = {

    // Auth helper (mock)
    getHeaders: () => {
        const userId = AppState.currentUser ? AppState.currentUser.id : 1;
        return {
            'Content-Type': 'application/json',
            'X-User-ID': userId
        };
    },

    // GET requests
    get: async (endpoint) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: api.getHeaders()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return await res.json();
        } catch (err) {
            console.error(`API GET error on ${endpoint}:`, err);
            throw err;
        }
    },

    // POST requests
    post: async (endpoint, data) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: api.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return await res.json();
        } catch (err) {
            console.error(`API POST error on ${endpoint}:`, err);
            throw err;
        }
    },

    // PUT requests (Updates)
    put: async (endpoint, data) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: api.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return await res.json();
        } catch (err) {
            console.error(`API PUT error on ${endpoint}:`, err);
            throw err;
        }
    },

    // DELETE requests
    del: async (endpoint) => {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: api.getHeaders()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return await res.json();
        } catch (err) {
            console.error(`API DELETE error on ${endpoint}:`, err);
            throw err;
        }
    },

    // File Upload (Multipart Form Data)
    upload: async (endpoint, file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                // Don't set Content-Type, let browser set it wrapper multipart boundary
                headers: {
                    'X-User-ID': AppState.currentUser ? AppState.currentUser.id : 1
                },
                body: formData
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`API Upload error:`, err);
            throw err;
        }
    }
};
