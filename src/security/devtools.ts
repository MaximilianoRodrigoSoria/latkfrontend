/**
 * Bloqueo de la consola y las herramientas de desarrollo del navegador.
 *
 * Solo en desarrollo (`npm run local` / `npm run dev`) se pueden usar. En el build desplegado:
 *  - la consola queda muda (no muestra logs de la app);
 *  - se bloquean los atajos que la abren (F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Cmd+Opt+I/J/C/U) y
 *    el menu contextual ("Inspeccionar");
 *  - si se detecta abierta, la app se reemplaza por un cartel de error (DevToolsGuard).
 *
 * Es disuasivo: un navegador no puede impedir del todo sus propias herramientas. Lo sensible se
 * protege en el backend (permisos), nunca solo en el frontend.
 */
export const DEVTOOLS_ALLOWED = import.meta.env.DEV;

type ConsoleMethod = 'log' | 'info' | 'debug' | 'warn' | 'error' | 'table' | 'dir' | 'trace';
const SILENCED: ConsoleMethod[] = [
  'log',
  'info',
  'debug',
  'warn',
  'error',
  'table',
  'dir',
  'trace',
];

/** Log original, guardado antes de silenciar la consola (lo usa la sonda de deteccion). */
const originalLog = console.log.bind(console);

/** Deja la consola sin salida de la app. Solo fuera de desarrollo. */
export function silenceConsole(target: Pick<Console, ConsoleMethod> = console) {
  const noop = () => undefined;
  for (const method of SILENCED) target[method] = noop;
}

/** Atajos que abren las herramientas de desarrollo o el codigo fuente. */
export function isDevToolsShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
): boolean {
  const key = event.key.toLowerCase();
  if (key === 'f12') return true;
  // Windows/Linux: Ctrl+Shift+I/J/C/K. Mac: Cmd+Opt+I/J/C.
  if ((event.ctrlKey && event.shiftKey) || (event.metaKey && event.altKey)) {
    return ['i', 'j', 'c', 'k'].includes(key);
  }
  // Ver codigo fuente: Ctrl+U o Cmd+Opt+U.
  return key === 'u' && (event.ctrlKey || (event.metaKey && event.altKey));
}

export interface WindowSize {
  outerWidth: number;
  innerWidth: number;
  outerHeight: number;
  innerHeight: number;
}

const MIN_GAP = 200;

/**
 * Herramientas acopladas a un costado o abajo: achican una sola dimension de la ventana. El zoom
 * del navegador achica las dos por igual, asi que no se confunde con el zoom.
 */
export function sizeSuggestsDevTools(w: WindowSize): boolean {
  if (w.innerWidth <= 0 || w.innerHeight <= 0) return false;
  const ratioW = w.outerWidth / w.innerWidth;
  const ratioH = w.outerHeight / w.innerHeight;
  const side = w.outerWidth - w.innerWidth > MIN_GAP && ratioW - ratioH > 0.1;
  // Abajo: la barra del navegador ya suma algo de alto, por eso el margen es mayor.
  const bottom = w.outerHeight - w.innerHeight > MIN_GAP + 100 && ratioH - ratioW > 0.25;
  return side || bottom;
}

/**
 * Sonda para herramientas desacopladas (ventana aparte): el navegador lee el `id` del elemento
 * recien al mostrarlo en una consola abierta.
 */
function consoleProbe(): boolean {
  let opened = false;
  const element = document.createElement('div');
  Object.defineProperty(element, 'id', {
    get() {
      opened = true;
      return '';
    },
  });
  originalLog('%c', element);
  return opened;
}

/** Solo en escritorio: en celulares las barras del navegador cambian el tamaño todo el tiempo. */
const isDesktop = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;

export function devToolsOpen(): boolean {
  return (isDesktop() && sizeSuggestsDevTools(window)) || consoleProbe();
}
