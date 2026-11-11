import { readFile, writeFile } from 'node:fs/promises';

// Only the built Android bundle is changed; web deployment keeps runtime-config.js.
const apiUrl = process.env.NIVI_API_URL?.replace(/\/+$/, '');
if (!apiUrl) throw new Error('Definí NIVI_API_URL con la URL absoluta del backend alcanzable desde Android.');
const url = new URL(apiUrl);
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
  throw new Error('NIVI_API_URL debe ser HTTP(S), sin credenciales, query ni fragmento.');
}
if (url.protocol === 'http:' && process.env.NIVI_ALLOW_HTTP !== 'true') {
  throw new Error('HTTP requiere NIVI_ALLOW_HTTP=true y un APK debug. Usá HTTPS fuera de desarrollo local.');
}
const output = new URL('../dist/frontend-tareas-proyectos/browser/runtime-config.js', import.meta.url);
await readFile(output); // Fail if the Angular build has not run.
await writeFile(output, `window.NIVI_CONFIG = ${JSON.stringify({ apiUrl: url.href.replace(/\/+$/, '') })};\n`);
console.log(`Configuración Android preparada (${url.protocol.slice(0, -1).toUpperCase()}).`);
