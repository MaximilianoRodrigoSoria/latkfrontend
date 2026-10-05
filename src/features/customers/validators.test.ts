import { describe, expect, it } from 'vitest';
import {
  ageAt,
  bankFromCbu,
  formatCuil,
  suggestCuils,
  validateCbu,
  validateCuil,
} from './validators';

describe('validadores argentinos', () => {
  it('valida CUIL y su coherencia con el DNI', () => {
    expect(validateCuil('20-12345678-6')).toBeNull();
    expect(validateCuil('20123456786', '12.345.678')).toBeNull();
    expect(validateCuil('20-12345678-5')).toMatch(/invalido/);
    expect(validateCuil('20-12345678-6', '30123456')).toMatch(/no corresponde/);
    expect(validateCuil('123')).toMatch(/11 digitos/);
  });

  it('sugiere CUIL validos para un DNI', () => {
    expect(suggestCuils('12345678')).toContain('20-12345678-6');
    expect(suggestCuils('12')).toEqual([]);
  });

  it('formatea el CUIL mientras se escribe', () => {
    expect(formatCuil('20123456786')).toBe('20-12345678-6');
    expect(formatCuil('2012')).toBe('20-12');
  });

  it('valida CBU y acepta CVU', () => {
    expect(validateCbu('2850590940090418135201')).toBeNull();
    expect(validateCbu('0000003100010000000001')).toBeNull();
    expect(validateCbu('2850590940090418135202')).toMatch(/invalido/);
    expect(validateCbu('285')).toMatch(/22 digitos/);
  });

  it('detecta el banco por el CBU', () => {
    expect(bankFromCbu('2850590940090418135201')).toBe('Banco Macro');
    expect(bankFromCbu('0000003100010000000001')).toMatch(/CVU/);
  });

  it('calcula la edad', () => {
    expect(ageAt(new Date(2008, 9, 6), new Date(2026, 9, 5))).toBe(17);
    expect(ageAt(new Date(2008, 9, 5), new Date(2026, 9, 5))).toBe(18);
  });
});
