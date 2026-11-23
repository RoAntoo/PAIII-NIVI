const leadingPhrase = /^(?:recordame|recuérdame|anotá|anota) que\s+/iu;
const ordinalListStart = /^primero\s*[:,]?\s+/iu;
const laterOrdinal = /[,;\r\n]\s*(?:segundo|tercero|cuarto|quinto|sexto|séptimo|octavo|noveno|décimo)(?:\s*[:,]\s*|\s+)/giu;
const numberedListStart = /^\d{1,2}[.)]\s+/u;

export function parseTaskText(transcript: string): string[] {
  let text = transcript.trim().replace(leadingPhrase, '');
  if (ordinalListStart.test(text)) {
    const entries = text.replace(ordinalListStart, '').replace(laterOrdinal, '\n');
    if (entries.includes('\n') || entries.includes(';')) text = entries;
  }
  if (numberedListStart.test(text)) {
    text = text
      .replace(numberedListStart, '')
      .replace(/\s+\d{1,2}[.)]\s+(?=\p{L})/gu, '\n');
  }

  return text.split(/[\r\n;]+|(?<=[!?])\s+/u)
    .map(fragment => fragment
      .replace(/^(?:[-•*]|\d{1,2}[.)])\s+/u, '')
      .replace(/\s+/gu, ' ')
      .trim()
      .replace(/^[¿¡\s.,:!?]+|[\s.,:!?]+$/gu, ''))
    .filter(fragment => /[\p{L}\p{N}]/u.test(fragment))
    .map(fragment => fragment.charAt(0).toLocaleUpperCase('es-AR') + fragment.slice(1));
}
