import chroma from 'chroma-js';

export type WcagLevel = 'AAA' | 'AA' | 'AA grande' | 'Insuficiente';

/** Relacion de contraste WCAG 2.x entre dos colores (1 a 21). */
export function contrastRatio(foreground: string, background: string): number {
  return chroma.contrast(foreground, background);
}

/** Nivel para texto normal; "AA grande" solo sirve para titulos de 18 px o mas. */
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA grande';
  return 'Insuficiente';
}

/** Elige blanco o negro segun cual contraste mas sobre el color dado. */
export function readableTextOn(background: string): '#FFFFFF' | '#000000' {
  return contrastRatio('#FFFFFF', background) >= contrastRatio('#000000', background)
    ? '#FFFFFF'
    : '#000000';
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}
