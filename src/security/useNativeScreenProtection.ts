import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';

/**
 * En la app Android activa FLAG_SECURE: el sistema operativo muestra negro en capturas, grabaciones
 * de pantalla y en la vista de apps recientes. En el navegador no tiene efecto (no existe API web
 * para bloquear capturas); ahi actuan las medidas disuasivas de ScreenGuard.
 */
export function useNativeScreenProtection(protect: boolean) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const action = protect ? PrivacyScreen.enable() : PrivacyScreen.disable();
    action.catch((error: unknown) => {
      // Fallar abierto seria un hueco de seguridad: solo se registra, el estado inicial ya es
      // protegido (capacitor.config.ts).
      console.error('No se pudo cambiar la proteccion de pantalla', error);
    });
  }, [protect]);
}
