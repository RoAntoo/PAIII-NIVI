const runtime = (globalThis as typeof globalThis & { NIVI_CONFIG?: { apiUrl?: string } }).NIVI_CONFIG;
export const environment = { production: false, apiUrl: runtime?.apiUrl?.replace(/\/$/, '') || 'http://127.0.0.1:8081' };
