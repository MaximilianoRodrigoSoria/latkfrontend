import { describe, expect, it } from 'vitest';
import { contrastRatio, isHexColor, readableTextOn, wcagLevel } from './contrast';

describe('contraste WCAG', () => {
  it('negro sobre blanco es 21:1 (AAA)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(wcagLevel(21)).toBe('AAA');
  });

  it('clasifica los umbrales AA y AA grande', () => {
    expect(wcagLevel(4.5)).toBe('AA');
    expect(wcagLevel(3.2)).toBe('AA grande');
    expect(wcagLevel(2)).toBe('Insuficiente');
  });

  it('elige texto oscuro sobre el cian de la marca', () => {
    expect(readableTextOn('#00E8FF')).toBe('#000000');
    expect(readableTextOn('#002C6B')).toBe('#FFFFFF');
  });

  it('valida hex de 6 digitos', () => {
    expect(isHexColor('#1673FF')).toBe(true);
    expect(isHexColor('#FFF')).toBe(false);
  });
});
