import { parseNiviTaskQr, readTaskLines } from './task-import-parser';

function qr(json: string): string {
  const bytes = new TextEncoder().encode(json);
  return 'nivi-task:v1:' + btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

describe('OCR task lines', () => {
  it('removes an exact heading and list markers, retaining accents, order and repeated titles', () => {
    const candidates = readTaskLines([
      '  LISTA DE TAREAS: ', '  • Llamar   a mamá\n2. Revisar presentación',
      '☐ Llamar a mamá', '.', 'Lista de tareas para mañana', '1.5 litros de agua',
    ]);
    expect(candidates.map(item => item.title)).toEqual([
      'Llamar a mamá', 'Revisar presentación', 'Llamar a mamá',
      'Lista de tareas para mañana', '1.5 litros de agua',
    ]);
    expect(candidates[0].originalTitle).toBe('• Llamar   a mamá');
  });
});

describe('NIVI QR templates', () => {
  it('decodes accented titles and accepts the task contract defaults', () => {
    expect(parseNiviTaskQr(qr('{"title":"  Revisar presentación  "}'))).toEqual({
      title: 'Revisar presentación', category: 'GENERAL', estimateHours: 1,
    });
    expect(parseNiviTaskQr(qr('{"title":"Comprar café","category":"COMPRAS","estimateHours":2}'))).toEqual({
      title: 'Comprar café', category: 'COMPRAS', estimateHours: 2,
    });
  });

  it.each([
    'https://example.org',
    'nivi-task:v2:e30',
    'nivi-task:v1:--=',
    'nivi-task:v1:_w',
    'nivi-task:v1:' + 'a'.repeat(1024),
    qr('[]'),
    qr('{"title":"  "}'),
    qr('{"title":"<script>alert(1)</script>"}'),
    qr('{"title":"Hola","__proto__":{}}'),
    qr('{"title":"Hola","estimateHours":1.5}'),
    qr('{"title":"Hola","category":"inventada"}'),
    qr('{"title":"Hola","open":"https://example.org"}'),
  ])('rejects an invalid or unsupported QR', value => {
    expect(() => parseNiviTaskQr(value)).toThrow();
  });
});
