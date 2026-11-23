import { TASK_CATEGORIES, TaskCategory, validateTaskInput } from './task.models';

export interface RecognizedTaskLine {
  title: string;
  originalTitle: string;
}

const listPrefix = /^(?:(?:[-–—](?!\d)|[*•▪◦☐☑]|\[\s*x?\s*\])\s*|\d{1,3}[.)]\s+)/iu;
const listHeading = /^lista de tareas\s*[:.]?$/iu;

export function readTaskLines(lines: readonly string[]): RecognizedTaskLine[] {
  const entries: RecognizedTaskLine[] = [];
  for (const observed of lines) {
    for (const raw of observed.split(/\r\n?|\n/u)) {
      const originalTitle = raw.trim();
      const title = originalTitle.replace(listPrefix, '').replace(/\s+/gu, ' ').trim();
      if (title && /[\p{L}\p{N}]/u.test(title) && !listHeading.test(title)) {
        entries.push({ title, originalTitle });
      }
    }
  }
  return entries;
}

export interface QrTaskTemplate {
  title: string;
  category: TaskCategory;
  estimateHours: number;
}

export class QrTemplateError extends Error {}

const qrPrefix = 'nivi-task:v1:';
const maxQrLength = 1024;
const templateKeys = ['title', 'category', 'estimateHours'];

export function parseNiviTaskQr(value: string): QrTaskTemplate {
  if (!value.startsWith(qrPrefix) || value.length > maxQrLength) {
    throw new QrTemplateError('El código no es una plantilla NIVI compatible.');
  }

  try {
    const encoded = value.slice(qrPrefix.length);
    if (!/^[A-Za-z0-9_-]+$/u.test(encoded)) throw new Error();
    const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
    const decoded: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) throw new Error();
    const fields = decoded as Record<string, unknown>;
    if (Object.keys(fields).some(key => !templateKeys.includes(key))) throw new Error();
    if (typeof fields['title'] !== 'string' || /[\u0000-\u001F\u007F]|<[!/A-Za-z?]/u.test(fields['title'])) {
      throw new Error();
    }
    const title = fields['title'].trim();
    const category = fields['category'] === undefined
      ? 'GENERAL' : TASK_CATEGORIES.find(entry => entry === fields['category']);
    const estimateHours = fields['estimateHours'] === undefined ? 1 : fields['estimateHours'];
    if (!category || typeof estimateHours !== 'number') throw new Error();
    validateTaskInput({ title, category, estimateHours });
    return { title, category, estimateHours };
  } catch {
    throw new QrTemplateError('La plantilla QR contiene datos inválidos.');
  }
}
