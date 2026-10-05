import { useSyncExternalStore } from 'react';

/** Evento de Chrome/Edge/Android que permite mostrar el dialogo "Instalar app". */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
// La foto se recalcula al cambiar algo, aunque todavia no haya componentes suscriptos.
const emit = () => {
  cached = snapshot();
  listeners.forEach((l) => l());
};

// El navegador avisa una sola vez, apenas carga: se guarda para usarlo cuando el usuario toque
// "Instalar". Se registra al importar el modulo, antes de que React monte.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    emit();
  });
}

/** Ya se abrio como app instalada (pantalla completa, sin barra del navegador). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true
  );
}

/** iPhone/iPad: Safari no tiene boton de instalar; se agrega desde "Compartir". */
export function isIos(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export interface InstallState {
  /** Ya instalada: no se ofrece. */
  installed: boolean;
  /** El navegador permite el dialogo nativo de instalacion. */
  canPrompt: boolean;
}

const snapshot = (): InstallState => ({
  installed: installed || isStandalone(),
  canPrompt: deferred !== null,
});
let cached = snapshot();

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => cached,
  );
}

/**
 * Muestra el dialogo nativo de instalacion.
 *
 * @return true si la instalo, false si la cancelo o el navegador no lo permite
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // el evento se puede usar una sola vez
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}
