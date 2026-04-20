/**
 * API Client — all data access goes through here.
 *
 * Currently returns mock data wrapped in Promises to simulate async.
 * When real backend is ready, replace each method body with `fetch(...)`.
 *
 * Example migration:
 *   getProjects() { return fetch('/api/projects').then(r => r.json()); }
 */

const API_BASE = 'http://127.0.0.1:8000';  // Python backend (unused in mock mode)
const MOCK_DELAY = 100;  // Simulate network latency (ms)

function delay(data) {
    return new Promise(resolve => setTimeout(() => resolve(data), MOCK_DELAY));
}

const Api = {
    // ========== Projects ==========
    async getProjects() {
        // TODO: return fetch(`${API_BASE}/runtime-configs`).then(r => r.json()).then(j => j.data);
        return delay(MockData.projects);
    },

    async getProject(name) {
        // TODO: return fetch(`${API_BASE}/projects/${name}/runtime-config`).then(r => r.json());
        const p = MockData.projects.find(x => x.project_name === name);
        if (!p) return delay(null);
        return delay({
            ...p,
            agents: MockData.agents[name] || [],
            tasks: MockData.tasks[name] || [],
        });
    },

    // ========== Agents ==========
    async getAgents(projectName) {
        return delay(MockData.agents[projectName] || []);
    },

    async saveAgent(projectName, payload, originalKey) {
        console.log('[API mock] saveAgent', { projectName, payload, originalKey });
        return delay({ ok: true });
    },

    async deleteAgent(projectName, agentKey) {
        console.log('[API mock] deleteAgent', { projectName, agentKey });
        return delay({ ok: true });
    },

    // ========== Tasks ==========
    async getTasks(projectName) {
        return delay(MockData.tasks[projectName] || []);
    },

    async saveTask(projectName, payload, originalKey) {
        console.log('[API mock] saveTask', { projectName, payload, originalKey });
        return delay({ ok: true });
    },

    async deleteTask(projectName, taskKey) {
        console.log('[API mock] deleteTask', { projectName, taskKey });
        return delay({ ok: true });
    },

    // ========== Email Recipients (per project) ==========
    async getEmails(projectName) {
        return delay(MockData.emails[projectName] || []);
    },

    async addEmail(projectName, payload) {
        console.log('[API mock] addEmail', { projectName, payload });
        return delay({ ok: true, id: Date.now() });
    },

    async deleteEmail(id) {
        console.log('[API mock] deleteEmail', id);
        return delay({ ok: true });
    },

    // ========== Access Control ==========
    async getAccess(projectName) {
        return delay(MockData.access[projectName] || []);
    },

    async grantAccess(projectName, payload) {
        console.log('[API mock] grantAccess', { projectName, payload });
        return delay({ ok: true });
    },

    async revokeAccess(id) {
        console.log('[API mock] revokeAccess', id);
        return delay({ ok: true });
    },

    // ========== News Sources (per project) ==========
    async getSources(projectName) {
        // TODO: return fetch(`${API_BASE}/news-sites?project_name=${projectName}`).then(r => r.json()).then(j => j.data);
        if (projectName) {
            return delay(MockData.sources.filter(s => s.project_name === projectName));
        }
        return delay(MockData.sources);
    },

    async saveSource(payload, originalId) {
        console.log('[API mock] saveSource', { payload, originalId });
        return delay({ ok: true });
    },

    async deleteSource(siteId) {
        console.log('[API mock] deleteSource', siteId);
        return delay({ ok: true });
    },

    // ========== Schedulers (per project) ==========
    async getSchedulers(projectName) {
        // TODO: return fetch(`${API_BASE}/scheduler/configs?project_name=${projectName}`).then(r => r.json()).then(j => j.data);
        if (projectName) {
            return delay(MockData.schedulers.filter(s => s.project_name === projectName));
        }
        return delay(MockData.schedulers);
    },

    async saveScheduler(payload, originalJobId) {
        console.log('[API mock] saveScheduler', { payload, originalJobId });
        return delay({ ok: true });
    },

    async deleteScheduler(jobId) {
        console.log('[API mock] deleteScheduler', jobId);
        return delay({ ok: true });
    },

    async reloadScheduler() {
        console.log('[API mock] reloadScheduler');
        return delay({ ok: true });
    },

    // ========== Articles ==========
    async getArticles(filters = {}) {
        let list = MockData.articles;
        if (filters.project_name) list = list.filter(a => a.project_name === filters.project_name);
        if (filters.is_relevant !== undefined) list = list.filter(a => a.is_relevant === filters.is_relevant);
        return delay(list);
    },
};
