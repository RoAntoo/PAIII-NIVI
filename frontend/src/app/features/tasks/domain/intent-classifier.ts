export type PlaceCategory = 'HARDWARE' | 'LABORATORY' | 'PHARMACY';

export interface PlaceIntent {
  category: PlaceCategory;
  confidence: 'clear' | 'ambiguous';
}

const shopAction = /\b(?:comprar|conseguir|retirar|buscar|pasar|ir)\b/;
const healthAction = /\b(?:hacer(?:me|se)?|realizar(?:me|se)?|sacar(?:me|se)?|pedir|ir|pasar)\b/;
const negation = /\b(?:no|nunca|jamas|evitar|cancelar|sin necesidad de)\b/;
const informational = /\b(?:estudiar|investigar|aprender|leer|averiguar|informacion|trabajo practico|programacion|analisis de datos|en linea|online|por internet)\b/;
const clinicalTest = /\b(?:analisis de sangre|extraccion de sangre|analisis clinicos|laboratorios?)\b/;

export const PLACE_LABELS: Record<PlaceCategory, string> = {
  HARDWARE: 'ferreterías',
  LABORATORY: 'laboratorios',
  PHARMACY: 'farmacias',
};

export function classifyIntent(title: string): PlaceIntent | null {
  const clauses = title.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .split(/[,;.!?\n]+|\b(?:pero|luego)\b|\by\s+(?=(?:no\s+)?(?:comprar|conseguir|retirar|buscar|hacer|ir|estudiar)\b)/)
    .map(clause => clause.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim());

  const candidates = new Map<PlaceCategory, PlaceIntent>();
  for (const clause of clauses) {
    if (negation.test(clause) || informational.test(clause)) continue;
    if (shopAction.test(clause) && /\b(?:ferreterias?|tornillos?|arandelas?|tarugos?|herramientas?|tuercas?)\b/.test(clause)) {
      candidates.set('HARDWARE', { category: 'HARDWARE', confidence: 'clear' });
    }
    if (shopAction.test(clause) && /\b(?:farmacias?|medicamentos?|remedios?)\b/.test(clause)) {
      candidates.set('PHARMACY', { category: 'PHARMACY', confidence: 'clear' });
    }
    const isClinical = clinicalTest.test(clause);
    if (healthAction.test(clause) && isClinical) {
      candidates.set('LABORATORY', { category: 'LABORATORY', confidence: 'clear' });
    } else if ((isClinical || !candidates.has('LABORATORY')) && /\b(?:retirar|buscar|recoger)\b.*\banalisis\b/.test(clause)) {
      candidates.set('LABORATORY', { category: 'LABORATORY', confidence: isClinical ? 'clear' : 'ambiguous' });
    }
  }
  return candidates.size === 1 ? candidates.values().next().value ?? null : null;
}
