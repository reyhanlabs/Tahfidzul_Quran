const apps = [];
export function initializeApp(cfg, name = '[DEFAULT]') { const a = { name, options: cfg }; apps.push(a); return a; }
export function getApps() { return apps.filter((a) => a.name === '[DEFAULT]'); }
export async function deleteApp() {}
