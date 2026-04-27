/**
 * API Client — tất cả data access đi qua đây.
 * Backend: news-fe/api/index.php (PHP + MySQL)
 * Đổi API_BASE nếu deploy sang domain khác.
 */

const API_BASE = '/api/index.php';

async function apiFetch(path, options = {}) {
    const url = `${API_BASE}?path=${path}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

const get  = (path, qs = '') => apiFetch(path + qs);
const post = (path, body)    => apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
const put  = (path, body)    => apiFetch(path, { method: 'PUT',  body: JSON.stringify(body) });
const del  = (path)          => apiFetch(path, { method: 'DELETE' });

const Api = {
    // ── Projects ──────────────────────────────────────────────────────────────
    getProjects()                  { return get('projects'); },
    getProject(name)               { return get(`projects/${name}`); },
    createProject(body)            { return post('projects', body); },
    updateProject(name, body)      { return put(`projects/${name}`, body); },
    deleteProject(name)            { return del(`projects/${name}`); },

    // ── Agents ────────────────────────────────────────────────────────────────
    getAgents(project)             { return get(`projects/${project}/agents`); },
    saveAgent(project, payload, originalKey) {
        return originalKey
            ? put(`projects/${project}/agents/${originalKey}`, payload)
            : post(`projects/${project}/agents`, payload);
    },
    deleteAgent(project, key)      { return del(`projects/${project}/agents/${key}`); },

    // ── Tasks ─────────────────────────────────────────────────────────────────
    getTasks(project)              { return get(`projects/${project}/tasks`); },
    saveTask(project, payload, originalKey) {
        return originalKey
            ? put(`projects/${project}/tasks/${originalKey}`, payload)
            : post(`projects/${project}/tasks`, payload);
    },
    deleteTask(project, key)       { return del(`projects/${project}/tasks/${key}`); },

    // ── Email Recipients ──────────────────────────────────────────────────────
    getEmails(project)             { return get(`projects/${project}/email-recipients`); },
    addEmail(project, payload)     { return post(`projects/${project}/email-recipients`, payload); },
    deleteEmail(project, id)       { return del(`projects/${project}/email-recipients/${id}`); },

    // ── Access Control ────────────────────────────────────────────────────────
    getAccess(project)             { return get(`projects/${project}/access`); },
    grantAccess(project, payload)  { return post(`projects/${project}/access`, payload); },
    revokeAccess(project, id)      { return del(`projects/${project}/access/${id}`); },

    // ── News Sources ──────────────────────────────────────────────────────────
    getSources(project) {
        const qs = project ? `&project_name=${encodeURIComponent(project)}` : '';
        return get('news-sites', qs);
    },
    saveSource(payload, originalId) {
        return originalId
            ? put(`news-sites/${originalId}`, payload)
            : post('news-sites', payload);
    },
    deleteSource(siteId)           { return del(`news-sites/${siteId}`); },

    // ── Schedulers ────────────────────────────────────────────────────────────
    getSchedulers(project) {
        const qs = project ? `&project_name=${encodeURIComponent(project)}` : '';
        return get('scheduler/configs', qs);
    },
    saveScheduler(payload, originalJobId) {
        return originalJobId
            ? put(`scheduler/configs/${originalJobId}`, payload)
            : post('scheduler/configs', payload);
    },
    deleteScheduler(jobId)         { return del(`scheduler/configs/${jobId}`); },

    // ── Articles ──────────────────────────────────────────────────────────────
    getArticles(filters = {}) {
        let qs = '';
        if (filters.project_name) qs += `&project_name=${encodeURIComponent(filters.project_name)}`;
        if (filters.status)       qs += `&status=${encodeURIComponent(filters.status)}`;
        if (filters.is_relevant !== undefined) qs += `&is_relevant=${filters.is_relevant ? 1 : 0}`;
        if (filters.limit)        qs += `&limit=${filters.limit}`;
        return get('articles', qs);
    },
    addArticle(payload)          { return post('articles', payload); },
    updateArticle(id, payload)   { return put(`articles/${id}`, payload); },
    deleteArticle(id)            { return del(`articles/${id}`); },

    // ── Logs ─────────────────────────────────────────────────────────────────
    getLogs(project, filters) {
        var qs = '';
        if (filters && filters.agent_key) qs += '&agent_key=' + encodeURIComponent(filters.agent_key);
        if (filters && filters.status)    qs += '&status='    + encodeURIComponent(filters.status);
        if (filters && filters.limit)     qs += '&limit='     + filters.limit;
        return get('projects/' + project + '/logs', qs);
    },
    getLog(project, id)            { return get('projects/' + project + '/logs/' + id); },
    createLog(project, payload)    { return post('projects/' + project + '/logs', payload); },
    updateLog(project, id, payload){ return put('projects/' + project + '/logs/' + id, payload); },
    deleteLog(project, id)         { return del('projects/' + project + '/logs/' + id); },

    // ── Users (Admin) ─────────────────────────────────────────────────────────
    getUsers()                     { return get('users'); },
    searchUser(knoxid)             { return get('users', `&q=${encodeURIComponent(knoxid)}`); },
    saveUser(payload, originalId) {
        return originalId
            ? put(`users/${originalId}`, payload)
            : post('users', payload);
    },
    deleteUser(id)                 { return del(`users/${id}`); },
};
