import { describe, expect, it } from 'vitest';
import { isDevToolsShortcut, silenceConsole, sizeSuggestsDevTools } from './devtools';

const key = (
  k: string,
  mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {},
) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe('atajos de las herramientas de desarrollo', () => {
  it('bloquea F12, Ctrl+Shift+I/J/C, Cmd+Opt+I y Ctrl+U', () => {
    expect(isDevToolsShortcut(key('F12'))).toBe(true);
    expect(isDevToolsShortcut(key('I', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(isDevToolsShortcut(key('j', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(isDevToolsShortcut(key('c', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(isDevToolsShortcut(key('i', { metaKey: true, altKey: true }))).toBe(true);
    expect(isDevToolsShortcut(key('u', { ctrlKey: true }))).toBe(true);
  });

  it('no bloquea copiar, pegar ni escribir', () => {
    expect(isDevToolsShortcut(key('c', { ctrlKey: true }))).toBe(false);
    expect(isDevToolsShortcut(key('v', { ctrlKey: true }))).toBe(false);
    expect(isDevToolsShortcut(key('i'))).toBe(false);
  });
});

describe('deteccion por tamaño de ventana', () => {
  it('detecta las herramientas acopladas a un costado o abajo', () => {
    expect(
      sizeSuggestsDevTools({
        outerWidth: 1920,
        innerWidth: 1400,
        outerHeight: 1040,
        innerHeight: 950,
      }),
    ).toBe(true);
    expect(
      sizeSuggestsDevTools({
        outerWidth: 1920,
        innerWidth: 1920,
        outerHeight: 1040,
        innerHeight: 600,
      }),
    ).toBe(true);
  });

  it('no confunde el zoom ni una ventana normal con las herramientas', () => {
    // Zoom 150 %: se achican las dos dimensiones.
    expect(
      sizeSuggestsDevTools({
        outerWidth: 1920,
        innerWidth: 1280,
        outerHeight: 1040,
        innerHeight: 633,
      }),
    ).toBe(false);
    expect(
      sizeSuggestsDevTools({
        outerWidth: 1920,
        innerWidth: 1920,
        outerHeight: 1040,
        innerHeight: 950,
      }),
    ).toBe(false);
  });
});

it('silencia la consola', () => {
  const calls: unknown[] = [];
  const fake = {
    log: (...a: unknown[]) => calls.push(a),
    info: (...a: unknown[]) => calls.push(a),
    debug: (...a: unknown[]) => calls.push(a),
    warn: (...a: unknown[]) => calls.push(a),
    error: (...a: unknown[]) => calls.push(a),
    table: (...a: unknown[]) => calls.push(a),
    dir: (...a: unknown[]) => calls.push(a),
    trace: (...a: unknown[]) => calls.push(a),
  };
  silenceConsole(fake);
  fake.log('secreto');
  fake.error('secreto');
  expect(calls).toHaveLength(0);
});
