import { describe, expect, it } from 'vitest';
import { normalizeZone, zoneOptions } from './CustomersPage';

describe('zonas de la cartera', () => {
  it('agrupa la misma ciudad escrita distinto y ordena por cantidad', () => {
    const list = [
      { city: 'San Justo' },
      { city: 'san justo ' },
      { city: 'Morón' },
      { city: 'Moron' },
      { city: 'Moron' },
      { city: 'Ramos Mejía' },
      { city: '' },
    ];
    expect(zoneOptions(list)).toEqual([
      { value: 'moron', label: 'Morón (3)' },
      { value: 'san justo', label: 'San Justo (2)' },
      { value: 'ramos mejia', label: 'Ramos Mejía (1)' },
    ]);
    expect(normalizeZone(' Ramos MEJÍA')).toBe('ramos mejia');
  });
});
