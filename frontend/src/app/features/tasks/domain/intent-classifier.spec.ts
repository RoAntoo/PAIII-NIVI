import { classifyIntent } from './intent-classifier';

describe('classifyIntent', () => {
  it.each([
    ['Comprar tornillos', 'HARDWARE', 'clear'],
    ['Comprar una herramienta', 'HARDWARE', 'clear'],
    ['Pasar por la FERRETERÍA', 'HARDWARE', 'clear'],
    ['Hacerme análisis de sangre', 'LABORATORY', 'clear'],
    ['Realizar analisis de sangre', 'LABORATORY', 'clear'],
    ['Retirar los análisis', 'LABORATORY', 'ambiguous'],
    ['Comprar medicamentos', 'PHARMACY', 'clear'],
    ['Comprar un remedio', 'PHARMACY', 'clear'],
    ['No comprar tornillos, pero ir a la farmacia', 'PHARMACY', 'clear'],
  ])('classifies %s', (title, category, confidence) => {
    expect(classifyIntent(title)).toEqual({ category, confidence });
  });

  it.each([
    'No comprar tornillos',
    'Nunca ir a la farmacia',
    'Buscar información sobre hospitales',
    'Retirar el análisis de datos',
    'Estudiar Programación Avanzada',
    'Comprar pan y leche',
    'Comprar tornillos por internet',
    'Comprar tornillos y comprar medicamentos',
  ])('skips %s', title => {
    expect(classifyIntent(title)).toBeNull();
  });
});
