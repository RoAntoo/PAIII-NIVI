import { parseTaskText } from './task-text-parser';

describe('parseTaskText', () => {
  it.each([
    ['comprar tornillos.', ['Comprar tornillos']],
    ['   ; ...  ', []],
    ['Comprar pan y leche', ['Comprar pan y leche']],
    ['  Recordame que   anote  el miércoles. ', ['Anote el miércoles']],
    ['primero, comprar tornillos; segundo, estudiar para el parcial', ['Comprar tornillos', 'Estudiar para el parcial']],
    ['Primero comprar pan, segundo estudiar', ['Comprar pan', 'Estudiar']],
    ['Primero comprar un segundo monitor', ['Primero comprar un segundo monitor']],
    ['1. Revisar apuntes 2. Llamar a mamá', ['Revisar apuntes', 'Llamar a mamá']],
    ['1) revisar apuntes\r\n2) llamar a mamá', ['Revisar apuntes', 'Llamar a mamá']],
    ['ir a Av. Rivadavia y comprar 2.5 kg de harina', ['Ir a Av. Rivadavia y comprar 2.5 kg de harina']],
    ['  • ¿ir al médico? ¡retirar análisis! ', ['Ir al médico', 'Retirar análisis']],
  ])('parses %j as %j', (transcript, expected) => {
    expect(parseTaskText(transcript)).toEqual(expected);
  });
});
