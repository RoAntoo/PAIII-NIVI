const runtime = (globalThis as typeof globalThis & { NIVI_CONFIG?: { apiUrl?: string } }).NIVI_CONFIG;
export const environment = { production: true, apiUrl: runtime?.apiUrl?.replace(/\/$/, '') || '/api' };
