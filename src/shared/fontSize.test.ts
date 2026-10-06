import { describe, expect, it } from 'vitest';
import { LARGE_ROOT, useFontSize } from './fontSize';

describe('tamaño de letra', () => {
  it('alterna entre normal y grande y lo aplica a la raiz', () => {
    useFontSize.setState({ size: 'normal' });
    useFontSize.getState().toggle();
    expect(useFontSize.getState().size).toBe('large');
    expect(document.documentElement.style.fontSize).toBe(LARGE_ROOT);
    useFontSize.getState().toggle();
    expect(document.documentElement.style.fontSize).toBe('');
  });
});
